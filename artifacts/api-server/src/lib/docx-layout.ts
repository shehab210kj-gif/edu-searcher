import JSZip from "jszip";
import type { LayoutMetadata } from "@workspace/db";

const TWIPS_PER_CM = 566.929133858;

function twipsToCm(twips: number): number {
  return Math.round((twips / TWIPS_PER_CM) * 100) / 100;
}

function extractParagraphText(xml: string): string[] {
  const paras: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(xml)) !== null) {
    const runs: string[] = [];
    const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(m[1])) !== null) {
      runs.push(decodeXml(tm[1]));
    }
    const text = runs.join("").trim();
    if (text) paras.push(text);
  }
  return paras;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function hasPageField(xml: string): boolean {
  return /\bPAGE\b/.test(xml) && /fld|instrText/i.test(xml);
}

function buildHtmlFromParas(paras: string[]): string {
  return paras
    .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
    .join("");
}

/**
 * Best-effort extraction of document-level layout from a DOCX: page size,
 * orientation, margins, and header/footer content (incl. page-number detection).
 * Never throws — on any parse failure it returns an empty object so import
 * always succeeds and the caller can fall back to defaults.
 */
export async function extractDocxLayout(
  buffer: Buffer,
): Promise<LayoutMetadata> {
  const layout: LayoutMetadata = {};
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) return layout;

    const sectPrMatches = documentXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g);
    const sectPr = sectPrMatches?.[sectPrMatches.length - 1] ?? "";

    const pgSz = sectPr.match(/<w:pgSz\b([^>]*)\/?>/);
    if (pgSz) {
      const w = Number(pgSz[1].match(/w:w="(\d+)"/)?.[1] ?? 0);
      const orient = pgSz[1].match(/w:orient="(\w+)"/)?.[1];
      layout.pageSetup = layout.pageSetup ?? {};
      layout.pageSetup.orientation =
        orient === "landscape" ? "landscape" : "portrait";
      layout.pageSetup.size = w > 12000 ? "Letter" : "A4";
    }

    const pgMar = sectPr.match(/<w:pgMar\b([^>]*)\/?>/);
    if (pgMar) {
      const attr = pgMar[1];
      const top = Number(attr.match(/w:top="(-?\d+)"/)?.[1] ?? 0);
      const bottom = Number(attr.match(/w:bottom="(-?\d+)"/)?.[1] ?? 0);
      const left = Number(attr.match(/w:left="(-?\d+)"/)?.[1] ?? 0);
      const right = Number(attr.match(/w:right="(-?\d+)"/)?.[1] ?? 0);
      layout.pageSetup = layout.pageSetup ?? {};
      if (top) layout.pageSetup.marginTop = twipsToCm(top);
      if (bottom) layout.pageSetup.marginBottom = twipsToCm(bottom);
      if (left) layout.pageSetup.marginLeft = twipsToCm(left);
      if (right) layout.pageSetup.marginRight = twipsToCm(right);
    }

    // Resolve header/footer parts via relationships.
    const relsXml =
      (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
    const relMap = new Map<string, string>();
    const relRegex = /<Relationship\b([^>]*)\/?>/g;
    let rm: RegExpExecArray | null;
    while ((rm = relRegex.exec(relsXml)) !== null) {
      const id = rm[1].match(/Id="([^"]+)"/)?.[1];
      const target = rm[1].match(/Target="([^"]+)"/)?.[1];
      if (id && target) relMap.set(id, target.replace(/^\//, ""));
    }

    const headerIds = [...sectPr.matchAll(/<w:headerReference\b([^>]*)\/?>/g)]
      .map((x) => x[1].match(/r:id="([^"]+)"/)?.[1])
      .filter((x): x is string => Boolean(x));
    const footerIds = [...sectPr.matchAll(/<w:footerReference\b([^>]*)\/?>/g)]
      .map((x) => x[1].match(/r:id="([^"]+)"/)?.[1])
      .filter((x): x is string => Boolean(x));

    let headerHtml = "";
    let pageNumbersInHeader = false;
    for (const id of headerIds) {
      const target = relMap.get(id);
      if (!target) continue;
      const xml = await zip.file(`word/${target}`)?.async("string");
      if (!xml) continue;
      if (hasPageField(xml)) pageNumbersInHeader = true;
      const html = buildHtmlFromParas(extractParagraphText(xml));
      if (html && !headerHtml) headerHtml = html;
    }

    let footerHtml = "";
    let pageNumbersInFooter = false;
    for (const id of footerIds) {
      const target = relMap.get(id);
      if (!target) continue;
      const xml = await zip.file(`word/${target}`)?.async("string");
      if (!xml) continue;
      if (hasPageField(xml)) pageNumbersInFooter = true;
      const html = buildHtmlFromParas(extractParagraphText(xml));
      if (html && !footerHtml) footerHtml = html;
    }

    if (headerHtml) layout.headerHtml = headerHtml;
    if (footerHtml) layout.footerHtml = footerHtml;
    if (pageNumbersInHeader || pageNumbersInFooter) {
      layout.showPageNumbers = true;
      layout.pageNumberAlign = "center";
      layout.pageNumberFormat = "{page}";
    }
  } catch {
    return {};
  }
  return layout;
}
