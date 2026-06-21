import type { Project, Formatting, Reference } from "@workspace/db";

export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type BlockStyle =
  | "Title"
  | "Heading1"
  | "Heading2"
  | "Body"
  | "ReferencesHeading"
  | "Reference";

export type FormattedBlock = {
  style: BlockStyle;
  runs: InlineRun[];
};

export type FormattedDocument = {
  blocks: FormattedBlock[];
  formatting: Formatting;
};

/** Remove code fences, normalize newlines, drop residual markdown noise. */
function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** Strip inline markdown markers that are not handled as runs. */
function cleanInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/^\s*[-*•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

/** Parse `**bold**` spans into runs; everything else becomes plain runs. */
function parseInlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      const chunk = cleanInline(text.slice(last, m.index));
      if (chunk) runs.push({ text: chunk });
    }
    const bold = cleanInline(m[1]);
    if (bold) runs.push({ text: bold, bold: true });
    last = regex.lastIndex;
  }
  if (last < text.length) {
    const chunk = cleanInline(text.slice(last));
    if (chunk) runs.push({ text: chunk });
  }
  return runs.length > 0 ? runs : [{ text: cleanInline(text) }];
}

/** Detect whether a single line is a sub-heading (markdown `#` or a short bold-only line). */
function detectHeadingLine(line: string): string | null {
  const t = line.trim();
  if (!t) return null;
  const md = t.match(/^#{1,6}\s+(.+?)\s*$/);
  if (md) return md[1].trim();
  const bold = t.match(/^\*\*(.+?)\*\*\s*:?\s*$/);
  if (bold && bold[1].length <= 80) return bold[1].trim();
  return null;
}

/** Split section content into paragraph/heading blocks (blank-line separated). */
function splitBlocks(content: string): string[] {
  return normalize(content)
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

function isArticleLike(ref: Reference): boolean {
  const t = (ref.type ?? "").toLowerCase();
  return /article|مقال|بحث|دورية|journal|paper/.test(t);
}

/** Build a single reference in APA 7 style from structured fields. */
function formatReferenceAPA7(ref: Reference): InlineRun[] {
  const authors = ref.authors?.trim();
  const year = ref.year?.trim();
  const title = ref.title?.trim();
  const source = ref.source?.trim();

  if (authors && title) {
    const runs: InlineRun[] = [];
    runs.push({ text: `${authors.replace(/\.?\s*$/, "")} ` });
    runs.push({ text: `(${year || "د.ت"}). ` });
    if (isArticleLike(ref)) {
      runs.push({ text: `${title.replace(/\.?\s*$/, "")}. ` });
      if (source) runs.push({ text: source.replace(/\.?\s*$/, ""), italic: true });
      runs.push({ text: "." });
    } else {
      runs.push({ text: `${title.replace(/\.?\s*$/, "")}`, italic: true });
      runs.push({ text: ". " });
      if (source) runs.push({ text: `${source.replace(/\.?\s*$/, "")}.` });
    }
    return runs;
  }

  const fallback = (ref.formatted ?? ref.raw ?? "").trim();
  if (fallback) return parseInlineRuns(normalize(fallback));
  return [];
}

/**
 * Transform a project's structured AI data into a normalized, cleaned document
 * model ready for rendering. Never emits raw AI text directly — every block is
 * cleaned and typed before it reaches the DOCX generator.
 */
export function buildFormattedDocument(project: Project): FormattedDocument {
  const blocks: FormattedBlock[] = [];

  const title = normalize(project.title);
  if (title) {
    blocks.push({ style: "Title", runs: [{ text: title, bold: true }] });
  }

  for (const section of project.sections) {
    const heading = cleanInline(normalize(section.heading));
    if (heading) {
      blocks.push({ style: "Heading1", runs: [{ text: heading, bold: true }] });
    }

    for (const block of splitBlocks(section.content)) {
      const lines = block.split("\n");
      let i = 0;
      while (i < lines.length) {
        const sub = detectHeadingLine(lines[i]);
        if (sub === null) break;
        blocks.push({
          style: "Heading2",
          runs: [{ text: cleanInline(sub), bold: true }],
        });
        i += 1;
      }
      const paragraph = lines.slice(i).join(" ").replace(/\s+/g, " ").trim();
      if (paragraph) {
        const runs = parseInlineRuns(paragraph).filter((r) => r.text.length > 0);
        if (runs.length > 0) {
          blocks.push({ style: "Body", runs });
        }
      }
    }
  }

  if (project.references.length > 0) {
    blocks.push({
      style: "ReferencesHeading",
      runs: [{ text: "قائمة المراجع", bold: true }],
    });

    const formatted = project.references
      .map((ref) => ({ ref, runs: formatReferenceAPA7(ref) }))
      .filter((r) => r.runs.some((run) => run.text.trim().length > 0));

    formatted.sort((a, b) => {
      const ka = (a.ref.authors || a.ref.formatted || "").trim();
      const kb = (b.ref.authors || b.ref.formatted || "").trim();
      return ka.localeCompare(kb, "ar");
    });

    for (const { runs } of formatted) {
      blocks.push({ style: "Reference", runs });
    }
  }

  return { blocks, formatting: project.formatting };
}
