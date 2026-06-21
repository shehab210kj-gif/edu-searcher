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
