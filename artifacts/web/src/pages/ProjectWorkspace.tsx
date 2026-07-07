import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useUpdateProject, 
  useDeleteProject, 
  useAnalyzeProject, 
  useExtractReferences, 
  useVerifyProject,
  useAssistProject,
  useSaveProjectToLibrary,
  getListProjectsQueryKey,
  getGetStatsQueryKey,
  useListLibraryDocuments
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Wand2, FileSearch, CheckCircle2, AlertTriangle, 
  Download, Printer, Settings, ArrowRight, Trash2, ListTree, RefreshCw, Send, BookMarked, Presentation,
  Eye, Edit, Save
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Project, Section } from "@workspace/api-client-react";
import { TemplateWorkspace } from "./TemplateWorkspace";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PdfPreview } from "@/components/PdfPreview";

export function ProjectWorkspace() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project, isLoading, isError } = useGetProject(id, { 
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } 
  });

  const analyzeProject = useAnalyzeProject();
  const extractReferences = useExtractReferences();
  const verifyProject = useVerifyProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const saveToLibrary = useSaveProjectToLibrary();
  const assistProject = useAssistProject();

  // Edit Modal State
  const { data: coversData } = useListLibraryDocuments({ documentType: "master_template" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editRawContent, setEditRawContent] = useState("");
  const [editCoverSubtitle, setEditCoverSubtitle] = useState("");
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editSupervisorName, setEditSupervisorName] = useState("");
  const [editFieldSupervisor, setEditFieldSupervisor] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editUniversity, setEditUniversity] = useState("");
  const [editFaculty, setEditFaculty] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editDegree, setEditDegree] = useState("");
  const [editAcademicYear, setEditAcademicYear] = useState("");
  const [editUniversityEn, setEditUniversityEn] = useState("");
  const [editCoverStyle, setEditCoverStyle] = useState("classic");
  const [editBorderColor, setEditBorderColor] = useState("#1B4FA3");
  const [editShowPageBorder, setEditShowPageBorder] = useState(true);

  // Custom cover layout options
  const [editDetailsAlign, setEditDetailsAlign] = useState<"right" | "center" | "left">("center");
  const [editHeaderLayout, setEditHeaderLayout] = useState<"logo-center" | "logo-right" | "logo-left">("logo-center");
  const [editArabicHeader1, setEditArabicHeader1] = useState("المملكة العربية السعودية");
  const [editArabicHeader2, setEditArabicHeader2] = useState("وزارة التعليم");
  const [editArabicHeader3, setEditArabicHeader3] = useState("");
  const [editEnglishHeader1, setEditEnglishHeader1] = useState("Kingdom of Saudi Arabia");
  const [editEnglishHeader2, setEditEnglishHeader2] = useState("Ministry of Education");
  const [editEnglishHeader3, setEditEnglishHeader3] = useState("");

  const [editDetailsVertical, setEditDetailsVertical] = useState<"top" | "center" | "bottom">("bottom");
  const [editTitlePosition, setEditTitlePosition] = useState<"top" | "center" | "bottom">("center");
  const [editDecorLineWidth, setEditDecorLineWidth] = useState<number>(200);
  const [editDecorLineHeight, setEditDecorLineHeight] = useState<number>(3);
  const [editDecorLineColor, setEditDecorLineColor] = useState<string>("#1a1a1a");
  const [editShowDecorLine, setEditShowDecorLine] = useState<boolean>(true);

  // Logo selection options
  const [editLogoPreset, setEditLogoPreset] = useState("default");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  const [fixingAll, setFixingAll] = useState(false);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);

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
      const templateId = parseInt(style.replace("template_", ""), 10);
      const selectedCoverTemplate: any = coversData?.items?.find((i: any) => i.id === templateId);
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
    <defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#C9A84C" stroke-width="1"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#hex)"/>
  </svg>
  <div style="background:linear-gradient(90deg,#C9A84C,#F0D070,#C9A84C);height:5pt;width:100%;flex-shrink:0;position:relative;z-index:1;"></div>
  <div style="position:relative;z-index:1;padding:32pt 36pt 20pt 36pt;flex-shrink:0;text-align:center;">
    <div style="width:55pt;height:55pt;border-radius:50%;border:2pt solid #C9A84C;margin:0 auto 10pt;line-height:55pt;text-align:center;"><span style="color:#C9A84C;font-size:20pt;">◆</span></div>
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

  const handleOpenEditModal = () => {
    if (!project) return;
    setEditTitle(project.title || "");
    setEditRawContent(project.rawContent || "");
    
    const cover = (project.layoutMetadata as any)?.cover || {};
    setEditCoverSubtitle(cover.subtitle || "");
    setEditStudentName(cover.studentName || "");
    setEditStudentId(cover.studentId || "");
    setEditSupervisorName(cover.supervisor || "");
    setEditFieldSupervisor(cover.fieldSupervisor || "");
    setEditSection(cover.section || "");
    setEditUniversity(cover.university || "");
    setEditFaculty(cover.faculty || "");
    setEditDepartment(cover.department || "");
    setEditDegree(cover.degree || "");
    setEditAcademicYear(cover.year || "");
    setEditUniversityEn(cover.universityEn || "");
    setEditCoverStyle((project.layoutMetadata as any)?.coverTemplateId ? `template_${(project.layoutMetadata as any).coverTemplateId}` : ((project.layoutMetadata as any)?.cover ? "classic" : "none"));
    setEditBorderColor((project.layoutMetadata as any)?.borderColor || "#1B4FA3");
    setEditShowPageBorder((project.layoutMetadata as any)?.showPageBorder !== false);
    
    // Custom layout settings
    setEditDetailsAlign((project.layoutMetadata as any)?.detailsAlign || "center");
    setEditHeaderLayout((project.layoutMetadata as any)?.headerLayout || "logo-center");
    setEditArabicHeader1((project.layoutMetadata as any)?.arabicHeader1 || "المملكة العربية السعودية");
    setEditArabicHeader2((project.layoutMetadata as any)?.arabicHeader2 || "وزارة التعليم");
    setEditArabicHeader3((project.layoutMetadata as any)?.arabicHeader3 || "");
    setEditEnglishHeader1((project.layoutMetadata as any)?.englishHeader1 || "Kingdom of Saudi Arabia");
    setEditEnglishHeader2((project.layoutMetadata as any)?.englishHeader2 || "Ministry of Education");
    setEditEnglishHeader3((project.layoutMetadata as any)?.englishHeader3 || "");

    setEditDetailsVertical((project.layoutMetadata as any)?.detailsVertical || "bottom");
    setEditTitlePosition((project.layoutMetadata as any)?.titlePosition || "center");
    setEditDecorLineWidth((project.layoutMetadata as any)?.decorLineWidth !== undefined ? (project.layoutMetadata as any).decorLineWidth : 200);
    setEditDecorLineHeight((project.layoutMetadata as any)?.decorLineHeight !== undefined ? (project.layoutMetadata as any).decorLineHeight : 3);
    setEditDecorLineColor((project.layoutMetadata as any)?.decorLineColor || "#1a1a1a");
    setEditShowDecorLine((project.layoutMetadata as any)?.showDecorLine !== false);

    const logoUrl = cover.logoUrl || "";
    setEditLogoUrl(logoUrl);
    if (logoUrl.includes("D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B3%D8%B9%D9%88%D8%AF")) {
      setEditLogoPreset("ksu");
    } else if (logoUrl.includes("D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2")) {
      setEditLogoPreset("kau");
    } else if (logoUrl.includes("Umm_Al-Qura_University_logo")) {
      setEditLogoPreset("uqu");
    } else if (logoUrl !== "") {
      setEditLogoPreset("custom");
    } else {
      setEditLogoPreset("default");
    }

    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!project) return;
    const isCoverEnabled = editCoverStyle !== "none";
    
    let finalLogoUrl = "";
    if (editLogoPreset === "ksu") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/6/69/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B3%D8%B9%D9%88%D8%AF.svg/250px-%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B3%D8%B9%D9%88%D8%AF.svg.png";
    } else if (editLogoPreset === "kau") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/4/4a/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2.svg/120px-%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D9%85%D9%84%D9%83_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B9%D8%B2%D9%8A%D8%B2.svg.png";
    } else if (editLogoPreset === "uqu") {
      finalLogoUrl = "https://upload.wikimedia.org/wikipedia/ar/thumb/c/c3/Umm_Al-Qura_University_logo.png/250px-Umm_Al-Qura_University_logo.png";
    } else if (editLogoPreset === "custom") {
      finalLogoUrl = editLogoUrl;
    }

    // Generate new cover HTML
    let coverHtml = "";
    if (isCoverEnabled) {
      coverHtml = getCoverPageHtml(
        editCoverStyle,
        editTitle,
        editCoverSubtitle,
        editStudentName,
        editSupervisorName,
        editUniversity,
        editUniversityEn,
        editFaculty,
        editDepartment,
        editDegree,
        editAcademicYear,
        finalLogoUrl,
        editBorderColor,
        editStudentId,
        editSection,
        editFieldSupervisor,
        "", // trainingAgency
        "", // courseName
        editDetailsAlign,
        editHeaderLayout,
        editArabicHeader1,
        editArabicHeader2,
        editArabicHeader3,
        editEnglishHeader1,
        editEnglishHeader2,
        editEnglishHeader3,
        editDetailsVertical,
        editTitlePosition,
        editDecorLineWidth,
        editDecorLineHeight,
        editDecorLineColor,
        editShowDecorLine
      );
    }

    const updatedLayoutMetadata = {
      ...(project.layoutMetadata || {}),
      borderColor: editBorderColor,
      showPageBorder: editShowPageBorder,
      detailsAlign: editDetailsAlign,
      headerLayout: editHeaderLayout,
      arabicHeader1: editArabicHeader1,
      arabicHeader2: editArabicHeader2,
      arabicHeader3: editArabicHeader3,
      englishHeader1: editEnglishHeader1,
      englishHeader2: editEnglishHeader2,
      englishHeader3: editEnglishHeader3,
      detailsVertical: editDetailsVertical,
      titlePosition: editTitlePosition,
      decorLineWidth: editDecorLineWidth,
      decorLineHeight: editDecorLineHeight,
      decorLineColor: editDecorLineColor,
      showDecorLine: editShowDecorLine,
      coverPageHtml: isCoverEnabled ? coverHtml : undefined,
      cover: isCoverEnabled ? {
        title: editTitle,
        subtitle: editCoverSubtitle,
        studentName: editStudentName,
        supervisor: editSupervisorName,
        university: editUniversity,
        universityEn: editUniversityEn,
        faculty: editFaculty,
        department: editDepartment,
        degree: editDegree,
        year: editAcademicYear,
        studentId: editStudentId,
        section: editSection,
        fieldSupervisor: editFieldSupervisor,
        logoUrl: finalLogoUrl,
      } : undefined,
      isCustomTemplateCover: editCoverStyle.startsWith("template_"),
      coverTemplateId: editCoverStyle.startsWith("template_") ? parseInt(editCoverStyle.replace("template_", ""), 10) : undefined,
    };

    updateProject.mutate({
      id,
      data: {
        title: editTitle,
        rawContent: editRawContent,
        layoutMetadata: updatedLayoutMetadata,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم تحديث متطلبات وغلاف المشروع بنجاح" });
        setEditModalOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        setPreviewReloadKey(prev => prev + 1);
      },
      onError: () => {
        toast({ title: "تعذّر حفظ التعديلات", variant: "destructive" });
      }
    });
  };

  const handleSaveToLibrary = async () => {
    try {
      await saveToLibrary.mutateAsync({ id });
      toast({ title: "تم حفظ وأرشفة هذا البحث بنجاح في المكتبة المشتركة" });
    } catch (err: any) {
      toast({
        title: "تعذّر الحفظ بالمكتبة",
        description: err.response?.data?.error || "حدث خطأ أثناء الاتصال بالخادم.",
        variant: "destructive",
      });
    }
  };

  const handleAutoFix = async (issueIndex?: number, fixAll: boolean = false) => {
    if (fixAll) {
      setFixingAll(true);
    } else if (issueIndex !== undefined) {
      setFixingIndex(issueIndex);
    }

    try {
      const response = await fetch(`/api/projects/${id}/auto-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueIndex, fixAll }),
      });

      if (!response.ok) {
        throw new Error("Failed to auto fix");
      }

      toast({
        title: fixAll ? "تم إصلاح كافة الملاحظات بنجاح" : "تم إصلاح المشكلة بنجاح",
        description: fixAll ? "وصلت الجاهزية إلى 100% وتم تحديث البحث بالكامل." : "تم تعديل القسم وحل المشكلة تلقائياً.",
      });

      // Refetch project data to show changes
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      setPreviewReloadKey(prev => prev + 1);
    } catch (err: any) {
      toast({
        title: "فشل الإصلاح التلقائي",
        description: "حدث خطأ غير متوقع أثناء محاولة إصلاح الأخطاء.",
        variant: "destructive",
      });
    } finally {
      setFixingAll(false);
      setFixingIndex(null);
    }
  };

  const [activeTab, setActiveTab] = useState("overview");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");
  const [assistPrompt, setAssistPrompt] = useState("");
  const [assistResult, setAssistResult] = useState("");

  // States for manual references
  const [showAddRefForm, setShowAddRefForm] = useState(false);
  const [refAuthor, setRefAuthor] = useState("");
  const [refYear, setRefYear] = useState("");
  const [refTitle, setRefTitle] = useState("");
  const [refSource, setRefSource] = useState("");
  const [refType, setRefType] = useState("كتاب");
  const [refInText, setRefInText] = useState("");

  const handleAnalyze = () => {
    analyzeProject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "تم تحليل المشروع بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء التحليل", variant: "destructive" });
      }
    });
  };

  const handleExtractReferences = () => {
    extractReferences.mutate({ id }, {
      onSuccess: (data) => {
        localStorage.setItem(`ref_extracted_${id}`, "true");
        if (data.references && data.references.length > 0) {
          toast({ title: `تم استخراج ${data.references.length} من المراجع بنجاح` });
        } else {
          toast({ title: "اكتمل الاستخراج بنجاح (لم يتم العثور على مراجع في النص المرفوع)" });
        }
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء استخراج المراجع", variant: "destructive" });
      }
    });
  };

  const handleAddReference = () => {
    if (!project) return;
    if (!refAuthor.trim() || !refTitle.trim()) {
      toast({ title: "الرجاء كتابة اسم المؤلف وعنوان المرجع على الأقل", variant: "destructive" });
      return;
    }

    const formatted = `${refAuthor} (${refYear || "د.ت"}). ${refTitle}. ${refSource || ""}.`.replace(/\s+/g, " ").trim();
    const newRef = {
      id: `ref-manual-${Date.now()}`,
      authors: refAuthor,
      year: refYear || "د.ت",
      title: refTitle,
      source: refSource || "",
      type: refType,
      inTextCitation: refInText || `(${refAuthor}, ${refYear || "د.ت"})`,
      formatted
    };

    const newReferences = [...project.references, newRef];
    updateProject.mutate({ id, data: { references: newReferences } }, {
      onSuccess: () => {
        toast({ title: "تم إضافة المرجع بنجاح" });
        localStorage.setItem(`ref_extracted_${id}`, "true"); // Also count manual adds as step completion
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        // Reset form
        setRefAuthor("");
        setRefYear("");
        setRefTitle("");
        setRefSource("");
        setRefInText("");
        setShowAddRefForm(false);
      },
      onError: () => {
        toast({ title: "فشل إضافة المرجع", variant: "destructive" });
      }
    });
  };

  const handleDeleteReference = (refId: string) => {
    if (!project) return;
    const newReferences = project.references.filter(r => r.id !== refId);
    updateProject.mutate({ id, data: { references: newReferences } }, {
      onSuccess: () => {
        toast({ title: "تم حذف المرجع" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      }
    });
  };

  const handleVerify = () => {
    verifyProject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "تم التقييم والتحقق بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء التحقق", variant: "destructive" });
      }
    });
  };

  const handleSaveSection = (key: string) => {
    if (!project) return;
    const newSections = project.sections.map(s => 
      s.key === key ? { ...s, content: sectionContent } : s
    );
    updateProject.mutate({ id, data: { sections: newSections } }, {
      onSuccess: () => {
        toast({ title: "تم حفظ التعديلات" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
        setEditingSection(null);
      }
    });
  };

  const handleAssist = () => {
    if (!assistPrompt.trim()) return;
    assistProject.mutate({ 
      id, 
      data: { action: "general_help", instructions: assistPrompt } 
    }, {
      onSuccess: (data) => {
        setAssistResult(data.result);
      },
      onError: () => {
        toast({ title: "فشل المساعد الذكي في الرد", variant: "destructive" });
      }
    });
  };

  const exportDocx = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=docx`;
  };

  const exportRtf = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=rtf`;
  };

  const exportOdt = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=odt`;
  };

  const exportPdf = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=pdf`;
  };

  const exportPptx = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export-presentation`;
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError || !project) return <div className="p-8 text-center text-red-500 font-bold">المشروع غير موجود</div>;

  if (project.documentMode === "TEMPLATE") {
    return <TemplateWorkspace project={project} />;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const backParam = searchParams.get("back");

  return (
    <div className="space-y-6 fade-in-up pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {backParam === "library" ? (
              <Link href="/library" className="flex items-center gap-1 hover:text-foreground text-indigo-600 font-semibold">
                <span>← العودة للمكتبة البحثية</span>
              </Link>
            ) : (
              <>
                <Link href="/" className="hover:text-foreground">لوحة التحكم</Link>
                <span>/</span>
                <span>المشاريع</span>
              </>
            )}
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{project.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary">{project.workType}</Badge>
            <Badge variant="outline">{project.citationStyle}</Badge>
            {project.readinessScore != null && (
              <Badge variant={project.readinessScore >= 80 ? "default" : "destructive"}>
                الجاهزية: {project.readinessScore}%
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenEditModal} className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50">
            <Edit className="w-4 h-4" />
            تعديل المتطلبات والغلاف
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPreviewReloadKey(prev => prev + 1); setPreviewOpen(true); }} className="gap-2 border-purple-600/30 text-purple-700 hover:bg-purple-50">
            <Eye className="w-4 h-4" />
            معاينة قبل التصدير
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveToLibrary} className="gap-2 border-indigo-600/30 text-indigo-700 hover:bg-indigo-50" disabled={saveToLibrary.isPending}>
            {saveToLibrary.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
            حفظ بالمكتبة البحثية
          </Button>
          <Button variant="outline" size="sm" onClick={exportDocx} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير DOCX
          </Button>
          <Button variant="outline" size="sm" onClick={exportRtf} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير RTF
          </Button>
          <Button variant="outline" size="sm" onClick={exportOdt} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير ODT
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <Printer className="w-4 h-4" />
            تصدير PDF
          </Button>
          <Button variant="default" size="sm" onClick={exportPptx} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white border-none">
            <Presentation className="w-4 h-4" />
            تصدير PPTX (عرض تقديمي)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">سير العمل الذكي</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Button 
                variant={project.analysis ? "outline" : "default"} 
                className="w-full justify-start gap-2" 
                onClick={handleAnalyze}
                disabled={analyzeProject.isPending}
              >
                {analyzeProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                1. تحليل وتقسيم
                {project.analysis && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
              </Button>
              <Button 
                variant={(project.references.length > 0 || localStorage.getItem(`ref_extracted_${id}`) === "true") ? "outline" : "default"} 
                className="w-full justify-start gap-2"
                onClick={handleExtractReferences}
                disabled={extractReferences.isPending || !project.analysis}
              >
                {extractReferences.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                2. استخراج المراجع
                {(project.references.length > 0 || localStorage.getItem(`ref_extracted_${id}`) === "true") && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
              </Button>
              <Button 
                variant={project.verification ? "outline" : "default"} 
                className="w-full justify-start gap-2"
                onClick={handleVerify}
                disabled={verifyProject.isPending || !project.analysis}
              >
                {verifyProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                3. التقييم والتحقق
                {project.verification && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
              </Button>
            </CardContent>
          </Card>

          {project.analysis && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">فهرس المحتويات</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1">
                  {project.sections.map((section, idx) => (
                    <button 
                      key={section.key} 
                      onClick={() => { setActiveTab("sections"); setEditingSection(section.key); setSectionContent(section.content); }}
                      className="w-full text-right text-sm px-2 py-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {idx + 1}. {section.heading}
                    </button>
                  ))}
                  {project.sections.length === 0 && <span className="text-sm text-muted-foreground">لا يوجد أقسام مقسمة.</span>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex md:grid w-full overflow-x-auto md:grid-cols-5 mb-4 p-1 bg-muted rounded-lg shrink-0">
              <TabsTrigger value="overview" className="shrink-0">نظرة عامة</TabsTrigger>
              <TabsTrigger value="sections" disabled={!project.analysis} className="shrink-0">الأقسام والمحتوى</TabsTrigger>
              <TabsTrigger value="references" disabled={!project.analysis} className="shrink-0">المراجع</TabsTrigger>
              <TabsTrigger value="verification" disabled={!project.verification} className="shrink-0">التقييم والملاحظات</TabsTrigger>
              <TabsTrigger value="assistant" className="shrink-0">المساعد الذكي</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {!project.analysis ? (
                <Card className="border-dashed bg-muted/30">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Wand2 className="w-12 h-12 text-primary/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">البحث يحتاج إلى تحليل</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      يقوم الذكاء الاصطناعي بقراءة النص وتقسيمه إلى فصول وأقسام منطقية حسب المعايير الأكاديمية.
                    </p>
                    <Button size="lg" onClick={handleAnalyze} disabled={analyzeProject.isPending}>
                      {analyzeProject.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSearch className="w-4 h-4 mr-2" />}
                      بدء تحليل المحتوى
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-sm text-muted-foreground mb-1">نوع البحث المكتشف</span>
                        <span className="font-bold text-lg">{project.analysis.researchType}</span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-sm text-muted-foreground mb-1">عدد الصفحات التقديري</span>
                        <span className="font-bold text-lg">{project.analysis.pageCount}</span>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                        <span className="text-sm text-muted-foreground mb-1">التخصص</span>
                        <span className="font-bold text-lg">{project.analysis.specialization}</span>
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>الملخص الذكي</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-relaxed text-muted-foreground">{project.analysis.summary}</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="sections">
              <Card className="min-h-[500px]">
                <CardHeader className="pb-3 border-b">
                  <CardTitle>محرر الأقسام</CardTitle>
                  <CardDescription>اختر قسماً للتعديل والمراجعة</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {editingSection ? (
                    <div className="flex flex-col h-full">
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <div className="font-bold">
                          {project.sections.find(s => s.key === editingSection)?.heading}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>إلغاء</Button>
                      </div>
                      <Textarea 
                        className="flex-1 min-h-[400px] border-0 focus-visible:ring-0 rounded-none resize-none p-6 leading-loose"
                        value={sectionContent}
                        onChange={(e) => setSectionContent(e.target.value)}
                        dir="auto"
                      />
                      <div className="p-4 border-t bg-muted/10 flex justify-end">
                        <Button onClick={() => handleSaveSection(editingSection)} disabled={updateProject.isPending}>
                          {updateProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          حفظ التعديلات
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 h-full text-center">
                      <ListTree className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">الرجاء اختيار قسم من الفهرس الجانبي لعرضه وتعديله.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>المراجع والمصادر</CardTitle>
                      <CardDescription>إدارة المراجع المنسقة وتوثيقها حسب نظام {project.citationStyle}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddRefForm(!showAddRefForm)}>
                        {showAddRefForm ? "إلغاء" : "إضافة مرجع يدوياً"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExtractReferences} disabled={extractReferences.isPending}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${extractReferences.isPending ? 'animate-spin' : ''}`} />
                        استخراج تلقائي
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Manual Add Form */}
                  {showAddRefForm && (
                    <div className="p-4 border rounded-lg bg-muted/40 space-y-3 fade-in-up">
                      <h4 className="font-bold text-sm">إضافة مرجع أكاديمي جديد</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">المؤلف (أو المؤلفين)</Label>
                          <Input
                            placeholder="مثلاً: أحمد، محمد"
                            value={refAuthor}
                            onChange={(e) => setRefAuthor(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">سنة النشر</Label>
                          <Input
                            placeholder="مثلاً: 2024"
                            value={refYear}
                            onChange={(e) => setRefYear(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">نوع المرجع</Label>
                          <Select value={refType} onValueChange={setRefType}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="كتاب">كتاب</SelectItem>
                              <SelectItem value="مقال">مقال علمي</SelectItem>
                              <SelectItem value="رسالة">رسالة ماجستير/دكتوراه</SelectItem>
                              <SelectItem value="موقع">موقع إلكتروني</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">عنوان المرجع / الدراسة</Label>
                          <Input
                            placeholder="العنوان الكامل للمرجع..."
                            value={refTitle}
                            onChange={(e) => setRefTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المصدر / الناشر / دار النشر</Label>
                          <Input
                            placeholder="مثلاً: مجلة العلوم الإدارية، دار الفكر..."
                            value={refSource}
                            onChange={(e) => setRefSource(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">الاستشهاد داخل النص (اختياري)</Label>
                        <Input
                          placeholder="مثلاً: (أحمد، 2024)"
                          value={refInText}
                          onChange={(e) => setRefInText(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowAddRefForm(false)}>إلغاء</Button>
                        <Button size="sm" onClick={handleAddReference}>حفظ المرجع</Button>
                      </div>
                    </div>
                  )}

                  {/* References List */}
                  <div className="space-y-4">
                    {project.references.map((ref, i) => (
                      <div key={ref.id || i} className="p-4 rounded-lg bg-muted/30 border flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-relaxed" dir="ltr">{ref.formatted}</p>
                          {ref.inTextCitation && (
                            <div className="mt-2 text-xs text-muted-foreground flex gap-2 items-center">
                              <Badge variant="secondary" className="text-[10px]">استشهاد داخلي</Badge>
                              <span dir="ltr">{ref.inTextCitation}</span>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8"
                          onClick={() => handleDeleteReference(ref.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Empty State */}
                    {project.references.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/10">
                        <BookMarked className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h4 className="font-bold text-base mb-1">لا توجد مراجع مضافة حالياً</h4>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                          لم يتم استخراج أي مراجع تلقائياً من البحث. يمكنك المحاولة مجدداً بالضغط على "استخراج تلقائي" أو إضافة المراجع يدوياً.
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setShowAddRefForm(true)}>إضافة مرجع يدوياً</Button>
                          <Button size="sm" variant="outline" onClick={handleExtractReferences} disabled={extractReferences.isPending}>
                            {extractReferences.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            استخراج تلقائي للمراجع
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verification">
              {project.verification && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>نتائج التقييم والتحقق</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="text-2xl font-bold text-primary mb-1">{project.verification.readinessScore}%</div>
                          <div className="text-xs text-muted-foreground">الجاهزية الكلية</div>
                        </div>
                        <div className="text-center p-4 rounded-lg border">
                          <div className="text-xl font-bold mb-1">{project.verification.completeness}%</div>
                          <div className="text-xs text-muted-foreground">اكتمال العناصر</div>
                        </div>
                        <div className="text-center p-4 rounded-lg border">
                          <div className="text-xl font-bold mb-1">{project.verification.citations}%</div>
                          <div className="text-xs text-muted-foreground">دقة التوثيق</div>
                        </div>
                        <div className="text-center p-4 rounded-lg border">
                          <div className="text-xl font-bold mb-1">{project.verification.formatting}%</div>
                          <div className="text-xs text-muted-foreground">التنسيق الأكاديمي</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4 border-b pb-3">
                        <h3 className="font-bold text-slate-800">الملاحظات والمشاكل المكتشفة ({project.verification.issues.length})</h3>
                        {project.verification.issues.length > 0 && (
                          <Button 
                            onClick={() => handleAutoFix(undefined, true)}
                            disabled={fixingAll || fixingIndex !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                          >
                            {fixingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            إصلاح كافة المشاكل والوصول لـ 100%
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {project.verification.issues.map((issue, i) => (
                          <div key={i} className={`p-4 rounded-lg border flex gap-4 justify-between items-start ${issue.severity === 'high' ? 'bg-red-50/50 border-red-200' : issue.severity === 'medium' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'}`}>
                            <div className="flex gap-4">
                              <div className="shrink-0 mt-0.5">
                                {issue.severity === 'high' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm mb-1">{issue.type}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{issue.message}</p>
                                {issue.suggestion && (
                                  <div className="text-sm bg-background p-2 rounded border mt-2">
                                    <span className="font-semibold text-primary">اقتراح: </span>
                                    {issue.suggestion}
                                  </div>
                                )}
                                {issue.location && (
                                  <div className="text-xs text-muted-foreground mt-2">
                                    📍 الموقع: {issue.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleAutoFix(i, false)}
                              disabled={fixingAll || fixingIndex !== null}
                              className="bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-semibold gap-1 shrink-0"
                            >
                              {fixingIndex === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                              إصلاح تلقائي
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="assistant">
              <Card className="min-h-[500px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-primary" />
                    مساعد التحرير الأكاديمي
                  </CardTitle>
                  <CardDescription>اطلب من الذكاء الاصطناعي مراجعة فقرة، إعادة صياغة، أو المساعدة في التوثيق.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 bg-muted/20 rounded-lg p-4 mb-4 border overflow-auto min-h-[300px]">
                    {assistResult ? (
                      <div className="prose prose-sm prose-slate max-w-none" dir="auto">
                        {assistResult.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Wand2 className="w-12 h-12 mb-4 opacity-20" />
                        <p>كيف يمكنني مساعدتك في بحثك اليوم؟</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="مثال: أعد صياغة المقدمة لتكون أكثر رسمية..." 
                      value={assistPrompt}
                      onChange={(e) => setAssistPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAssist()}
                      disabled={assistProject.isPending}
                    />
                    <Button onClick={handleAssist} disabled={assistProject.isPending || !assistPrompt.trim()}>
                      {assistProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              معاينة مستند البحث قبل التصدير
            </DialogTitle>
            <DialogDescription>
              هذه معاينة حية لشكل البحث النهائي المنسق، متضمناً الغلاف والفهرس وقائمة المراجع.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-muted rounded-lg overflow-y-auto border p-2 min-h-[50vh]">
            <PdfPreview 
              src={`/api/projects/${id}/preview.pdf`} 
              reloadKey={previewReloadKey} 
              className="w-full"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-emerald-600" />
              تعديل بيانات البحث ومتطلبات الغلاف
            </DialogTitle>
            <DialogDescription className="text-right">
              عدّل متطلبات وتكليفات الواجب أو بيانات صفحة الغلاف الأكاديمية دون فقدان النصوص المكتوبة بالبحث.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full text-right">
            <TabsList className="grid w-full grid-cols-2 mb-4 p-1 bg-muted rounded-lg shrink-0">
              <TabsTrigger value="basic">البيانات الأساسية والتكليف</TabsTrigger>
              <TabsTrigger value="cover">بيانات الغلاف الأكاديمي</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-1.5">
                <Label>عنوان البحث</Label>
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  placeholder="أدخل عنوان البحث..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>متطلبات الواجب وتفاصيل التكليف</Label>
                <textarea
                  className="w-full min-h-[200px] p-3 border rounded-md text-sm font-sans focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                  value={editRawContent}
                  onChange={(e) => setEditRawContent(e.target.value)}
                  placeholder="اكتب متطلبات التكليف أو الصقها هنا بالتفصيل..."
                />
              </div>
            </TabsContent>

            <TabsContent value="cover" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نمط الغلاف</Label>
                  <Select value={editCoverStyle} onValueChange={setEditCoverStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نمط الغلاف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون غلاف</SelectItem>
                      <SelectItem value="classic">كلاسيكي أكاديمي (ترويسة مزدوجة)</SelectItem>
                      <SelectItem value="modern">حديث ملون (خلفية داكنة)</SelectItem>
                      <SelectItem value="framed">إطار إسلامي ذهبي</SelectItem>
                      {coversData && Array.isArray(coversData.items) && coversData.items.map((doc: any) => (
                        <SelectItem key={doc.id} value={`template_${doc.id}`}>قالب: {doc.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Logo Preset */}
                <div className="space-y-1.5">
                  <Label>شعار الجامعة</Label>
                  <Select value={editLogoPreset} onValueChange={setEditLogoPreset}>
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
                {editLogoPreset === "custom" && (
                  <div className="space-y-1.5">
                    <Label>رابط الشعار المخصص (Logo Image URL)</Label>
                    <Input
                      placeholder="أدخل رابط صورة الشعار (https://...)"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>عنوان الغلاف الفرعي (اختياري)</Label>
                  <Input 
                    value={editCoverSubtitle} 
                    onChange={(e) => setEditCoverSubtitle(e.target.value)} 
                    placeholder="شرح مبسط أو مقرر البحث الدراسي..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم الطالب / الباحث</Label>
                  <Input 
                    value={editStudentName} 
                    onChange={(e) => setEditStudentName(e.target.value)} 
                    placeholder="اسم الطالب كاملاً..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الرقم الجامعي (اختياري)</Label>
                  <Input 
                    value={editStudentId} 
                    onChange={(e) => setEditStudentId(e.target.value)} 
                    placeholder="الرقم الجامعي..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم المشرف الأكاديمي</Label>
                  <Input 
                    value={editSupervisorName} 
                    onChange={(e) => setEditSupervisorName(e.target.value)} 
                    placeholder="أ.د. / د. ..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>المشرف الميداني (اختياري)</Label>
                  <Input 
                    value={editFieldSupervisor} 
                    onChange={(e) => setEditFieldSupervisor(e.target.value)} 
                    placeholder="المشرف في جهة التدريب..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الشعبة / المجموعة (اختياري)</Label>
                  <Input 
                    value={editSection} 
                    onChange={(e) => setEditSection(e.target.value)} 
                    placeholder="الشعبة..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم الجامعة</Label>
                  <Input 
                    value={editUniversity} 
                    onChange={(e) => setEditUniversity(e.target.value)} 
                    placeholder="اسم الجامعة..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم الكلية</Label>
                  <Input 
                    value={editFaculty} 
                    onChange={(e) => setEditFaculty(e.target.value)} 
                    placeholder="كلية..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم القسم</Label>
                  <Input 
                    value={editDepartment} 
                    onChange={(e) => setEditDepartment(e.target.value)} 
                    placeholder="قسم..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الدرجة العلمية المستهدفة</Label>
                  <Select value={editDegree} onValueChange={setEditDegree}>
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

                <div className="space-y-1.5">
                  <Label>العام الجامعي / الدراسي</Label>
                  <Input 
                    value={editAcademicYear} 
                    onChange={(e) => setEditAcademicYear(e.target.value)} 
                    placeholder="العام الجامعي..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>اسم الجامعة بالإنجليزية</Label>
                  <Input 
                    value={editUniversityEn} 
                    onChange={(e) => setEditUniversityEn(e.target.value)} 
                    placeholder="University of..."
                  />
                </div>

                {/* Header Layout & Details Alignment Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>تنسيق وترتيب الهيدر (أعلى الغلاف)</Label>
                    <Select value={editHeaderLayout} onValueChange={(val: any) => setEditHeaderLayout(val)}>
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
                    <Select value={editDetailsAlign} onValueChange={(val: any) => setEditDetailsAlign(val)}>
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
                        value={editArabicHeader1}
                        onChange={(e) => setEditArabicHeader1(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">السطر الثاني</span>
                      <Input
                        placeholder="وزارة التعليم"
                        value={editArabicHeader2}
                        onChange={(e) => setEditArabicHeader2(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">السطر الثالث (الجامعة)</span>
                      <Input
                        placeholder="اسم الجامعة بالعربي"
                        value={editArabicHeader3}
                        onChange={(e) => setEditArabicHeader3(e.target.value)}
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
                        value={editEnglishHeader1}
                        onChange={(e) => setEditEnglishHeader1(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Line 2</span>
                      <Input
                        placeholder="Ministry of Education"
                        value={editEnglishHeader2}
                        onChange={(e) => setEditEnglishHeader2(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Line 3 (University)</span>
                      <Input
                        placeholder="University Name"
                        value={editEnglishHeader3}
                        onChange={(e) => setEditEnglishHeader3(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Layout Position Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label>موضع بيانات الطالب والمشرف رأسيّاً</Label>
                    <Select value={editDetailsVertical} onValueChange={(val: any) => setEditDetailsVertical(val)}>
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
                    <Select value={editTitlePosition} onValueChange={(val: any) => setEditTitlePosition(val)}>
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
                      <span className="text-xs text-muted-foreground">{editShowDecorLine ? "مفعّل" : "ملغى"}</span>
                      <input
                        type="checkbox"
                        checked={editShowDecorLine}
                        onChange={(e) => setEditShowDecorLine(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {editShowDecorLine && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-2 border-l-2 border-slate-200 mt-2">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block font-bold mb-1">عرض الخط (نقطة)</span>
                        <input
                          type="range"
                          min="50"
                          max="400"
                          step="10"
                          value={editDecorLineWidth}
                          onChange={(e) => setEditDecorLineWidth(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground block text-center font-medium">{editDecorLineWidth}pt</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block font-bold mb-1">سمك الخط (نقطة)</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={editDecorLineHeight}
                          onChange={(e) => setEditDecorLineHeight(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground block text-center font-medium">{editDecorLineHeight}pt</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs text-muted-foreground block font-bold mb-1">لون الخط الزخرفي</span>
                        <div className="flex gap-1 items-center">
                          <Input
                            type="color"
                            className="w-8 h-8 p-0.5 cursor-pointer rounded-md border border-border"
                            value={editDecorLineColor}
                            onChange={(e) => setEditDecorLineColor(e.target.value)}
                          />
                          <Input
                            type="text"
                            className="h-8 text-xs font-mono"
                            value={editDecorLineColor}
                            onChange={(e) => setEditDecorLineColor(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 border-t pt-3">
                  <Label>لون إطار الصفحة</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      className="w-10 h-9 p-0.5 cursor-pointer rounded-md border border-border"
                      value={editBorderColor}
                      onChange={(e) => setEditBorderColor(e.target.value)}
                    />
                    <Input
                      type="text"
                      className="flex-1 text-xs uppercase"
                      value={editBorderColor}
                      onChange={(e) => setEditBorderColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={updateProject.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}