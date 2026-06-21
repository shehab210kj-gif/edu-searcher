import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { parseDocument } from "../lib/documents";
import { buildDocx } from "../lib/export";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post(
  "/parse-document",
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم رفع أي ملف" });
      return;
    }

    try {
      const text = await parseDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
      res.json({ text });
    } catch (err) {
      req.log.error({ err }, "Failed to parse uploaded document");
      const message =
        err instanceof Error ? err.message : "تعذّر قراءة الملف";
      res.status(400).json({ error: message });
    }
  },
);

router.get("/projects/:id/export", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  const format = Array.isArray(req.query.format)
    ? req.query.format[0]
    : req.query.format;
  if (format && format !== "docx") {
    res.status(400).json({ error: "صيغة التصدير غير مدعومة" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id));

  if (!project) {
    res.status(404).json({ error: "المشروع غير موجود" });
    return;
  }

  const buffer = await buildDocx(project);
  const filename = encodeURIComponent(`${project.title || "research"}.docx`);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
  );
  res.send(buffer);
});

export default router;
