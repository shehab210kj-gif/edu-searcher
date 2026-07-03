import { execSync } from "node:child_process";
import fs from "node:fs";
import puppeteer from "puppeteer";
import type { Project, Formatting } from "@workspace/db";
import {
  buildFormattedDocument,
  type FormattedBlock,
  type InlineRun,
} from "./format-pipeline";
import amiriRegular from "../../assets/fonts/Amiri-Regular.ttf";
import amiriBold from "../../assets/fonts/Amiri-Bold.ttf";

function resolveChromium(): string {
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
  throw new Error(
    "Chromium executable not found for PDF export. Set PUPPETEER_EXECUTABLE_PATH.",
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRuns(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      const styles: string[] = [];
      if (run.bold) styles.push("font-weight:700");
      if (run.italic) styles.push("font-style:italic");
      const attr = styles.length ? ` style="${styles.join(";")}"` : "";
      return `<span${attr}>${escapeHtml(run.text)}</span>`;
    })
    .join("");
}

function renderBlock(block: FormattedBlock): string {
  const inner = renderRuns(block.runs);
  switch (block.style) {
    case "Title":
      return `<h1 class="doc-title">${inner}</h1>`;
    case "Heading1":
      return `<h2 class="h1">${inner}</h2>`;
    case "Heading2":
      return `<h3 class="h2">${inner}</h3>`;
    case "ReferencesHeading":
      return `<h2 class="h1 refs-heading">${inner}</h2>`;
    case "Reference":
      return `<p class="reference">${inner}</p>`;
    case "Body":
    default:
      return `<p class="body">${inner}</p>`;
  }
}

function alignment(value: string): string {
  switch (value) {
    case "center":
      return "center";
    case "right":
      return "right";
    case "left":
      return "left";
    default:
      return "justify";
  }
}

function buildHtml(blocks: FormattedBlock[], f: Formatting): string {
  const body = blocks.map(renderBlock).join("\n");
  const bodyAlign = alignment(f.paragraphAlign);

  return `<!DOCTYPE html>
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
  html, body {
    margin: 0;
    padding: 0;
    direction: rtl;
  }
  body {
    font-family: "Amiri", serif;
    font-size: ${f.fontSize}pt;
    line-height: ${f.lineSpacing};
    color: #000;
  }
  .doc-title {
    text-align: center;
    font-weight: 700;
    font-size: ${f.headingSize}pt;
    margin: 0 0 24pt;
    line-height: ${f.lineSpacing};
  }
  .h1 {
    text-align: right;
    font-weight: 700;
    font-size: ${f.headingSize}pt;
    margin: 18pt 0 10pt;
    line-height: ${f.lineSpacing};
  }
  .h2 {
    text-align: right;
    font-weight: 700;
    font-size: ${f.subheadingSize}pt;
    margin: 12pt 0 8pt;
    line-height: ${f.lineSpacing};
  }
  .refs-heading {
    break-before: page;
    page-break-before: always;
  }
  .body {
    text-align: ${bodyAlign};
    margin: 0 0 10pt;
    text-indent: ${f.firstLineIndent}cm;
    line-height: ${f.lineSpacing};
  }
  .reference {
    text-align: justify;
    margin: 0 0 8pt;
    padding-inline-start: 1.27cm;
    text-indent: -1.27cm;
    line-height: ${f.lineSpacing};
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Render a project to PDF.
 *
 * Reuses the same two-stage formatting pipeline as the DOCX export
 * (`buildFormattedDocument`) so the PDF and DOCX share identical content,
 * structure, and ordering. The cleaned blocks are mapped to HTML/CSS that
 * mirrors the DOCX named styles (Title/Heading 1/Heading 2/Body/Reference,
 * margins, line spacing, first-line and hanging indents) and rendered by
 * headless Chromium, which handles Arabic shaping, bidi, and RTL correctly.
 * The Amiri Arabic font is embedded so rendering never depends on system fonts.
 */
export async function buildPdf(project: Project): Promise<Buffer> {
  const formatted = buildFormattedDocument(project);
  const f = formatted.formatting;
  const html = buildHtml(formatted.blocks, f);

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

    const pdf = await page.pdf({
      format: f.pageSize === "Letter" ? "letter" : "a4",
      printBackground: true,
      margin: {
        top: `${f.marginTop}cm`,
        bottom: `${f.marginBottom}cm`,
        left: `${f.marginLeft}cm`,
        right: `${f.marginRight}cm`,
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
