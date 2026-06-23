import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  useUpdateProject,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import type { Project, TemplateParagraph } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Printer, Save, FileText, RefreshCw } from "lucide-react";
import { PdfPreview } from "@/components/PdfPreview";

/**
 * Borderless, auto-growing text line that blends into the document sheet so
 * editing feels like typing inside the real Word document — no field chrome,
 * no paragraph numbers.
 */
function DocLine({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      dir="auto"
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      rows={1}
      className="w-full resize-none border-0 bg-transparent p-0 leading-loose text-[15px] text-slate-900 outline-none focus:bg-primary/5 focus:ring-0"
    />
  );
}

export function TemplateWorkspace({ project }: { project: Project }) {
  const id = project.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const [paragraphs, setParagraphs] = useState<TemplateParagraph[]>(
    project.templateContent ?? [],
  );
  const [previewVersion, setPreviewVersion] = useState(0);

  useEffect(() => {
    setParagraphs(project.templateContent ?? []);
  }, [project.templateContent]);

  const dirty =
    JSON.stringify(paragraphs) !== JSON.stringify(project.templateContent ?? []);

  const previewSrc = `${import.meta.env.BASE_URL}api/projects/${id}/preview.pdf?v=${previewVersion}`;

  const updateText = (pid: number, text: string) => {
    setParagraphs((prev) =>
      prev.map((p) => (p.id === pid ? { ...p, text } : p)),
    );
  };

  const handleSave = () => {
    updateProject.mutate(
      { id, data: { templateContent: paragraphs } },
      {
        onSuccess: () => {
          toast({ title: "تم حفظ التعديلات" });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
          // Auto-regenerate the live preview from the freshly saved document.
          setPreviewVersion((v) => v + 1);
        },
        onError: () => {
          toast({ title: "تعذّر حفظ التعديلات", variant: "destructive" });
        },
      },
    );
  };

  const exportDocx = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=docx`;
  };
  const exportPdf = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=pdf`;
  };

  return (
    <div className="space-y-6 fade-in-up pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/" className="hover:text-foreground">لوحة التحكم</Link>
            <span>/</span>
            <span>المشاريع</span>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{project.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{project.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="gap-1">
              <FileText className="w-3.5 h-3.5" />
              قالب أصلي
            </Badge>
            <Badge variant="outline">{project.workType}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={!dirty || updateProject.isPending} className="gap-2">
            {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </Button>
          <Button variant="outline" size="sm" onClick={exportDocx} className="gap-2">
            <Download className="w-4 h-4" />
            تصدير DOCX
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <Printer className="w-4 h-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-4 text-sm text-muted-foreground">
          عدّل النصوص مباشرةً داخل المستند بالأسفل. يحافظ القالب على تنسيقه الأصلي
          بالكامل (الخطوط، الهوامش، الجداول، الصور، الرأس والتذييل)، وتظهر تعديلاتك
          في المعاينة الحقيقية فور الحفظ.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle>تحرير المستند</CardTitle>
            <CardDescription>اكتب داخل الصفحة كما في وورد</CardDescription>
          </CardHeader>
          <CardContent className="p-4 bg-slate-100 max-h-[72vh] overflow-auto">
            {paragraphs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                لا توجد نصوص قابلة للتعديل في هذا القالب.
              </p>
            ) : (
              <div className="mx-auto max-w-[760px] bg-white shadow-md rounded-sm px-12 py-14 space-y-3">
                {paragraphs.map((p) => (
                  <DocLine
                    key={p.id}
                    value={p.text}
                    onChange={(text) => updateText(p.id, text)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>المعاينة الحية</CardTitle>
              <CardDescription>عرض حقيقي للمستند كما سيُصدَّر</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewVersion((v) => v + 1)}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث المعاينة
            </Button>
          </CardHeader>
          <CardContent className="p-4 bg-slate-100 max-h-[72vh] overflow-auto">
            <PdfPreview src={previewSrc} reloadKey={previewVersion} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
