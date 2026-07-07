import { useState } from "react";
import { useListTemplates, useListLibraryDocuments, useUseLibraryDocument } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft, Eye, FilePlus2, Loader2, Sparkles, BookOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resolveStorageUrl } from "@/lib/library";

export function Templates() {
  const [activeTab, setActiveTab] = useState<"formatting" | "covers">("formatting");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: templates, isLoading: isLoadingTemplates } = useListTemplates();
  const { data: coversData, isLoading: isLoadingCovers } = useListLibraryDocuments({
    documentType: "master_template",
    page: 1,
    pageSize: 50,
  });
  const useDoc = useUseLibraryDocument();

  const handleUseCover = (docId: number) => {
    useDoc.mutate(
      { id: docId },
      {
        onSuccess: (p) => {
          toast({ title: "تم إنشاء نسخة من القالب للبدء في التعديل عليها" });
          setLocation(`/projects/${p.id}`);
        },
        onError: () => {
          toast({ title: "عفواً، تعذر استخدام هذا القالب", variant: "destructive" });
        },
      }
    );
  };

  const isLoading = activeTab === "formatting" ? isLoadingTemplates : isLoadingCovers;

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">قوالب النظام</h1>
          <p className="text-muted-foreground mt-2">مكتبة من قوالب التنسيق المعتمدة وقوالب الغلاف الجاهزة للاستخدام</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border rounded-lg p-1 bg-muted/40 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("formatting")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "formatting"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            قوالب التنسيق
          </button>
          <button
            onClick={() => setActiveTab("covers")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "covers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            قوالب الغلاف
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/30"></Card>
          ))}
        </div>
      ) : activeTab === "formatting" ? (
        /* Formatting Templates Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(templates) && templates.map((template) => (
            <Card key={template.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant={template.isBuiltin ? "default" : "secondary"}>
                    {template.citationStyle}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2 min-h-[2.5rem]">
                  {template.description || "لا يوجد وصف"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>نوع الخط:</span>
                    <span className="font-mono">{template.formatting.fontFamily}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حجم الخط:</span>
                    <span>{template.formatting.fontSize}pt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المسافة بين السطور:</span>
                    <span>{template.formatting.lineSpacing}x</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/10 mt-auto">
                <Link href={`/projects/new`} className="w-full">
                  <Button variant="ghost" className="w-full gap-2 justify-between">
                    استخدام القالب
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          {(!templates || templates.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              لا توجد قوالب تنسيق متاحة.
            </div>
          )}
        </div>
      ) : (
        /* Cover Templates Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coversData && Array.isArray(coversData.items) && coversData.items.map((doc) => {
            const cover = resolveStorageUrl(doc.coverImageUrl);
            return (
              <Card key={doc.id} className="flex flex-col h-full overflow-hidden hover:border-primary/50 transition-colors group">
                <div className="relative aspect-[4/3] bg-muted overflow-hidden border-b">
                  {cover ? (
                    <img
                      src={cover}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 border-b relative overflow-hidden flex items-center justify-center select-none group-hover:bg-slate-100/50 transition-colors">
                      <div 
                        className="w-[210px] h-[297px] bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden relative shrink-0"
                        style={{
                          transform: "scale(0.55)",
                          transformOrigin: "center center",
                        }}
                      >
                        <iframe
                          title={doc.title}
                          srcDoc={`
                            <!DOCTYPE html>
                            <html dir="rtl">
                              <head>
                                <meta charset="utf-8">
                                <style>
                                  html, body {
                                    margin: 0;
                                    padding: 12px;
                                    font-family: 'Cairo', 'Amiri', sans-serif;
                                    background: white;
                                    font-size: 5px;
                                    color: #1e293b;
                                    overflow: hidden;
                                    height: 100%;
                                    box-sizing: border-box;
                                    line-height: 1.3;
                                  }
                                  body * {
                                    font-size: inherit !important;
                                  }
                                  img {
                                    max-height: 20px;
                                    width: auto;
                                    object-fit: contain;
                                  }
                                  /* Clean margins and layouts */
                                  h1, h2, h3, p {
                                    margin: 4px 0;
                                    text-align: center;
                                  }
                                </style>
                              </head>
                              <body>
                                ${ (doc as any).richContent
                                  ? (doc as any).richContent
                                      .replace(/\{title\}/g, doc.title || "عنوان التكليف الأكاديمي")
                                      .replace(/\{subtitle\}/g, "دراسة تحليلية مقارنة")
                                      .replace(/\{student\}/g, "اسم الطالب الباحث")
                                      .replace(/\{supervisor\}/g, "أ.د. المشرف العلمي")
                                      .replace(/\{university\}/g, doc.university || "الجامعة الأكاديمية")
                                      .replace(/\{faculty\}/g, doc.department || "الكلية المعنية")
                                      .replace(/\{department\}/g, "قسم الدراسات والبحوث")
                                      .replace(/\{academicYear\}/g, "2026/2027")
                                      .replace(/\{studentId\}/g, "44102938")
                                  : `<div style="text-align:center;margin-top:50px;">قالب غلاف جاهز</div>`
                                }
                              </body>
                            </html>
                          `}
                          className="w-full h-full border-none pointer-events-none"
                        />
                      </div>
                    </div>
                  )}
                  {doc.university && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="shadow-sm">
                        {doc.university}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader className="p-4 flex-grow">
                  <CardTitle className="text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {doc.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {doc.description || "قالب غلاف جاهز للاستخدام"}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="p-4 pt-0 gap-2 mt-auto border-t bg-muted/5 flex">
                  <Link href={`/library/${doc.id}?back=templates`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Eye className="w-4 h-4" />
                      معاينة
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleUseCover(doc.id)}
                    disabled={useDoc.isPending}
                  >
                    {useDoc.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FilePlus2 className="w-4 h-4" />
                    )}
                    استخدام
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {(!coversData || !coversData.items || coversData.items.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              لا توجد قوالب غلاف متاحة حالياً.
            </div>
          )}
        </div>
      )}
    </div>
  );
}