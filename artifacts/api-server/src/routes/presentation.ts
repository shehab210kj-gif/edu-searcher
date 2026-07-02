import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import pptxgen from "pptxgenjs";

const router: IRouter = Router();

router.get("/projects/:id/export-presentation", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "معرّف غير صالح" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id));

    if (!project) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";
    pptx.rtlMode = true; // Enable Right-to-Left presentation-wide
    pptx.defineSlideMaster({
      title: "ACADEMIC_THEME",
      background: { color: "F4F6F9" },
      slideNumber: { x: "90%", y: "90%", fontFace: "Arial", fontSize: 10, color: "555555" },
    });

    // 1. Title Slide
    const titleSlide = pptx.addSlide();
    // Dark premium background for title slide
    titleSlide.background = { color: "1E293B" }; 

    titleSlide.addText(project.title, {
      x: "10%",
      y: "35%",
      w: "80%",
      h: "20%",
      fontSize: 32,
      bold: true,
      color: "F1F5F9",
      fontFace: "Arial",
      align: "center",
    });

    titleSlide.addText(project.workType, {
      x: "10%",
      y: "55%",
      w: "80%",
      h: "10%",
      fontSize: 18,
      color: "38BDF8", // Cyan subtitle accent
      fontFace: "Arial",
      align: "center",
    });

    titleSlide.addText(`نمط التوثيق: ${project.citationStyle} | اللغة: ${project.language}`, {
      x: "10%",
      y: "75%",
      w: "80%",
      h: "10%",
      fontSize: 12,
      color: "94A3B8",
      fontFace: "Arial",
      align: "center",
    });

    // 2. Content Slides from project sections
    const sections = project.sections || [];
    sections.forEach((sec) => {
      const slide = pptx.addSlide({ masterName: "ACADEMIC_THEME" });

      // Title header
      slide.addText(sec.heading, {
        x: "5%",
        y: "8%",
        w: "90%",
        h: "10%",
        fontSize: 24,
        bold: true,
        color: "1E293B",
        fontFace: "Arial",
        align: "right",
      });

      // Gold bottom accent line under header
      slide.addShape("rect", {
        x: "5%",
        y: "20%",
        w: "90%",
        h: 0.05,
        fill: { color: "F59E0B" }, // Amber/gold accent line
      });

      // Split body text by paragraph
      const paragraphs = sec.content
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 10)
        .slice(0, 4); // Limit to top 4 paragraphs per slide

      if (paragraphs.length > 0) {
        const textObjects = paragraphs.map((para) => {
          // clean markdown
          const cleanText = para
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/•\s*/g, "");
          return {
            text: `• ${cleanText}`,
            options: { fontSize: 14, color: "334155", fontFace: "Arial" },
          };
        });

        slide.addText(textObjects, {
          x: "5%",
          y: "26%",
          w: "90%",
          h: "60%",
          align: "right",
        });
      } else {
        slide.addText("لا يوجد محتوى في هذا القسم بعد.", {
          x: "5%",
          y: "30%",
          w: "90%",
          h: "20%",
          fontSize: 14,
          color: "64748B",
          fontFace: "Arial",
          align: "right",
        });
      }
    });

    // 3. References Slide (if any references exist)
    const refs = project.references || [];
    if (refs.length > 0) {
      const refSlide = pptx.addSlide({ masterName: "ACADEMIC_THEME" });

      refSlide.addText("المراجع والمصادر", {
        x: "5%",
        y: "8%",
        w: "90%",
        h: "10%",
        fontSize: 24,
        bold: true,
        color: "1E293B",
        fontFace: "Arial",
        align: "right",
      });

      refSlide.addShape("rect", {
        x: "5%",
        y: "20%",
        w: "90%",
        h: 0.05,
        fill: { color: "F59E0B" },
      });

      const refItems = refs.slice(0, 6).map((ref) => {
        return {
          text: `• ${ref.formatted}`,
          options: { fontSize: 12, color: "334155", fontFace: "Arial" },
        };
      });

      refSlide.addText(refItems, {
        x: "5%",
        y: "26%",
        w: "90%",
        h: "60%",
        align: "right",
      });
    }

    const buffer = await pptx.write({ outputType: "nodebuffer" });
    const filename = encodeURIComponent(`${project.title || "presentation"}.pptx`);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    );
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to generate PPTX presentation");
    res.status(500).json({ error: "تعذّر إنشاء العرض التقديمي" });
  }
});

export default router;
