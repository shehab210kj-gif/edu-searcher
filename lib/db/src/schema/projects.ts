import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type Section = {
  key: string;
  heading: string;
  level?: 1 | 2;
  content: string;
};

export type Reference = {
  id: string;
  raw?: string;
  formatted: string;
  type?: string;
  authors?: string;
  year?: string;
  title?: string;
  source?: string;
  inTextCitation?: string;
};

export type Formatting = {
  fontFamily: string;
  fontSize: number;
  headingSize: number;
  subheadingSize: number;
  lineSpacing: number;
  pageSize: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paragraphAlign: string;
  firstLineIndent: number;
};

/**
 * A single editable text unit extracted from a TEMPLATE document's original
 * DOCX. `id` is the paragraph's position among matched `<w:p>` elements in
 * word/document.xml (index-stable so edits can be re-applied to the immutable
 * clone). `original` is the text as imported; `text` is the user's current
 * value. Only paragraphs whose `text` differs from `original` are written back,
 * and only their `<w:t>` nodes are touched on export.
 */
export type TemplateParagraph = {
  id: number;
  original: string;
  text: string;
};

export type Analysis = {
  researchType: string;
  pageCount: number;
  language: string;
  specialization: string;
  summary: string;
  detectedSections: string[];
};

export type VerificationIssue = {
  type: string;
  severity: string;
  message: string;
  location?: string | null;
  suggestion?: string | null;
};

export type Verification = {
  readinessScore: number;
  completeness: number;
  citations: number;
  indexing: number;
  formatting: number;
  issues: VerificationIssue[];
};

/**
 * Document-level layout captured from an imported DOCX (or edited by a user) and
 * re-applied on rich-content export. Independent of the structured AI pipeline.
 */
export type LayoutMetadata = {
  coverPageHtml?: string;
  headerHtml?: string;
  footerHtml?: string;
  showPageNumbers?: boolean;
  pageNumberFormat?: string;
  pageNumberAlign?: "left" | "center" | "right";
  pageSetup?: {
    size?: string;
    orientation?: "portrait" | "landscape";
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  };
  cover?: {
    title?: string;
    subtitle?: string;
    studentName?: string;
    supervisor?: string;
    university?: string;
    faculty?: string;
    department?: string;
    degree?: string;
    year?: string;
    logoUrl?: string;
  };
};

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  workType: text("work_type").notNull(),
  citationStyle: text("citation_style").notNull(),
  language: text("language").notNull(),
  templateId: integer("template_id"),
  rawContent: text("raw_content").notNull().default(""),
  sections: jsonb("sections").$type<Section[]>().notNull().default([]),
  references: jsonb("references").$type<Reference[]>().notNull().default([]),
  formatting: jsonb("formatting").$type<Formatting>().notNull(),
  analysis: jsonb("analysis").$type<Analysis | null>(),
  verification: jsonb("verification").$type<Verification | null>(),
  readinessScore: integer("readiness_score"),
  sourceLibraryDocumentId: integer("source_library_document_id"),
  richContent: text("rich_content"),
  layoutMetadata: jsonb("layout_metadata").$type<LayoutMetadata>(),
  /**
   * "AI_GENERATED" (default): the Gemini/rich-content pipeline.
   * "TEMPLATE": preserves the original uploaded DOCX 100% — export clones the
   * file and only swaps edited `<w:t>` text nodes.
   */
  documentMode: text("document_mode").notNull().default("AI_GENERATED"),
  /** Object-storage path of the cloned original DOCX (TEMPLATE mode, internal). */
  templateFileUrl: text("template_file_url"),
  /** Editable text units for TEMPLATE mode. */
  templateContent: jsonb("template_content").$type<TemplateParagraph[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
