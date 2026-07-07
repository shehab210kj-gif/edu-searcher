import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useListTemplates, useListLibraryDocuments, useGetLibraryDocument } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, UploadCloud, FileText, Wand2, Settings2, Type, ArrowRight,
  AlignRight, CheckSquare, Copy, BookOpen, Lightbulb, ChevronDown, ChevronUp,
  Layout, AlignCenter, AlignLeft, AlignJustify, GraduationCap, ListTodo, CheckCircle2, Eye
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
  const { data: coversData } = useListLibraryDocuments({
    documentType: "master_template",
    page: 1,
    pageSize: 100,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
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
  const [targetPageCount, setTargetPageCount] = useState("unlimited");

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
  const [studentId, setStudentId] = useState("");
  const [section, setSection] = useState("");
  const [fieldSupervisor, setFieldSupervisor] = useState("");
  const [trainingAgency, setTrainingAgency] = useState("");
  const [courseName, setCourseName] = useState("");
  const [coverStyle, setCoverStyle] = useState("classic");
  const [logoPreset, setLogoPreset] = useState("default");
  const [logoUrl, setLogoUrl] = useState("");
  // Border frame
  const [borderColor, setBorderColor] = useState("#1B4FA3");
  const [showPageBorder, setShowPageBorder] = useState(true);

  // Custom cover layout options
  const [detailsAlign, setDetailsAlign] = useState<"right" | "center" | "left">("center");
  const [headerLayout, setHeaderLayout] = useState<"logo-center" | "logo-right" | "logo-left">("logo-center");
  const [arabicHeader1, setArabicHeader1] = useState("المملكة العربية السعودية");
  const [arabicHeader2, setArabicHeader2] = useState("وزارة التعليم");
  const [arabicHeader3, setArabicHeader3] = useState("");
  const [englishHeader1, setEnglishHeader1] = useState("Kingdom of Saudi Arabia");
  const [englishHeader2, setEnglishHeader2] = useState("Ministry of Education");
  const [englishHeader3, setEnglishHeader3] = useState("");

  const [detailsVertical, setDetailsVertical] = useState<"top" | "center" | "bottom">("bottom");
  const [titlePosition, setTitlePosition] = useState<"top" | "center" | "bottom">("center");
  const [decorLineWidth, setDecorLineWidth] = useState<number>(200);
  const [decorLineHeight, setDecorLineHeight] = useState<number>(3);
  const [decorLineColor, setDecorLineColor] = useState<string>("#1a1a1a");
  const [showDecorLine, setShowDecorLine] = useState<boolean>(true);

  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const applyFormattingTemplate = (t: any) => {
    if (!t || !t.formatting) return;
    const f = t.formatting;
    if (f.fontFamily) setFontFamily(f.fontFamily);
    if (f.fontSize) setFontSize(f.fontSize.toString());
    if (f.headingSize) setHeadingSize(f.headingSize.toString());
    if (f.subheadingSize) setSubheadingSize(f.subheadingSize.toString());
    if (f.lineSpacing) setLineSpacing(f.lineSpacing.toString());
    if (f.paragraphAlign) setParagraphAlign(f.paragraphAlign);
    if (f.firstLineIndent !== undefined) setFirstLineIndent(f.firstLineIndent.toString());
    if (f.pageSize) setPageSize(f.pageSize);
    if (f.marginTop !== undefined) setMarginTop(f.marginTop.toString());
    if (f.marginBottom !== undefined) setMarginBottom(f.marginBottom.toString());
    if (f.marginLeft !== undefined) setMarginLeft(f.marginLeft.toString());
    if (f.marginRight !== undefined) setMarginRight(f.marginRight.toString());
    
    form.setValue("templateId", t.id);
    toast({
      title: "تم تطبيق قالب التنسيق تلقائياً",
      description: `تم تحديث الخط والهوامش والتباعد وفقاً لقالب "${t.name}"`,
    });
  };

  const [enableSpellCheck, setEnableSpellCheck] = useState(true);
  const [enableDuplicateCheck, setEnableDuplicateCheck] = useState(true);
  const [selectedParts, setSelectedParts] = useState<string[]>(["cover", "toc", "intro", "body", "conclusion", "refs"]);
  const [contentType, setContentType] = useState<"body" | "plan">("body");

  const selectedTemplateId = coverStyle.startsWith("template_")
    ? parseInt(coverStyle.replace("template_", ""), 10)
    : null;

  const { data: selectedCoverTemplate } = useGetLibraryDocument(
    selectedTemplateId || 0,
    {
      query: {
        enabled: !!selectedTemplateId,
      }
    } as any
  );

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

  const getCoverPageHtml = (
    style: string,
    title: string,
    subtitle: string,
    student: string,
    supervisor: string,
    uni: string,
    uniEn: string,
    fac: string,
    dept: string,
    deg: string,
    year: string,
    logo: string,
    borderCol: string,
    sId?: string,
    sect?: string,
    fieldSup?: string,
    trainAgency?: string,
    cName?: string,
    detailsAlign?: string,
    headerLayout?: string,
    arLine1?: string,
    arLine2?: string,
    arLine3?: string,
    enLine1?: string,
    enLine2?: string,
    enLine3?: string,
    detailsVertical?: string,
    titlePosition?: string,
    decorLineWidth?: number,
    decorLineHeight?: number,
    decorLineColor?: string,
    showDecorLine?: boolean
  ) => {
    if (style.startsWith("template_")) {
      if (selectedCoverTemplate && selectedCoverTemplate.richContent) {
        return selectedCoverTemplate.richContent
          .replace(/{title}/g, title || "")
          .replace(/{student}/g, student || "")
          .replace(/{supervisor}/g, supervisor || "")
          .replace(/{university}/g, uni || "")
          .replace(/{faculty}/g, fac || "")
          .replace(/{department}/g, dept || "")
          .replace(/{degree}/g, deg || "")
          .replace(/{year}/g, year || "")
          .replace(/{studentId}/g, sId || "")
          .replace(/{section}/g, sect || "")
          .replace(/{fieldSupervisor}/g, fieldSup || "")
          .replace(/{trainingAgency}/g, trainAgency || "")
          .replace(/{courseName}/g, cName || "");
      }
      return "";
    }

    const frameBorderOuter = `position:absolute;top:8pt;right:8pt;bottom:8pt;left:8pt;border:3pt solid ${borderCol};pointer-events:none;z-index:10;`;
    const frameBorderInner = `position:absolute;top:14pt;right:14pt;bottom:14pt;left:14pt;border:1pt solid ${borderCol};pointer-events:none;z-index:10;`;

    if (style === "modern") {
      return `
<div style="font-family:'Cairo','Segoe UI','Arial',sans-serif;direction:rtl;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(160deg,#0a1628 0%,#0d2347 40%,#1a3a6b 70%,#0f2a50 100%);-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;box-sizing:border-box;">
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.06;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
    <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#C9A84C" stroke-width="1"/></pattern>
    <rect width="100%" height="100%" fill="url(#hex)"/>
  </svg>
  <div style="background:linear-gradient(90deg,#C9A84C,#F0D070,#C9A84C);height:5pt;width:100%;flex-shrink:0;position:relative;z-index:1;"></div>
  <div style="position:relative;z-index:1;padding:32pt 36pt 20pt 36pt;flex-shrink:0;text-align:center;">
    ${logo ? `<img src="${logo}" style="max-height:70pt;margin-bottom:10pt;filter:drop-shadow(0 2px 10px rgba(201,168,76,0.4));" />` : `<div style="width:55pt;height:55pt;border-radius:50%;border:2pt solid #C9A84C;margin:0 auto 10pt;line-height:55pt;text-align:center;"><span style="color:#C9A84C;font-size:20pt;">◆</span></div>`}
    ${uni ? `<div style="color:#F0D070;font-size:13pt;font-weight:700;letter-spacing:0.5px;margin-bottom:4pt;">${uni}</div>` : ""}
    ${fac ? `<div style="color:#B8C8E8;font-size:10.5pt;margin-bottom:2pt;">${fac}</div>` : ""}
    ${dept ? `<div style="color:#8A9FBF;font-size:10pt;">${dept}</div>` : ""}
  </div>
  <div style="position:relative;z-index:1;margin:0 36pt;height:1pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);flex-shrink:0;"></div>
  <div style="position:relative;z-index:1;padding:36pt 40pt 30pt;text-align:center;flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:inline-block;background:rgba(201,168,76,0.15);border:1.5pt solid #C9A84C;border-radius:20pt;padding:5pt 20pt;margin-bottom:24pt;margin-left:auto;margin-right:auto;">
      <span style="color:#F0D070;font-size:10pt;font-weight:700;letter-spacing:1px;">${deg || "بحث علمي"}</span>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1pt solid rgba(201,168,76,0.25);border-radius:8pt;padding:26pt 22pt;margin-bottom:0;">
      <h1 style="color:#FFFFFF;font-size:${Math.min(26, Math.max(17, Math.round(380 / Math.max(title.length, 10))))}pt;font-weight:800;line-height:1.5;margin:0 0 12pt;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${title}</h1>
      <div style="width:100pt;height:2.5pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);margin:0 auto;"></div>
      ${subtitle ? `<p style="color:#B8C8E8;font-size:12pt;font-style:italic;margin:14pt 0 0;">${subtitle}</p>` : ""}
      ${cName ? `<p style="color:#B8C8E8;font-size:11pt;margin:10pt 0 0;"><span style="color:#C9A84C;font-weight:700;">المقرر: </span>${cName}</p>` : ''}
      ${trainAgency ? `<p style="color:#B8C8E8;font-size:11pt;margin:6pt 0 0;"><span style="color:#C9A84C;font-weight:700;">جهة التدريب: </span>${trainAgency}</p>` : ''}
    </div>
  </div>
  <div style="position:relative;z-index:1;background:rgba(0,0,0,0.4);border-top:1pt solid rgba(201,168,76,0.3);padding:16pt 40pt;flex-shrink:0;">
    <div style="height:2pt;background:linear-gradient(90deg,transparent,#C9A84C,#F0D070,#C9A84C,transparent);margin-bottom:14pt;"></div>
    <table style="width:100%;border:none;border-collapse:collapse;color:#E8EEF8;font-size:11pt;">
      <tr>
        ${student ? `<td style="padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">إعداد الطالب: </span>${student}</td>` : "<td style='border:none;'></td>"}
        ${supervisor ? `<td style="padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">إشراف: </span>${supervisor}</td>` : "<td style='border:none;'></td>"}
      </tr>
      ${(sId || fieldSup) ? `
      <tr>
        ${sId ? `<td style="padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">الرقم الجامعي: </span>${sId}</td>` : "<td style='border:none;'></td>"}
        ${fieldSup ? `<td style="padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">المشرف الميداني: </span>${fieldSup}</td>` : "<td style='border:none;'></td>"}
      </tr>
      ` : ""}
      ${(sect || year) ? `
      <tr>
        ${sect ? `<td style="padding:3pt 8pt;border:none;text-align:right;"><span style="color:#C9A84C;font-weight:700;">الشعبة: </span>${sect}</td>` : "<td style='border:none;'></td>"}
        <td style="padding:3pt 8pt;border:none;text-align:right;color:#8A9FBF;">${year || ""}</td>
      </tr>
      ` : `
      <tr><td colspan="2" style="border:none;padding:6pt 8pt 0;"><div style="text-align:center;color:#8A9FBF;font-size:10pt;">${year || ""}</div></td></tr>
      `}
    </table>
  </div>
</div>`;
    }

    if (style === "framed") {
      return `
<div style="font-family:'Traditional Arabic','Amiri','Times New Roman',serif;direction:rtl;width:100%;height:100%;background:#F8F4EE;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;">
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 595 842" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M 530 15 L 560 15 L 560 8 L 568 8 L 568 45 L 560 45 L 560 22 L 530 22 Z" fill="#1B5E3B" opacity="0.8"/>
    <path d="M 545 8 L 545 45" stroke="#C9A84C" stroke-width="1" opacity="0.6"/>
    <path d="M 30 15 L 60 15 L 60 22 L 30 22 L 30 45 L 22 45 L 22 8 L 30 8 Z" fill="#1B5E3B" opacity="0.8"/>
    <path d="M 15 8 L 15 45" stroke="#C9A84C" stroke-width="1" opacity="0.6"/>
    <path d="M 530 815 L 560 815 L 560 822 L 568 822 L 568 785 L 560 785 L 560 808 L 530 808 Z" fill="#1B5E3B" opacity="0.8"/>
    <path d="M 30 815 L 60 815 L 60 808 L 30 808 L 30 785 L 22 785 L 22 822 L 30 822 Z" fill="#1B5E3B" opacity="0.8"/>
  </svg>
  <div style="position:absolute;top:12pt;right:12pt;bottom:12pt;left:12pt;border:3pt solid #1B5E3B;"></div>
  <div style="position:absolute;top:18pt;right:18pt;bottom:18pt;left:18pt;border:1pt solid #C9A84C;"></div>
  <div style="padding:35pt;position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
    <div style="background:linear-gradient(135deg,#1B5E3B,#2E7D52);border-radius:4pt;padding:14pt 20pt;margin-bottom:10pt;text-align:center;">
      ${logo ? `<img src="${logo}" style="max-height:55pt;margin-bottom:8pt;filter:brightness(1.1);" /><br/>` : ""}
      ${uni ? `<div style="color:#F0E6C8;font-size:13pt;font-weight:700;margin-bottom:3pt;">${uni}</div>` : ""}
      ${fac ? `<div style="color:#B8D4C0;font-size:10.5pt;margin-bottom:2pt;">${fac}</div>` : ""}
      ${dept ? `<div style="color:#90B89A;font-size:10pt;">${dept}</div>` : ""}
    </div>
    <div style="text-align:center;margin:4pt 0;color:#C9A84C;font-size:12pt;letter-spacing:6px;">✦ ✦ ✦</div>
    <div style="text-align:center;padding:16pt 16pt;border:1.5pt solid #1B5E3B;border-radius:4pt;background:linear-gradient(180deg,rgba(27,94,59,0.04),rgba(27,94,59,0.02));margin:10pt 0 10pt;">
      ${deg ? `<div style="display:inline-block;background:#1B5E3B;color:#F0E6C8;font-size:10pt;padding:3pt 16pt;border-radius:2pt;margin-bottom:12pt;margin-left:auto;margin-right:auto;">${deg}</div>` : ""}
      <h1 style="color:#0D3320;font-size:20pt;font-weight:800;line-height:1.5;margin:0 0 8pt;">${title}</h1>
      <div style="margin:8pt auto;width:120pt;height:0;border-top:2pt solid #C9A84C;"></div>
      ${subtitle ? `<p style="color:#2E7D52;font-size:11pt;font-style:italic;margin:8pt 0 0;">${subtitle}</p>` : ""}
      ${cName ? `<p style="color:#2E7D52;font-size:11pt;margin:6pt 0 0;"><strong style="color:#0D3320;">المقرر:</strong> ${cName}</p>` : ''}
      ${trainAgency ? `<p style="color:#2E7D52;font-size:11pt;margin:4pt 0 0;"><strong style="color:#0D3320;">جهة التدريب:</strong> ${trainAgency}</p>` : ''}
    </div>
    <div style="text-align:center;margin:4pt 0;color:#C9A84C;font-size:12pt;letter-spacing:6px;">◆ ◆ ◆</div>
    <div style="background:linear-gradient(180deg,rgba(27,94,59,0.06),rgba(201,168,76,0.06));border:1pt solid rgba(27,94,59,0.2);border-radius:4pt;padding:12pt 16pt;margin-top:10pt;">
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#1B5E3B;">
        <tr>
          ${student ? `<td style="padding:4pt 6pt;border:none;text-align:right;"><strong style="color:#0D3320;">إعداد الطالب:</strong> ${student}</td>` : "<td style='border:none;'></td>"}
          ${supervisor ? `<td style="padding:4pt 6pt;border:none;text-align:right;"><strong style="color:#0D3320;">إشراف الدكتور:</strong> ${supervisor}</td>` : "<td style='border:none;'></td>"}
        </tr>
        ${(sId || fieldSup) ? `
        <tr>
          ${sId ? `<td style="padding:4pt 6pt;border:none;text-align:right;"><strong style="color:#0D3320;">الرقم الجامعي:</strong> ${sId}</td>` : "<td style='border:none;'></td>"}
          ${fieldSup ? `<td style="padding:4pt 6pt;border:none;text-align:right;"><strong style="color:#0D3320;">المشرف الميداني:</strong> ${fieldSup}</td>` : "<td style='border:none;'></td>"}
        </tr>
        ` : ""}
        ${sect ? `
        <tr>
          <td style="padding:4pt 6pt;border:none;text-align:right;" colspan="2"><strong style="color:#0D3320;">الشعبة:</strong> ${sect}</td>
        </tr>
        ` : ""}
        <tr><td colspan="2" style="border:none;padding:4pt 8pt;"><div style="height:1pt;background:rgba(27,94,59,0.2);"></div></td></tr>
        <tr>
          <td style="padding:4pt 6pt;border:none;text-align:center;font-size:10pt;color:#555;" colspan="2">${year || ""}</td>
        </tr>
      </table>
    </div>
  </div>
</div>`;
    }

    const arL1 = arLine1 || "المملكة العربية السعودية";
    const arL2 = arLine2 || "وزارة التعليم";
    const arL3 = arLine3 || uni || "";
    const enL1 = enLine1 || "Kingdom of Saudi Arabia";
    const enL2 = enLine2 || "Ministry of Education";
    const enL3 = enLine3 || uniEn || (uni ? uni : "");

    const alignClass = detailsAlign || "center"; // "right" | "left" | "center"

    // Construct Columns Content with faculty & department added in side columns
    let leftColumnContent = `
      <div style="text-align:left;direction:ltr;font-family:'Arial','Calibri',sans-serif;font-size:9.5pt;font-weight:700;color:${borderCol};line-height:1.8;flex:1;">
        ${enL1}<br/>
        ${enL2}<br/>
        ${enL3}
        ${fac ? `<br/>Faculty of ${fac}` : ''}
        ${dept ? `<br/>Department of ${dept}` : ''}
      </div>
    `;
    let centerColumnContent = `
      <div style="text-align:center;flex:0 0 auto;padding:0 12pt;">
        ${logo ? `<img src="${logo}" style="max-height:60pt;max-width:90pt;display:block;margin:0 auto 5pt;" />` : `<div style="width:45pt;height:45pt;border-radius:50%;border:2pt solid ${borderCol};margin:0 auto 5pt;display:flex;align-items:center;justify-content:center;margin-left:auto;margin-right:auto;"><span style="color:${borderCol};font-size:16pt;">✦</span></div>`}
      </div>
    `;
    let rightColumnContent = `
      <div style="text-align:right;direction:rtl;font-size:10pt;font-weight:700;color:${borderCol};line-height:1.8;flex:1;">
        ${arL1}<br/>
        ${arL2}<br/>
        ${arL3}
        ${fac ? `<br/>كلية ${fac}` : ''}
        ${dept ? `<br/>قسم ${dept}` : ''}
      </div>
    `;

    if (headerLayout === "logo-right") {
      rightColumnContent = `
        <div style="text-align:right;flex:0 0 auto;padding:0 12pt;">
          ${logo ? `<img src="${logo}" style="max-height:60pt;max-width:90pt;display:block;margin:0 auto 5pt;" />` : `<div style="width:45pt;height:45pt;border-radius:50%;border:2pt solid ${borderCol};margin:0 auto 5pt;display:flex;align-items:center;justify-content:center;margin-left:auto;margin-right:auto;"><span style="color:${borderCol};font-size:16pt;">✦</span></div>`}
        </div>
      `;
      centerColumnContent = `<div style="flex:1;"></div>`;
      leftColumnContent = `
        <div style="text-align:left;direction:ltr;font-family:'Arial','Calibri',sans-serif;font-size:9.5pt;font-weight:700;color:${borderCol};line-height:1.8;flex:1;">
          ${enL1}<br/>${enL2}<br/>${enL3}${fac ? `<br/>Faculty of ${fac}` : ''}${dept ? `<br/>Department of ${dept}` : ''}
          <div style="margin-top:10pt;text-align:right;direction:rtl;font-size:10pt;font-family:'Traditional Arabic',serif;">
            ${arL1}<br/>${arL2}<br/>${arL3}${fac ? `<br/>كلية ${fac}` : ''}${dept ? `<br/>قسم ${dept}` : ''}
          </div>
        </div>
      `;
    } else if (headerLayout === "logo-left") {
      leftColumnContent = `
        <div style="text-align:left;flex:0 0 auto;padding:0 12pt;">
          ${logo ? `<img src="${logo}" style="max-height:60pt;max-width:90pt;display:block;margin:0 auto 5pt;" />` : `<div style="width:45pt;height:45pt;border-radius:50%;border:2pt solid ${borderCol};margin:0 auto 5pt;display:flex;align-items:center;justify-content:center;margin-left:auto;margin-right:auto;"><span style="color:${borderCol};font-size:16pt;">✦</span></div>`}
        </div>
      `;
      centerColumnContent = `<div style="flex:1;"></div>`;
      rightColumnContent = `
        <div style="text-align:right;direction:rtl;font-size:10pt;font-weight:700;color:${borderCol};line-height:1.8;flex:1;">
          ${arL1}<br/>${arL2}<br/>${arL3}${fac ? `<br/>كلية ${fac}` : ''}${dept ? `<br/>قسم ${dept}` : ''}
          <div style="margin-top:10pt;text-align:left;direction:ltr;font-size:9.5pt;font-family:'Arial','Calibri',sans-serif;">
            ${enL1}<br/>${enL2}<br/>${enL3}${fac ? `<br/>Faculty of ${fac}` : ''}${dept ? `<br/>Department of ${dept}` : ''}
          </div>
        </div>
      `;
    }

    const dVertical = detailsVertical || "bottom"; // "top" | "center" | "bottom"
    const tPosition = titlePosition || "center"; // "top" | "center" | "bottom"
    const dLineWidth = decorLineWidth !== undefined ? decorLineWidth : 200;
    const dLineHeight = decorLineHeight !== undefined ? decorLineHeight : 3;
    const dLineColor = decorLineColor || "#1a1a1a";
    const sDecorLine = showDecorLine !== false;

    // Flex order mapping
    let detailsOrder = 5;
    if (dVertical === "top") detailsOrder = 1;
    else if (dVertical === "center") detailsOrder = 3;

    let titleOrder = 4;
    if (tPosition === "top") titleOrder = 2;
    else if (tPosition === "bottom") titleOrder = 6;

    // Construct Blocks
    const titleGroupBlock = `
    <div style="text-align:center;order:${titleOrder};display:flex;flex-direction:column;align-items:center;justify-content:center;margin:8pt auto;max-width:400pt;width:100%;flex-shrink:0;">
      <h1 style="font-size:${Math.min(22, Math.max(16, Math.round(340 / Math.max(title.length, 8))))}pt;font-weight:800;color:#1a1a1a;line-height:1.5;margin:8pt auto 8pt;max-width:400pt;">${title}</h1>
      ${sDecorLine ? `<div style="width:${dLineWidth}pt;height:${dLineHeight}pt;background:${dLineColor};margin:12pt auto 12pt;"></div>` : ''}
      ${subtitle ? `<div style="font-size:12pt;color:#333;font-weight:600;margin-bottom:10pt;">${subtitle}</div>` : ''}
      ${cName ? `<div style="font-size:11pt;color:#555;margin-bottom:8pt;"><strong style="color:#111;">المقرر:</strong> ${cName}</div>` : ''}
      ${trainAgency ? `<div style="font-size:11pt;color:#555;margin-bottom:8pt;"><strong style="color:#111;">جهة التدريب:</strong> ${trainAgency}</div>` : ''}
      ${deg ? `<div style="display:inline-block;background:${borderCol};color:#fff;font-size:10pt;padding:4pt 24pt;border-radius:3pt;margin-top:6pt;margin-left:auto;margin-right:auto;">${deg}</div>` : ''}
    </div>
    `;

    const detailsBlock = `
    <div style="flex-shrink:0;text-align:${alignClass};padding-top:12pt;padding-bottom:12pt;border-top:${dVertical === "bottom" ? "0.5pt solid #cccccc" : "none"};border-bottom:${dVertical === "top" ? "0.5pt solid #cccccc" : "none"};order:${detailsOrder};width:100%;">
      <div style="font-size:11.5pt;line-height:2.0;color:#1a1a1a;">
        ${student ? `<div><strong style="color:#1a1a1a;">إعداد الطالب: </strong>${student}</div>` : ''}
        ${sId ? `<div><strong style="color:#1a1a1a;">الرقم الجامعي: </strong>${sId}</div>` : ''}
        ${sect ? `<div><strong style="color:#1a1a1a;">الشعبة: </strong>${sect}</div>` : ''}
        ${supervisor ? `<div><strong style="color:#1a1a1a;">إشراف الدكتور: </strong>${supervisor}</div>` : ''}
        ${fieldSup ? `<div><strong style="color:#1a1a1a;">المشرف الميداني: </strong>${fieldSup}</div>` : ''}
        ${year ? `<div style="font-size:11pt;color:#444;">${year}</div>` : ''}
      </div>
    </div>
    `;

    return `
<div style="font-family:'Traditional Arabic','Amiri','Times New Roman',serif;direction:rtl;width:100%;height:100%;background:#ffffff;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;display:flex;flex-direction:column;box-sizing:border-box;">
  <div style="${frameBorderOuter}"></div>
  <div style="${frameBorderInner}"></div>
  <div style="padding:24pt 24pt;display:flex;flex-direction:column;flex:1;justify-content:space-between;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;direction:ltr;width:100%;order:0;">
      ${leftColumnContent}
      ${centerColumnContent}
      ${rightColumnContent}
    </div>
    <div style="height:1pt;background:#cccccc;margin:10pt 0;flex-shrink:0;order:0.5;"></div>
    ${titleGroupBlock}
    ${detailsBlock}
  </div>
</div>`;
  };

  const watchedTitle = form.watch("title");
  const [liveCoverHtml, setLiveCoverHtml] = useState("");

  useEffect(() => {
    if (!includeCover) {
      setLiveCoverHtml("");
      return;
    }

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

    const html = getCoverPageHtml(
      coverStyle,
      watchedTitle || "عنوان البحث هنا",
      coverSubtitle,
      studentName,
      supervisorName,
      university,
      universityEn,
      faculty,
      department,
      degree,
      academicYear,
      finalLogoUrl,
      borderColor,
      studentId,
      section,
      fieldSupervisor,
      trainingAgency,
      courseName,
      detailsAlign,
      headerLayout,
      arabicHeader1,
      arabicHeader2,
      arabicHeader3,
      englishHeader1,
      englishHeader2,
      englishHeader3,
      detailsVertical,
      titlePosition,
      decorLineWidth,
      decorLineHeight,
      decorLineColor,
      showDecorLine
    );
    setLiveCoverHtml(html);
  }, [
    includeCover,
    coverStyle,
    watchedTitle,
    coverSubtitle,
    studentName,
    supervisorName,
    university,
    universityEn,
    faculty,
    department,
    degree,
    academicYear,
    studentId,
    section,
    fieldSupervisor,
    trainingAgency,
    courseName,
    logoPreset,
    logoUrl,
    borderColor,
    coversData,
    detailsAlign,
    headerLayout,
    arabicHeader1,
    arabicHeader2,
    arabicHeader3,
    englishHeader1,
    englishHeader2,
    englishHeader3,
    detailsVertical,
    titlePosition,
    decorLineWidth,
    decorLineHeight,
    decorLineColor,
    showDecorLine
  ]);

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

    let coverPageHtml = "";
    if (includeCover) {
      coverPageHtml = liveCoverHtml;
    }


    const layoutMetadata = {
      showPageNumbers,
      pageNumberFormat,
      pageNumberAlign,
      targetPageCount,
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
      detailsAlign,
      headerLayout,
      arabicHeader1,
      arabicHeader2,
      arabicHeader3,
      englishHeader1,
      englishHeader2,
      englishHeader3,
      detailsVertical,
      titlePosition,
      decorLineWidth,
      decorLineHeight,
      decorLineColor,
      showDecorLine,
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
        studentId,
        section,
        fieldSupervisor,
        trainingAgency,
        courseName,
      } : undefined,
      isCustomTemplateCover: coverStyle.startsWith("template_"),
      coverTemplateId: coverStyle.startsWith("template_") ? parseInt(coverStyle.replace("template_", ""), 10) : undefined,
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let newUploadedNames = [...uploadedFiles];
    let latestAnalysis = analysis;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}api/parse-document`, {
          method: "POST",
          body: formData
        });

        if (!response.ok) throw new Error("Failed to parse file");

        const data = await response.json();
        
        // Append text instead of replacing
        const currentText = form.getValues("rawContent") || "";
        const newText = data.text || "";
        const divider = currentText ? "\n\n" : "";
        const header = `--- محتوى ملف (${file.name}) ---\n`;
        form.setValue("rawContent", `${currentText}${divider}${header}${newText}`);

        newUploadedNames.push(file.name);
        successCount++;

        // If there's AI analysis, let's keep it (prefer the first file's analysis if multiple have it)
        if (data.analysis && !latestAnalysis) {
          latestAnalysis = data.analysis;
          setAnalysis(data.analysis);
        }
      } catch (err) {
        toast({ 
          title: `فشل استخراج النص من ${file.name}`, 
          description: "تأكد من أن صيغة الملف مدعومة وحاول مرة أخرى.", 
          variant: "destructive" 
        });
      }
    }

    setUploadedFiles(newUploadedNames);
    if (successCount > 0) {
      toast({ title: `تم استخراج النصوص بنجاح من ${successCount} ملف/ملفات` });
    }
    setIsUploading(false);
    e.target.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in-up pb-10" dir="rtl">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors w-fit mb-1"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للوحة التحكم</span>
        </button>
        <h1 className="text-3xl font-bold text-foreground">مشروع جديد</h1>
        <p className="text-muted-foreground">أنشئ مشروعاً بحثياً جديداً وقم بتنسيقه وإعداده باحترافية كاملة</p>
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
            </div>

            {/* Template Visual Card List */}
            <div className="space-y-3 mt-4 border-t pt-4">
              <Label className="text-sm font-bold text-slate-800">قالب التنسيق الأكاديمي (اختياري)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Default Custom Card */}
                <div 
                  onClick={() => {
                    form.setValue("templateId", undefined as any);
                    toast({ title: "تم إلغاء تحديد القالب", description: "يمكنك الآن تعديل التنسيق يدوياً بالكامل." });
                  }}
                  className={`border rounded-xl p-4 cursor-pointer flex flex-col justify-between transition-all hover:shadow-md ${!form.watch("templateId") ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-white"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900">تنسيق مخصص بالكامل</h4>
                      <p className="text-xs text-muted-foreground">قم بتهيئة كافة الإعدادات والخطوط بنفسك يدوياً</p>
                    </div>
                    {!form.watch("templateId") && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                  </div>
                  <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between">
                    <span>إعدادات حرة</span>
                    <span>خصائص يدوية</span>
                  </div>
                </div>

                {Array.isArray(templates) && templates.map(t => {
                  const isSelected = form.watch("templateId") === t.id;
                  return (
                    <div 
                      key={t.id}
                      className={`border rounded-xl p-4 cursor-pointer flex flex-col justify-between transition-all hover:shadow-md ${isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-white"}`}
                    >
                      <div onClick={() => applyFormattingTemplate(t)} className="flex items-start justify-between flex-1">
                        <div className="space-y-1 relative">
                          <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description || "قالب تنسيق أكاديمي جاهز للبحوث والواجبات"}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>الخط: {t.formatting.fontFamily || "Traditional Arabic"}</span>
                          <span>•</span>
                          <span>التباعد: {t.formatting.lineSpacing || "1.5"}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(t);
                            }}
                          >
                            <Eye className="w-3 h-3 ml-1" />
                            معاينة
                          </Button>
                          <Button 
                            type="button" 
                            variant={isSelected ? "secondary" : "outline"} 
                            size="sm" 
                            className="h-7 px-2.5 text-xs font-semibold"
                            onClick={() => applyFormattingTemplate(t)}
                          >
                            استخدام
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

            {/* Target Page Count Select (AI Expansion parameter) */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="targetPageCount">عدد الصفحات المستهدف (للذكاء الاصطناعي)</Label>
              <Select value={targetPageCount} onValueChange={setTargetPageCount}>
                <SelectTrigger id="targetPageCount" className="w-full md:w-72">
                  <SelectValue placeholder="اختر حجم المحتوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">توليد تلقائي (حسب متطلبات الواجب)</SelectItem>
                  <SelectItem value="3-5">قصير (3 - 5 صفحات)</SelectItem>
                  <SelectItem value="5-10">متوسط (5 - 10 صفحات)</SelectItem>
                  <SelectItem value="10-15">طويل (10 - 15 صفحة)</SelectItem>
                  <SelectItem value="15-20">مفصل جداً (15 - 20 صفحة)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">سيقوم الذكاء الاصطناعي بالتوسع في شرح وتفصيل النقاط والمفاهيم لتلبية حجم البحث المستهدف.</p>
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
              {/* Shortcut to apply general academic formatting */}
              <div className="flex items-center justify-between mb-4 bg-purple-500/10 dark:bg-purple-950/20 p-2.5 rounded-lg border border-purple-200/50 dark:border-purple-800/30 gap-3 flex-wrap md:flex-nowrap">
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium font-bold">💡 اختصار سريع:</span>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-purple-600 hover:bg-purple-700 text-white hover:text-white border-transparent text-xs gap-1 py-1 px-3 h-8 shadow-sm transition-all"
                  onClick={() => {
                    setFontFamily("Traditional Arabic");
                    setFontSize("12");
                    setHeadingSize("18");
                    setSubheadingSize("14");
                    setLineSpacing("1.5");
                    setParagraphAlign("justify");
                    setPageSize("A4");
                    setOrientation("portrait");
                    setMarginTop("2.5");
                    setMarginBottom("2.5");
                    setMarginLeft("2.5");
                    setMarginRight("3.0");
                    setShowPageNumbers(true);
                    setPageNumberFormat("1, 2, 3");
                    setPageNumberAlign("center");
                    toast({ title: "تم تطبيق التنسيق الأكاديمي العام بنجاح", description: "تم ضبط حجم الخط 12، هوامش 2.5سم، خط Traditional Arabic وتباعد 1.5." });
                  }}
                >
                  تطبيق التنسيق الأكاديمي العام (خط 12)
                </Button>
              </div>

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
                        {/* Cover Style Selector - Premium Visual Card Grid */}
                        <div className="md:col-span-2 space-y-3">
                          <Label className="font-semibold text-slate-800 text-sm">تصميم وتنسيق الغلاف</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* Classic Card */}
                            <div
                              onClick={() => setCoverStyle("classic")}
                              className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all relative ${
                                coverStyle === "classic"
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-slate-300 bg-card hover:bg-slate-50/50"
                              }`}
                            >
                              <div className="aspect-[1/1.414] bg-white border border-slate-100 rounded-lg shadow-sm mb-2.5 overflow-hidden flex flex-col justify-between p-2 text-[6px] text-slate-400 select-none">
                                <div className="flex justify-between border-b pb-0.5 border-slate-100">
                                  <span>UNIVERSITY HEADER</span>
                                  <span>الترويسة الأكاديمية</span>
                                </div>
                                <div className="text-center font-bold text-slate-800 my-auto text-[8px]">
                                  العنوان الرئيسي للبحث
                                </div>
                                <div className="space-y-0.5 border-t pt-1 border-slate-100">
                                  <div className="h-1 w-8 bg-slate-100 rounded-full mx-auto" />
                                  <div className="h-1 w-6 bg-slate-100 rounded-full mx-auto" />
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-800 text-center mb-0.5">كلاسيكي أكاديمي</h4>
                                <p className="text-[10px] text-muted-foreground text-center">ترويسة ثنائية اللغة وشعار بالمنتصف</p>
                              </div>
                              {coverStyle === "classic" && (
                                <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 left-2" />
                              )}
                            </div>

                            {/* Modern Card */}
                            <div
                              onClick={() => setCoverStyle("modern")}
                              className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all relative ${
                                coverStyle === "modern"
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-slate-300 bg-card hover:bg-slate-50/50"
                              }`}
                            >
                              <div className="aspect-[1/1.414] bg-slate-900 border border-slate-800 rounded-lg shadow-sm mb-2.5 overflow-hidden flex flex-col justify-between p-2.5 text-[5px] text-slate-400 select-none relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950" />
                                <div className="z-10 flex justify-between border-b pb-0.5 border-slate-800">
                                  <span>MODERN LAYOUT</span>
                                  <span>شعار الجامعة</span>
                                </div>
                                <div className="z-10 text-center font-bold text-amber-400 my-auto text-[8px] tracking-wide">
                                  RESEARCH TITLE
                                </div>
                                <div className="z-10 space-y-0.5 border-t pt-1 border-slate-800">
                                  <div className="h-1 w-10 bg-slate-800 rounded-full mx-auto" />
                                  <div className="h-1 w-8 bg-slate-800 rounded-full mx-auto" />
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-800 text-center mb-0.5">حديث ملون</h4>
                                <p className="text-[10px] text-muted-foreground text-center">خلفية داكنة مع تدرجات وزخارف ذهبية</p>
                              </div>
                              {coverStyle === "modern" && (
                                <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 left-2" />
                              )}
                            </div>

                            {/* Framed Card */}
                            <div
                              onClick={() => setCoverStyle("framed")}
                              className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all relative ${
                                coverStyle === "framed"
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-slate-300 bg-card hover:bg-slate-50/50"
                              }`}
                            >
                              <div className="aspect-[1/1.414] bg-white border border-slate-100 rounded-lg shadow-sm mb-2.5 overflow-hidden flex flex-col justify-between p-2 text-[5px] text-slate-400 select-none relative">
                                <div className="absolute inset-1 border-2 border-double border-amber-500/40 rounded" />
                                <div className="z-10 flex justify-between px-1.5 pt-1.5 text-[5px]">
                                  <span>FRAMED DESIGN</span>
                                  <span>شعار الجامعة</span>
                                </div>
                                <div className="z-10 text-center font-bold text-slate-800 my-auto text-[8px] px-1">
                                  العنوان المبروز للبحث
                                </div>
                                <div className="z-10 space-y-0.5 pb-1.5 text-center">
                                  <div className="h-1 w-6 bg-slate-100 rounded-full mx-auto" />
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-800 text-center mb-0.5">إطار إسلامي</h4>
                                <p className="text-[10px] text-muted-foreground text-center">إطار ذهبي هندسي مزدوج فاخر</p>
                              </div>
                              {coverStyle === "framed" && (
                                <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 left-2" />
                              )}
                            </div>

                            {/* Custom Templates from library */}
                            {coversData?.items?.map((doc: any) => {
                              const value = `template_${doc.id}`;
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() => setCoverStyle(value)}
                                  className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all relative ${
                                    coverStyle === value
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                      : "border-border hover:border-slate-300 bg-card hover:bg-slate-50/50"
                                  }`}
                                >
                                  <div className="aspect-[1/1.414] bg-white border border-slate-100 rounded-lg shadow-sm mb-2.5 overflow-hidden flex items-center justify-center p-2 text-slate-400 select-none relative">
                                    {doc.coverImageUrl ? (
                                      <img src={doc.coverImageUrl} className="w-full h-full object-cover rounded" alt={doc.title} />
                                    ) : (
                                      <div className="flex flex-col items-center gap-1.5">
                                        <BookOpen className="w-6 h-6 text-slate-300" />
                                        <span className="text-[8px] text-center font-medium text-slate-400 line-clamp-2 px-1">{doc.title}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-800 text-center mb-0.5 truncate">{doc.title}</h4>
                                    <p className="text-[10px] text-muted-foreground text-center">قالب مخصص من المكتبة</p>
                                  </div>
                                  {coverStyle === value && (
                                    <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 left-2" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
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

                        {/* Student ID */}
                        <div className="space-y-1.5">
                          <Label>الرقم الجامعي (اختياري)</Label>
                          <Input
                            placeholder="مثلاً: 44102938..."
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
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

                        {/* Field Supervisor */}
                        <div className="space-y-1.5">
                          <Label>المشرف الميداني (اختياري)</Label>
                          <Input
                            placeholder="اسم المشرف في جهة التدريب..."
                            value={fieldSupervisor}
                            onChange={(e) => setFieldSupervisor(e.target.value)}
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

                        {/* Section */}
                        <div className="space-y-1.5">
                          <Label>الشعبة / المجموعة (اختياري)</Label>
                          <Input
                            placeholder="مثلاً: 101 أو A..."
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                          />
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

                        {/* Course Name */}
                        <div className="space-y-1.5">
                          <Label>اسم المقرر / المادة (اختياري)</Label>
                          <Input
                            placeholder="مثلاً: التدريب التعاوني..."
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                          />
                        </div>

                        {/* Training Agency */}
                        <div className="space-y-1.5">
                          <Label>جهة التدريب / العمل (اختياري)</Label>
                          <Input
                            placeholder="مثلاً: أمانة منطقة الحدود الشمالية..."
                            value={trainingAgency}
                            onChange={(e) => setTrainingAgency(e.target.value)}
                          />
                        </div>

                        {/* Header Layout & Details Alignment Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                          <div className="space-y-1.5">
                            <Label>تنسيق وترتيب الهيدر (أعلى الغلاف)</Label>
                            <Select value={headerLayout} onValueChange={(val: any) => setHeaderLayout(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر ترتيب الهيدر" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="logo-center">اللوجو بالمنتصف، والترويسات يمين ويسار</SelectItem>
                                <SelectItem value="logo-right">اللوجو باليمين، والترويسة مدمجة باليسار</SelectItem>
                                <SelectItem value="logo-left">اللوجو باليسار، والترويسة مدمجة باليمين</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>محاذاة بيانات الطالب والمشرف (أسفل الغلاف)</Label>
                            <Select value={detailsAlign} onValueChange={(val: any) => setDetailsAlign(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر محاذاة البيانات" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="right">محاذاة إلى اليمين</SelectItem>
                                <SelectItem value="center">توسيط البيانات (بالمنتصف)</SelectItem>
                                <SelectItem value="left">محاذاة إلى اليسار</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Custom Arabic Header Lines */}
                        <div className="space-y-2 border-t pt-3">
                          <Label className="text-emerald-700 font-bold block mb-1">التحكم في نص الترويسة العربية (اليمين)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">السطر الأول</span>
                              <Input
                                placeholder="المملكة العربية السعودية"
                                value={arabicHeader1}
                                onChange={(e) => setArabicHeader1(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">السطر الثاني</span>
                              <Input
                                placeholder="وزارة التعليم"
                                value={arabicHeader2}
                                onChange={(e) => setArabicHeader2(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">السطر الثالث (الجامعة)</span>
                              <Input
                                placeholder="اسم الجامعة بالعربي"
                                value={arabicHeader3}
                                onChange={(e) => setArabicHeader3(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Custom English Header Lines */}
                        <div className="space-y-2 border-t pt-3 pb-3 border-b mb-3">
                          <Label className="text-indigo-700 font-bold block mb-1">التحكم في نص الترويسة الإنجليزية (اليسار)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Line 1</span>
                              <Input
                                placeholder="Kingdom of Saudi Arabia"
                                value={englishHeader1}
                                onChange={(e) => setEnglishHeader1(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Line 2</span>
                              <Input
                                placeholder="Ministry of Education"
                                value={englishHeader2}
                                onChange={(e) => setEnglishHeader2(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Line 3 (University)</span>
                              <Input
                                placeholder="University Name"
                                value={englishHeader3}
                                onChange={(e) => setEnglishHeader3(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Custom Layout Position Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                          <div className="space-y-1.5">
                            <Label>موضع بيانات الطالب والمشرف رأسيّاً</Label>
                            <Select value={detailsVertical} onValueChange={(val: any) => setDetailsVertical(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الموضع الرأسي" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">أعلى الصفحة (تحت الترويسة)</SelectItem>
                                <SelectItem value="center">وسط الصفحة</SelectItem>
                                <SelectItem value="bottom">أسفل الصفحة (افتراضي)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>موضع العنوان الرئيسي للبحث</Label>
                            <Select value={titlePosition} onValueChange={(val: any) => setTitlePosition(val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر موضع العنوان" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">أعلى الصفحة (تحت الترويسة)</SelectItem>
                                <SelectItem value="center">وسط الصفحة (افتراضي)</SelectItem>
                                <SelectItem value="bottom">أسفل وسط الصفحة</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Decor Line Customization */}
                        <div className="space-y-2 border-t pt-3">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium">الخط الزخرفي تحت العنوان الرئيسي</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{showDecorLine ? "مفعّل" : "ملغى"}</span>
                              <input
                                type="checkbox"
                                checked={showDecorLine}
                                onChange={(e) => setShowDecorLine(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          {showDecorLine && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-2 border-l-2 border-slate-200 mt-2">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground block font-bold mb-1">عرض الخط (نقطة)</span>
                                <input
                                  type="range"
                                  min="50"
                                  max="400"
                                  step="10"
                                  value={decorLineWidth}
                                  onChange={(e) => setDecorLineWidth(parseInt(e.target.value))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs text-muted-foreground block text-center font-medium">{decorLineWidth}pt</span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground block font-bold mb-1">سمك الخط (نقطة)</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="0.5"
                                  value={decorLineHeight}
                                  onChange={(e) => setDecorLineHeight(parseFloat(e.target.value))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs text-muted-foreground block text-center font-medium">{decorLineHeight}pt</span>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-xs text-muted-foreground block font-bold mb-1">لون الخط الزخرفي</span>
                                <div className="flex gap-1 items-center">
                                  <Input
                                    type="color"
                                    className="w-8 h-8 p-0.5 cursor-pointer rounded-md border border-border"
                                    value={decorLineColor}
                                    onChange={(e) => setDecorLineColor(e.target.value)}
                                  />
                                  <Input
                                    type="text"
                                    className="h-8 text-xs font-mono"
                                    value={decorLineColor}
                                    onChange={(e) => setDecorLineColor(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Border Color Picker */}
                        <div className="space-y-1.5 border-t pt-3">
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

                        {/* Live Cover Preview */}
                        {liveCoverHtml && (
                          <div className="md:col-span-2 mt-6 border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                            <div className="bg-muted px-4 py-2 border-b text-xs font-semibold text-muted-foreground text-right flex justify-between items-center">
                              <span>معاينة صفحة الغلاف</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">تحديث تلقائي</span>
                            </div>
                            <div className="p-4 flex justify-center bg-slate-100 min-h-[300px] overflow-hidden relative">
                              <div 
                                className="overflow-hidden border shadow-lg rounded bg-white relative transition-all"
                                style={{
                                  width: orientation === "landscape" ? "120mm" : "84mm",
                                  height: orientation === "landscape" ? "84mm" : "120mm",
                                }}
                              >
                                <div 
                                  className="origin-top-left scale-[0.4] absolute top-0 left-0"
                                  style={{
                                    width: orientation === "landscape" ? "297mm" : "210mm",
                                    height: orientation === "landscape" ? "210mm" : "297mm",
                                  }}
                                >
                                  <iframe
                                    srcDoc={`<!DOCTYPE html><html lang="ar" dir="rtl" spellcheck="false"><head><meta charset="utf-8"/><style>html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: white; }</style></head><body spellcheck="false">${liveCoverHtml}</body></html>`}
                                    className="w-full h-full border-0"
                                    title="Cover Live Preview"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                <span>رفع ملفات (Word / PDF / صور)</span>
              </Label>
              <Input id="file-upload" type="file" accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.bmp" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
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

            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 bg-primary/5 p-3 rounded-lg border border-primary/10">
                <Label className="text-xs font-semibold text-primary">الملفات المرفوعة والمترجمة بنجاح:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {uploadedFiles.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-primary bg-white border border-primary/20 px-3 py-1 rounded-full shadow-sm">
                      <FileText className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                      <span className="truncate max-w-[150px]">{name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = uploadedFiles.filter((_, i) => i !== idx);
                          setUploadedFiles(updated);
                          toast({ title: `تمت إزالة ${name}` });
                        }}
                        className="text-primary/60 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors font-bold text-sm leading-none"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
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

      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-right">معاينة تنسيق قالب: {previewTemplate.name}</DialogTitle>
              <DialogDescription className="text-right">
                {previewTemplate.description || "معاينة بصرية لتنسيق خطوط وهوامش وتوزيع محتوى الصفحة في هذا القالب."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 border rounded-lg p-6 bg-slate-50 flex justify-center">
              <div 
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  aspectRatio: "1/1.414", // A4 ratio
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  padding: `${(previewTemplate.formatting.marginTop || 2.5) * 12}px ${(previewTemplate.formatting.marginRight || 3) * 12}px ${(previewTemplate.formatting.marginBottom || 2.5) * 12}px ${(previewTemplate.formatting.marginLeft || 2.5) * 12}px`,
                  fontFamily: previewTemplate.formatting.fontFamily || "Traditional Arabic",
                  direction: "rtl",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
                className="text-right select-none"
              >
                <div style={{ fontSize: `${(previewTemplate.formatting.headingSize || 18) * 0.8}px`, fontWeight: "bold", marginBottom: "12px", color: "#111827", lineHeight: 1.2 }}>
                  1. عنوان القسم الرئيسي للبحث
                </div>
                <div style={{ fontSize: `${(previewTemplate.formatting.subheadingSize || 16) * 0.8}px`, fontWeight: "bold", marginBottom: "8px", color: "#374151", lineHeight: 1.2 }}>
                  1.1 عنوان فرعي من المستوى الثاني
                </div>
                <div style={{ 
                  fontSize: `${(previewTemplate.formatting.fontSize || 14) * 0.8}px`, 
                  lineHeight: previewTemplate.formatting.lineSpacing || 1.5,
                  textAlign: previewTemplate.formatting.paragraphAlign || "justify",
                  textIndent: `${(previewTemplate.formatting.firstLineIndent || 1.25) * 8}px`,
                  color: "#4b5563"
                }}>
                  هذا النص يمثل نموذجاً للمعاينة البصرية لطريقة عرض خطوط البحث وتباعد الأسطر المنسقة تلقائياً. عند اختيار هذا القالب، سيقوم النظام تلقائياً بتطبيق إعدادات الخط وحجم العناوين والمسافات البادئة والمارش الداخلي للهوامش في هذا البحث.
                </div>
                <div className="w-full h-px bg-slate-100 my-4" />
                <div style={{ fontSize: `${(previewTemplate.formatting.fontSize || 14) * 0.8}px`, lineHeight: previewTemplate.formatting.lineSpacing || 1.5, color: "#4b5563" }}>
                  • نقطة أولى لتوضيح شكل القوائم والتعداد النقطي.<br/>
                  • نقطة ثانية تعكس شكل الهوامش الجانبية المطبقة على البحث.
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>إغلاق</Button>
              <Button 
                onClick={() => {
                  applyFormattingTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="bg-primary text-primary-foreground font-semibold"
              >
                تطبيق هذا التنسيق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}