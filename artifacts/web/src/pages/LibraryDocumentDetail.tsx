import { useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import DOMPurify from "dompurify";
import {
  useGetLibraryDocument,
  getGetLibraryDocumentQueryKey,
  useUseLibraryDocument,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Download, Printer, FilePlus2, ArrowRight,
  GraduationCap, Building2, Tag, Languages, BookOpen,
} from "lucide-react";

export function LibraryDocumentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: doc, isLoading, isError } = useGetLibraryDocument(id, {
    query: { enabled: !!id, queryKey: getGetLibraryDocumentQueryKey(id) },
  });

  const useDocument = useUseLibraryDocument();

  const safeContent = useMemo(
    () => (doc ? DOMPurify.sanitize(doc.richContent) : ""),
    [doc],
  );

  const exportUrl = (format: "docx" | "pdf") =>
    `${import.meta.env.BASE_URL}api/library/${id}/export?format=${format}`;

  const handleUseAsTemplate = () => {
    useDocument.mutate(
      { id },
      {
        onSuccess: (project) => {
          toast({ title: "تم إنشاء مشروع من المستند" });
          navigate(`/projects/${project.id}`);
        },
        onError: () => {
          toast({ title: "تعذّر إنشاء المشروع", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-red-500 font-bold">المستند غير موجود</p>
        <Link href="/library">
          <Button variant="outline">العودة إلى المكتبة</Button>
        </Link>
      </div>
    );
  }

  const metaItems = [
    doc.university && { icon: GraduationCap, label: "الجامعة", value: doc.university },
    doc.department && { icon: Building2, label: "القسم", value: doc.department },
    doc.degreeLevel && { icon: BookOpen, label: "الدرجة", value: doc.degreeLevel },
    doc.category && { icon: Tag, label: "التصنيف", value: doc.category },
    doc.language && { icon: Languages, label: "اللغة", value: doc.language },
  ].filter(Boolean) as { icon: typeof GraduationCap; label: string; value: string }[];

  return (
    <div className="space-y-6 fade-in-up pb-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/library" className="hover:text-foreground">المكتبة البحثية</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[300px]">{doc.title}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{doc.documentType}</Badge>
            {doc.degreeLevel && <Badge variant="outline">{doc.degreeLevel}</Badge>}
          </div>
          <h1 className="text-3xl font-bold text-foreground leading-tight">{doc.title}</h1>
          {doc.description && (
            <p className="text-muted-foreground max-w-2xl leading-relaxed">{doc.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={handleUseAsTemplate} disabled={useDocument.isPending} className="gap-2">
            {useDocument.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FilePlus2 className="w-4 h-4" />
            )}
            استخدام كقالب
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="gap-2 flex-1">
              <a href={exportUrl("docx")}>
                <Download className="w-4 h-4" />
                DOCX
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2 flex-1">
              <a href={exportUrl("pdf")}>
                <Printer className="w-4 h-4" />
                PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {metaItems.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="flex items-start gap-2 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                      <div className="font-medium">{m.value}</div>
                    </div>
                  </div>
                );
              })}
              {metaItems.length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد بيانات وصفية إضافية.</p>
              )}
            </CardContent>
          </Card>

          {doc.tags.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-2">الوسوم</div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="ghost" className="w-full gap-2 justify-between" onClick={handleUseAsTemplate} disabled={useDocument.isPending}>
            ابدأ مشروعاً من هذا المستند
            <ArrowRight className="w-4 h-4" />
          </Button>
        </aside>

        <div className="md:col-span-3">
          <Card>
            <CardContent className="p-6 md:p-10">
              <div
                dir="rtl"
                className="library-rich-content prose prose-slate max-w-none prose-headings:font-bold prose-img:mx-auto prose-table:text-right"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
