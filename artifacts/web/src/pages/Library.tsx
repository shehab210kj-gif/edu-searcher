import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListLibraryDocuments,
  useGetLibraryFacets,
  useUploadLibraryDocument,
  useSmartSearchLibrary,
  useUseLibraryDocument,
  type FacetCount,
  type LibraryDocumentSummary,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  BookOpen,
  Eye,
  FilePlus2,
  X,
  GraduationCap,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
  Loader2,
  FileText,
  FileImage,
} from "lucide-react";
import {
  resolveStorageUrl,
  documentTypeLabel,
  languageLabel,
} from "@/lib/library";
import { cn } from "@/lib/utils";

interface Filters {
  documentType?: string;
  category?: string;
  university?: string;
  degreeLevel?: string;
  department?: string;
  language?: string;
  tag?: string;
}

const FILTER_GROUPS: {
  key: keyof Filters;
  label: string;
  facet: keyof ReturnType<typeof facetGroups>;
  translate?: (v: string) => string;
}[] = [
  { key: "university", label: "الجامعة", facet: "universities" },
  { key: "degreeLevel", label: "الدرجة العلمية", facet: "degreeLevels" },
  { key: "department", label: "القسم", facet: "departments" },
  {
    key: "documentType",
    label: "نوع المستند",
    facet: "documentTypes",
    translate: documentTypeLabel,
  },
  { key: "category", label: "التصنيف", facet: "categories" },
  {
    key: "language",
    label: "اللغة",
    facet: "languages",
    translate: languageLabel,
  },
  { key: "tag", label: "الكلمات المفتاحية", facet: "tags" },
];

function facetGroups() {
  return {
    universities: [] as FacetCount[],
    degreeLevels: [] as FacetCount[],
    departments: [] as FacetCount[],
    documentTypes: [] as FacetCount[],
    categories: [] as FacetCount[],
    languages: [] as FacetCount[],
    tags: [] as FacetCount[],
  };
}

function ResearchCard({ doc }: { doc: LibraryDocumentSummary }) {
  const cover = resolveStorageUrl(doc.coverImageUrl);
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:border-primary/50 transition-colors group">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={doc.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-6 text-center">
            <BookOpen className="w-10 h-10 mb-3 opacity-80" />
            <span className="font-bold text-sm line-clamp-4 leading-relaxed">
              {doc.title}
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="shadow-sm">
            {documentTypeLabel(doc.documentType)}
          </Badge>
        </div>
      </div>
      <CardContent className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-bold text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {doc.title}
        </h3>
        {doc.university && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{doc.university}</span>
          </div>
        )}
        {doc.degreeLevel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{doc.degreeLevel}</span>
          </div>
        )}
        {doc.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {doc.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {doc.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-auto pt-3">
          <Link href={`/library/${doc.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Eye className="w-4 h-4" />
              معاينة
            </Button>
          </Link>
          {/* PDF documents are preview-only — they can't become editable
              projects, so the "use" action is hidden for them. */}
          {doc.fileType !== "pdf" && (
            <Link href={`/library/${doc.id}?use=1`} className="flex-1">
              <Button size="sm" className="w-full gap-1.5">
                <FilePlus2 className="w-4 h-4" />
                استخدام
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE = 24;

export function Library() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  // Upload old research state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadUni, setUploadUni] = useState("");
  const [uploadDept, setUploadDept] = useState("");
  const [uploadDegree, setUploadDegree] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  // Smart Search state
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchFile, setMatchFile] = useState<File | null>(null);
  const [matchResults, setMatchResults] = useState<any[]>([]);

  // Mutation hooks
  const uploadDoc = useUploadLibraryDocument();
  const smartSearch = useSmartSearchLibrary();
  const useDoc = useUseLibraryDocument();

  // Debounce keyword input so results update live as the user types.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any change to the result set resets paging back to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...filters,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, filters, page],
  );

  const { data, isLoading, refetch } = useListLibraryDocuments(params);
  const { data: facets } = useGetLibraryFacets();

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilters = Object.entries(filters).filter(([, v]) => v) as [
    keyof Filters,
    string,
  ][];

  const toggleFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const clearAll = () => {
    setFilters({});
    setSearch("");
    setSearchInput("");
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast({ title: "الرجاء اختيار ملف", variant: "destructive" });
      return;
    }

    try {
      await uploadDoc.mutateAsync({
        data: {
          file: uploadFile,
          title: uploadTitle || uploadFile.name,
          description: uploadDesc,
          university: uploadUni,
          department: uploadDept,
          degreeLevel: uploadDegree,
          category: uploadCategory,
          tags: uploadTags,
        },
      });

      toast({ title: "تم رفع البحث القديم وحفظه بالمكتبة بنجاح" });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
      setUploadUni("");
      setUploadDept("");
      setUploadDegree("");
      setUploadCategory("");
      setUploadTags("");
      refetch();
    } catch (err: any) {
      toast({
        title: "تعذّر رفع الملف",
        description: err.response?.data?.error || "الرجاء التحقق من صيغة الملف وحجمه.",
        variant: "destructive",
      });
    }
  };

  const handleSmartSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchFile) {
      toast({ title: "الرجاء اختيار ملف التكليف أولاً", variant: "destructive" });
      return;
    }

    try {
      const res = await smartSearch.mutateAsync({
        data: {
          file: matchFile,
        },
      });
      setMatchResults(res.results ?? []);
      if ((res.results ?? []).length === 0) {
        toast({ title: "لم يتم العثور على أبحاث سابقة مطابقة للتكليف المرفوع" });
      } else {
        toast({ title: `تم العثور على ${(res.results ?? []).length} بحث مشابه للتكليف` });
      }
    } catch (err: any) {
      toast({
        title: "فشل البحث الذكي والمطابقة",
        description: err.response?.data?.error || "حدث خطأ أثناء الاتصال بالخادم المساعد.",
        variant: "destructive",
      });
    }
  };

  const handleReuseDocument = (docId: number) => {
    useDoc.mutate(
      { id: docId },
      {
        onSuccess: (p) => {
          toast({ title: "تم إنشاء نسخة من البحث للبدء في التعديل عليها" });
          setLocation(`/projects/${p.id}`);
        },
        onError: () => {
          toast({ title: "عفواً، تعذر إعادة استخدام هذا البحث", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المكتبة البحثية</h1>
          <p className="text-muted-foreground mt-2">
            تصفّح نماذج الرسائل والأبحاث الأكاديمية، عاينها بتنسيقها الأصلي،
            واستخدمها كنقطة انطلاق لبحثك.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Smart AI Matching Button & Modal */}
          <Dialog open={matchOpen} onOpenChange={(open) => { setMatchOpen(open); if (!open) { setMatchFile(null); setMatchResults([]); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md">
                <Sparkles className="w-4 h-4" />
                البحث الذكي ومطابقة التكاليف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  البحث الذكي ومطابقة التكاليف
                </DialogTitle>
                <DialogDescription className="text-right">
                  أرفق ملف التكليف أو الواجب الدراسي (PDF أو Word أو صورة) ليقوم نظام الذكاء الاصطناعي بقراءة المطلوب ومطابقته فوراً مع أبحاثك السابقة لمعرفة نسبة التشابه وإمكانية إعادة استخدامها.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSmartSearchSubmit} className="space-y-4 text-right">
                <div className="border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                  {matchFile ? (
                    <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-md">
                      {matchFile.type.startsWith("image/") ? (
                        <FileImage className="w-8 h-8 text-indigo-500" />
                      ) : (
                        <FileText className="w-8 h-8 text-primary" />
                      )}
                      <div className="text-right">
                        <p className="font-semibold text-sm line-clamp-1 max-w-[280px]">{matchFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(matchFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setMatchFile(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mb-1" />
                      <p className="font-semibold text-sm">اسحب ملف التكليف هنا أو اضغط للاختيار</p>
                      <p className="text-xs text-muted-foreground">يدعم PDF، Word وصور المطلوب</p>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        id="smart-search-file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setMatchFile(e.target.files[0]);
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("smart-search-file")?.click()}>
                        اختر ملف
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={!matchFile || smartSearch.isPending} className="gap-2">
                    {smartSearch.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري مطابقة المتطلبات وقراءة الملف...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        بدء المطابقة الذكية
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {matchResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-bold text-base text-right border-b pb-2">نتائج المطابقة والتشابه:</h3>
                  <div className="space-y-3">
                    {matchResults.map((result) => {
                      const isHigh = result.similarityScore >= 80;
                      const isMed = result.similarityScore >= 50 && result.similarityScore < 80;
                      return (
                        <div key={result.documentId} className="border rounded-lg p-4 bg-muted/10 hover:bg-muted/20 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-base shadow-inner shrink-0 ${
                              isHigh ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                              isMed ? "bg-amber-50 text-amber-600 border border-amber-200" :
                              "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}>
                              {result.similarityScore}%
                            </div>
                            <div className="text-right">
                              <h4 className="font-bold text-sm text-foreground line-clamp-1">{result.document?.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{result.explanation}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                            <Link href={`/library/${result.documentId}`} className="flex-1 md:flex-none">
                              <Button variant="outline" size="sm" className="w-full gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                معاينة
                              </Button>
                            </Link>
                            {result.document?.fileType !== "pdf" && (
                              <Button
                                size="sm"
                                className="flex-1 md:flex-none gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={() => handleReuseDocument(result.documentId)}
                                disabled={useDoc.isPending}
                              >
                                {useDoc.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                                إعادة استخدام
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Upload Old Research Button & Modal */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 hover:border-primary">
                <Upload className="w-4 h-4" />
                أرشفة بحث قديم
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  أرشفة بحث قديم للمكتبة
                </DialogTitle>
                <DialogDescription className="text-right">
                  قم بأرشفة ورفع ملفاتك البحثية القديمة المنجزة مسبقاً (PDF أو Word) لتخزينها في مكتبتك الخاصة واستخدامها في المطابقة لاحقاً.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-right">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">ملف البحث (Word أو PDF) *</label>
                  <div className="border border-input rounded-md p-3 bg-muted/20 flex items-center gap-3">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className="text-xs text-right w-full"
                      required
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          setUploadFile(file);
                          // Auto fill title if empty
                          if (!uploadTitle) {
                            const cleanName = file.name.replace(/\.[^/.]+$/, "");
                            setUploadTitle(cleanName);
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">عنوان البحث *</label>
                  <Input
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="أدخل عنوان البحث..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">الوصف أو الملخص</label>
                  <Input
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="ملخص بسيط لمحتوى البحث..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">الجامعة</label>
                    <Input
                      value={uploadUni}
                      onChange={(e) => setUploadUni(e.target.value)}
                      placeholder="جامعة الملك سعود..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">الدرجة العلمية</label>
                    <Input
                      value={uploadDegree}
                      onChange={(e) => setUploadDegree(e.target.value)}
                      placeholder="بكالوريوس، ماجستير..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">القسم</label>
                    <Input
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      placeholder="علوم الحاسب..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">التصنيف</label>
                    <Input
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      placeholder="ذكاء اصطناعي..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">الكلمات المفتاحية (مفصولة بفاصلة)</label>
                  <Input
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="بحث العلمي, ذكاء اصطناعي, كود..."
                  />
                </div>

                <DialogFooter className="mt-6">
                  <Button type="submit" className="w-full gap-2" disabled={uploadDoc.isPending}>
                    {uploadDoc.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري رفع وأرشفة المستند...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        حفظ في المكتبة البحثية
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="ابحث بالعنوان، الجامعة، الوصف أو الكلمات المفتاحية..."
          className="pr-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              تصفية
            </h2>
            {(activeFilters.length > 0 || search) && (
              <button
                onClick={clearAll}
                className="text-xs text-primary hover:underline"
              >
                مسح الكل
              </button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map(([key, value]) => (
                <Badge
                  key={key}
                  variant="default"
                  className="gap-1 cursor-pointer"
                  onClick={() => toggleFilter(key, value)}
                >
                  {key === "documentType"
                    ? documentTypeLabel(value)
                    : key === "language"
                      ? languageLabel(value)
                      : value}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}

          {FILTER_GROUPS.map((group) => {
            const items = (facets?.[group.facet] ?? []) as FacetCount[];
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground/80">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = filters[group.key] === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => toggleFilter(group.key, item.value)}
                        className={cn(
                          "w-full flex items-center justify-between text-sm px-2 py-1.5 rounded-md transition-colors text-right",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground/80",
                        )}
                      >
                        <span className="line-clamp-1">
                          {group.translate
                            ? group.translate(item.value)
                            : item.value}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-1.5 rounded",
                            active
                              ? "bg-primary-foreground/20"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Results */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-muted/40 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : data && Array.isArray(data.items) && data.items.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {data.total} نتيجة
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {data.items.map((doc) => (
                  <ResearchCard key={doc.id} doc={doc} />
                ))}
              </div>
              {pageCount > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    صفحة {page} من {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="gap-1"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  جرّب تعديل كلمات البحث أو إزالة بعض عوامل التصفية.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
