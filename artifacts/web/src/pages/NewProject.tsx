import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useListTemplates } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, UploadCloud, FileText, Wand2, Settings2, Type,
  AlignRight, CheckSquare, Copy, BookOpen, Lightbulb, ChevronDown, ChevronUp,
  Layout, AlignCenter, AlignLeft, AlignJustify, GraduationCap, ListTodo
} from "lucide-react";
import { getListProjectsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";

const WORK_TYPES = [
  "بحث علمي",
  "مشروع تخرج",
  "رسالة ماجستير",
  "أطروحة دكتوراه",
  "تقرير تدريبي",
  "دراسة حالة",
  "خطة بحث",
  "عرض تقديمي",
  "ورقة علمية للنشر",
  "واجب جامعي"
];
const CITATION_STYLES = ["APA", "MLA", "Harvard", "Chicago", "IEEE", "Vancouver"];
const LANGUAGES = ["العربية", "English"];

const ARABIC_FONTS = [
  // --- خطوط عربية ---
  "Traditional Arabic",
  "Simplified Arabic",
  "Amiri",
  "Cairo",
  "Tajawal",
  "Scheherazade New",
  "Andalus",
  "Sakkal Majalla",
  "Arabic Typesetting",
  "Dubai",
  "DecoType Naskh",
  "Lateef",
  "Noto Naskh Arabic",
  "Noto Sans Arabic",
  // --- خطوط إنجليزية ---
  "Calibri",
  "Times New Roman",
  "Arial",
  "Cambria",
  "Georgia",
  "Garamond",
  "Century Gothic",
  "Book Antiqua",
  "Courier New",
  "Verdana",
  "Segoe UI",
  "Tahoma",
  "Trebuchet MS"
];

const FONT_SIZES = ["12", "14", "16", "18", "20"];
const HEADING_SIZES = ["16", "18", "20", "22", "24", "26", "28"];
const SUBHEADING_SIZES = ["14", "16", "18", "20", "22"];

const LINE_SPACINGS = [
  { label: "مفرد (1.0)", value: "1.0" },
  { label: "1.15", value: "1.15" },
  { label: "مزدوج (1.5)", value: "1.5" },
  { label: "مضاعف (2.0)", value: "2.0" },
];

const DOCUMENT_PARTS = [
  { id: "cover", label: "غلاف البحث" },
  { id: "toc", label: "فهرس المحتويات" },
  { id: "intro", label: "المقدمة" },
  { id: "body", label: "متن البحث" },
  { id: "conclusion", label: "الخاتمة" },
  { id: "refs", label: "المراجع والمصادر" },
];

const formSchema = z.object({
  title: z.string().min(3, "عنوان المشروع يجب أن يكون 3 أحرف على الأقل"),
  workType: z.string().min(1, "الرجاء اختيار نوع البحث"),
  citationStyle: z.string().min(1, "الرجاء اختيار نمط التوثيق"),
  language: z.string().min(1, "الرجاء اختيار لغة البحث"),
  templateId: z.coerce.number().optional(),
  rawContent: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const { data: templates } = useListTemplates();

  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    title?: string | null;
    university?: string | null;
    faculty?: string | null;
    matchedTemplateId?: number | null;
  } | null>(null);

  // Formatting options state
  const [showFormatting, setShowFormatting] = useState(true);
  const [activeFormattingTab, setActiveFormattingTab] = useState<"fonts" | "layout" | "numbering" | "cover">("fonts");

  // Tab 1: Fonts & Spacing
  const [fontFamily, setFontFamily] = useState("Traditional Arabic");
  const [fontSize, setFontSize] = useState("14");
  const [headingSize, setHeadingSize] = useState("18");
  const [subheadingSize, setSubheadingSize] = useState("16");
  const [lineSpacing, setLineSpacing] = useState("1.5");
  const [paragraphAlign, setParagraphAlign] = useState<"justify" | "right" | "center" | "left">("justify");
  const [firstLineIndent, setFirstLineIndent] = useState("1.25");
  const [textDirection, setTextDirection] = useState<"rtl" | "ltr">("rtl");

  // Tab 2: Page Setup & Margins
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [marginTop, setMarginTop] = useState("2.5");
  const [marginBottom, setMarginBottom] = useState("2.5");
  const [marginLeft, setMarginLeft] = useState("2.5");
  const [marginRight, setMarginRight] = useState("3.0");

  // Tab 3: Page Numbering
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [pageNumberFormat, setPageNumberFormat] = useState("1, 2, 3");
  const [pageNumberAlign, setPageNumberAlign] = useState<"left" | "center" | "right">("center");

  // Tab 4: Cover details
  const [includeCover, setIncludeCover] = useState(true);
  const [coverSubtitle, setCoverSubtitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [university, setUniversity] = useState("");
  const [universityEn, setUniversityEn] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [degree, setDegree] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [coverStyle, setCoverStyle] = useState("classic");
  const [logoPreset, setLogoPreset] = useState("default");
  const [logoUrl, setLogoUrl] = useState("");
  // Border frame
  const [borderColor, setBorderColor] = useState("#1B4FA3");
  const [showPageBorder, setShowPageBorder] = useState(true);

  const [enableSpellCheck, setEnableSpellCheck] = useState(true);
  const [enableDuplicateCheck, setEnableDuplicateCheck] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>(["cover", "toc", "intro", "body", "conclusion", "refs"]);
  const [contentType, setContentType] = useState<"body" | "plan">("body");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      workType: "",
      citationStyle: "",
      language: "العربية",
      rawContent: ""
    }
  });

  const togglePart = (partId: string) => {
    setSelectedParts(prev =>
      prev.includes(partId) ? prev.filter(p => p !== partId) : [...prev, partId]
    );
  };

  const applyMarginPreset = (top: string, bottom: string, left: string, right: string) => {
    setMarginTop(top);
    setMarginBottom(bottom);
    setMarginLeft(left);
    setMarginRight(right);
    toast({ title: "تم تطبيق هوامش الصفحة بنجاح" });
  };

  const onSubmit = (values: FormValues) => {
    const formatting = {
      fontFamily,
      fontSize: parseFloat(fontSize),
      headingSize: parseFloat(headingSize),
      subheadingSize: parseFloat(subheadingSize),
      lineSpacing: parseFloat(lineSpacing),
      pageSize,
      marginTop: parseFloat(marginTop),
      marginBottom: parseFloat(marginBottom),
      marginLeft: parseFloat(marginLeft),
      marginRight: parseFloat(marginRight),
      paragraphAlign,
      firstLineIndent: parseFloat(firstLineIndent),
    };

    // Determine final logo URL
    let finalLogoUrl = "";
    if (logoPreset === "ksu") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/6/69/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B3%D8%B9%D9%88%D8%AF.svg/250px-%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B3%D8%B9%D9%88%D8%AF.svg.png";
    } else if (logoPreset === "kau") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/4/4a/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2.svg/120px-%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2.svg.png";
    } else if (logoPreset === "uqu") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/c/c3/Umm_Al-Qura_University_logo.png/250px-Umm_Al-Qura_University_logo.png";
    } else if (logoPreset === "custom") {
      finalLogoUrl = logoUrl;
    }

    // Helper for cover HTML generation
    const logoHtmlStr = finalLogoUrl
      ? `<p style="text-align:center;margin-bottom:12pt;"><img src="${finalLogoUrl}" style="max-height:90px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.18));" /></p>`
      : "";

    // Border frame helper (for classic style cover)
    const frameBorderOuter = `position:absolute;top:8pt;right:8pt;bottom:8pt;left:8pt;border:3pt solid ${borderColor};pointer-events:none;z-index:10;`;
    const frameBorderInner = `position:absolute;top:14pt;right:14pt;bottom:14pt;left:14pt;border:1pt solid ${borderColor};pointer-events:none;z-index:10;`;

    let coverPageHtml = "";
    if (includeCover) {
      if (coverStyle === "modern") {
        // ═══════════════════════════════════════════════════
        // LEGENDARY MODERN: Deep Royal Blue + Gold Gradient
        // ═══════════════════════════════════════════════════
        coverPageHtml = `
<div style="font-family:'Cairo','Segoe UI','Arial',sans-serif;direction:rtl;width:100%;height:25.0cm;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(160deg,#0a1628 0%,#0d2347 40%,#1a3a6b 70%,#0f2a50 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;">

  <!-- Geometric SVG Background Pattern -->
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#C9A84C" stroke-width="1"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#hex)"/>
  </svg>

  <!-- Top Gold Bar -->
  <div style="background:linear-gradient(90deg,#C9A84C,#F0D070,#C9A84C);height:5pt;width:100%;flex-shrink:0;position:relative;z-index:1;"></div>

  <!-- Top Section: University Header -->
  <div style="position:relative;z-index:1;padding:32pt 36pt 20pt 36pt;flex-shrink:0;text-align:center;">
    ${finalLogoUrl ? `<img src="${finalLogoUrl}" style="max-height:70pt;margin-bottom:10pt;filter:drop-shadow(0 2px 10px rgba(201,168,76,0.4));" />` : `<div style="width:55pt;height:55pt;border-radius:50%;border:2pt solid #C9A84C;margin:0 auto 10pt;line-height:55pt;text-align:center;"><span style="color:#C9A84C;font-size:20pt;">◆</span></div>`}
    ${university ? `<div style="color:#F0D070;font-size:13pt;font-weight:700;letter-spacing:0.5px;margin-bottom:4pt;">${university}</div>` : ""}
    ${faculty ? `<div style="color:#B8C8E8;font-size:10.5pt;margin-bottom:2pt;">${faculty}</div>` : ""}
    ${department ? `<div style="color:#8A9FBF;font-size:10pt;">${department}</div>` : ""}
  </div>

  <!-- Gold Divider -->
  <div style="position:relative;z-index:1;margin:0 36pt;height:1pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);flex-shrink:0;"></div>

  <!-- Center: Title Block — flex:1 pushes bottom panel down -->
  <div style="position:relative;z-index:1;padding:36pt 40pt 30pt;text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center;">
    <!-- Badge -->
    <div style="display:inline-block;background:rgba(201,168,76,0.15);border:1.5pt solid #C9A84C;border-radius:20pt;padding:5pt 20pt;margin-bottom:24pt;">
      <span style="color:#F0D070;font-size:10pt;font-weight:700;letter-spacing:1px;">${degree || "بحث علمي"}</span>
    </div>

    <!-- Main Title -->
    <div style="background:rgba(255,255,255,0.04);border:1pt solid rgba(201,168,76,0.25);border-radius:8pt;padding:26pt 22pt;margin-bottom:0;">
      <h1 style="color:#FFFFFF;font-size:${Math.min(26, Math.max(17, Math.round(380 / Math.max(values.title.length, 10))))}pt;font-weight:800;line-height:1.5;margin:0 0 12pt;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${values.title}</h1>
      <div style="width:100pt;height:2.5pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);margin:0 auto;"></div>
      ${coverSubtitle ? `<p style="color:#B8C8E8;font-size:12pt;font-style:italic;margin:14pt 0 0;">${coverSubtitle}</p>` : ""}
    </div>
  </div>

  <!-- Bottom Info Panel — naturally at the bottom thanks to flex column -->
  <div style="position:relative;z-index:1;background:rgba(0,0,0,0.4);border-top:1pt solid rgba(201,168,76,0.3);padding:16pt 40pt;flex-shrink:0;">
    <div style="height:2pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);margin-bottom:14pt;"></div>
    <table style="width:100%;border:none;border-collapse:collapse;">
      <tr>
        ${studentName ? `<td style="color:#E8EEF8;font-size:11pt;padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">إعداد الطالب: </span>${studentName}</td>` : "<td style='border:none;'></td>"}
        ${supervisorName ? `<td style="color:#E8EEF8;font-size:11pt;padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">إشراف: </span>${supervisorName}</td>` : "<td style='border:none;'></td>"}
      </tr>
      <tr>
        <td colspan="2" style="border:none;padding:6pt 8pt 0;">
          <div style="height:1pt;background:rgba(201,168,76,0.2);margin-bottom:6pt;"></div>
          <div style="text-align:center;color:#8A9FBF;font-size:10pt;">${academicYear || ""}</div>
        </td>
      </tr>
    </table>
  </div>
</div>
        `;
      } else if (coverStyle === "framed") {
        // ═══════════════════════════════════════════════════
        // LEGENDARY FRAMED: Emerald Forest + Cream Luxury
        // ═══════════════════════════════════════════════════
        coverPageHtml = `
<div style="font-family:'Traditional Arabic','Amiri','Times New Roman',serif;direction:rtl;width:100%;height:25.0cm;background:#F8F4EE;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;overflow:hidden;box-sizing:border-box;">

  <!-- Corner Ornaments SVG -->
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
    <!-- Top-right corner -->
    <path d="M 530 15 L 560 15 L 560 8 L 568 8 L 568 45 L 560 45 L 560 22 L 530 22 Z" fill="#1B5E3B" opacity="0.8"/>
    <path d="M 545 8 L 545 45" stroke="#C9A84C" stroke-width="1" opacity="0.6"/>
    <!-- Top-left corner -->
    <path d="M 30 15 L 60 15 L 60 22 L 30 22 L 30 45 L 22 45 L 22 8 L 30 8 Z" fill="#1B5E3B" opacity="0.8"/>
    <path d="M 15 8 L 15 45" stroke="#C9A84C" stroke-width="1" opacity="0.6"/>
    <!-- Bottom-right corner -->
    <path d="M 530 1105 L 560 1105 L 560 1112 L 568 1112 L 568 1075 L 560 1075 L 560 1098 L 530 1098 Z" fill="#1B5E3B" opacity="0.8"/>
    <!-- Bottom-left corner -->
    <path d="M 30 1105 L 60 1105 L 60 1098 L 30 1098 L 30 1075 L 22 1075 L 22 1112 L 30 1112 Z" fill="#1B5E3B" opacity="0.8"/>
  </svg>

  <!-- Outer Border -->
  <div style="position:absolute;top:12pt;right:12pt;bottom:12pt;left:12pt;border:3pt solid #1B5E3B;"></div>
  <!-- Inner Border -->
  <div style="position:absolute;top:18pt;right:18pt;bottom:18pt;left:18pt;border:1pt solid #C9A84C;"></div>

  <!-- Content -->
  <div style="padding:35pt;position:relative;">

    <!-- Top Header Strip -->
    <div style="background:linear-gradient(135deg,#1B5E3B,#2E7D52);border-radius:4pt;padding:14pt 20pt;margin-bottom:20pt;text-align:center;">
      ${finalLogoUrl ? `<img src="${finalLogoUrl}" style="max-height:55pt;margin-bottom:8pt;filter:brightness(1.1);" /><br/>` : ""}
      ${university ? `<div style="color:#F0E6C8;font-size:13pt;font-weight:700;margin-bottom:3pt;">${university}</div>` : ""}
      ${faculty ? `<div style="color:#B8D4C0;font-size:10.5pt;margin-bottom:2pt;">${faculty}</div>` : ""}
      ${department ? `<div style="color:#90B89A;font-size:10pt;">${department}</div>` : ""}
    </div>

    <!-- Ornamental Divider -->
    <div style="text-align:center;margin:12pt 0;color:#C9A84C;font-size:14pt;letter-spacing:8px;">✦ ✦ ✦</div>

    <!-- Title Area -->
    <div style="text-align:center;padding:20pt 16pt;border:1.5pt solid #1B5E3B;border-radius:4pt;background:linear-gradient(180deg,rgba(27,94,59,0.04),rgba(27,94,59,0.02));margin:10pt 0 20pt;">
      ${degree ? `<div style="display:inline-block;background:#1B5E3B;color:#F0E6C8;font-size:10pt;padding:3pt 16pt;border-radius:2pt;margin-bottom:16pt;">${degree}</div>` : ""}
      <h1 style="color:#0D3320;font-size:22pt;font-weight:800;line-height:1.6;margin:0 0 10pt;">${values.title}</h1>
      <div style="margin:10pt auto;width:120pt;height:0;border-top:2pt solid #C9A84C;"></div>
      ${coverSubtitle ? `<p style="color:#2E7D52;font-size:12pt;font-style:italic;margin:10pt 0 0;">${coverSubtitle}</p>` : ""}
    </div>

    <!-- Ornamental Divider -->
    <div style="text-align:center;margin:12pt 0;color:#C9A84C;font-size:14pt;letter-spacing:8px;">◆ ◆ ◆</div>

    <!-- Metadata Grid -->
    <div style="background:linear-gradient(180deg,rgba(27,94,59,0.06),rgba(201,168,76,0.06));border:1pt solid rgba(27,94,59,0.2);border-radius:4pt;padding:16pt 20pt;margin-top:10pt;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          ${studentName ? `<td style="padding:6pt 8pt;border:none;text-align:right;font-size:11.5pt;color:#1B5E3B;"><strong style="color:#0D3320;">إعداد الطالب:</strong> ${studentName}</td>` : "<td style='border:none;'></td>"}
          ${supervisorName ? `<td style="padding:6pt 8pt;border:none;text-align:right;font-size:11.5pt;color:#1B5E3B;"><strong style="color:#0D3320;">إشراف الدكتور:</strong> ${supervisorName}</td>` : "<td style='border:none;'></td>"}
        </tr>
        <tr><td colspan="2" style="border:none;padding:4pt 8pt;"><div style="height:1pt;background:rgba(27,94,59,0.2);"></div></td></tr>
        <tr>
          <td style="padding:6pt 8pt;border:none;text-align:center;font-size:10.5pt;color:#555;" colspan="2">${academicYear || ""}</td>
        </tr>
      </table>
    </div>
  </div>
</div>
        `;
      } else {
        // ═══════════════════════════════════════════════════
        // ACADEMIC REFERENCE STYLE: Exact match to reference document
        // White bg, double border frame, 3-col bilingual header
        // ═══════════════════════════════════════════════════
        coverPageHtml = `
<div style="font-family:'Traditional Arabic','Amiri','Times New Roman',serif;direction:rtl;width:100%;height:100%;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;display:flex;flex-direction:column;box-sizing:border-box;">

  <div style="padding:12pt 14pt;display:flex;flex-direction:column;flex:1;">

    <!-- ═══ TOP HEADER: 3-column bilingual (EXACT reference match) ═══ -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;direction:ltr;width:100%;">

      <!-- LEFT: English institution info (LTR direction) -->
      <div style="text-align:left;direction:ltr;font-family:'Arial','Calibri',sans-serif;font-size:9.5pt;font-weight:700;color:${borderColor};line-height:2.0;flex:1;">
        Kingdom of Saudi Arabia<br/>
        Ministry of Education<br/>
        ${universityEn || (university ? university : '')}
      </div>

      <!-- CENTER: Logo image + university Arabic name below it -->
      <div style="text-align:center;flex:0 0 auto;padding:0 12pt;">
        ${finalLogoUrl
          ? `<img src="${finalLogoUrl}" style="max-height:68pt;max-width:100pt;display:block;margin:0 auto 5pt;" />`
          : `<div style="width:55pt;height:55pt;border-radius:50%;border:2pt solid ${borderColor};margin:0 auto 5pt;display:flex;align-items:center;justify-content:center;"><span style="color:${borderColor};font-size:18pt;">✦</span></div>`}
        ${university ? `<div style="color:#1a1a1a;font-size:9.5pt;font-weight:700;font-family:'Traditional Arabic',serif;line-height:1.4;">${university}</div>` : ''}
        ${universityEn ? `<div style="color:#1a1a1a;font-size:7.5pt;font-family:'Arial',sans-serif;direction:ltr;">${universityEn}</div>` : ''}
      </div>

      <!-- RIGHT: Arabic institution info -->
      <div style="text-align:right;direction:rtl;font-size:10pt;font-weight:700;color:${borderColor};line-height:2.0;flex:1;">
        المملكة العربية السعودية<br/>
        وزارة التعليم<br/>
        ${university || ''}
      </div>
    </div>

    <!-- Thin separator under header -->
    <div style="height:1pt;background:#cccccc;margin:12pt 0;flex-shrink:0;"></div>

    <!-- ═══ TITLE area (upper center after header) ═══ -->
    <div style="text-align:center;flex-shrink:0;margin-bottom:0;">
      ${faculty ? `<div style="font-size:11pt;color:#333;margin-bottom:4pt;">${faculty}</div>` : ''}
      ${department ? `<div style="font-size:10pt;color:#555;margin-bottom:8pt;">${department}</div>` : ''}
      <h1 style="font-size:${Math.min(26, Math.max(18, Math.round(360 / Math.max(values.title.length, 8))))}pt;font-weight:800;color:#1a1a1a;line-height:1.6;margin:10pt auto 10pt;max-width:400pt;">${values.title}</h1>
      <!-- Thick horizontal black rule (exact reference match) -->
      <div style="width:220pt;height:3.5pt;background:#1a1a1a;margin:0 auto 16pt;"></div>
    </div>

    <!-- ═══ CENTER SPACE: project image / subtitle ═══ -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10pt 0;">
      ${coverSubtitle ? `<div style="font-size:13pt;color:#333;font-weight:600;margin-bottom:12pt;">${coverSubtitle}</div>` : ''}
      ${degree ? `<div style="display:inline-block;background:${borderColor};color:#fff;font-size:10.5pt;padding:5pt 28pt;border-radius:3pt;margin-top:8pt;">${degree}</div>` : ''}
    </div>

    <!-- ═══ BOTTOM: Student info (centered, exact reference style) ═══ -->
    <div style="flex-shrink:0;text-align:center;padding-top:14pt;border-top:0.5pt solid #cccccc;">
      <div style="font-size:12pt;line-height:2.2;color:#1a1a1a;">
        ${studentName ? `<div><strong style="color:#1a1a1a;">إعداد الطالب: </strong>${studentName}</div>` : ''}
        ${supervisorName ? `<div><strong style="color:#1a1a1a;">إشراف الدكتور: </strong>${supervisorName}</div>` : ''}
        ${academicYear ? `<div style="font-size:11pt;color:#444;">${academicYear}</div>` : ''}
      </div>
    </div>

  </div>
</div>
        `;
      }
    }


    const layoutMetadata = {
      showPageNumbers,
      pageNumberFormat,
      pageNumberAlign,
      pageSetup: {
        size: pageSize,
        orientation,
        marginTop: parseFloat(marginTop),
        marginBottom: parseFloat(marginBottom),
        marginLeft: parseFloat(marginLeft),
        marginRight: parseFloat(marginRight),
      },
      coverPageHtml: includeCover ? coverPageHtml : undefined,
      borderColor,
      showPageBorder,
      cover: includeCover ? {
        title: values.title,
        subtitle: coverSubtitle,
        studentName,
        supervisor: supervisorName,
        university,
        universityEn,
        faculty,
        department,
        degree,
        year: academicYear,
        logoUrl: finalLogoUrl,
      } : undefined
    };

    createProject.mutate({
      data: {
        title: values.title,
        workType: values.workType,
        citationStyle: values.citationStyle,
        language: values.language,
        templateId: values.templateId || null,
        rawContent: values.rawContent || "",
        formatting,
        layoutMetadata,
      } as any,
    }, {
      onSuccess: (data) => {
        toast({ title: "تم إنشاء المشروع بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation(`/projects/${data.id}`);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء إنشاء المشروع", variant: "destructive" });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/parse-document`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      form.setValue("rawContent", data.text);
      if (data.analysis) {
        setAnalysis(data.analysis);
        toast({ title: "اكتمل تحليل الملف بنجاح" });
      } else {
        toast({ title: "تم استخراج النص بنجاح" });
      }
    } catch (err) {
      toast({ title: "فشل استخراج النص", description: "تأكد من أن الملف بصيغة مدعومة وحاول مرة أخرى.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in-up pb-10" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">مشروع جديد</h1>
        <p className="text-muted-foreground mt-2">أنشئ مشروعاً بحثياً جديداً وقم بتنسيقه وإعداده باحترافية كاملة</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* ─── Card 1: Basic Info ─── */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">بيانات البحث الأساسية</CardTitle>
                <CardDescription className="text-xs mt-0.5">أدخل المعلومات الأساسية للبحث</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">عنوان البحث</Label>
              <Input
                id="title"
                placeholder="أدخل عنوان البحث كاملاً..."
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Work Type */}
              <div className="space-y-1.5">
                <Label>نوع البحث</Label>
                <Select onValueChange={(val) => form.setValue("workType", val)} defaultValue={form.getValues("workType")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع البحث" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map(wt => <SelectItem key={wt} value={wt}>{wt}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.workType && <p className="text-xs text-destructive">{form.formState.errors.workType.message}</p>}
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <Label>لغة البحث</Label>
                <Select onValueChange={(val) => form.setValue("language", val)} defaultValue={form.getValues("language")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Citation Style */}
              <div className="space-y-1.5">
                <Label>نمط التوثيق (Citation Style)</Label>
                <Select onValueChange={(val) => form.setValue("citationStyle", val)} defaultValue={form.getValues("citationStyle")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نمط التوثيق" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITATION_STYLES.map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.citationStyle && <p className="text-xs text-destructive">{form.formState.errors.citationStyle.message}</p>}
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <Label>قالب التنسيق (اختياري)</Label>
                <Select onValueChange={(val) => form.setValue("templateId", parseInt(val))} defaultValue={form.getValues("templateId")?.toString()}>
                  <SelectTrigger>
                    <SelectValue placeholder="بدون قالب مسبق" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(templates) && templates.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Card 2: Document Parts ─── */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">هيكل ومحتوى البحث</CardTitle>
                <CardDescription className="text-xs mt-0.5">حدد نوع المحتوى وأجزاء البحث المطلوبة</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Content Type Toggle */}
            <div className="space-y-2">
              <Label>نوع المحتوى</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContentType("body")}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    contentType === "body"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  متن بحث كامل
                </button>
                <button
                  type="button"
                  onClick={() => setContentType("plan")}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    contentType === "plan"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  خطة بحث فقط
                </button>
              </div>
            </div>

            {/* Document Parts */}
            <div className="space-y-2">
              <Label>أجزاء البحث المطلوبة</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DOCUMENT_PARTS.map(part => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => togglePart(part.id)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-all text-right ${
                      selectedParts.includes(part.id)
                        ? "bg-primary/10 border-primary/50 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="ml-1">{selectedParts.includes(part.id) ? "✓" : "○"}</span>
                    {part.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Card 3: MS-Word Professional Formatting panel ─── */}
        <Card className="border-border/60">
          <button
            type="button"
            className="w-full text-right"
            onClick={() => setShowFormatting(!showFormatting)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">تنسيق مستند Microsoft Word الاحترافي</CardTitle>
                    <CardDescription className="text-xs mt-0.5">اضبط الخطوط، الهوامش، مسافات الفقرات، والترقيم تماماً مثل برنامج الوورد</CardDescription>
                  </div>
                </div>
                {showFormatting ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </button>

          {showFormatting && (
            <CardContent className="pt-0">
              {/* Tab Navigation (Word Ribbon Style) */}
              <div className="flex border-b border-border mb-5 overflow-x-auto gap-1">
                <button
                  type="button"
                  onClick={() => setActiveFormattingTab("fonts")}
                  className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeFormattingTab === "fonts"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Type className="w-4 h-4" />
                    نوع وحجم الخط
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormattingTab("layout")}
                  className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeFormattingTab === "layout"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Layout className="w-4 h-4" />
                    تخطيط الصفحة والهوامش
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormattingTab("numbering")}
                  className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeFormattingTab === "numbering"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4" />
                    ترقيم وتذييل الصفحات
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormattingTab("cover")}
                  className={`pb-2.5 px-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeFormattingTab === "cover"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    صفحة الغلاف الأكاديمية
                  </div>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                
                {/* ─── TAB 1: Fonts & Paragraphs ─── */}
                {activeFormattingTab === "fonts" && (
                  <div className="space-y-4 fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Font Family */}
                      <div className="space-y-1.5">
                        <Label>نوع خط المتن</Label>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ARABIC_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-1.5">
                        <Label>حجم خط المتن (pt)</Label>
                        <Select value={fontSize} onValueChange={setFontSize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_SIZES.map(s => <SelectItem key={s} value={s}>{s} pt</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Heading Size */}
                      <div className="space-y-1.5">
                        <Label>العناوين الرئيسية (Heading 1)</Label>
                        <Select value={headingSize} onValueChange={setHeadingSize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HEADING_SIZES.map(s => <SelectItem key={s} value={s}>{s} pt</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subheading Size */}
                      <div className="space-y-1.5">
                        <Label>العناوين الفرعية (Heading 2)</Label>
                        <Select value={subheadingSize} onValueChange={setSubheadingSize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBHEADING_SIZES.map(s => <SelectItem key={s} value={s}>{s} pt</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Line Spacing */}
                      <div className="space-y-1.5">
                        <Label>تباعد الأسطر</Label>
                        <Select value={lineSpacing} onValueChange={setLineSpacing}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LINE_SPACINGS.map(ls => <SelectItem key={ls.value} value={ls.value}>{ls.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* First line indent */}
                      <div className="space-y-1.5">
                        <Label>إزاحة السطر الأول (cm)</Label>
                        <Input
                          type="number"
                          step="0.05"
                          value={firstLineIndent}
                          onChange={(e) => setFirstLineIndent(e.target.value)}
                          placeholder="مثلاً: 1.25"
                        />
                      </div>

                      {/* Alignment */}
                      <div className="space-y-1.5">
                        <Label>محاذاة النص</Label>
                        <div className="flex border border-input rounded-md overflow-hidden h-9">
                          <button
                            type="button"
                            onClick={() => setParagraphAlign("justify")}
                            className={`flex-1 flex items-center justify-center transition-all ${paragraphAlign === "justify" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                            title="ضبط كلي"
                          >
                            <AlignJustify className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setParagraphAlign("right")}
                            className={`flex-1 flex items-center justify-center transition-all ${paragraphAlign === "right" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                            title="محاذاة لليمين"
                          >
                            <AlignRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setParagraphAlign("center")}
                            className={`flex-1 flex items-center justify-center transition-all ${paragraphAlign === "center" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                            title="محاذاة للوسط"
                          >
                            <AlignCenter className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setParagraphAlign("left")}
                            className={`flex-1 flex items-center justify-center transition-all ${paragraphAlign === "left" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                            title="محاذاة لليسار"
                          >
                            <AlignLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Text Direction */}
                      <div className="space-y-1.5">
                        <Label>اتجاه النص الافتراضي</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTextDirection("rtl")}
                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                              textDirection === "rtl" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            من اليمين إلى اليسار (عربي)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextDirection("ltr")}
                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                              textDirection === "ltr" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            من اليسار إلى اليمين (إنجليزي)
                          </button>
                        </div>
                      </div>

                      {/* Formatting preview card */}
                      <div className="border border-border/80 rounded-lg p-3 bg-muted/40 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">معاينة النص الحي</Label>
                        <p
                          style={{
                            fontFamily: fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: lineSpacing,
                            textAlign: paragraphAlign,
                            textIndent: `${firstLineIndent}em`
                          }}
                          className="text-sm text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                        >
                          هذا النص يوضح شكل الخط والتباعد المختار للمتن داخل مستند البحث.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: Page Setup & Margins ─── */}
                {activeFormattingTab === "layout" && (
                  <div className="space-y-4 fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Page Size */}
                      <div className="space-y-1.5">
                        <Label>حجم الورقة</Label>
                        <Select value={pageSize} onValueChange={setPageSize}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A4">A4 (21cm x 29.7cm)</SelectItem>
                            <SelectItem value="Letter">Letter (8.5in x 11in)</SelectItem>
                            <SelectItem value="A3">A3 (29.7cm x 42cm)</SelectItem>
                            <SelectItem value="B5">B5 (17.6cm x 25cm)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Orientation */}
                      <div className="space-y-1.5">
                        <Label>اتجاه الصفحة</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setOrientation("portrait")}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                              orientation === "portrait" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            عمودي (Portrait)
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrientation("landscape")}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                              orientation === "landscape" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            أفقي (Landscape)
                          </button>
                        </div>
                      </div>

                      {/* Margin Presets */}
                      <div className="space-y-1.5">
                        <Label>تجهيزات هوامش سريعة</Label>
                        <Select onValueChange={(val) => {
                          const [t, b, l, r] = val.split(",");
                          applyMarginPreset(t, b, l, r);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر قالب هوامش..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2.5,2.5,2.5,3.0">عادي (أعلى 2.5، يمين 3.0 سم)</SelectItem>
                            <SelectItem value="1.27,1.27,1.27,1.27">ضيق (1.27 سم من كل جانب)</SelectItem>
                            <SelectItem value="2.54,2.54,1.91,1.91">متوسط (أعلى 2.54، جانبين 1.91 سم)</SelectItem>
                            <SelectItem value="2.54,2.54,5.08,5.08">عريض (5.08 سم جانبين)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Margins custom sizes */}
                    <div className="bg-muted/40 p-4 rounded-lg border border-border/80 space-y-3">
                      <Label className="text-sm font-semibold">تخصيص الهوامش (بالسنتيمتر - cm)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">الهامش العلوي (Top)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={marginTop}
                            onChange={(e) => setMarginTop(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الهامش السفلي (Bottom)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={marginBottom}
                            onChange={(e) => setMarginBottom(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الهامش الأيمن (Right)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={marginRight}
                            onChange={(e) => setMarginRight(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الهامش الأيسر (Left)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={marginLeft}
                            onChange={(e) => setMarginLeft(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: Page Numbering & Footers ─── */}
                {activeFormattingTab === "numbering" && (
                  <div className="space-y-4 fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Show Page Numbers */}
                      <div className="space-y-1.5">
                        <Label>تفعيل ترقيم الصفحات</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPageNumbers(true)}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                              showPageNumbers ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400" : "border-border text-muted-foreground"
                            }`}
                          >
                            تفعيل الترقيم
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPageNumbers(false)}
                            className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                              !showPageNumbers ? "bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400" : "border-border text-muted-foreground"
                            }`}
                          >
                            إلغاء الترقيم
                          </button>
                        </div>
                      </div>

                      {/* Page Number Format */}
                      {showPageNumbers && (
                        <>
                          <div className="space-y-1.5">
                            <Label>صيغة الترقيم</Label>
                            <Select value={pageNumberFormat} onValueChange={setPageNumberFormat}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1, 2, 3">أرقام قياسية (1، 2، 3)</SelectItem>
                                <SelectItem value="I, II, III">أرقام رومانية كابيتال (I, II, III)</SelectItem>
                                <SelectItem value="i, ii, iii">أرقام رومانية صغيرة (i, ii, iii)</SelectItem>
                                <SelectItem value="أ، ب، ج">أبجدية عربية (أ، ب، ج)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Page Number Align */}
                          <div className="space-y-1.5">
                            <Label>موقع الرقم أسفل الصفحة</Label>
                            <Select
                              value={pageNumberAlign}
                              onValueChange={(val) => setPageNumberAlign(val as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center">وسط الصفحة</SelectItem>
                                <SelectItem value="right">الجانب الأيمن</SelectItem>
                                <SelectItem value="left">الجانب الأيسر</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: Cover Page Details ─── */}
                {activeFormattingTab === "cover" && (
                  <div className="space-y-4 fade-in-up">
                    <div className="flex items-center justify-between pb-2 border-b border-border/80">
                      <Label className="font-semibold text-sm">تضمين صفحة غلاف أكاديمية منسقة للبحث</Label>
                      <button
                        type="button"
                        onClick={() => setIncludeCover(!includeCover)}
                        className={`py-1 px-4 rounded-md border text-xs font-medium transition-all ${
                          includeCover ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {includeCover ? "تضمين الغلاف ✓" : "تخطي الغلاف"}
                      </button>
                    </div>

                    {includeCover && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cover Style */}
                        <div className="space-y-1.5">
                          <Label>تصميم وتنسيق الغلاف</Label>
                          <Select value={coverStyle} onValueChange={setCoverStyle}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر تصميم الغلاف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classic">كلاسيكي أكاديمي (Classic Academic)</SelectItem>
                              <SelectItem value="modern">حديث أنيق (Modern Elegant)</SelectItem>
                              <SelectItem value="framed">مؤطر بإطار أنيق (Framed Border)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Logo Preset */}
                        <div className="space-y-1.5">
                          <Label>شعار الجامعة</Label>
                          <Select value={logoPreset} onValueChange={setLogoPreset}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر شعار الجامعة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">بدون شعار (Default)</SelectItem>
                              <SelectItem value="ksu">جامعة الملك سعود (KSU)</SelectItem>
                              <SelectItem value="kau">جامعة الملك عبدالعزيز (KAU)</SelectItem>
                              <SelectItem value="uqu">جامعة أم القرى (UQU)</SelectItem>
                              <SelectItem value="custom">رابط شعار مخصص (Custom Logo URL)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Custom Logo URL */}
                        {logoPreset === "custom" && (
                          <div className="space-y-1.5 md:col-span-2">
                            <Label>رابط الشعار المخصص (Logo Image URL)</Label>
                            <Input
                              placeholder="أدخل رابط صورة الشعار (https://...)"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                            />
                          </div>
                        )}

                        {/* Subtitle */}
                        <div className="space-y-1.5">
                          <Label>العنوان الفرعي للبحث (اختياري)</Label>
                          <Input
                            placeholder="مثلاً: دراسة تطبيقية على..."
                            value={coverSubtitle}
                            onChange={(e) => setCoverSubtitle(e.target.value)}
                          />
                        </div>

                        {/* Student Name */}
                        <div className="space-y-1.5">
                          <Label>اسم الطالب / الباحث</Label>
                          <Input
                            placeholder="أدخل اسم الطالب رباعي..."
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                          />
                        </div>

                        {/* Supervisor Name */}
                        <div className="space-y-1.5">
                          <Label>اسم المشرف الأكاديمي</Label>
                          <Input
                            placeholder="د. / أ.د. ..."
                            value={supervisorName}
                            onChange={(e) => setSupervisorName(e.target.value)}
                          />
                        </div>

                        {/* University */}
                        <div className="space-y-1.5">
                          <Label>اسم الجامعة</Label>
                          <Input
                            placeholder="مثلاً: جامعة الملك سعود"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                          />
                        </div>

                        {/* Faculty */}
                        <div className="space-y-1.5">
                          <Label>اسم الكلية</Label>
                          <Input
                            placeholder="مثلاً: كلية إدارة الأعمال"
                            value={faculty}
                            onChange={(e) => setFaculty(e.target.value)}
                          />
                        </div>

                        {/* Department */}
                        <div className="space-y-1.5">
                          <Label>اسم القسم</Label>
                          <Input
                            placeholder="مثلاً: قسم الإدارة العامة"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                          />
                        </div>

                        {/* Degree Level */}
                        <div className="space-y-1.5">
                          <Label>الدرجة العلمية المستهدفة</Label>
                          <Select value={degree} onValueChange={setDegree}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الدرجة العلمية" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="بكالوريوس">بكالوريوس</SelectItem>
                              <SelectItem value="ماجستير">ماجستير</SelectItem>
                              <SelectItem value="دكتوراه">دكتوراه</SelectItem>
                              <SelectItem value="دبلوم">دبلوم</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Academic Year */}
                        <div className="space-y-1.5">
                          <Label>العام الجامعي / الدراسي</Label>
                          <Input
                            placeholder="مثلاً: 1447هـ - 2026م"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                          />
                        </div>

                        {/* English University Name */}
                        <div className="space-y-1.5">
                          <Label>اسم الجامعة بالإنجليزية (للترويسة الثنائية)</Label>
                          <Input
                            placeholder="مثلاً: University of Jeddah"
                            value={universityEn}
                            onChange={(e) => setUniversityEn(e.target.value)}
                          />
                        </div>

                        {/* Page Border Color Picker */}
                        <div className="space-y-1.5">
                          <Label>لون إطار الصفحات</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              className="w-10 h-9 p-0.5 cursor-pointer rounded-md border border-border"
                              value={borderColor}
                              onChange={(e) => setBorderColor(e.target.value)}
                            />
                            <Input
                              type="text"
                              placeholder="#1B4FA3"
                              className="flex-1 text-xs uppercase"
                              value={borderColor}
                              onChange={(e) => setBorderColor(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Show Page Border Checkbox */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <div className="flex items-center gap-2 h-9">
                            <input
                              type="checkbox"
                              id="showPageBorder"
                              checked={showPageBorder}
                              onChange={(e) => setShowPageBorder(e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                            <Label htmlFor="showPageBorder" className="cursor-pointer select-none">رسم إطار ملون على كافة صفحات البحث</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Quality & Checks (Spell / Duplicate) in Formatting panel footer */}
              <div className="mt-6 pt-5 border-t border-border/80">
                <Label className="text-xs text-muted-foreground block mb-3">خيارات التحقق والجودة الإضافية</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEnableSpellCheck(!enableSpellCheck)}
                    className={`py-2.5 px-4 rounded-lg border text-sm transition-all flex items-center gap-3 text-right ${
                      enableSpellCheck
                        ? "bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <CheckSquare className={`w-4 h-4 shrink-0 ${enableSpellCheck ? "text-green-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-semibold text-xs">التدقيق الإملائي التلقائي</p>
                      <p className="text-[10px] opacity-70 mt-0.5">فحص وتصحيح الكلمات النحوية والإملائية</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnableDuplicateCheck(!enableDuplicateCheck)}
                    className={`py-2.5 px-4 rounded-lg border text-sm transition-all flex items-center gap-3 text-right ${
                      enableDuplicateCheck
                        ? "bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Copy className={`w-4 h-4 shrink-0 ${enableDuplicateCheck ? "text-orange-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-semibold text-xs">كشف وحجب الجمل المكررة</p>
                      <p className="text-[10px] opacity-70 mt-0.5">منع التكرار والحشو داخل فقرات البحث</p>
                    </div>
                  </button>
                </div>
              </div>

            </CardContent>
          )}
        </Card>

        {/* ─── Card 4: Content Upload ─── */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">محتوى البحث</CardTitle>
                  <CardDescription className="text-xs mt-0.5">ارفع ملفاً للتحليل الذكي، أو الصق النص مباشرة</CardDescription>
                </div>
              </div>
              <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 whitespace-nowrap">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>رفع ملف (Word / PDF)</span>
              </Label>
              <Input id="file-upload" type="file" accept=".docx,.doc,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* AI Analysis Banner */}
            {analysis && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3 fade-in-up">
                <h4 className="font-semibold text-primary flex items-center gap-2 text-sm">
                  <Wand2 className="w-4 h-4" />
                  اقتراحات التحليل الذكي للبحث المرفوع
                </h4>
                <div className="text-sm space-y-1 text-muted-foreground" dir="rtl">
                  {analysis.title && <p><strong>عنوان البحث المقترح:</strong> {analysis.title}</p>}
                  {analysis.university && <p><strong>الجامعة المكتشفة:</strong> {analysis.university}</p>}
                  {analysis.faculty && <p><strong>الكلية:</strong> {analysis.faculty}</p>}
                  {analysis.matchedTemplateId && (
                    <p>
                      <strong>قالب التنسيق المقترح:</strong>{" "}
                      <span className="text-foreground font-semibold">
                        {Array.isArray(templates) && templates?.find(t => t.id === analysis.matchedTemplateId)?.name || "قالب مطابق"}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-1 justify-start">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (analysis.title) form.setValue("title", analysis.title);
                      if (analysis.university) setUniversity(analysis.university);
                      if (analysis.faculty) setFaculty(analysis.faculty);
                      if (analysis.matchedTemplateId) {
                        form.setValue("templateId", analysis.matchedTemplateId);
                      }
                      toast({ title: "تم تطبيق الاقتراحات التلقائية بنجاح!" });
                      setAnalysis(null);
                    }}
                    className="bg-primary text-primary-foreground"
                  >
                    تطبيق التنسيق التلقائي
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAnalysis(null);
                      toast({ title: "يمكنك إدخال التنسيق والبيانات يدوياً" });
                    }}
                  >
                    تعديل يدوي
                  </Button>
                </div>
              </div>
            )}

            {fileName && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-3 rounded-md">
                <FileText className="w-4 h-4" />
                تم تحميل: {fileName}
              </div>
            )}

            <Textarea
              placeholder="أو قم بلصق نص البحث هنا مباشرةً (يمكنك لصق محتوى من ChatGPT أو أي مصدر آخر)..."
              className="min-h-[180px] text-sm"
              {...form.register("rawContent")}
            />
          </CardContent>
        </Card>

        {/* ─── Submit ─── */}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => setLocation("/")}>
            إلغاء
          </Button>
          <Button type="submit" size="lg" disabled={createProject.isPending} className="min-w-[160px]">
            {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            إنشاء المشروع
          </Button>
        </div>
      </form>
    </div>
  );
}