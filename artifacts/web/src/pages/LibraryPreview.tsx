import { useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLibraryDocument,
  useUseLibraryDocument,
  getListProjectsQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  FilePlus2,
  Loader2,
  Download,
  FileText,
  Building2,
  GraduationCap,
} from "lucide-react";
import { documentTypeLabel, languageLabel } from "@/lib/library";

/** Absolute URL of the inline PDF preview for a library document. */
function previewUrl(id: number): string {
  return `${import.meta.env.BASE_URL}api/library/${id}/preview.pdf`;
}

/** Absolute URL that downloads the document in the requested format. */
function exportUrl(id: number, format: "docx" | "pdf"): string {
  return `${import.meta.env.BASE_URL}api/library/${id}/export?format=${format}`;
}

export function LibraryPreview() {
  const params = useParams();
  const id = Number(params.id);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoUsed = useRef(false);

  const { data: doc, isLoading, isError } = useGetLibraryDocument(id);
  const useDoc = useUseLibraryDocument();

  const isPdf = doc?.fileType === "pdf";

  const handleUse = () => {
    if (useDoc.isPending) return;
    useDoc.mutate(
      { id },
      {
        onSuccess: (project) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          toast({ title: "تم إنشاء نسخة قابلة للتحرير" });
          setLocation(`/projects/${project.id}`);
        },
        onError: () => {
          toast({
            title: "تعذّر إنشاء النسخة",
            description: "حاول مرة أخرى.",
            variant: "destructive",
          });
        },
      },
    );
  };

  // Honor a `?use=1` deep-link (from the library card "use" button). PDF
  // documents are preview-only, so the deep-link is ignored for them.
  useEffect(() => {
    if (autoUsed.current || !doc) return;
    if (doc.fileType === "pdf") return;
    const search = location.includes("?")
      ? location.slice(location.indexOf("?"))
      : window.location.search;
    if (new URLSearchParams(search).get("use") === "1") {
      autoUsed.current = true;
      handleUse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, location]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-[60vh] bg-muted/40 animate-pulse rounded-lg max-w-3xl mx-auto" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="text-center py-20 space-y-4">
        <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h2 className="text-xl font-bold">المستند غير موجود</h2>
        <Link href="/library">
          <Button variant="outline">العودة إلى المكتبة</Button>
        </Link>
      </div>
    );
  }

  const src = previewUrl(id);

  return (
    <div className="fade-in-up">
      {/* Header / actions */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="space-y-2 min-w-0">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="w-4 h-4" />
            المكتبة البحثية
          </Link>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{documentTypeLabel(doc.documentType)}</Badge>
            {isPdf && <Badge variant="outline">PDF</Badge>}
            {doc.university && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {doc.university}
              </span>
            )}
            {doc.degreeLevel && (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {doc.degreeLevel}
              </span>
            )}
            <span>{languageLabel(doc.language)}</span>
            {isPdf && doc.pageCount != null && (
              <span>{doc.pageCount} صفحة</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isPdf ? (
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href={exportUrl(id, "pdf")}>
                <Download className="w-5 h-5" />
                تنزيل PDF
              </a>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href={exportUrl(id, "docx")}>
                  <Download className="w-5 h-5" />
                  تنزيل Word
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href={exportUrl(id, "pdf")}>
                  <Download className="w-5 h-5" />
                  تنزيل PDF
                </a>
              </Button>
              <Button
                size="lg"
                onClick={handleUse}
                disabled={useDoc.isPending}
                className="gap-2"
              >
                {useDoc.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FilePlus2 className="w-5 h-5" />
                )}
                استخدام هذا المستند
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Real-file preview: the original PDF, or the DOCX rendered to PDF by
          LibreOffice on the server. No HTML conversion, so fonts, layout, RTL,
          headers/footers, images and tables are preserved exactly. */}
      <div className="bg-muted/30 rounded-xl p-2 md:p-4">
        <iframe
          src={src}
          title={doc.title}
          className="w-full h-[80vh] rounded-lg border bg-white"
        />
      </div>

      {!isPdf && (
        <div className="text-center pt-6">
          <Button
            size="lg"
            onClick={handleUse}
            disabled={useDoc.isPending}
            className="gap-2"
          >
            {useDoc.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FilePlus2 className="w-5 h-5" />
            )}
            استخدام هذا المستند والبدء في التحرير
          </Button>
        </div>
      )}
    </div>
  );
}
