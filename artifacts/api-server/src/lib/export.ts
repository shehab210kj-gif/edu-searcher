import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageOrientation,
  convertMillimetersToTwip,
} from "docx";
import type { Project, Formatting } from "@workspace/db";
import {
  buildFormattedDocument,
  type FormattedBlock,
  type InlineRun,
} from "./format-pipeline";

function alignment(value: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (value) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "left":
      return AlignmentType.LEFT;
    default:
      return AlignmentType.JUSTIFIED;
  }
}

function cmToTwip(cm: number): number {
  return convertMillimetersToTwip(cm * 10);
}

const halfPt = (pt: number): number => Math.round(pt * 2);
const line = (spacing: number): number => Math.round(spacing * 240);

function runs(items: InlineRun[], font: string, size: number): TextRun[] {
  return items.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        font,
        size,
        rightToLeft: true,
      }),
  );
}

function renderBlock(block: FormattedBlock, f: Formatting): Paragraph {
  const font = f.fontFamily;

  switch (block.style) {
    case "Title":
      return new Paragraph({
        style: "Title",
        bidirectional: true,
        children: runs(block.runs, font, halfPt(f.headingSize)),
      });

    case "Heading1":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        bidirectional: true,
        children: runs(block.runs, font, halfPt(f.headingSize)),
      });

    case "Heading2":
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        children: runs(block.runs, font, halfPt(f.subheadingSize)),
      });

    case "ReferencesHeading":
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        bidirectional: true,
        pageBreakBefore: true,
        children: runs(block.runs, font, halfPt(f.headingSize)),
      });

    case "Reference":
      return new Paragraph({
        style: "Reference",
        bidirectional: true,
        children: runs(block.runs, font, halfPt(f.fontSize)),
      });

    case "Body":
    default:
      return new Paragraph({
        style: "Body",
        bidirectional: true,
        children: runs(block.runs, font, halfPt(f.fontSize)),
      });
  }
}

export async function buildDocx(project: Project): Promise<Buffer> {
  const formatted = buildFormattedDocument(project);
  const f = formatted.formatting;

  const children = formatted.blocks.map((block) => renderBlock(block, f));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: f.fontFamily, size: halfPt(f.fontSize), rightToLeft: true },
          paragraph: { spacing: { line: line(f.lineSpacing) } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Body",
          quickFormat: true,
          run: { bold: true, size: halfPt(f.headingSize), font: f.fontFamily, rightToLeft: true },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: { after: 480, line: line(f.lineSpacing) },
          },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Body",
          quickFormat: true,
          run: { bold: true, size: halfPt(f.headingSize), font: f.fontFamily, rightToLeft: true },
          paragraph: {
            alignment: AlignmentType.RIGHT,
            outlineLevel: 0,
            spacing: { before: 360, after: 200, line: line(f.lineSpacing) },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Body",
          quickFormat: true,
          run: { bold: true, size: halfPt(f.subheadingSize), font: f.fontFamily, rightToLeft: true },
          paragraph: {
            alignment: AlignmentType.RIGHT,
            outlineLevel: 1,
            spacing: { before: 240, after: 160, line: line(f.lineSpacing) },
          },
        },
        {
          id: "Body",
          name: "Body",
          basedOn: "Normal",
          next: "Body",
          quickFormat: true,
          run: { size: halfPt(f.fontSize), font: f.fontFamily, rightToLeft: true },
          paragraph: {
            alignment: alignment(f.paragraphAlign),
            spacing: { after: 200, line: line(f.lineSpacing) },
            indent: { firstLine: cmToTwip(f.firstLineIndent) },
          },
        },
        {
          id: "Reference",
          name: "Reference",
          basedOn: "Normal",
          next: "Reference",
          quickFormat: true,
          run: { size: halfPt(f.fontSize), font: f.fontFamily, rightToLeft: true },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 160, line: line(f.lineSpacing) },
            indent: { start: cmToTwip(1.27), hanging: cmToTwip(1.27) },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: {
              top: cmToTwip(f.marginTop),
              bottom: cmToTwip(f.marginBottom),
              left: cmToTwip(f.marginLeft),
              right: cmToTwip(f.marginRight),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
