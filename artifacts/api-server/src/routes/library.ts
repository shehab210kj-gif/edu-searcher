import { Router, type IRouter } from "express";
import multer from "multer";
import { and, eq, or, ilike, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
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
import { parseDocument, extractPdfMetadata, parseDocxToRich } from "../lib/documents";
import { gemini, GEMINI_MODEL, chatStructured } from "../lib/gemini";
import { Type } from "@google/genai";
import { buildFormattedDocument } from "../lib/format-pipeline";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

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

  if (q.documentType) {
    conditions.push(eq(libraryDocumentsTable.documentType, q.documentType));
  } else {
    conditions.push(sql`${libraryDocumentsTable.documentType} <> 'master_template'`);
  }
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
      sql`${q.tag} = ANY(${libraryDocumentsTable.tags})`,
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
      .where(and(PUBLISHED, sql`${column} is not null and ${column} <> '' and ${libraryDocumentsTable.documentType} <> 'master_template'`))
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
        sql`unnest(${libraryDocumentsTable.tags}) as tag(value)`,
        sql`true`,
      )
      .where(and(PUBLISHED, sql`tag.value <> '' and ${libraryDocumentsTable.documentType} <> 'master_template'`))
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

router.post("/library/categories", async (req, res): Promise<void> => {
  const { name, kind, parentId } = req.body;
  if (!name || !kind) {
    res.status(400).json({ error: "الاسم ونوع التصنيف مطلوبان" });
    return;
  }
  try {
    const [inserted] = await db
      .insert(libraryCategoriesTable)
      .values({
        name,
        kind,
        parentId: parentId ? parseInt(parentId, 10) : null,
      })
      .returning();
    res.status(201).json(serializeLibraryCategory(inserted));
  } catch (err) {
    res.status(500).json({ error: "فشل إنشاء التصنيف" });
  }
});

router.patch("/library/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف غير صحيح" });
    return;
  }
  const { name, parentId } = req.body;
  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId ? parseInt(parentId, 10) : null;

    const [updated] = await db
      .update(libraryCategoriesTable)
      .set(updateData)
      .where(eq(libraryCategoriesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "التصنيف غير موجود" });
      return;
    }
    res.json(serializeLibraryCategory(updated));
  } catch (err) {
    res.status(500).json({ error: "فشل تعديل التصنيف" });
  }
});

router.delete("/library/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "معرف غير صحيح" });
    return;
  }
  try {
    const [deleted] = await db
      .delete(libraryCategoriesTable)
      .where(eq(libraryCategoriesTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "التصنيف غير موجود" });
      return;
    }
    await db
      .delete(libraryCategoriesTable)
      .where(eq(libraryCategoriesTable.parentId, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "فشل حذف التصنيف" });
  }
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
const previewCache = new Map<number, { pdf: Buffer; updatedAt: number }>();

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

  if (!doc.originalFileUrl && (!doc.richContent || !doc.richContent.trim())) {
    res.status(422).json({ error: "المستند فارغ ولا تتوفر له معاينة" });
    return;
  }

  const docUpdatedAt = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
  const cached = previewCache.get(doc.id);
  if (cached && cached.updatedAt === docUpdatedAt) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.send(cached.pdf);
    return;
  }

  if (doc.richContent) {
    const isUnsafe = /<script|javascript:|on\w+=/i.test(doc.richContent);
    if (isUnsafe) {
      res.status(422).json({ error: "محتوى غير آمن" });
      return;
    }
  }

  try {
    let pdf: Buffer;
    if (doc.originalFileUrl) {
      const { buffer } = await downloadObjectToBuffer(doc.originalFileUrl);
      pdf = doc.fileType === "pdf" ? buffer : await convertDocxToPdf(buffer);
    } else {
      const exportInput = {
        title: doc.title,
        richContent: doc.richContent,
        layoutMetadata: doc.layoutMetadata,
        formatting: doc.formatting || {
          fontFamily: "Amiri",
          fontSize: 12,
          lineSpacing: 1.5,
          headingSize: 18,
          subheadingSize: 14,
          marginTop: 2.5,
          marginBottom: 2.5,
          marginLeft: 2.5,
          marginRight: 2.5,
          pageSize: "A4",
          paragraphAlign: "justify",
          firstLineIndent: 1.25
        }
      };
      pdf = await buildPdfFromRich(exportInput);
    }

    previewCache.set(doc.id, { pdf, updatedAt: docUpdatedAt });

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

  const base = doc.title || "document";
  const sendFile = (
    buffer: Buffer,
    ext: "docx" | "pdf",
    contentType: string,
  ): void => {
    const filename = encodeURIComponent(`${base}.${ext}`);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    );
    res.send(buffer);
  };

  try {
    // File-first documents own an original file in storage. Export the real
    // bytes (or a faithful LibreOffice conversion) — never the rich exporters,
    // whose richContent is empty for these docs and would yield a blank file.
    if (doc.originalFileUrl) {
      const { buffer } = await downloadObjectToBuffer(doc.originalFileUrl);

      // PDF originals can only be exported as PDF (there is no DOCX source).
      if (doc.fileType === "pdf") {
        if (format === "docx") {
          res.status(400).json({
            error: "ملفات PDF متاحة بصيغة PDF فقط",
          });
          return;
        }
        sendFile(buffer, "pdf", "application/pdf");
        return;
      }

      // DOCX originals: serve the original for DOCX, or convert for PDF.
      if (format === "pdf") {
        sendFile(await convertDocxToPdf(buffer), "pdf", "application/pdf");
      } else {
        sendFile(buffer, "docx", DOCX_MIME);
      }
      return;
    }

    // Legacy documents without a preserved original use the rich pipeline.
    const input = {
      title: doc.title,
      richContent: doc.richContent,
      layoutMetadata: doc.layoutMetadata,
      formatting: doc.formatting ?? defaultFormatting,
    };
    if (format === "pdf") {
      sendFile(await buildPdfFromRich(input), "pdf", "application/pdf");
    } else {
      sendFile(await buildDocxFromRich(input), "docx", DOCX_MIME);
    }
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

  // TEMPLATE mode: when the original DOCX is preserved in storage AND the document
  // is explicitly marked as a template, clone it so the project owns an immutable copy.
  if (doc.originalFileUrl && doc.fileType === "docx" && doc.isTemplate) {
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
  // We extract plain text so the frontend editor has content to display.
  const plainText = doc.richContent.replace(/<[^>]*>/g, " ").trim();
  const [project] = await db
    .insert(projectsTable)
    .values({
      title: doc.title,
      workType: doc.documentType,
      citationStyle: "APA",
      language: doc.language,
      rawContent: plainText,
      sections: plainText ? [{ key: "imported", heading: "المحتوى المستورد", content: plainText }] : [],
      analysis: plainText ? {
        researchType: "بحث مستورد",
        pageCount: Math.max(1, Math.ceil(plainText.length / 1500)),
        language: doc.language,
        specialization: doc.category || "عام",
        summary: doc.description || "بحث مستورد للتحرير",
        detectedSections: ["المحتوى المستورد"]
      } : null,
      formatting: doc.formatting ?? defaultFormatting,
      sourceLibraryDocumentId: doc.id,
      richContent: doc.richContent,
      layoutMetadata: doc.layoutMetadata,
    })
    .returning();

  res.status(201).json(serializeProject(project));
});

// Configure multer for memory storage uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 1. User-facing research document upload
router.post(
  "/library/upload",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم رفع أي ملف" });
      return;
    }
    const name = req.file.originalname.toLowerCase();
    const isDocx = name.endsWith(".docx") || req.file.mimetype === DOCX_MIME;
    const isPdf = name.endsWith(".pdf") || req.file.mimetype === PDF_MIME;
    if (!isDocx && !isPdf) {
      res.status(400).json({ error: "يجب رفع ملف Word (.docx) أو PDF" });
      return;
    }

    try {
      const fileType = isPdf ? "pdf" : "docx";
      const mime = isPdf ? PDF_MIME : DOCX_MIME;
      const originalFileUrl = await uploadBuffer(req.file.buffer, mime);

      let pageCount: number | null = null;
      let extractedTitle = "";
      let richContent = "";
      let layoutMetadata = {};

      if (isPdf) {
        const meta = await extractPdfMetadata(req.file.buffer);
        pageCount = meta.pageCount;
        extractedTitle = meta.title;
        let pdfText = "";
        try {
          pdfText = await parseDocument(req.file.buffer, req.file.originalname, PDF_MIME);
        } catch (err) {
          req.log.warn({ err }, "Failed to extract text from PDF");
        }
        if (pdfText.trim().length < 100 && gemini) {
          req.log.info("PDF upload has very little digital text; performing Gemini OCR");
          try {
            const aiRes = await gemini.models.generateContent({
              model: GEMINI_MODEL,
              contents: [
                {
                  inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: "application/pdf",
                  },
                },
                "قم بقراءة واستخراج كل النصوص المكتوبة في هذا الملف الـ PDF بالتفصيل والكامل باللغة العربية."
              ]
            });
            pdfText = aiRes.text ?? pdfText;
          } catch (ocrErr) {
            req.log.warn({ ocrErr }, "Gemini OCR failed during PDF upload");
          }
        }
        if (pdfText) {
          richContent = pdfText.split(/\n+/).map(p => `<p>${p.trim()}</p>`).join("");
        }
      } else if (isDocx) {
        try {
          const parsed = await parseDocxToRich(req.file.buffer);
          richContent = parsed.html;
          layoutMetadata = parsed.layout;
          if (parsed.title) {
            extractedTitle = parsed.title;
          }
        } catch (err) {
          req.log.warn({ err }, "Failed to extract rich content from user uploaded DOCX");
        }
      }

      const body = req.body as Record<string, string | undefined>;
      const tags = (body.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const values = {
        title: body.title?.trim() || extractedTitle || req.file.originalname,
        description: body.description?.trim() ?? "بحث قديم مرفوع من قبل المستخدم",
        documentType: "previous_research",
        workType: body.workType?.trim() || "research",
        coverImageUrl: body.coverImageUrl?.trim() || null,
        university: body.university?.trim() || null,
        degreeLevel: body.degreeLevel?.trim() || null,
        department: body.department?.trim() || null,
        category: body.category?.trim() || null,
        language: body.language?.trim() || "ar",
        tags,
        fileType,
        pageCount,
        originalFileName: req.file.originalname,
        originalFileUrl,
        richContent,
        layoutMetadata,
        isTemplate: false,
        status: "published",
      };

      const [doc] = await db
        .insert(libraryDocumentsTable)
        .values(values)
        .returning();

      res.status(201).json(serializeLibraryDocument(doc));
    } catch (err) {
      req.log.error({ err }, "Failed to upload user library document");
      res.status(400).json({ error: "تعذّر معالجة الملف المرفوع وحفظه" });
    }
  }
);

// 2. AI-powered smart search comparison
router.post(
  "/library/smart-search",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم رفع أي ملف تكليف للمطابقة" });
      return;
    }

    try {
      let extractedText = "";
      const name = req.file.originalname.toLowerCase();
      const isImage = name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp");

      if (isImage) {
        if (!gemini) {
          res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير متوفرة حالياً" });
          return;
        }
        req.log.info("Performing multimodal OCR on uploaded image requirements");
        const aiRes = await gemini.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
              },
            },
            "قم بقراءة واستخراج المطلوب والتعليمات الدراسية والتكليفية من هذه الصورة بالتفصيل."
          ]
        });
        extractedText = aiRes.text ?? "";
      } else {
        extractedText = await parseDocument(req.file.buffer, req.file.originalname, req.file.mimetype);
        if (req.file.mimetype === "application/pdf" && extractedText.trim().length < 100 && gemini) {
          req.log.info("PDF has very little digital text; falling back to multimodal Gemini OCR for scanned PDF");
          try {
            const aiRes = await gemini.models.generateContent({
              model: GEMINI_MODEL,
              contents: [
                {
                  inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: "application/pdf",
                  },
                },
                "قم بقراءة واستخراج كل النصوص والتعليمات والتكليفات من هذا المستند الـ PDF بالتفصيل والكامل باللغة العربية."
              ]
            });
            extractedText = aiRes.text ?? extractedText;
          } catch (ocrErr) {
            req.log.warn({ ocrErr }, "Gemini OCR failed during PDF match");
          }
        }
      }

      if (!extractedText.trim()) {
        res.status(400).json({ error: "لم يتم العثور على أي نص مقروء في الملف المرفوع. يبدو أن الملف عبارة عن صورة سكانر غير مقروءة، يرجى كتابة المتطلبات يدوياً أو رفع ملف نصي." });
        return;
      }

      // Fetch all library documents (master templates & previous research) to match against
      const allDocs = await db.select().from(libraryDocumentsTable);
      if (allDocs.length === 0) {
        res.json({ results: [] });
        return;
      }

      const docList = allDocs.map((d) => {
        const cleanSnippet = d.richContent
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 800);
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          university: d.university,
          department: d.department,
          category: d.category,
          snippet: cleanSnippet,
        };
      });

      const systemPrompt = `أنت خبير أكاديمي ذكي ومساعد باحث. مهمتك هي قراءة متطلبات التكليف/البحث الدراسي ومقارنتها بقائمة الأبحاث السابقة المنجزة في قاعدة البيانات لتحديد نسبة التطابق والتشابه ومدى ملاءمة إعادة استخدام أي منها وتعديله.`;
      const userPrompt = `
متطلبات التكليف الدراسي المستخرجة:
\"\"\"
${extractedText}
\"\"\"

قائمة البحوث المنجزة سابقاً في المكتبة:
${JSON.stringify(docList, null, 2)}

قم بتحليل مدى التطابق أو إمكانية إعادة الاستخدام لكل مستند في القائمة.
يجب أن تعيد الإجابة كـ JSON array من الكائنات، بحيث يحتوي كل كائن على:
1. "documentId" (رقم): معرف المستند من القائمة.
2. "similarityScore" (رقم من 0 إلى 100): نسبة التطابق والتشابه والملائمة للتكليف الجديد.
3. "explanation" (نص): مبرر علمي دقيق باللغة العربية لنسبة التشابه وكيف يمكن تعديله أو الاستفادة منه للتكليف.

ملاحظة: تضمن فقط الأبحاث التي تشهد تشابهاً أو فائدة (Similarity > 0). رتب النتائج تنازلياً حسب النسبة.`;

      const MatchResultSchema = z.object({
        documentId: z.number(),
        similarityScore: z.number(),
        explanation: z.string(),
      });
      const MatchResultsSchema = z.array(MatchResultSchema);

      const matchResponseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            documentId: { type: Type.INTEGER },
            similarityScore: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
          },
          required: ["documentId", "similarityScore", "explanation"],
        },
      };

      let results: any[] = [];
      try {
        const matches = await chatStructured(systemPrompt, userPrompt, MatchResultsSchema, {
          responseSchema: matchResponseSchema as any,
          temperature: 0.2
        });
        results = matches
          .map((m) => {
            const doc = allDocs.find((d) => d.id === m.documentId);
            return {
              ...m,
              document: doc ? serializeLibraryDocumentSummary(doc) : null,
            };
          })
          .filter((r) => r.document !== null && r.similarityScore > 0);
      } catch (aiErr) {
        req.log.warn({ aiErr }, "Gemini smart search matching failed, falling back to keyword text match");
        
        // Simple fallback matching algorithm
        const searchWords = extractedText
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter(w => w.length > 2);

        results = allDocs
          .map((doc) => {
            let score = 0;
            const titleLower = (doc.title || "").toLowerCase();
            const snippetLower = (doc.richContent || "").toLowerCase().slice(0, 1000);
            
            // Count matching words
            let matchedWords = 0;
            for (const word of searchWords) {
              if (titleLower.includes(word)) {
                score += 20;
                matchedWords++;
              } else if (snippetLower.includes(word)) {
                score += 5;
                matchedWords++;
              }
            }

            // Cap similarity score between 0 and 95
            const similarityScore = Math.min(95, Math.max(0, Math.round(score)));
            
            return {
              documentId: doc.id,
              similarityScore,
              explanation: matchedWords > 0 
                ? `مطابقة تلقائية مبنية على تطابق كلمات مفتاحية للتكليف (${matchedWords} كلمة مشتركة).`
                : "تم اقتراح هذا المستند كنموذج استرشادي عام لتشابه تخصص البحث.",
              document: serializeLibraryDocumentSummary(doc)
            };
          })
          .filter(r => r.similarityScore > 5)
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, 5); // top 5 matches
      }

      res.json({ results });
    } catch (err) {
      req.log.error({ err }, "Smart search failed");
      res.status(500).json({ error: "حدث خطأ أثناء معالجة ومطابقة التكليف ذكياً" });
    }
  }
);

// 3. Save finished project to library
router.post(
  "/projects/:id/save-to-library",
  async (req, res): Promise<void> => {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "معرف المشروع غير صحيح" });
      return;
    }

    try {
      const [project] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));

      if (!project) {
        res.status(404).json({ error: "المشروع غير موجود" });
        return;
      }

      const escapeHtml = (str: string) => {
        return str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      };

      if (project.documentMode !== "TEMPLATE" && (!project.richContent || !project.richContent.trim())) {
        const formatted = buildFormattedDocument(project);
        project.richContent = formatted.blocks.map(block => {
          const inner = block.runs.map(run => {
            const styles: string[] = [];
            if (run.bold) styles.push("font-weight:700");
            if (run.italic) styles.push("font-style:italic");
            const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
            return `<span${styleAttr}>${escapeHtml(run.text)}</span>`;
          }).join("");

          switch (block.style) {
            case "Title":
              return `<h1 style="text-align:center;font-weight:bold;margin:24pt 0 12pt;">${inner}</h1>`;
            case "Heading1":
              return `<h2 style="font-weight:bold;margin:18pt 0 10pt;">${inner}</h2>`;
            case "Heading2":
              return `<h3 style="font-weight:bold;margin:12pt 0 8pt;">${inner}</h3>`;
            case "ReferencesHeading":
              return `<h2 style="font-weight:bold;margin:24pt 0 12pt;" class="refs-heading">${inner}</h2>`;
            case "Reference":
              return `<p class="reference" style="margin:0 0 8pt;padding-inline-start:1.27cm;text-indent:-1.27cm;">${inner}</p>`;
            case "Body":
            default:
              return `<p style="margin:0 0 10pt;text-indent:1.27cm;">${inner}</p>`;
          }
        }).join("\n");
      }

      // Generate DOCX to act as the original file for future usage as a TEMPLATE
      let originalFileUrl: string | null = null;
      try {
        const exportInput = {
          title: project.title,
          richContent: project.richContent ?? "",
          layoutMetadata: project.layoutMetadata ?? {},
          formatting: project.formatting ?? defaultFormatting,
        };
        const docxBuffer = await buildDocxFromRich(exportInput);
        originalFileUrl = await uploadBuffer(docxBuffer, DOCX_MIME);
      } catch (err) {
        req.log.warn({ err }, "Failed to generate original DOCX for library document");
      }

      // Insert as previous research document in library
      const [doc] = await db
        .insert(libraryDocumentsTable)
        .values({
          title: project.title,
          description: project.analysis?.summary || `بحث منجز عبر المنصة: ${project.title}`,
          documentType: "previous_research",
          workType: project.workType || "research",
          fileType: "docx",
          richContent: project.richContent ?? "",
          layoutMetadata: project.layoutMetadata ?? {},
          formatting: project.formatting,
          originalFileUrl,
          isTemplate: false,
          status: "published",
        })
        .returning();

      res.status(201).json(serializeLibraryDocument(doc));
    } catch (err) {
      req.log.error({ err, projectId }, "Failed to save project to library");
      res.status(500).json({ error: "تعذّر حفظ المشروع في المكتبة البحثية" });
    }
  }
);

export default router;
