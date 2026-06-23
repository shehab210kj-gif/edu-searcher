import mammoth from "mammoth";
import type { LayoutMetadata } from "@workspace/db";
import { uploadBuffer } from "./storage";
import { extractDocxLayout } from "./docx-layout";

const STYLE_MAP = [
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "b => strong",
  "i => em",
];

export type RichParseResult = {
  html: string;
  title: string;
  layout: LayoutMetadata;
  warnings: string[];
};

function firstHeadingText(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return "";
  return m[1].replace(/<[^>]+>/g, "").trim();
}

/**
 * Convert a DOCX into TipTap-compatible HTML, extracting embedded images to
 * object storage (referenced via `/api/storage/objects/...`), and capturing
 * document-level layout (margins, page size, headers/footers, page numbers).
 */
export async function parseDocxToRich(buffer: Buffer): Promise<RichParseResult> {
  const layout = await extractDocxLayout(buffer);

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        const objectPath = await uploadBuffer(
          imageBuffer,
          image.contentType || "image/png",
        );
        return { src: `/api/storage${objectPath}` };
      }),
    },
  );

  const html = result.value;
  const title = firstHeadingText(html);
  return {
    html,
    title,
    layout,
    warnings: result.messages.map((m) => m.message),
  };
}

export type PdfMetadata = {
  title: string;
  pageCount: number | null;
};

/**
 * pdf-parse bundles pdf.js, whose `canvas` module references `DOMMatrix`,
 * `ImageData` and `Path2D` at class-definition time. In a headless Node bundle
 * these globals are undefined, so the module throws on import. We only read
 * metadata (never render), so defining inert stubs is enough to let the module
 * load. The stubs are never invoked because `getInfo()` does no rendering.
 */
function ensurePdfGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = class {};
  if (typeof g.ImageData === "undefined") g.ImageData = class {};
  if (typeof g.Path2D === "undefined") g.Path2D = class {};
}

/**
 * Extract lightweight metadata (title, page count) from a PDF without
 * converting it to HTML or rendering any pages. The original PDF is stored and
 * previewed unchanged; this only reads the document info dictionary and page
 * total. Best-effort: any failure resolves to empty metadata so a malformed or
 * unreadable PDF never blocks the upload.
 */
export async function extractPdfMetadata(buffer: Buffer): Promise<PdfMetadata> {
  try {
    ensurePdfGlobals();
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getInfo();
      const info = (result.info ?? {}) as Record<string, unknown>;
      const rawTitle = typeof info.Title === "string" ? info.Title.trim() : "";
      const pages = result.total;
      return {
        title: rawTitle,
        pageCount: typeof pages === "number" && pages > 0 ? pages : null,
      };
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    // Non-fatal: a malformed/unreadable PDF still uploads and previews; only
    // its derived metadata is missing.
    const { logger } = await import("./logger");
    logger.warn({ err }, "PDF metadata extraction failed");
    return { title: "", pageCount: null };
  }
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const lower = filename.toLowerCase();

  if (
    lower.endsWith(".docx") ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (lower.endsWith(".pdf") || mimetype === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text ?? "").trim();
    } finally {
      await parser.destroy();
    }
  }

  if (lower.endsWith(".txt") || mimetype === "text/plain") {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a Word (.docx), PDF, or text file.",
  );
}
