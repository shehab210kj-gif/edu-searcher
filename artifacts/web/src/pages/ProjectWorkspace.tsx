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
  getGetStatsQueryKey
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
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Project, Section } from "@workspace/api-client-react";
import { TemplateWorkspace } from "./TemplateWorkspace";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

                      <h3 className="font-bold mb-4">الملاحظات والمشاكل المكتشفة ({project.verification.issues.length})</h3>
                      <div className="space-y-3">
                        {project.verification.issues.map((issue, i) => (
                          <div key={i} className={`p-4 rounded-lg border flex gap-4 ${issue.severity === 'high' ? 'bg-red-50/50 border-red-200' : issue.severity === 'medium' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'}`}>
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
    </div>
  );
}