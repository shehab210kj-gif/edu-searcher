import { z } from "zod/v4";
import { Type, type Schema } from "@google/genai";
import { chatStructured } from "./gemini";
import type {
  Analysis,
  Section,
  Reference,
  Verification,
  Project,
} from "@workspace/db";

function truncate(text: string, max = 16000): string {
  return text.length > max ? text.slice(0, max) : text;
}

function slugKey(heading: string, index: number): string {
  const base = heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base ? `${base}-${index + 1}` : `section-${index + 1}`;
}

// ---------------------------------------------------------------------------
// Analyze & structure
// ---------------------------------------------------------------------------

const analysisZod = z.object({
  researchType: z.string(),
  pageCount: z.number().int().nonnegative(),
  language: z.string(),
  specialization: z.string(),
  summary: z.string(),
  detectedSections: z.array(z.string()),
});

const analyzeResponseZod = z.object({
  analysis: analysisZod,
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        level: z.union([z.literal(1), z.literal(2)]),
        content: z.string(),
      }),
    )
    .min(1),
});

const analyzeResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.OBJECT,
      properties: {
        researchType: { type: Type.STRING },
        pageCount: { type: Type.INTEGER },
        language: { type: Type.STRING },
        specialization: { type: Type.STRING },
        summary: { type: Type.STRING },
        detectedSections: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        "researchType",
        "pageCount",
        "language",
        "specialization",
        "summary",
        "detectedSections",
      ],
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          level: { type: Type.INTEGER },
          content: { type: Type.STRING },
        },
        required: ["heading", "level", "content"],
      },
    },
  },
  required: ["analysis", "sections"],
};

export async function analyzeContent(
  project: Project,
): Promise<{ analysis: Analysis; sections: Section[] }> {
  const layout = (project.layoutMetadata as any) || {};
  const targetPageCount = layout.targetPageCount || "unlimited";

  let expansionInstruction = "";
  if (targetPageCount && targetPageCount !== "unlimited") {
    expansionInstruction = `
[توجيه هام جداً للتوسع وتلبية حجم الصفحات المستهدف]:
الهدف هو توليد محتوى غني ومفصل يناسب حجم الصفحات المستهدف (${targetPageCount} صفحات).
إذا كانت مدخلات المستخدم أو متطلبات الواجب قصيرة أو مختصرة، يجب عليك التوسع في شرح وتفصيل المفاهيم، الخلفية العلمية، الأفكار الفرعية، والخطوات التفصيلية.
يرجى اتباع الأسلوب الأكاديمي التفصيلي المنظم:
1. استخدم القوائم المنقطة والمفصلة (bullet points) متبوعة بشروحات وافية لكل نقطة بدلاً من الفقرات الطويلة المصمتة (الدش الأعمى).
2. اشرح النظريات ذات الصلة والمفاهيم العلمية بالتفصيل وادعمها بأمثلة تطبيقية.
3. قسّم المحتوى إلى أقسام فرعية منطقية (Level 2) متعددة وتعمق في تفاصيل كل منها لتعبئة المساحة الأكاديمية المطلوبة بذكاء وبناء علمي حقيقي دون حشو مكرر.
`;
  } else {
    expansionInstruction = `
إذا كانت مدخلات المستخدم قصيرة أو مختصرة، يرجى التوسع فيها وصياغتها وتفصيلها بأسلوب أكاديمي منظم مستخدماً القوائم المنقطة والشروحات المنظمة بدلاً من الفقرات الطويلة المصمتة (الدش).
`;
  }

  const system = `أنت محرر أكاديمي خبير متخصص في تنسيق وتوسيع وهيكلة الأبحاث العلمية باللغة العربية. مهمتك تحليل نص متطلبات الواجب أو التكليف، وتوليد وتطوير محتوى أكاديمي كامل ومفصل بناءً عليه وتحديد نوعه وبنيته وتقسيمه إلى أقسام منظمة بشكل منسق. ${expansionInstruction}`;

  const user = `حلّل وطوّر البحث التالي.
العنوان: ${project.title}
نوع العمل: ${project.workType}
نمط التوثيق: ${project.citationStyle}
لغة البحث: ${project.language}
عدد الصفحات المستهدف: ${targetPageCount === "unlimited" ? "تلقائي" : targetPageCount}

النص ومتطلبات التكليف:
"""
${truncate(project.rawContent)}
"""

أعد كائن JSON بالحقول التالية:
- analysis: { researchType, pageCount (عدد صحيح يدل على عدد الصفحات الفعلي بعد التوليد), language, specialization, summary (2-3 جمل)، detectedSections (مصفوفة نصية) }
- sections: مصفوفة من { heading (عنوان القسم بالعربية), level (1 للقسم الرئيسي أو 2 للقسم الفرعي), content (محتوى القسم منسقاً ومحرراً ومفصلاً بالكامل مع استخدام القوائم النقطية والشروحات الأكاديمية) }

قسّم النص إلى أقسام أكاديمية منطقية (مثل: المقدمة، مشكلة الدراسة، الأهداف، الإطار النظري، الدراسات السابقة، المنهجية، النتائج، المناقشة، الخاتمة، التوصيات). استخدم level=2 للأقسام الفرعية داخل قسم رئيسي. حسّن صياغة المحتوى أكاديمياً وتوسع فيه بالكامل بما يتلاءم مع حجم الصفحات المستهدف.`;

  const data = await chatStructured(system, user, analyzeResponseZod, {
    responseSchema: analyzeResponseSchema,
    temperature: 0.3,
  });

  const sections: Section[] = data.sections.map((s, i) => ({
    key: slugKey(s.heading, i),
    heading: s.heading,
    level: s.level,
    content: s.content,
  }));

  return { analysis: data.analysis, sections };
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

const referencesResponseZod = z.object({
  references: z.array(
    z.object({
      author: z.string(),
      year: z.string(),
      title: z.string(),
      source: z.string(),
      type: z.string().optional(),
      inTextCitation: z.string().optional(),
    }),
  ),
});

const referencesResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    references: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          author: { type: Type.STRING },
          year: { type: Type.STRING },
          title: { type: Type.STRING },
          source: { type: Type.STRING },
          type: { type: Type.STRING },
          inTextCitation: { type: Type.STRING },
        },
        required: ["author", "year", "title", "source"],
      },
    },
  },
  required: ["references"],
};

export async function extractReferences(
  project: Project,
): Promise<Reference[]> {
  const system = `أنت متخصص في التوثيق الأكاديمي وإدارة المراجع. مهمتك استخراج المراجع من نص بحثي وتنسيقها وفق النمط المطلوب.`;

  const sectionsText = project.sections
    .map((s) => `${s.heading}\n${s.content}`)
    .join("\n\n");
  const sourceText = sectionsText.trim() || project.rawContent;

  const user = `استخرج جميع المراجع والاستشهادات من البحث التالي ونسّقها وفق نمط ${project.citationStyle}.

النص:
"""
${truncate(sourceText)}
"""

أعد كائن JSON بالحقل references وهو مصفوفة من العناصر بالحقول التالية:
- author: اسم المؤلف أو المؤلفين
- year: سنة النشر
- title: عنوان المرجع
- source: المصدر أو دار النشر أو اسم المجلة
- type: نوع المرجع (كتاب/مقال/رسالة/موقع)
- inTextCitation: صيغة الاستشهاد داخل النص

إذا لم تجد مراجع صريحة، أعد مصفوفة references فارغة. رتّب المراجع وفق قواعد نمط ${project.citationStyle}.`;

  const data = await chatStructured(system, user, referencesResponseZod, {
    responseSchema: referencesResponseSchema,
    temperature: 0.3,
  });

  return data.references.map((r, i) => {
    const formatted = `${r.author} (${r.year}). ${r.title}. ${r.source}.`
      .replace(/\s+/g, " ")
      .trim();
    return {
      id: `ref-${i + 1}`,
      authors: r.author,
      year: r.year,
      title: r.title,
      source: r.source,
      type: r.type,
      inTextCitation: r.inTextCitation,
      formatted,
    } satisfies Reference;
  });
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const verificationResponseZod = z.object({
  verification: z.object({
    readinessScore: z.number().int().min(0).max(100),
    completeness: z.number().int().min(0).max(100),
    citations: z.number().int().min(0).max(100),
    indexing: z.number().int().min(0).max(100),
    formatting: z.number().int().min(0).max(100),
    issues: z.array(
      z.object({
        type: z.string(),
        severity: z.string(),
        message: z.string(),
        location: z.string().nullable().optional(),
        suggestion: z.string().nullable().optional(),
      }),
    ),
  }),
});

const verificationResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verification: {
      type: Type.OBJECT,
      properties: {
        readinessScore: { type: Type.INTEGER },
        completeness: { type: Type.INTEGER },
        citations: { type: Type.INTEGER },
        indexing: { type: Type.INTEGER },
        formatting: { type: Type.INTEGER },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              severity: { type: Type.STRING },
              message: { type: Type.STRING },
              location: { type: Type.STRING, nullable: true },
              suggestion: { type: Type.STRING, nullable: true },
            },
            required: ["type", "severity", "message"],
          },
        },
      },
      required: [
        "readinessScore",
        "completeness",
        "citations",
        "indexing",
        "formatting",
        "issues",
      ],
    },
  },
  required: ["verification"],
};

export async function verifyProject(project: Project): Promise<Verification> {
  const system = `أنت مدقق أكاديمي صارم متخصص في تقييم جاهزية الأبحاث العلمية للنشر. مهمتك تقييم البحث وإعطاء درجة جاهزية ورصد المشكلات.`;

  const sectionsText = project.sections
    .map((s) => `[${s.heading}]\n${s.content}`)
    .join("\n\n");
  const refsText = project.references.map((r) => r.formatted).join("\n");

  const user = `قيّم جاهزية البحث الأكاديمي التالي للنشر.
العنوان: ${project.title}
نوع العمل: ${project.workType}
نمط التوثيق: ${project.citationStyle}
عدد الأقسام: ${project.sections.length}
عدد المراجع: ${project.references.length}

محتوى الأقسام:
"""
${truncate(sectionsText || project.rawContent, 12000)}
"""

المراجع:
"""
${truncate(refsText, 3000)}
"""

أعد كائن JSON بالحقل verification (الدرجات من 0 إلى 100):
{ readinessScore, completeness, citations, indexing, formatting, issues: [ { type (اكتمال/توثيق/فهرسة/تنسيق/لغة), severity (high|medium|low), message (بالعربية), location (أو null), suggestion (أو null) } ] }

كن دقيقاً وعادلاً في التقييم. اذكر المشكلات الحقيقية فقط.`;

  const data = await chatStructured(system, user, verificationResponseZod, {
    responseSchema: verificationResponseSchema,
    temperature: 0.3,
  });

  return data.verification;
}

// ---------------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------------

const assistResponseZod = z.object({
  result: z.string(),
  suggestions: z.array(z.string()).optional(),
});

const assistResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    result: { type: Type.STRING },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["result"],
};

export async function assist(
  project: Project,
  action: string,
  instructions?: string,
  context?: string,
): Promise<{ result: string; suggestions?: string[] }> {
  const system = `أنت مساعد أكاديمي ذكي يساعد الباحثين في تحسين أبحاثهم العلمية باللغة العربية. قدّم مساعدة دقيقة ومهنية ومفيدة.`;

  const projectContext = `العنوان: ${project.title}
نوع العمل: ${project.workType}
نمط التوثيق: ${project.citationStyle}
ملخص: ${project.analysis?.summary ?? "غير متوفر"}`;

  const user = `سياق البحث:
${projectContext}

الإجراء المطلوب: ${action}
${instructions ? `تعليمات إضافية: ${instructions}` : ""}
${context ? `النص المحدد للعمل عليه:\n"""\n${truncate(context, 8000)}\n"""` : ""}

نفّذ الإجراء المطلوب وأعد كائن JSON بالحقل result (نص الإجابة بالعربية) وحقل اختياري suggestions (مصفوفة اقتراحات قصيرة).`;

  return chatStructured(system, user, assistResponseZod, {
    responseSchema: assistResponseSchema,
    temperature: 0.4,
  });
}
