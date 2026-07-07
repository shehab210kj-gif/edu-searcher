import mammoth from "mammoth";
import type { LayoutMetadata } from "@workspace/db";
import { uploadBuffer } from "./storage";
import { extractDocxLayout } from "./docx-layout";
import { gemini, GEMINI_MODEL } from "./gemini";

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

export async function extractOcrText(buffer: Buffer, mimetype: string): Promise<string> {
  if (!gemini) {
    throw new Error("Gemini AI API key is not configured for OCR/Image processing.");
  }
  
  try {
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: mimetype,
          },
        },
        "أنت قارئ نصوص ضوئي (OCR) محترف ومختص باللغتين العربية والإنجليزية. استخرج واكتب جميع النصوص والبيانات المكتوبة في هذا المستند/الصورة بدقة متناهية وبدون حذف أي كلمة. حافظ على نفس التنسيق والفقرات وقوائم النقاط، ولا تضف أي تعليقات أو شروحات إضافية خارج النص المستخرج.",
      ],
    });
    
    return response.text?.trim() || "";
  } catch (err) {
    const { logger } = await import("./logger");
    logger.error({ err }, "OCR extraction via Gemini failed");
    throw new Error("فشل استخراج النص من الصورة/المستند الممسوح ضوئياً.");
  }
}

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const lower = filename.toLowerCase();

  // 1. DOCX text extraction
  if (
    lower.endsWith(".docx") ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // 2. PDF text extraction (with fallback to Gemini OCR if scanned/empty)
  if (lower.endsWith(".pdf") || mimetype === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    let text = "";
    try {
      const result = await parser.getText();
      text = (result.text ?? "").trim();
    } catch (parseErr) {
      const { logger } = await import("./logger");
      logger.warn({ parseErr }, "pdf-parse failed, will fallback to Gemini OCR");
    } finally {
      await parser.destroy();
    }

    // If PDF text is extremely short or empty, it's likely a scanned PDF image or has complex vector layers.
    // We fall back to Gemini PDF OCR which is extremely powerful.
    if (text.length < 100) {
      const { logger } = await import("./logger");
      logger.info("PDF text layer is empty or too short. Falling back to Gemini OCR for scanned PDF.");
      return await extractOcrText(buffer, "application/pdf");
    }

    return text;
  }

  // 3. Plain Text extraction
  if (lower.endsWith(".txt") || mimetype === "text/plain") {
    return buffer.toString("utf-8").trim();
  }

  // 4. Image OCR (PNG, JPG, JPEG, WEBP, BMP)
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".bmp") ||
    mimetype.startsWith("image/")
  ) {
    let resolvedMimetype = mimetype;
    if (!mimetype.startsWith("image/")) {
      if (lower.endsWith(".png")) resolvedMimetype = "image/png";
      else if (lower.endsWith(".webp")) resolvedMimetype = "image/webp";
      else if (lower.endsWith(".bmp")) resolvedMimetype = "image/bmp";
      else resolvedMimetype = "image/jpeg";
    }
    return await extractOcrText(buffer, resolvedMimetype);
  }

  throw new Error(
    "Unsupported file type. Please upload a Word (.docx), PDF, text file, or image (.png, .jpg, .jpeg, .webp).",
  );
}
