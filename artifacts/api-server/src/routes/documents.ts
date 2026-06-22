import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { parseDocument } from "../lib/documents";
import { buildDocx } from "../lib/export";
import { buildPdf } from "../lib/pdf";
import { buildDocxFromRich, buildPdfFromRich } from "../lib/rich-export";

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

  const rawFormat = Array.isArray(req.query.format)
    ? req.query.format[0]
    : req.query.format;
  const format = rawFormat || "docx";
  if (format !== "docx" && format !== "pdf") {
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

  const base = project.title || "research";
  const hasRich = Boolean(project.richContent && project.richContent.trim());

  try {
    if (format === "pdf") {
      const buffer = hasRich
        ? await buildPdfFromRich(project)
        : await buildPdf(project);
      const filename = encodeURIComponent(`${base}.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      );
      res.send(buffer);
      return;
    }

    const buffer = hasRich
      ? await buildDocxFromRich(project)
      : await buildDocx(project);
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
    req.log.error({ err, format }, "Failed to export project document");
    res.status(500).json({ error: "تعذّر إنشاء ملف التصدير" });
  }
});

export default router;
