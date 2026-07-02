import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import JSZip from "jszip";
import type { TemplateParagraph } from "@workspace/db";

const execFileAsync = promisify(execFile);

const DOCUMENT_PART = "word/document.xml";

/**
 * Matches a non-self-closing paragraph element and captures its inner XML.
 * Paragraphs never nest, so the first `</w:p>` always closes the current one.
 * Self-closing `<w:p/>` (empty) are intentionally not matched, which keeps the
 * paragraph index identical between extraction and re-application.
 */
const PARAGRAPH_RE = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
const TEXT_NODE_RE = /<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g;

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphText(innerXml: string): string {
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  TEXT_NODE_RE.lastIndex = 0;
  while ((m = TEXT_NODE_RE.exec(innerXml)) !== null) {
    parts.push(decodeXml(m[2]));
  }
  return parts.join("");
}

/** Read `word/document.xml` from a DOCX buffer. */
async function readDocumentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(DOCUMENT_PART);
  if (!file) throw new Error("DOCX is missing word/document.xml");
  return file.async("string");
}

/**
 * Extract the editable text units from a DOCX. The returned `id` is the
 * paragraph's position among matched paragraphs (index-stable), so the same id
 * can later target the same paragraph in the immutable clone. Only paragraphs
 * that contain a non-empty text node are returned (headings/empty spacers are
 * skipped from the editor, but still counted so indices stay aligned).
 */
export async function extractTemplateParagraphs(
  buffer: Buffer,
): Promise<TemplateParagraph[]> {
  const xml = await readDocumentXml(buffer);
  const out: TemplateParagraph[] = [];
  let index = -1;
  let m: RegExpExecArray | null;
  PARAGRAPH_RE.lastIndex = 0;
  while ((m = PARAGRAPH_RE.exec(xml)) !== null) {
    index++;
    const text = paragraphText(m[1]);
    if (!text.trim()) continue;
    out.push({ id: index, original: text, text });
  }
  return out;
}

/**
 * Replace the text of a single paragraph by rewriting only its `<w:t>` nodes:
 * the full new text goes into the first text node (with `xml:space="preserve"`),
 * and every other text node in the paragraph is emptied. Run properties
 * (`<w:rPr>`), paragraph properties (`<w:pPr>`), drawings and section
 * properties are never touched, so character/paragraph formatting of the first
 * run is preserved.
 */
function setParagraphText(paragraphXml: string, text: string): string {
  let replacedFirst = false;
  return paragraphXml.replace(TEXT_NODE_RE, (_full, attrs: string) => {
    const withSpace = /\bxml:space=/.test(attrs)
      ? attrs
      : `${attrs} xml:space="preserve"`;
    if (!replacedFirst) {
      replacedFirst = true;
      return `<w:t${withSpace}>${encodeXml(text)}</w:t>`;
    }
    return `<w:t${withSpace}></w:t>`;
  });
}

/**
 * Clone the original DOCX and apply edited text. Every part of the package
 * (styles, settings, media, headers, footers, numbering, theme, relationships,
 * `<w:sectPr>` with RTL/bidi) is preserved byte-for-byte; only the `<w:t>` text
 * of paragraphs whose value changed is rewritten.
 *
 * Byte-fidelity guarantee: `String.replace` returns every unedited paragraph
 * match unchanged and leaves all bytes outside paragraph matches untouched, so
 * nothing the user did not edit is ever altered — even exotic structures like
 * textboxes (nested `<w:p>`). Index alignment with `extractTemplateParagraphs`
 * is exact because both walk the identical `PARAGRAPH_RE` over the same
 * immutable clone bytes, yielding the same paragraph sequence. A reserializing
 * XML parser is deliberately avoided: it would normalize attribute order and
 * namespaces across the whole package and reduce fidelity.
 */
export async function applyTemplateEdits(
  buffer: Buffer,
  paragraphs: TemplateParagraph[] | null | undefined,
): Promise<Buffer> {
  const edits = new Map<number, string>();
  for (const p of paragraphs ?? []) {
    if (p.text !== p.original) edits.set(p.id, p.text);
  }
  if (edits.size === 0) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(DOCUMENT_PART);
  if (!file) throw new Error("DOCX is missing word/document.xml");
  const xml = await file.async("string");

  let index = -1;
  const updated = xml.replace(PARAGRAPH_RE, (full) => {
    index++;
    const text = edits.get(index);
    if (text === undefined) return full;
    return setParagraphText(full, text);
  });

  zip.file(DOCUMENT_PART, updated);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Convert a DOCX buffer to a target format (pdf, rtf, odt) using headless LibreOffice.
 */
export async function convertDocxToFormat(
  buffer: Buffer,
  format: "pdf" | "rtf" | "odt",
): Promise<Buffer> {
  const work = await mkdtemp(join(tmpdir(), `docx2${format}-`));
  const profile = join(work, "profile");
  const input = join(work, "input.docx");
  const output = join(work, `input.${format}`);
  try {
    await writeFile(input, buffer);

    let cmd = "soffice";
    if (process.platform === "win32") {
      const winPaths = [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      ];
      for (const p of winPaths) {
        if (existsSync(p)) {
          cmd = p;
          break;
        }
      }
    }

    await execFileAsync(
      cmd,
      [
        "--headless",
        "--norestore",
        "--nolockcheck",
        `-env:UserInstallation=file://${process.platform === "win32" ? profile.replace(/\\/g, "/") : profile}`,
        "--convert-to",
        format,
        "--outdir",
        work,
        input,
      ],
      { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 },
    );
    return await readFile(output);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/**
 * Convert a DOCX buffer to PDF using headless LibreOffice.
 */
export async function convertDocxToPdf(buffer: Buffer): Promise<Buffer> {
  return convertDocxToFormat(buffer, "pdf");
}
