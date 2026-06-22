import { useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLibraryDocument,
  useUseLibraryDocument,
  getListProjectsQueryKey,
  getGetStatsQueryKey,
  type LibraryDocument,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  FilePlus2,
  Loader2,
  ListTree,
  FileText,
  Building2,
  GraduationCap,
} from "lucide-react";
import {
  resolveStorageUrl,
  documentTypeLabel,
  languageLabel,
} from "@/lib/library";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Rewrite storage-backed <img> src values to proxy URLs and collect headings. */
function processRichContent(html: string): { html: string; headings: Heading[] } {
  if (typeof window === "undefined") return { html, headings: [] };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    const resolved = resolveStorageUrl(src);
    if (resolved) img.setAttribute("src", resolved);
  });

  const headings: Heading[] = [];
  doc.querySelectorAll("h1, h2, h3").forEach((el, i) => {
    const text = el.textContent?.trim();
    if (!text) return;
    const id = `sec-${i}`;
    el.setAttribute("id", id);
    headings.push({
      id,
      text,
      level: Number(el.tagName.substring(1)),
    });
  });

  return { html: doc.body.innerHTML, headings };
}

function CoverPage({ doc }: { doc: LibraryDocument }) {
  const layout = doc.layoutMetadata ?? {};
  const cover = layout.cover;
  const logo = resolveStorageUrl(cover?.logoUrl);

  if (layout.coverPageHtml && layout.coverPageHtml.trim()) {
    const html = processRichContent(layout.coverPageHtml).html;
    return (
      <div
        className="doc-cover doc-body"
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="doc-cover flex flex-col items-center text-center justify-between py-8 gap-8">
      <div className="space-y-2">
        {cover?.university && (
          <p className="text-lg font-bold">{cover.university}</p>
        )}
        {cover?.faculty && <p className="text-base">{cover.faculty}</p>}
        {cover?.department && (
          <p className="text-base">{cover.department}</p>
        )}
      </div>

      {logo && (
        <img src={logo} alt="" className="w-24 h-24 object-contain" />
      )}

      <div className="space-y-4 max-w-xl">
        <h1 className="text-3xl font-bold leading-relaxed">
          {cover?.title || doc.title}
        </h1>
        {cover?.subtitle && (
          <p className="text-xl text-gray-700">{cover.subtitle}</p>
        )}
      </div>

      <div className="space-y-1 text-base">
        {cover?.studentName && <p>إعداد: {cover.studentName}</p>}
        {cover?.supervisor && <p>إشراف: {cover.supervisor}</p>}
        {cover?.degree && <p>{cover.degree}</p>}
        {cover?.year && <p className="font-bold mt-2">{cover.year}</p>}
      </div>
    </div>
  );
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

  const processed = useMemo(
    () => (doc ? processRichContent(doc.richContent) : { html: "", headings: [] }),
    [doc],
  );

  const isLandscape = doc?.layoutMetadata?.pageSetup?.orientation === "landscape";

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

  // Honor a `?use=1` deep-link (from the library card "use" button).
  useEffect(() => {
    if (autoUsed.current) return;
    const search = location.includes("?")
      ? location.slice(location.indexOf("?"))
      : window.location.search;
    if (doc && new URLSearchParams(search).get("use") === "1") {
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
          </div>
        </div>
        <Button
          size="lg"
          onClick={handleUse}
          disabled={useDoc.isPending}
          className="gap-2 shrink-0"
        >
          {useDoc.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FilePlus2 className="w-5 h-5" />
          )}
          استخدام هذا المستند
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: thumbnails + table of contents */}
        <aside className="space-y-6 lg:sticky lg:top-6 self-start">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              الصفحات
            </h2>
            <div className="border rounded-lg overflow-hidden bg-muted/40 aspect-[3/4] relative">
              <div
                className="doc-thumb absolute top-0 right-0"
                style={{ width: 794, transform: "scale(0.29)" }}
              >
                <div className="doc-page" style={{ boxShadow: "none" }}>
                  <CoverPage doc={doc} />
                </div>
              </div>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-background/80 px-2 py-0.5 rounded">
                صفحة الغلاف
              </span>
            </div>
          </div>

          {processed.headings.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ListTree className="w-4 h-4" />
                جدول المحتويات
              </h2>
              <nav className="space-y-0.5 max-h-[50vh] overflow-auto pl-1">
                {processed.headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(h.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="block text-sm text-foreground/70 hover:text-primary truncate py-0.5"
                    style={{ paddingRight: `${(h.level - 1) * 12}px` }}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </aside>

        {/* Document pages */}
        <div className="space-y-8 bg-muted/30 rounded-xl p-4 md:p-8 overflow-x-auto">
          <div className={`doc-page ${isLandscape ? "landscape" : ""}`}>
            <CoverPage doc={doc} />
          </div>
          <div className={`doc-page ${isLandscape ? "landscape" : ""}`}>
            <div
              className="doc-body"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: processed.html }}
            />
          </div>

          <div className="text-center pt-2">
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
        </div>
      </div>
    </div>
  );
}
