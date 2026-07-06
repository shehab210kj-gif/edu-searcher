import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import pptxgen from "pptxgenjs";
import { gemini, GEMINI_MODEL, chatStructured } from "../lib/gemini";
import { z } from "zod/v4";
import { Schema, Type } from "@google/genai";

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

    const sections = project.sections || [];

    // Call Gemini once to summarize all sections into slide bullets
    const slidesMap: Record<string, string[]> = {};
    if (gemini && sections.length > 0) {
      try {
        const sectionsData = sections.map(s => ({
          heading: s.heading,
          content: s.content.replace(/<[^>]*>/g, " ").trim().slice(0, 1500)
        }));

        const systemPrompt = `أنت خبير إعداد عروض تقديمية (PowerPoint/Keynote) أكاديمية ومهنية. مهمتك هي تلخيص محتوى فصول/أقسام البحث إلى نقاط مختصرة وموجزة جداً قابلة للعرض المباشر على الشرائح.`;
        const userPrompt = `
إليك أقسام البحث العلمي:
${JSON.stringify(sectionsData, null, 2)}

لخص كل قسم إلى 3-5 نقاط (bullets) باللغة العربية تكون مركزة جداً ومناسبة للشرائح (كل نقطة لا تتعدى 10 كلمات).
أعد المخرجات كـ JSON كائن يحتوي على حقل "slides" وهو عبارة عن مصفوفة من الكائنات، كل منها يحتوي على:
1. "heading" (نص): عنوان القسم كما هو.
2. "bullets" (مصفوفة نصوص): النقاط التلخيصية المختصرة.
`;

        const responseSchema: Schema = {
          type: Type.OBJECT,
          properties: {
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  bullets: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["heading", "bullets"]
              }
            }
          },
          required: ["slides"]
        };

        const result: any = await chatStructured(
          systemPrompt,
          userPrompt,
          z.object({
            slides: z.array(z.object({
              heading: z.string(),
              bullets: z.array(z.string())
            }))
          }) as any,
          {
            responseSchema,
            temperature: 0.3
          }
        );

        if (result && Array.isArray(result.slides)) {
          for (const s of result.slides) {
            slidesMap[s.heading] = s.bullets;
          }
        }
      } catch (err) {
        req.log.warn({ err }, "Gemini presentation summarization failed, falling back to basic split");
      }
    }

    // Map theme colors based on cover style
    let primaryColor = "1E3A8A";
    let accentColor = "F59E0B";
    let slideBg = "F8FAFC";
    let textColor = "334155";
    let titleBg = "1E293B";
    let titleColor = "F1F5F9";
    let subtitleColor = "38BDF8";

    const layout = (project.layoutMetadata as any) || {};
    const coverHtmlStr = layout.coverPageHtml || "";
    const coverObj = layout.cover || {};

    if (coverHtmlStr.includes("modern") || coverHtmlStr.includes("0a1628")) {
      primaryColor = "4F46E5"; // Indigo
      accentColor = "10B981";  // Emerald
      slideBg = "0B1329";      // Dark Slate
      textColor = "E2E8F0";    // Light slate text
      titleBg = "0B1329";
      titleColor = "FFFFFF";
      subtitleColor = "10B981";
    } else if (coverHtmlStr.includes("framed") || coverHtmlStr.includes("F8F4EE")) {
      primaryColor = "065F46"; // Emerald
      accentColor = "C9A84C";  // Gold
      slideBg = "FAF7F2";      // Ivory background
      textColor = "0D3320";    // Dark forest text
      titleBg = "065F46";
      titleColor = "F0E6C8";
      subtitleColor = "C9A84C";
    }

    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";
    pptx.rtlMode = true; // Enable Right-to-Left presentation-wide
    pptx.defineSlideMaster({
      title: "ACADEMIC_THEME",
      background: { color: slideBg },
      slideNumber: { x: "90%", y: "90%", fontFace: "Arial", fontSize: 10, color: textColor === "E2E8F0" ? "94A3B8" : "555555" },
    });

    // 1. Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: titleBg }; 

    titleSlide.addText(project.title, {
      x: "10%",
      y: "30%",
      w: "80%",
      h: "20%",
      fontSize: 32,
      bold: true,
      color: titleColor,
      fontFace: "Arial",
      align: "center",
    });

    titleSlide.addText(project.workType, {
      x: "10%",
      y: "52%",
      w: "80%",
      h: "10%",
      fontSize: 18,
      color: subtitleColor,
      fontFace: "Arial",
      align: "center",
    });

    if (coverObj.studentName) {
      titleSlide.addText(`إعداد الطالب/الطالبة: ${coverObj.studentName}`, {
        x: "10%",
        y: "65%",
        w: "80%",
        h: "8%",
        fontSize: 14,
        color: textColor === "E2E8F0" ? "CBD5E1" : "475569",
        fontFace: "Arial",
        align: "center",
      });
    }

    titleSlide.addText(`نمط التوثيق: ${project.citationStyle} | اللغة: ${project.language}`, {
      x: "10%",
      y: "78%",
      w: "80%",
      h: "10%",
      fontSize: 11,
      color: textColor === "E2E8F0" ? "94A3B8" : "64748B",
      fontFace: "Arial",
      align: "center",
    });

    // 2. Content Slides from project sections
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
        color: primaryColor,
        fontFace: "Arial",
        align: "right",
      });

      // Bottom accent line under header
      slide.addShape("rect", {
        x: "5%",
        y: "20%",
        w: "90%",
        h: 0.04,
        fill: { color: accentColor },
      });

      // Get summarized bullets or fallback to split paragraphs
      let bullets = slidesMap[sec.heading];
      if (!bullets || bullets.length === 0) {
        bullets = sec.content
          .split(/\n+/)
          .map((p) => p.replace(/<[^>]*>/g, " ").trim())
          .filter((p) => p.length > 10)
          .slice(0, 4);
      }

      if (bullets.length > 0) {
        const textObjects = bullets.map((bulletText) => {
          const cleanText = bulletText
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/•\s*/g, "")
            .replace(/^-+\s*/, "");
          return {
            text: `• ${cleanText}`,
            options: { fontSize: 14, color: textColor, fontFace: "Arial" },
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
          color: textColor === "E2E8F0" ? "94A3B8" : "64748B",
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
