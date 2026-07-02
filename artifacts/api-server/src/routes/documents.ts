import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, projectsTable, templatesTable } from "@workspace/db";
import { parseDocument } from "../lib/documents";
import { buildDocx } from "../lib/export";
import { buildPdf } from "../lib/pdf";
import { buildDocxFromRich, buildPdfFromRich } from "../lib/rich-export";
import { applyTemplateEdits, convertDocxToPdf, convertDocxToFormat } from "../lib/docx-template";
import { downloadObjectToBuffer } from "../lib/storage";
import { z } from "zod/v4";
import { chatStructured } from "../lib/gemini";
import { buildFormattedDocument } from "../lib/format-pipeline";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

      // Attempt AI analysis to recognize university and suggest template
      let analysis = null;
      try {
        const templates = await db.select().from(templatesTable);
        if (templates.length > 0) {
          const analysisSchema = z.object({
            university: z.string().optional().nullable(),
            faculty: z.string().optional().nullable(),
            title: z.string().optional().nullable(),
            matchedTemplateId: z.number().optional().nullable(),
          });

          const systemPrompt = `أنت خبير تحليل أكاديمي. مهمتك هي قراءة مقتطف من ملف أكاديمي واستخراج بيانات التنسيق والجامعة وتحديد القالب المطابق من قائمة القوالب المتوفرة بالمنصة.`;

          const userPrompt = `مقتطف من الملف:
${text.substring(0, 3000)}

قائمة القوالب المتوفرة بالمنصة (معرّف ID - الاسم - التصنيف - الوصف):
${templates.map(t => `${t.id} - ${t.name} - ${t.category} - ${t.description}`).join("\n")}

استخرج البيانات المطلوبة بصيغة JSON مطابقة للمخطط التالي:
{
  "university": "اسم الجامعة المكتشفة بالملف المرفوع أو null",
  "faculty": "اسم الكلية أو القسم المكتشف بالملف المرفوع أو null",
  "title": "عنوان البحث أو المشروع المكتشف بالملف المرفوع أو null",
  "matchedTemplateId": معرّف القالب المطابق من القائمة إذا وجد تطابق قوي جداً مع الجامعة والكلية، وإلا null
}`;

          analysis = await chatStructured(systemPrompt, userPrompt, analysisSchema, { temperature: 0.1 });
        }
      } catch (aiErr) {
        req.log.warn({ err: aiErr }, "Failed to auto-detect document metadata via Gemini");
      }

      res.json({ text, analysis });
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
  const format = (rawFormat || "docx").toString().toLowerCase();
  if (format !== "docx" && format !== "pdf" && format !== "rtf" && format !== "odt") {
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

  // TEMPLATE mode
  if (project.documentMode === "TEMPLATE") {
    if (!project.templateFileUrl) {
      req.log.error({ projectId: id }, "TEMPLATE project missing templateFileUrl");
      res.status(500).json({ error: "ملف القالب الأصلي غير متوفر" });
      return;
    }
    try {
      const { buffer: original } = await downloadObjectToBuffer(
        project.templateFileUrl,
      );
      const docx = await applyTemplateEdits(original, project.templateContent);

      if (format !== "docx") {
        const converted = await convertDocxToFormat(docx, format as "pdf" | "rtf" | "odt");
        const mimeTypes = {
          pdf: "application/pdf",
          rtf: "application/rtf",
          odt: "application/vnd.oasis.opendocument.text"
        };
        const mime = mimeTypes[format as "pdf" | "rtf" | "odt"] || "application/octet-stream";
        const filename = encodeURIComponent(`${base}.${format}`);
        res.setHeader("Content-Type", mime);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
        );
        res.send(converted);
        return;
      }

      const filename = encodeURIComponent(`${base}.docx`);
      res.setHeader("Content-Type", DOCX_MIME);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      );
      res.send(docx);
      return;
    } catch (err) {
      req.log.error({ err, format }, "Failed to export template document");
      res.status(500).json({ error: "تعذّر إنشاء ملف التصدير" });
      return;
    }
  }

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  if (!project.richContent || !project.richContent.trim()) {
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

  const hasRich = true;

  try {
    if (format === "pdf") {
      const buffer = await buildPdfFromRich(project);
      const filename = encodeURIComponent(`${base}.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      );
      res.send(buffer);
      return;
    }

    let buffer = await buildDocxFromRich(project);

    if (format === "rtf" || format === "odt") {
      buffer = await convertDocxToFormat(buffer, format);
    }

    const mimeTypes = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      rtf: "application/rtf",
      odt: "application/vnd.oasis.opendocument.text"
    };
    const mime = mimeTypes[format as "docx" | "rtf" | "odt"] || "application/octet-stream";
    const filename = encodeURIComponent(`${base}.${format}`);

    res.setHeader("Content-Type", mime);
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

// Live PDF preview for TEMPLATE projects — renders the real DOCX (with saved
// edits applied) via LibreOffice and serves it inline for an <iframe>.
router.get("/projects/:id/preview.pdf", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "معرّف غير صالح" });
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

  if (project.documentMode !== "TEMPLATE" || !project.templateFileUrl) {
    res.status(400).json({ error: "المعاينة متاحة لمستندات القوالب فقط" });
    return;
  }

  try {
    const { buffer: original } = await downloadObjectToBuffer(
      project.templateFileUrl,
    );
    const docx = await applyTemplateEdits(original, project.templateContent);
    const pdf = await convertDocxToPdf(docx);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.send(pdf);
  } catch (err) {
    req.log.error({ err }, "Failed to render template preview");
    res.status(500).json({ error: "تعذّرت معاينة المستند" });
  }
});

export default router;
