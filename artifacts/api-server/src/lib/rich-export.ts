import { execSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import HTMLtoDOCX from "@turbodocx/html-to-docx";
import type { Project, Formatting, LayoutMetadata } from "@workspace/db";
import { downloadObjectToBuffer } from "./storage";
import amiriRegular from "../../assets/fonts/Amiri-Regular.ttf";
import amiriBold from "../../assets/fonts/Amiri-Bold.ttf";

function resolveChromium(): string {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;
  for (const bin of ["chromium", "chromium-browser", "google-chrome"]) {
    try {
      const found = execSync(`which ${bin}`, { encoding: "utf8" }).trim();
      if (found) return found;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    "Chromium executable not found for PDF export. Set PUPPETEER_EXECUTABLE_PATH.",
  );
}

function cmToTwip(cm: number): number {
  return Math.round(cm * 566.929);
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
    if (s.includes("/objects/")) srcs.add(s);
  }

  let out = html;
  for (const s of srcs) {
    try {
      const objectPath = s.replace(/^.*(\/objects\/)/, "/objects/");
      const { buffer, contentType } = await downloadObjectToBuffer(objectPath);
      const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
      out = out.split(`src="${s}"`).join(`src="${dataUri}"`);
    } catch {
      // leave the original reference untouched if download fails
    }
  }
  return out;
}

function coverHtml(layout: LayoutMetadata): string {
  if (layout.coverPageHtml && layout.coverPageHtml.trim()) {
    return layout.coverPageHtml;
  }
  const c = layout.cover;
  if (!c) return "";
  const line = (label: string | undefined) =>
    label ? `<p style="text-align:center;margin:6pt 0;">${label}</p>` : "";
  return [
    c.logoUrl
      ? `<p style="text-align:center;"><img src="${c.logoUrl}" style="max-height:120px;" /></p>`
      : "",
    c.university
      ? `<p style="text-align:center;font-weight:700;">${c.university}</p>`
      : "",
    line(c.faculty),
    line(c.department),
    c.title
      ? `<h1 style="text-align:center;margin-top:48pt;">${c.title}</h1>`
      : "",
    c.subtitle
      ? `<p style="text-align:center;font-style:italic;">${c.subtitle}</p>`
      : "",
    line(c.studentName),
    line(c.supervisor),
    line(c.degree),
    line(c.year),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Render a project's rich (TipTap) HTML content to a layout-preserving DOCX,
 * keeping cover page, headers/footers, page numbers, RTL direction, tables and
 * inline images. Images are embedded as base64 so the file is self-contained.
 */
export async function buildDocxFromRich(project: Project): Promise<Buffer> {
  const layout: LayoutMetadata = project.layoutMetadata ?? {};
  const f: Formatting = project.formatting;

  const inlined = await inlineStorageImages(project.richContent ?? "");
  const cover = await inlineStorageImages(coverHtml(layout));
  const body = cover
    ? `${cover}<br style="page-break-before: always;" />${inlined}`
    : inlined;

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
export async function buildPdfFromRich(project: Project): Promise<Buffer> {
  const layout: LayoutMetadata = project.layoutMetadata ?? {};
  const f: Formatting = project.formatting;

  const inlined = await inlineStorageImages(project.richContent ?? "");
  const cover = await inlineStorageImages(coverHtml(layout));
  const content = cover
    ? `<section class="cover">${cover}</section>${inlined}`
    : inlined;

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
    color: #000;
  }
  h1 { font-size: ${f.headingSize}pt; font-weight: 700; }
  h2 { font-size: ${f.subheadingSize}pt; font-weight: 700; }
  h3 { font-size: ${f.subheadingSize}pt; font-weight: 700; }
  p { margin: 0 0 10pt; text-align: justify; }
  img { max-width: 100%; height: auto; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #444; padding: 4pt 6pt; }
  .cover { break-after: page; page-break-after: always; }
</style>
</head>
<body>
${content}
</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: resolveChromium(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");

    const showPageNumbers = Boolean(layout.showPageNumbers);
    const headerHtml = layout.headerHtml?.trim() ? layout.headerHtml : "";
    const footerHtml = layout.footerHtml?.trim() ? layout.footerHtml : "";
    const pageNumberAlign = layout.pageNumberAlign ?? "center";
    const footerInner = showPageNumbers
      ? `${footerHtml}<span class="pageNumber"></span>`
      : footerHtml;
    const displayHeaderFooter = Boolean(
      headerHtml || footerHtml || showPageNumbers,
    );

    const pdf = await page.pdf({
      format: ps?.size === "Letter" ? "letter" : "a4",
      landscape: ps?.orientation === "landscape",
      printBackground: true,
      displayHeaderFooter,
      headerTemplate: headerHtml
        ? printTemplate(headerHtml, "center", marginLeft, marginRight)
        : "<div></div>",
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
    await browser.close();
  }
}
