import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListLibraryDocuments,
  useGetLibraryFacets,
  useUploadLibraryDocument,
  useSmartSearchLibrary,
  useUseLibraryDocument,
  useListLibraryCategories,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  Trash,
  Edit,
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
          <div className="w-full h-full flex flex-col bg-white p-3 border-b relative select-none">
            {/* Miniature Page Decoration */}
            <div className="border border-slate-200 w-full h-full p-3 rounded-sm flex flex-col gap-1.5 relative bg-[#fafafa] shadow-inner overflow-hidden text-right">
              <div className="text-[10px] font-bold text-primary border-b border-primary/20 pb-1 flex justify-between items-center">
                <span>{doc.university || "جامعة"}</span>
                <span className="text-[8px] bg-primary/10 px-1.5 rounded">{doc.department || "تخصص"}</span>
              </div>
              <div className="font-extrabold text-xs text-slate-800 line-clamp-3 leading-relaxed mt-1 text-center">
                {doc.title}
              </div>
              <div className="w-8 h-0.5 bg-amber-500 mx-auto my-0.5"></div>
              {doc.description ? (
                <div className="text-[9.5px] text-slate-500 line-clamp-5 leading-relaxed">
                  {doc.description}
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="h-1.5 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-4/5"></div>
                  <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                </div>
              )}
              {/* Fade out bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#fafafa] to-transparent pointer-events-none" />
            </div>
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

  // Taxonomy categories states
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const { data: categories, refetch: refetchCategories } = useListLibraryCategories();

  const universities = useMemo(() => {
    return categories ? categories.filter((c: any) => c.kind === "university") : [];
  }, [categories]);

  const selectedUni = useMemo(() => {
    return categories && uploadUni ? categories.find((c: any) => c.name === uploadUni && c.kind === "university") : null;
  }, [categories, uploadUni]);

  const selectedUniDepts = useMemo(() => {
    return categories && selectedUni ? categories.filter((c: any) => c.kind === "department" && c.parentId === selectedUni.id) : [];
  }, [categories, selectedUni]);

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
          setLocation(`/projects/${p.id}?back=library`);
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

          {/* Taxonomy Management Dialog */}
          <Dialog open={taxonomyOpen} onOpenChange={setTaxonomyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/30">
                <Building2 className="w-4 h-4 text-indigo-500" />
                إدارة الجامعات والتخصصات
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right text-xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  إدارة هيكل الجامعات والتخصصات
                </DialogTitle>
                <DialogDescription className="text-right">
                  أضف الجامعات المختلفة، ثم أضف الأقسام أو التخصصات التابعة لكل جامعة لترتيب مكتبتك البحثية بشكل هرمي متناسق.
                </DialogDescription>
              </DialogHeader>

              <CategoryManager categories={categories || []} refetch={refetchCategories} />
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
                    <Select value={uploadUni} onValueChange={(val) => {
                      setUploadUni(val);
                      setUploadDept("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الجامعة" />
                      </SelectTrigger>
                      <SelectContent>
                        {universities.map(uni => (
                          <SelectItem key={uni.id} value={uni.name}>{uni.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select value={uploadDept} onValueChange={setUploadDept} disabled={!uploadUni}>
                      <SelectTrigger>
                        <SelectValue placeholder={uploadUni ? "اختر القسم" : "اختر الجامعة أولاً"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedUniDepts.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          {/* Custom University & Department Hierarchical Taxonomy Filter */}
          {(() => {
            const uniFacet = facets?.universities ?? [];
            const deptFacet = facets?.departments ?? [];
            if (uniFacet.length === 0) return null;

            return (
              <div className="space-y-2 border-b pb-4">
                <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  الجامعات والتخصصات
                </h3>
                <div className="space-y-1.5 mr-1">
                  {uniFacet.map((uniItem) => {
                    const activeUni = filters.university === uniItem.value;
                    const uniCat = categories?.find((c: any) => c.name === uniItem.value && c.kind === "university");
                    const childDeptNames = uniCat 
                      ? categories?.filter((c: any) => c.kind === "department" && c.parentId === uniCat.id).map((c: any) => c.name) || []
                      : [];
                    const matchingDepts = deptFacet.filter(d => childDeptNames.includes(d.value));

                    return (
                      <div key={uniItem.value} className="space-y-1">
                        <button
                          onClick={() => toggleFilter("university", uniItem.value)}
                          className={cn(
                            "w-full flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md transition-colors text-right font-medium",
                            activeUni
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground/80",
                          )}
                        >
                          <span className="line-clamp-1">{uniItem.value}</span>
                          <span className="text-xs px-1.5 rounded bg-muted/40">{uniItem.count}</span>
                        </button>

                        {/* Indented child departments */}
                        {matchingDepts.length > 0 && (
                          <div className="mr-3 border-r pr-2 border-indigo-100/50 space-y-0.5 mt-0.5">
                            {matchingDepts.map(deptItem => {
                              const activeDept = filters.department === deptItem.value;
                              return (
                                <button
                                  key={deptItem.value}
                                  onClick={() => toggleFilter("department", deptItem.value)}
                                  className={cn(
                                    "w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-md transition-colors text-right",
                                    activeDept
                                      ? "bg-indigo-600 text-white font-semibold"
                                      : "hover:bg-slate-50 text-slate-600",
                                  )}
                                >
                                  <span className="line-clamp-1">{deptItem.value}</span>
                                  <span className="text-[10px] opacity-75">{deptItem.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {FILTER_GROUPS.map((group) => {
            if (group.key === "university" || group.key === "department") return null;
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

function CategoryManager({ categories, refetch }: { categories: any[]; refetch: () => void }) {
  const { toast } = useToast();
  const [newUniName, setNewUniName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newDeptNames, setNewDeptNames] = useState<Record<number, string>>({});

  const universities = useMemo(() => {
    return categories ? categories.filter((c: any) => c.kind === "university") : [];
  }, [categories]);

  const handleAddUniversity = async () => {
    if (!newUniName.trim()) return;
    try {
      const res = await fetch("/api/library/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUniName.trim(), kind: "university" })
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم إضافة الجامعة بنجاح" });
      setNewUniName("");
      refetch();
    } catch (err) {
      toast({ title: "فشل إضافة الجامعة", variant: "destructive" });
    }
  };

  const handleAddDepartment = async (uniId: number) => {
    const name = newDeptNames[uniId] || "";
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/library/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), kind: "department", parentId: uniId })
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم إضافة التخصص بنجاح" });
      setNewDeptNames(prev => ({ ...prev, [uniId]: "" }));
      refetch();
    } catch (err) {
      toast({ title: "فشل إضافة التخصص", variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`/api/library/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() })
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم التعديل بنجاح" });
      setEditingId(null);
      setEditingName("");
      refetch();
    } catch (err) {
      toast({ title: "فشل التعديل", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟ سيؤدي هذا لحذف التخصصات المرتبطة أيضاً.")) return;
    try {
      const res = await fetch(`/api/library/categories/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم الحذف بنجاح" });
      refetch();
    } catch (err) {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 text-right mt-4" dir="rtl">
      <div className="bg-muted/30 p-4 rounded-lg border flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">إضافة جامعة جديدة</label>
          <Input 
            placeholder="مثال: جامعة الملك سعود، جامعة صنعاء..."
            value={newUniName}
            onChange={(e) => setNewUniName(e.target.value)}
          />
        </div>
        <Button onClick={handleAddUniversity} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة جامعة
        </Button>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
        {universities.map((uni: any) => {
          const depts = categories.filter((c: any) => c.kind === "department" && c.parentId === uni.id);
          return (
            <div key={uni.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                {editingId === uni.id ? (
                  <div className="flex gap-1.5 flex-1 max-w-sm">
                    <Input 
                      value={editingName} 
                      onChange={(e) => setEditingName(e.target.value)} 
                      className="h-8"
                    />
                    <Button size="sm" onClick={() => handleSaveEdit(uni.id)}>حفظ</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>إلغاء</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-base">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span>{uni.name}</span>
                  </div>
                )}

                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                    onClick={() => { setEditingId(uni.id); setEditingName(uni.name); }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(uni.id)}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mr-4 space-y-1.5 border-r pr-3 border-slate-100">
                {depts.map((dept: any) => (
                  <div key={dept.id} className="flex justify-between items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 group">
                    {editingId === dept.id ? (
                      <div className="flex gap-1.5 flex-1 max-w-xs">
                        <Input 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)} 
                          className="h-7 text-xs"
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(dept.id)}>حفظ</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>إلغاء</Button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-600 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        {dept.name}
                      </span>
                    )}

                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-slate-400 hover:text-slate-600"
                        onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-1.5 pt-1.5">
                  <Input 
                    placeholder="إضافة تخصص جديد للجامعة..."
                    value={newDeptNames[uni.id] || ""}
                    onChange={(e) => setNewDeptNames(prev => ({ ...prev, [uni.id]: e.target.value }))}
                    className="h-8 text-xs flex-1"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => handleAddDepartment(uni.id)} 
                    className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {universities.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            لا توجد جامعات مضافة حالياً. يرجى إضافة جامعة أولاً.
          </div>
        )}
      </div>
    </div>
  );
}
