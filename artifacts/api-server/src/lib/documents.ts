import mammoth from "mammoth";

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
