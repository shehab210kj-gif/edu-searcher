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

export async function buildDocx(project: Project): Promise<Buffer> {
  const f: Formatting = project.formatting;
  const halfPt = (pt: number) => Math.round(pt * 2);

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 480, line: Math.round(f.lineSpacing * 240) },
      children: [
        new TextRun({
          text: project.title,
          bold: true,
          font: f.fontFamily,
          size: halfPt(f.headingSize + 4),
          rightToLeft: true,
        }),
      ],
    }),
  );

  for (const section of project.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 360, after: 200, line: Math.round(f.lineSpacing * 240) },
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            font: f.fontFamily,
            size: halfPt(f.headingSize),
            rightToLeft: true,
          }),
        ],
      }),
    );

    const paragraphs = section.content.split(/\n+/).filter((p) => p.trim());
    for (const para of paragraphs) {
      children.push(
        new Paragraph({
          bidirectional: true,
          alignment: alignment(f.paragraphAlign),
          spacing: { after: 160, line: Math.round(f.lineSpacing * 240) },
          indent: { firstLine: cmToTwip(f.firstLineIndent) },
          children: [
            new TextRun({
              text: para.trim(),
              font: f.fontFamily,
              size: halfPt(f.fontSize),
              rightToLeft: true,
            }),
          ],
        }),
      );
    }
  }

  if (project.references.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 480, after: 200 },
        children: [
          new TextRun({
            text: "قائمة المراجع",
            bold: true,
            font: f.fontFamily,
            size: halfPt(f.headingSize),
            rightToLeft: true,
          }),
        ],
      }),
    );

    for (const ref of project.references) {
      children.push(
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          spacing: { after: 120, line: Math.round(f.lineSpacing * 240) },
          children: [
            new TextRun({
              text: ref.formatted,
              font: f.fontFamily,
              size: halfPt(f.fontSize),
              rightToLeft: true,
            }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
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
