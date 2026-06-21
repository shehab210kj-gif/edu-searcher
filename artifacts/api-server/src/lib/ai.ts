import { chatJSON, chatText } from "./gemini";
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

export async function analyzeContent(
  project: Project,
): Promise<{ analysis: Analysis; sections: Section[] }> {
  const system = `أنت محرر أكاديمي خبير متخصص في تنسيق وهيكلة الأبحاث العلمية باللغة العربية. مهمتك تحليل نص بحثي وتحديد نوعه وبنيته وتقسيمه إلى أقسام منظمة. أعد النتيجة بصيغة JSON فقط.`;

  const user = `حلّل البحث التالي.
العنوان: ${project.title}
نوع العمل: ${project.workType}
نمط التوثيق: ${project.citationStyle}
لغة البحث: ${project.language}

النص:
"""
${truncate(project.rawContent)}
"""

أعد كائن JSON بالشكل التالي بالضبط:
{
  "analysis": {
    "researchType": "نوع البحث المكتشف",
    "pageCount": عدد الصفحات التقريبي (رقم صحيح),
    "language": "لغة البحث",
    "specialization": "التخصص العلمي",
    "summary": "ملخص موجز للبحث في 2-3 جمل",
    "detectedSections": ["عناوين الأقسام المكتشفة"]
  },
  "sections": [
    { "key": "معرف_فريد_بالإنجليزية", "heading": "عنوان القسم بالعربية", "content": "محتوى القسم منسقاً ومحرراً" }
  ]
}

قسّم النص إلى أقسام أكاديمية منطقية (مثل: المقدمة، مشكلة الدراسة، الأهداف، الإطار النظري، الدراسات السابقة، المنهجية، النتائج، المناقشة، الخاتمة، التوصيات). حسّن صياغة المحتوى أكاديمياً مع الحفاظ على المعنى الأصلي.`;

  return chatJSON<{ analysis: Analysis; sections: Section[] }>(system, user);
}

export async function extractReferences(
  project: Project,
): Promise<Reference[]> {
  const system = `أنت متخصص في التوثيق الأكاديمي وإدارة المراجع. مهمتك استخراج المراجع من نص بحثي وتنسيقها وفق النمط المطلوب. أعد النتيجة بصيغة JSON فقط.`;

  const sectionsText = project.sections
    .map((s) => `${s.heading}\n${s.content}`)
    .join("\n\n");
  const sourceText = sectionsText.trim() || project.rawContent;

  const user = `استخرج جميع المراجع والاستشهادات من البحث التالي ونسّقها وفق نمط ${project.citationStyle}.

النص:
"""
${truncate(sourceText)}
"""

أعد كائن JSON بالشكل التالي بالضبط:
{
  "references": [
    {
      "id": "معرف_فريد",
      "raw": "المرجع كما ورد في النص (إن وُجد)",
      "formatted": "المرجع منسقاً بالكامل وفق نمط ${project.citationStyle}",
      "type": "نوع المرجع (كتاب/مقال/رسالة/موقع)",
      "authors": "المؤلفون",
      "year": "سنة النشر",
      "title": "العنوان",
      "source": "المصدر أو دار النشر",
      "inTextCitation": "صيغة الاستشهاد داخل النص"
    }
  ]
}

إذا لم تجد مراجع صريحة، استنتج المراجع المحتملة من الإشارات داخل النص. رتّب المراجع أبجدياً وفق قواعد نمط ${project.citationStyle}.`;

  const result = await chatJSON<{ references: Reference[] }>(system, user);
  return result.references ?? [];
}

export async function verifyProject(
  project: Project,
): Promise<Verification> {
  const system = `أنت مدقق أكاديمي صارم متخصص في تقييم جاهزية الأبحاث العلمية للنشر. مهمتك تقييم البحث وإعطاء درجة جاهزية ورصد المشكلات. أعد النتيجة بصيغة JSON فقط.`;

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

أعد كائن JSON بالشكل التالي بالضبط (الدرجات من 0 إلى 100):
{
  "verification": {
    "readinessScore": الدرجة الإجمالية للجاهزية,
    "completeness": درجة اكتمال الأقسام,
    "citations": درجة جودة التوثيق والمراجع,
    "indexing": درجة الفهرسة والتنظيم,
    "formatting": درجة التنسيق,
    "issues": [
      {
        "type": "نوع المشكلة (اكتمال/توثيق/فهرسة/تنسيق/لغة)",
        "severity": "high أو medium أو low",
        "message": "وصف المشكلة بالعربية",
        "location": "موضع المشكلة أو null",
        "suggestion": "اقتراح للإصلاح أو null"
      }
    ]
  }
}

كن دقيقاً وعادلاً في التقييم. اذكر المشكلات الحقيقية فقط.`;

  const result = await chatJSON<{ verification: Verification }>(system, user);
  return result.verification;
}

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

نفّذ الإجراء المطلوب وقدّم نتيجة واضحة ومفيدة باللغة العربية.`;

  const result = await chatText(system, user);
  return { result };
}
