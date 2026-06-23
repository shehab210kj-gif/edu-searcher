import { Router, type IRouter } from "express";
import { and, eq, or, ilike, desc, sql } from "drizzle-orm";
import {
  db,
  libraryDocumentsTable,
  libraryCategoriesTable,
  projectsTable,
} from "@workspace/db";
import {
  ListLibraryDocumentsQueryParams,
  GetLibraryDocumentParams,
  UseLibraryDocumentParams,
} from "@workspace/api-zod";
import { defaultFormatting } from "../lib/formatting";
import { buildDocxFromRich, buildPdfFromRich } from "../lib/rich-export";
import { downloadObjectToBuffer, uploadBuffer } from "../lib/storage";
import {
  extractTemplateParagraphs,
  convertDocxToPdf,
} from "../lib/docx-template";
import {
  serializeLibraryDocument,
  serializeLibraryDocumentSummary,
  serializeLibraryCategory,
  serializeProject,
} from "../lib/serialize";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const router: IRouter = Router();

const PUBLISHED = eq(libraryDocumentsTable.status, "published");

router.get("/library", async (req, res): Promise<void> => {
  const parsed = ListLibraryDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const q = parsed.data;
  const conditions = [PUBLISHED];

  if (q.documentType)
    conditions.push(eq(libraryDocumentsTable.documentType, q.documentType));
  if (q.category) conditions.push(eq(libraryDocumentsTable.category, q.category));
  if (q.university)
    conditions.push(eq(libraryDocumentsTable.university, q.university));
  if (q.degreeLevel)
    conditions.push(eq(libraryDocumentsTable.degreeLevel, q.degreeLevel));
  if (q.department)
    conditions.push(eq(libraryDocumentsTable.department, q.department));
  if (q.language) conditions.push(eq(libraryDocumentsTable.language, q.language));
  if (q.tag) {
    conditions.push(
      sql`${libraryDocumentsTable.tags}::jsonb @> ${JSON.stringify([q.tag])}::jsonb`,
    );
  }
  if (q.search) {
    const term = `%${q.search}%`;
    const search = or(
      ilike(libraryDocumentsTable.title, term),
      ilike(libraryDocumentsTable.description, term),
      ilike(libraryDocumentsTable.university, term),
      ilike(libraryDocumentsTable.department, term),
    );
    if (search) conditions.push(search);
  }

  const where = and(...conditions);
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 12;

  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(libraryDocumentsTable)
    .where(where);

  const rows = await db
    .select()
    .from(libraryDocumentsTable)
    .where(where)
    .orderBy(desc(libraryDocumentsTable.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({
    items: rows.map(serializeLibraryDocumentSummary),
    total,
    page,
    pageSize,
  });
});

router.get("/library/facets", async (_req, res): Promise<void> => {
  async function facet(
    column:
      | typeof libraryDocumentsTable.documentType
      | typeof libraryDocumentsTable.category
      | typeof libraryDocumentsTable.university
      | typeof libraryDocumentsTable.department
      | typeof libraryDocumentsTable.degreeLevel
      | typeof libraryDocumentsTable.language,
  ): Promise<{ value: string; count: number }[]> {
    const rows = await db
      .select({ value: column, count: sql<number>`count(*)::int` })
      .from(libraryDocumentsTable)
      .where(and(PUBLISHED, sql`${column} is not null and ${column} <> ''`))
      .groupBy(column)
      .orderBy(desc(sql`count(*)`));
    return rows
      .filter((r): r is { value: string; count: number } => r.value != null)
      .map((r) => ({ value: r.value, count: r.count }));
  }

  async function tagFacet(): Promise<{ value: string; count: number }[]> {
    const rows = await db
      .select({
        value: sql<string>`tag.value`,
        count: sql<number>`count(*)::int`,
      })
      .from(libraryDocumentsTable)
      .innerJoin(
        sql`jsonb_array_elements_text(${libraryDocumentsTable.tags}::jsonb) as tag(value)`,
        sql`true`,
      )
      .where(and(PUBLISHED, sql`tag.value <> ''`))
      .groupBy(sql`tag.value`)
      .orderBy(desc(sql`count(*)`));
    return rows
      .filter((r): r is { value: string; count: number } => r.value != null)
      .map((r) => ({ value: r.value, count: r.count }));
  }

  res.json({
    documentTypes: await facet(libraryDocumentsTable.documentType),
    categories: await facet(libraryDocumentsTable.category),
    universities: await facet(libraryDocumentsTable.university),
    departments: await facet(libraryDocumentsTable.department),
    degreeLevels: await facet(libraryDocumentsTable.degreeLevel),
    languages: await facet(libraryDocumentsTable.language),
    tags: await tagFacet(),
  });
});

router.get("/library/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(libraryCategoriesTable)
    .orderBy(libraryCategoriesTable.name);
  res.json(rows.map(serializeLibraryCategory));
});

router.get("/library/:id", async (req, res): Promise<void> => {
  const params = GetLibraryDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db
    .select()
    .from(libraryDocumentsTable)
    .where(
      and(eq(libraryDocumentsTable.id, params.data.id), PUBLISHED),
    );
  if (!doc) {
    res.status(404).json({ error: "المستند غير موجود" });
    return;
  }
  res.json(serializeLibraryDocument(doc));
});

// Inline preview of the REAL document — never an HTML rendering. PDF originals
// are streamed as-is; DOCX originals are rendered to PDF by headless LibreOffice
// so fonts, layout, RTL, headers/footers, images and tables are preserved.
router.get("/library/:id/preview.pdf", async (req, res): Promise<void> => {
  const params = GetLibraryDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db
    .select()
    .from(libraryDocumentsTable)
    .where(and(eq(libraryDocumentsTable.id, params.data.id), PUBLISHED));
  if (!doc) {
    res.status(404).json({ error: "المستند غير موجود" });
    return;
  }
  if (!doc.originalFileUrl) {
    res.status(404).json({ error: "لا تتوفر معاينة لهذا المستند" });
    return;
  }

  try {
    const { buffer } = await downloadObjectToBuffer(doc.originalFileUrl);
    const pdf =
      doc.fileType === "pdf" ? buffer : await convertDocxToPdf(buffer);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.send(pdf);
  } catch (err) {
    req.log.error(
      { err, libraryDocumentId: doc.id },
      "Failed to render library preview",
    );
    res.status(500).json({ error: "تعذّر إنشاء المعاينة" });
  }
});

router.get("/library/:id/export", async (req, res): Promise<void> => {
  const params = GetLibraryDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rawFormat = Array.isArray(req.query.format)
    ? req.query.format[0]
    : req.query.format;
  const format = rawFormat || "docx";
  if (format !== "docx" && format !== "pdf") {
    res.status(400).json({ error: "صيغة التصدير غير مدعومة" });
    return;
  }

  const [doc] = await db
    .select()
    .from(libraryDocumentsTable)
    .where(and(eq(libraryDocumentsTable.id, params.data.id), PUBLISHED));
  if (!doc) {
    res.status(404).json({ error: "المستند غير موجود" });
    return;
  }

  const input = {
    title: doc.title,
    richContent: doc.richContent,
    layoutMetadata: doc.layoutMetadata,
    formatting: doc.formatting ?? defaultFormatting,
  };
  const base = doc.title || "document";

  try {
    if (format === "pdf") {
      const buffer = await buildPdfFromRich(input);
      const filename = encodeURIComponent(`${base}.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      );
      res.send(buffer);
      return;
    }

    const buffer = await buildDocxFromRich(input);
    const filename = encodeURIComponent(`${base}.docx`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    );
    res.send(buffer);
  } catch (err) {
    req.log.error({ err, format }, "Failed to export library document");
    res.status(500).json({ error: "تعذّر إنشاء ملف التصدير" });
  }
});

router.post("/library/:id/use", async (req, res): Promise<void> => {
  const params = UseLibraryDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [doc] = await db
    .select()
    .from(libraryDocumentsTable)
    .where(and(eq(libraryDocumentsTable.id, params.data.id), PUBLISHED));
  if (!doc) {
    res.status(404).json({ error: "المستند غير موجود" });
    return;
  }

  // PDF documents are reference/preview-only — they cannot be turned into an
  // editable project (the text-node editing pipeline is DOCX-only).
  if (doc.fileType === "pdf") {
    res.status(400).json({
      error: "ملفات PDF متاحة للمعاينة فقط ولا يمكن استخدامها كقالب قابل للتحرير",
    });
    return;
  }

  // TEMPLATE mode: when the original DOCX is preserved in storage, clone it so
  // the project owns an immutable copy, and extract its editable text. Export
  // later swaps only the edited text nodes — fonts, layout, RTL, headers,
  // footers, images and tables are preserved exactly. If the original exists but
  // cloning fails, surface the error instead of silently producing an AI-mode
  // project, so fidelity failures stay visible.
  if (doc.originalFileUrl) {
    try {
      const { buffer } = await downloadObjectToBuffer(doc.originalFileUrl);
      const templateFileUrl = await uploadBuffer(buffer, DOCX_MIME);
      const templateContent = await extractTemplateParagraphs(buffer);

      const [project] = await db
        .insert(projectsTable)
        .values({
          title: doc.title,
          workType: doc.documentType,
          citationStyle: "APA",
          language: doc.language,
          rawContent: "",
          formatting: doc.formatting ?? defaultFormatting,
          sourceLibraryDocumentId: doc.id,
          documentMode: "TEMPLATE",
          templateFileUrl,
          templateContent,
        })
        .returning();

      res.status(201).json(serializeProject(project));
    } catch (err) {
      req.log.error(
        { err, libraryDocumentId: doc.id },
        "Failed to prepare template DOCX",
      );
      res.status(500).json({ error: "تعذّر تجهيز القالب من المستند الأصلي" });
    }
    return;
  }

  // Legacy documents without a preserved original DOCX use the AI/rich pipeline.
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: doc.title,
      workType: doc.documentType,
      citationStyle: "APA",
      language: doc.language,
      rawContent: "",
      formatting: doc.formatting ?? defaultFormatting,
      sourceLibraryDocumentId: doc.id,
      richContent: doc.richContent,
      layoutMetadata: doc.layoutMetadata,
    })
    .returning();

  res.status(201).json(serializeProject(project));
});

export default router;
