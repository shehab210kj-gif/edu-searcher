import { execSync } from "node:child_process";
import fs from "node:fs";
import puppeteer, { Browser, Page } from "puppeteer";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import type { Formatting, LayoutMetadata } from "@workspace/db";
import { downloadObjectToBuffer } from "./storage";
import amiriRegular from "../../assets/fonts/Amiri-Regular.ttf";
import amiriBold from "../../assets/fonts/Amiri-Bold.ttf";

/**
 * Minimal structural input the rich exporters need. Both full projects and
 * library documents satisfy this shape, so either can be exported with the
 * same layout-preserving pipeline.
 */
export interface RichExportInput {
  title: string;
  richContent: string | null;
  layoutMetadata: LayoutMetadata | null;
  formatting: Formatting;
}

function resolveChromium(): string | undefined {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;

  if (process.platform === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  const searchCmd = process.platform === "win32" ? "where" : "which";
  for (const bin of ["chromium", "chromium-browser", "google-chrome", "chrome"]) {
    try {
      const found = execSync(`${searchCmd} ${bin}`, { encoding: "utf8" }).trim();
      if (found) {
        return process.platform === "win32" ? found.split("\r\n")[0].split("\n")[0].trim() : found;
      }
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

function cmToTwip(cm: number): number {
  return Math.round(cm * 566.929);
}

function normalizeWikipediaUrl(url: string): string {
  if (url.includes("upload.wikimedia.org") && url.includes("/thumb/")) {
    const match = /\/(\d+)px-/i.exec(url);
    if (match) {
      const size = parseInt(match[1]);
      const allowedSizes = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];
      if (!allowedSizes.includes(size)) {
        return url.replace(/\/\d+px-/i, "/250px-");
      }
    }
  }
  return url;
}

/**
 * Replace storage-backed `<img src>` references with inline base64 data URIs so
 * exported documents are self-contained and never depend on a live server.
 * Storage paths look like `/api/storage/objects/...` or `/objects/...`.
 */
export async function inlineStorageImages(html: string): Promise<string> {
  const srcs = new Set<string>();
  const re = /src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const s = m[1];
    if (s.startsWith("data:")) continue;
    if (s.includes("/objects/") || s.startsWith("http://") || s.startsWith("https://")) {
      srcs.add(s);
    }
  }

  let out = html;
  for (const s of srcs) {
    try {
      if (s.includes("/objects/")) {
        const objectPath = s.replace(/^.*(\/objects\/)/, "/objects/");
        const { buffer, contentType } = await downloadObjectToBuffer(objectPath);
        const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
        out = out.split(`src="${s}"`).join(`src="${dataUri}"`);
      } else if (s.startsWith("http://") || s.startsWith("https://")) {
        const targetUrl = normalizeWikipediaUrl(s);
        const res = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SalaamAlaikumExporter/1.0"
          },
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "image/png";
          if (contentType.startsWith("image/")) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
            out = out.split(`src="${s}"`).join(`src="${dataUri}"`);
          }
        }
      }
    } catch {
      // leave the original reference untouched if download fails
    }
  }
  return out;
}

function getEnglishUniversity(arabicName: string): string {
  const mapping: Record<string, string> = {
    "جامعة الملك سعود": "King Saud University",
    "جامعة أم القرى": "Umm Al-Qura University",
    "جامعة الملك عبدالعزيز": "King Abdulaziz University",
    "جامعة الملك فيصل": "King Faisal University",
    "جامعة الإمام محمد بن سعود": "Imam Mohammad Ibn Saud Islamic University",
    "جامعة الأمير سطام": "Prince Sattam bin Abdulaziz University",
    "جامعة طيبة": "Taibah University",
    "جامعة القصيم": "Qassim University",
  };
  const trimmed = (arabicName || "").trim();
  return mapping[trimmed] || trimmed;
}

function coverHtml(layout: LayoutMetadata, forDocx = false): string {
  if (layout.coverPageHtml && layout.coverPageHtml.trim()) {
    if (!forDocx || layout.isCustomTemplateCover) {
      return layout.coverPageHtml;
    }
  }
  const c = layout.cover;
  if (!c) return "";

  const uniNameAr = c.university || "جامعة الملك سعود";
  const uniNameEn = getEnglishUniversity(uniNameAr);

  const arL1 = layout.arabicHeader1 || "المملكة العربية السعودية";
  const arL2 = layout.arabicHeader2 || "وزارة التعليم";
  const arL3 = layout.arabicHeader3 || uniNameAr;
  const enL1 = layout.englishHeader1 || "Kingdom of Saudi Arabia";
  const enL2 = layout.englishHeader2 || "Ministry of Education";
  const enL3 = layout.englishHeader3 || uniNameEn;

  const alignClass = layout.detailsAlign || "center";
  const dVertical = layout.detailsVertical || "bottom";
  const tPosition = layout.titlePosition || "center";

  const logoHtml = c.logoUrl 
    ? `<img src="${c.logoUrl}" style="max-height:90px; max-width:90px;" />` 
    : `<div style="height:90px; width:90px;"></div>`;

  const headerTable = `
    <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 24pt;">
      <tr style="border: none;">
        <td style="width: 38%; border: none; text-align: right; vertical-align: top; font-family: 'Amiri', serif; font-size: 11pt; padding: 0; line-height: 1.4;">
          ${arL1}<br/>
          ${arL2}<br/>
          ${arL3}
          ${c.faculty ? `<br/>كلية ${c.faculty}` : ''}
          ${c.department ? `<br/>قسم ${c.department}` : ''}
        </td>
        <td style="width: 24%; border: none; text-align: center; vertical-align: middle; padding: 0;">
          ${logoHtml}
        </td>
        <td style="width: 38%; border: none; text-align: left; vertical-align: top; font-family: 'Amiri', serif; font-size: 11pt; padding: 0; line-height: 1.4; direction: ltr;">
          ${enL1}<br/>
          ${enL2}<br/>
          ${enL3}
          ${c.faculty ? `<br/>Faculty of ${c.faculty}` : ''}
          ${c.department ? `<br/>Department of ${c.department}` : ''}
        </td>
      </tr>
    </table>
  `;

  const titleBlock = c.title
    ? `<h1 style="text-align:center; margin-top:50pt; font-size:24pt; font-weight:bold; border:none; background:none; padding:0; color:black;">${c.title}</h1>`
    : "";

  const subtitleBlock = c.subtitle
    ? `<p style="text-align:center; font-size:14pt; font-style:italic; margin-top:12pt; margin-bottom:40pt;">${c.subtitle}</p>`
    : "";

  const detailsBlock = `<div style="margin-top: 40pt; text-align: ${alignClass}; font-size: 14pt; line-height: 2.0; font-family: 'Amiri', serif;">
      ${c.studentName ? `<p>إعداد الطالب/الطالبة: <strong>${c.studentName}</strong></p>` : ""}
      ${(c as any).studentId ? `<p>الرقم الجامعي: <strong>${(c as any).studentId}</strong></p>` : ""}
      ${(c as any).section ? `<p>الشعبة: <strong>${(c as any).section}</strong></p>` : ""}
      ${c.supervisor ? `<p>إشراف الدكتور/الأستاذ: <strong>${c.supervisor}</strong></p>` : ""}
      ${(c as any).fieldSupervisor ? `<p>المشرف الميداني: <strong>${(c as any).fieldSupervisor}</strong></p>` : ""}
      ${(c as any).courseName ? `<p>المقرر: <strong>${(c as any).courseName}</strong></p>` : ""}
      ${(c as any).trainingAgency ? `<p>جهة التدريب: <strong>${(c as any).trainingAgency}</strong></p>` : ""}
      ${c.year ? `<p>العام الجامعي: <strong>${c.year}</strong></p>` : ""}
    </div>`;

  let lines: string[] = [];
  lines.push(headerTable);

  if (dVertical === "top") {
    lines.push(detailsBlock);
    lines.push(titleBlock);
    lines.push(subtitleBlock);
  } else if (dVertical === "center") {
    if (tPosition === "top") {
      lines.push(titleBlock);
      lines.push(subtitleBlock);
      lines.push(detailsBlock);
    } else {
      lines.push(detailsBlock);
      lines.push(titleBlock);
      lines.push(subtitleBlock);
    }
  } else {
    // details at bottom
    if (tPosition === "top") {
      lines.push(titleBlock);
      lines.push(subtitleBlock);
      lines.push(detailsBlock);
    } else {
      lines.push(titleBlock);
      lines.push(subtitleBlock);
      lines.push(detailsBlock);
    }
  }

  return lines.filter(Boolean).join("\n");
}

function generateRichIndexes(html: string): { toc: string; tables: string; figures: string } {
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  const headings: { level: number; text: string }[] = [];
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (text) {
      headings.push({ level: parseInt(match[1]), text });
    }
  }

  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: string[] = [];
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const captionMatch = /<caption[^>]*>(.*?)<\/caption>/i.exec(tableMatch[1]);
    if (captionMatch) {
      tables.push(captionMatch[1].replace(/<[^>]*>/g, "").trim());
    } else {
      tables.push(`جدول رقم ${tables.length + 1}`);
    }
  }

  const imgRegex = /<img[^>]*alt="([^"]+)"/gi;
  const figures: string[] = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    figures.push(imgMatch[1].trim());
  }

  let tocHtml = `<div class="toc-section" style="direction:rtl;margin-bottom:12pt;">
    <h2 style="text-align:center;font-weight:bold;margin-bottom:10pt;">فهرس المحتويات</h2>
    <ul style="list-style:none;padding:0;margin:0;">`;
  headings.forEach(h => {
    const indent = (h.level - 1) * 20;
    tocHtml += `<li style="padding-right:${indent}px;margin-bottom:2.5pt;display:flex;justify-content:space-between;border-bottom:1px dotted #ccc;">
      <span style="background:#fff;padding-left:4px;">${h.text}</span>
    </li>`;
  });
  tocHtml += `</ul></div>`;

  let tablesHtml = "";
  if (tables.length > 0) {
    tablesHtml = `<div class="tables-index-section" style="direction:rtl;margin-bottom:12pt;">
      <h2 style="text-align:center;font-weight:bold;margin-bottom:10pt;">فهرس الجداول</h2>
      <ul style="list-style:none;padding:0;margin:0;">`;
    tables.forEach((t, idx) => {
      tablesHtml += `<li style="margin-bottom:2.5pt;display:flex;justify-content:space-between;border-bottom:1px dotted #ccc;">
        <span style="background:#fff;padding-left:4px;">جدول (${idx + 1}): ${t}</span>
      </li>`;
    });
    tablesHtml += `</ul></div>`;
  }

  let figuresHtml = "";
  if (figures.length > 0) {
    figuresHtml = `<div class="figures-index-section" style="direction:rtl;margin-bottom:12pt;">
      <h2 style="text-align:center;font-weight:bold;margin-bottom:10pt;">فهرس الأشكال والصور</h2>
      <ul style="list-style:none;padding:0;margin:0;">`;
    figures.forEach((f, idx) => {
      figuresHtml += `<li style="margin-bottom:2.5pt;display:flex;justify-content:space-between;border-bottom:1px dotted #ccc;">
        <span style="background:#fff;padding-left:4px;">شكل (${idx + 1}): ${f}</span>
      </li>`;
    });
    figuresHtml += `</ul></div>`;
  }

  return { toc: tocHtml, tables: tablesHtml, figures: figuresHtml };
}

/**
 * Render a project's rich (TipTap) HTML content to a layout-preserving DOCX,
 * keeping cover page, headers/footers, page numbers, RTL direction, tables and
 * inline images. Images are embedded as base64 so the file is self-contained.
 */
function styleHtmlForDocx(html: string, f: Formatting, borderColor: string): string {
  let styled = html;
  
  styled = styled.replace(/<(h1|h2|h3|p)\b[^>]*>/gi, (match, tag) => {
    if (match.includes('class="reference"') || match.includes("reference")) {
      return `<p style="font-size:${f.fontSize}pt;line-height:${f.lineSpacing};text-align:left;font-family:${f.fontFamily};margin:0 0 8pt;padding-left:36pt;text-indent:-36pt;direction:ltr;">`;
    }
    
    switch (tag.toLowerCase()) {
      case "h1":
        return `<h1 style="text-align:center;font-weight:bold;font-size:${f.headingSize}pt;color:${borderColor};margin:24pt 0 12pt;font-family:${f.fontFamily};">`;
      case "h2":
        return `<h2 style="font-weight:bold;font-size:${f.subheadingSize}pt;color:${borderColor};border-right:4pt solid ${borderColor};padding-right:10pt;margin:18pt 0 10pt;font-family:${f.fontFamily};">`;
      case "h3":
        return `<h3 style="font-weight:bold;font-size:${Math.max(f.subheadingSize - 2, 12)}pt;color:${borderColor};margin:12pt 0 8pt;font-family:${f.fontFamily};">`;
      case "p":
      default:
        return `<p style="font-size:${f.fontSize}pt;line-height:${f.lineSpacing};text-align:${f.paragraphAlign || 'justify'};font-family:${f.fontFamily};margin:0 0 10pt;text-indent:36pt;">`;
    }
  });

  return styled;
}

export async function buildDocxFromRich(
  project: RichExportInput,
): Promise<Buffer> {
  const layout: LayoutMetadata = project.layoutMetadata ?? {};
  const f: Formatting = project.formatting;
  const borderColor = layout.borderColor ?? "#1B4FA3";

  const inlined = await inlineStorageImages(project.richContent ?? "");
  const cover = await inlineStorageImages(coverHtml(layout, true));
  
  const indexes = generateRichIndexes(project.richContent ?? "");
  const indexesHtml = `${indexes.toc}${indexes.tables ? `<br style="page-break-before: always;" />${indexes.tables}` : ""}${indexes.figures ? `<br style="page-break-before: always;" />${indexes.figures}` : ""}`;

  const styledBody = styleHtmlForDocx(inlined, f, borderColor);
  const styledIndexes = styleHtmlForDocx(indexesHtml, f, borderColor);

  let body = styledBody;
  if (cover) {
    body = `${cover}<br style="page-break-before: always;" />${styledIndexes}<br style="page-break-before: always;" />${styledBody}`;
  } else {
    body = `${styledIndexes}<br style="page-break-before: always;" />${styledBody}`;
  }

  const margins = layout.pageSetup
    ? {
        top: cmToTwip(layout.pageSetup.marginTop ?? f.marginTop),
        bottom: cmToTwip(layout.pageSetup.marginBottom ?? f.marginBottom),
        left: cmToTwip(layout.pageSetup.marginLeft ?? f.marginLeft),
        right: cmToTwip(layout.pageSetup.marginRight ?? f.marginRight),
      }
    : {
        top: cmToTwip(f.marginTop),
        bottom: cmToTwip(f.marginBottom),
        left: cmToTwip(f.marginLeft),
        right: cmToTwip(f.marginRight),
      };

  const headerHtml = layout.headerHtml?.trim() ? layout.headerHtml : null;
  const footerHtml = layout.footerHtml?.trim() ? layout.footerHtml : null;

  const result = await HTMLtoDOCX(
    `<!DOCTYPE html><html lang="ar" dir="rtl"><body>${body}</body></html>`,
    headerHtml,
    {
      orientation:
        layout.pageSetup?.orientation === "landscape" ? "landscape" : "portrait",
      margins,
      direction: "rtl",
      lang: "ar-SA",
      font: f.fontFamily,
      fontSize: f.fontSize * 2,
      title: project.title,
      header: Boolean(headerHtml),
      footer: Boolean(footerHtml) || Boolean(layout.showPageNumbers),
      pageNumber: Boolean(layout.showPageNumbers),
    },
    footerHtml,
  );

  if (Buffer.isBuffer(result)) return result;
  if (result instanceof ArrayBuffer) return Buffer.from(result);
  return Buffer.from(await (result as Blob).arrayBuffer());
}

/**
 * Wrap header/footer markup for Puppeteer's print templates. These templates
 * render in a separate document context (no page CSS/fonts), so every style
 * must be inline and explicit, and side padding must mirror the page margins.
 */
function printTemplate(
  inner: string,
  align: string,
  marginLeft: number,
  marginRight: number,
): string {
  return `<div style="width:100%;font-size:9pt;direction:rtl;text-align:${align};padding:0 ${marginRight}cm 0 ${marginLeft}cm;-webkit-print-color-adjust:exact;">${inner}</div>`;
}

/**
 * Render a project's rich HTML content to a layout-preserving PDF using headless
 * Chromium, reusing the bundled Amiri font for correct Arabic shaping/RTL.
 * Cover page, headers/footers and page numbers are preserved.
 */
class BrowserManager {
  private static instance: Browser | null = null;
  private static isLaunching = false;

  public static async getBrowser(): Promise<Browser> {
    if (this.instance) {
      try {
        await this.instance.target();
        return this.instance;
      } catch (err) {
        console.warn("Pooled browser is unresponsive, restarting...", err);
        await this.closeBrowser();
      }
    }

    if (this.isLaunching) {
      for (let i = 0; i < 50; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (this.instance) return this.instance;
      }
    }

    const executablePath = resolveChromium();
    this.isLaunching = true;
    try {
      this.instance = await puppeteer.launch({
        ...(executablePath ? { executablePath } : {}),
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      });
      this.instance.on("disconnected", () => {
        this.instance = null;
      });
      return this.instance;
    } finally {
      this.isLaunching = false;
    }
  }

  public static async closeBrowser(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.close();
      } catch {}
      this.instance = null;
    }
  }
}

async function renderPdf(project: RichExportInput): Promise<Buffer> {
  const layout: LayoutMetadata = project.layoutMetadata ?? {};
  const f: Formatting = project.formatting;
  const borderColor = layout.borderColor ?? "#1B4FA3";
  const showPageBorder = layout.showPageBorder !== false;

  const inlined = await inlineStorageImages(project.richContent ?? "");
  const cover = await inlineStorageImages(coverHtml(layout));
  
  const indexes = generateRichIndexes(project.richContent ?? "");
  const indexesHtml = `<section class="toc">${indexes.toc}</section>` +
    (indexes.tables ? `<section class="tables-index">${indexes.tables}</section>` : "") +
    (indexes.figures ? `<section class="figures-index">${indexes.figures}</section>` : "");

  const content = cover
    ? `<section class="cover">${cover}</section>${indexesHtml}${inlined}`
    : `${indexesHtml}${inlined}`;

  const ps = layout.pageSetup;
  const marginTop = ps?.marginTop ?? f.marginTop;
  const marginBottom = ps?.marginBottom ?? f.marginBottom;
  const marginLeft = ps?.marginLeft ?? f.marginLeft;
  const marginRight = ps?.marginRight ?? f.marginRight;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: "Amiri";
    font-style: normal;
    font-weight: 400;
    src: url(data:font/ttf;base64,${amiriRegular}) format("truetype");
  }
  @font-face {
    font-family: "Amiri";
    font-style: normal;
    font-weight: 700;
    src: url(data:font/ttf;base64,${amiriBold}) format("truetype");
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; direction: rtl; }
  body {
    font-family: "Amiri", serif;
    font-size: ${f.fontSize}pt;
    line-height: ${f.lineSpacing};
    color: #1a1a2e;
  }

  .cover {
    height: 22.0cm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
    break-after: page;
  }
  .cover h1 {
    background: none !important;
    color: #1a1a1a !important;
    padding: 0 !important;
    border: none !important;
    margin: 0 auto 14pt !important;
    font-weight: 800 !important;
    text-align: center !important;
    border-radius: 0 !important;
  }
  .cover p {
    text-align: center !important;
    margin: 0 auto 10pt !important;
  }

  h1 {
    font-size: ${f.headingSize}pt;
    font-weight: 800;
    color: #ffffff;
    background: ${borderColor};
    border-radius: 6pt;
    padding: 8pt 20pt;
    text-align: center;
    margin: 24pt 0 18pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h2 {
    font-size: ${f.subheadingSize}pt;
    font-weight: 700;
    color: ${borderColor};
    border-right: 4pt solid ${borderColor};
    padding-right: 10pt;
    margin: 18pt 0 10pt;
    background: linear-gradient(90deg, rgba(27,79,163,0.06), transparent);
    padding-top: 4pt;
    padding-bottom: 4pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h3 {
    font-size: ${Math.max(f.subheadingSize - 2, 12)}pt;
    font-weight: 700;
    color: ${borderColor};
    margin: 14pt 0 8pt;
    border-bottom: 1pt solid rgba(27,79,163,0.25);
    padding-bottom: 4pt;
  }
  h4 { font-size: ${Math.max(f.fontSize + 1, 12)}pt; font-weight: 700; color: #1a3a6b; margin: 12pt 0 6pt; }

  p { margin: 0 0 10pt; text-align: ${f.paragraphAlign ?? 'justify'}; color: #1a1a2e; }

  img { max-width: 100%; height: auto; }

  table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  thead th {
    background: ${borderColor};
    color: #ffffff;
    font-weight: 700;
    padding: 7pt 8pt;
    border: 1pt solid ${borderColor};
    text-align: center;
    font-size: ${Math.max(f.fontSize - 1, 10)}pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  td {
    border: 1pt solid #C0C8D8;
    padding: 5pt 7pt;
    text-align: right;
    font-size: ${Math.max(f.fontSize - 1, 10)}pt;
  }
  tr:nth-child(even) td { background: rgba(27,79,163,0.04); }

  blockquote {
    border-right: 4pt solid ${borderColor};
    background: rgba(27,79,163,0.05);
    padding: 10pt 16pt;
    margin: 12pt 0;
    font-style: italic;
    color: #3a3a5e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover, .toc, .tables-index, .figures-index { break-after: page; page-break-after: always; }

  .toc-section h2 {
    color: #ffffff;
    background: ${borderColor};
    border-radius: 6pt;
    padding: 6pt 16pt;
    text-align: center;
    border-right: none;
    font-size: ${f.headingSize - 1}pt;
    margin-bottom: 12pt;
  }
  .toc-section ul { list-style: none; padding: 0; margin: 0; }
  .toc-section li {
    display: flex;
    justify-content: space-between;
    border-bottom: 1pt dotted ${borderColor};
    padding: 2.5pt 0;
    color: ${borderColor};
    font-weight: 500;
    font-size: ${Math.max(f.fontSize - 1, 10.5)}pt;
    line-height: 1.4;
  }
  .toc-section li span { background: #fff; padding-left: 4px; }

  .page-num-hex {
    display: inline-block;
    background: ${borderColor};
    color: white;
    padding: 4pt 12pt;
    clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%);
    font-size: 10pt;
    font-weight: 700;
    min-width: 30pt;
    text-align: center;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  strong { color: ${borderColor}; font-weight: 700; }
  em { color: #1B5E3B; font-style: italic; }
</style>
</head>
<body>
${content}
</body>
</html>`;

  const browser = await BrowserManager.getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");

    const showPageNumbers = Boolean(layout.showPageNumbers);
    const headerHtml = layout.headerHtml?.trim() ? layout.headerHtml : "";
    const footerHtml = layout.footerHtml?.trim() ? layout.footerHtml : "";
    const pageNumberAlign = layout.pageNumberAlign ?? "center";
    const footerInner = showPageNumbers
      ? `${footerHtml}<span class="pageNumber"></span>`
      : footerHtml;

    const displayHeaderFooter = Boolean(
      headerHtml || footerHtml || showPageNumbers || showPageBorder,
    );

    const isLetter = ps?.size === "Letter";
    const pageWidth = isLetter ? 21.59 : 21.0;
    const pageHeight = isLetter ? 27.94 : 29.7;

    const borderHtml = showPageBorder
      ? `<div style="position: absolute; top: 0.4cm; left: 0.4cm; width: ${pageWidth - 0.8}cm; height: ${pageHeight - 0.8}cm; border: 3pt solid ${borderColor}; box-sizing: border-box; pointer-events: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; z-index: 9999;"></div>
         <div style="position: absolute; top: 0.7cm; left: 0.7cm; width: ${pageWidth - 1.4}cm; height: ${pageHeight - 1.4}cm; border: 0.8pt solid ${borderColor}; box-sizing: border-box; pointer-events: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; z-index: 9999;"></div>`
      : "";

    const finalHeaderTemplate = `
      <div style="font-size: 8pt; width: 100%; height: 100%; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
        ${borderHtml}
        ${headerHtml ? printTemplate(headerHtml, "center", marginLeft, marginRight) : "<div></div>"}
      </div>
    `;

    const pdf = await page.pdf({
      format: isLetter ? "letter" : "a4",
      landscape: ps?.orientation === "landscape",
      printBackground: true,
      displayHeaderFooter,
      headerTemplate: finalHeaderTemplate,
      footerTemplate: footerInner
        ? printTemplate(footerInner, pageNumberAlign, marginLeft, marginRight)
        : "<div></div>",
      margin: {
        top: `${marginTop}cm`,
        bottom: `${marginBottom}cm`,
        left: `${marginLeft}cm`,
        right: `${marginRight}cm`,
      },
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function buildPdfFromRich(
  project: RichExportInput,
  retries = 2
): Promise<Buffer> {
  let attempt = 0;
  while (true) {
    try {
      return await renderPdf(project);
    } catch (err) {
      attempt++;
      if (attempt > retries) {
        throw err;
      }
      console.warn(`PDF generation failed (attempt ${attempt}/${retries + 1}), retrying...`, err);
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}
