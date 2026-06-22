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
import { projectsTable, type Formatting, type LayoutMetadata } from "./projects";

export const DOCUMENT_TYPES = [
  "master_template",
  "previous_research",
  "journal_template",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const CATEGORY_KINDS = [
  "category",
  "university",
  "department",
  "degree_level",
] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/**
 * A master research document in the library. The original DOCX is stored once,
 * read-only, in object storage (`originalFileUrl`); `richContent` + `layoutMetadata`
 * hold the parsed, TipTap-compatible representation used for preview and duplication.
 */
export const libraryDocumentsTable = pgTable("library_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  documentType: text("document_type").notNull().default("master_template"),
  coverImageUrl: text("cover_image_url"),
  university: text("university"),
  degreeLevel: text("degree_level"),
  department: text("department"),
  category: text("category"),
  language: text("language").notNull().default("ar"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  originalFileName: text("original_file_name"),
  originalFileUrl: text("original_file_url"),
  richContent: text("rich_content").notNull().default(""),
  layoutMetadata: jsonb("layout_metadata")
    .$type<LayoutMetadata>()
    .notNull()
    .default({}),
  formatting: jsonb("formatting").$type<Formatting | null>(),
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Admin-managed taxonomy backing the library filter dropdowns. */
export const libraryCategoriesTable = pgTable("library_categories", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("category"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DocumentSnapshot = {
  title?: string;
  richContent?: string;
  layoutMetadata?: LayoutMetadata;
  formatting?: Formatting | null;
};

/** Point-in-time snapshot of an editable copy's rich content, for version history. */
export const documentVersionsTable = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  snapshot: jsonb("snapshot").$type<DocumentSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLibraryDocumentSchema = createInsertSchema(
  libraryDocumentsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLibraryDocument = z.infer<typeof insertLibraryDocumentSchema>;
export type LibraryDocument = typeof libraryDocumentsTable.$inferSelect;

export const insertLibraryCategorySchema = createInsertSchema(
  libraryCategoriesTable,
).omit({ id: true, createdAt: true });
export type InsertLibraryCategory = z.infer<typeof insertLibraryCategorySchema>;
export type LibraryCategory = typeof libraryCategoriesTable.$inferSelect;

export const insertDocumentVersionSchema = createInsertSchema(
  documentVersionsTable,
).omit({ id: true, createdAt: true });
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersionsTable.$inferSelect;
