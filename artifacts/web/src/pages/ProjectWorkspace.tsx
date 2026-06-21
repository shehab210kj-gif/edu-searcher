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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Wand2, FileSearch, CheckCircle2, AlertTriangle, 
  Download, Printer, Settings, ArrowRight, Trash2, ListTree, RefreshCw, Send, BookMarked
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import type { Project, Section } from "@workspace/api-client-react/src/generated/api.schemas";

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
  const assistProject = useAssistProject();

  const [activeTab, setActiveTab] = useState("overview");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState("");
  const [assistPrompt, setAssistPrompt] = useState("");
  const [assistResult, setAssistResult] = useState("");

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
      onSuccess: () => {
        toast({ title: "تم استخراج المراجع بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(id) });
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء استخراج المراجع", variant: "destructive" });
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

  const exportPdf = () => {
    window.location.href = `${import.meta.env.BASE_URL}api/projects/${id}/export?format=pdf`;
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError || !project) return <div className="p-8 text-center text-red-500 font-bold">المشروع غير موجود</div>;

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
            {project.readinessScore !== null && (
              <Badge variant={project.readinessScore >= 80 ? "default" : "destructive"}>
                الجاهزية: {project.readinessScore}%
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                variant={project.references.length > 0 ? "outline" : "default"} 
                className="w-full justify-start gap-2"
                onClick={handleExtractReferences}
                disabled={extractReferences.isPending || !project.analysis}
              >
                {extractReferences.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                2. استخراج المراجع
                {project.references.length > 0 && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
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
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="sections" disabled={!project.analysis}>الأقسام والمحتوى</TabsTrigger>
              <TabsTrigger value="references" disabled={project.references.length === 0}>المراجع</TabsTrigger>
              <TabsTrigger value="verification" disabled={!project.verification}>التقييم والملاحظات</TabsTrigger>
              <TabsTrigger value="assistant">المساعد الذكي</TabsTrigger>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>المراجع والمصادر</CardTitle>
                      <CardDescription>تم استخراج وتنسيق المراجع حسب نظام {project.citationStyle}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExtractReferences} disabled={extractReferences.isPending}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${extractReferences.isPending ? 'animate-spin' : ''}`} />
                      إعادة استخراج
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.references.map((ref, i) => (
                      <div key={ref.id || i} className="p-4 rounded-lg bg-muted/30 border">
                        <p className="text-sm font-medium leading-relaxed" dir="ltr">{ref.formatted}</p>
                        {ref.inTextCitation && (
                          <div className="mt-2 text-xs text-muted-foreground flex gap-2 items-center">
                            <Badge variant="secondary" className="text-[10px]">استشهاد داخلي</Badge>
                            <span dir="ltr">{ref.inTextCitation}</span>
                          </div>
                        )}
                      </div>
                    ))}
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
    </div>
  );
}