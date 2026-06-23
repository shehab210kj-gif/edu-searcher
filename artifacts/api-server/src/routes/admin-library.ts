import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, libraryDocumentsTable, libraryCategoriesTable } from "@workspace/db";
import {
  AdminLoginBody,
  UpdateLibraryDocumentBody,
  UpdateLibraryDocumentParams,
  DeleteLibraryDocumentParams,
  CreateLibraryCategoryBody,
  DeleteLibraryCategoryParams,
} from "@workspace/api-zod";
import {
  checkAdminPassword,
  signAdminToken,
  requireAdmin,
  adminPasswordConfigured,
  sessionSecretConfigured,
} from "../lib/admin-auth";
import { extractPdfMetadata } from "../lib/documents";
import { uploadBuffer } from "../lib/storage";
import {
  serializeLibraryDocument,
  serializeLibraryCategory,
} from "../lib/serialize";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

router.post("/admin/login", async (req, res): Promise<void> => {
  if (!adminPasswordConfigured() || !sessionSecretConfigured()) {
    res.status(503).json({ error: "لم يتم تكوين كلمة مرور المشرف" });
    return;
  }
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!checkAdminPassword(parsed.data.password)) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }
  res.json({ token: signAdminToken() });
});

router.get("/admin/library", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(libraryDocumentsTable);
  res.json(rows.map(serializeLibraryDocument));
});

router.post(
  "/admin/library/upload",
  requireAdmin,
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
      // File-first import: the original is stored unchanged and templates are
      // NEVER converted to HTML. DOCX is previewed/edited via the TEMPLATE
      // pipeline (LibreOffice + text-node edits); PDF is stored and previewed
      // as-is, with only lightweight metadata extracted.
      const fileType = isPdf ? "pdf" : "docx";
      const mime = isPdf ? PDF_MIME : DOCX_MIME;
      const originalFileUrl = await uploadBuffer(req.file.buffer, mime);

      let pageCount: number | null = null;
      let extractedTitle = "";
      if (isPdf) {
        const meta = await extractPdfMetadata(req.file.buffer);
        pageCount = meta.pageCount;
        extractedTitle = meta.title;
      }

      const body = req.body as Record<string, string | undefined>;
      const tags = (body.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const values = {
        title: body.title?.trim() || extractedTitle || req.file.originalname,
        description: body.description?.trim() ?? "",
        documentType: body.documentType?.trim() || "master_template",
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
        richContent: "",
        layoutMetadata: {},
        status: body.status?.trim() || "published",
      };

      const replaceId = body.id ? Number.parseInt(body.id, 10) : NaN;

      // When an `id` is supplied, replace the file (and refresh metadata) of an
      // existing document instead of creating a new one.
      if (Number.isInteger(replaceId)) {
        const [doc] = await db
          .update(libraryDocumentsTable)
          .set(values)
          .where(eq(libraryDocumentsTable.id, replaceId))
          .returning();

        if (!doc) {
          res.status(404).json({ error: "المستند غير موجود" });
          return;
        }
        res.status(200).json(serializeLibraryDocument(doc));
        return;
      }

      const [doc] = await db
        .insert(libraryDocumentsTable)
        .values(values)
        .returning();

      res.status(201).json(serializeLibraryDocument(doc));
    } catch (err) {
      req.log.error({ err }, "Failed to import library document");
      res.status(400).json({ error: "تعذّر معالجة الملف المرفوع" });
    }
  },
);

router.patch(
  "/admin/library/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateLibraryDocumentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateLibraryDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [doc] = await db
      .update(libraryDocumentsTable)
      .set(parsed.data)
      .where(eq(libraryDocumentsTable.id, params.data.id))
      .returning();

    if (!doc) {
      res.status(404).json({ error: "المستند غير موجود" });
      return;
    }
    res.json(serializeLibraryDocument(doc));
  },
);

router.delete(
  "/admin/library/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteLibraryDocumentParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [doc] = await db
      .delete(libraryDocumentsTable)
      .where(eq(libraryDocumentsTable.id, params.data.id))
      .returning();
    if (!doc) {
      res.status(404).json({ error: "المستند غير موجود" });
      return;
    }
    res.sendStatus(204);
  },
);

router.post(
  "/admin/categories",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = CreateLibraryCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [category] = await db
      .insert(libraryCategoriesTable)
      .values({ kind: parsed.data.kind, name: parsed.data.name })
      .returning();
    res.status(201).json(serializeLibraryCategory(category));
  },
);

router.delete(
  "/admin/categories/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteLibraryCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [category] = await db
      .delete(libraryCategoriesTable)
      .where(eq(libraryCategoriesTable.id, params.data.id))
      .returning();
    if (!category) {
      res.status(404).json({ error: "التصنيف غير موجود" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
