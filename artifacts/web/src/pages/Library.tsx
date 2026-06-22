import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListLibraryDocuments,
  useGetLibraryFacets,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, ArrowLeft, Search, X, ChevronLeft, ChevronRight, GraduationCap, Tag } from "lucide-react";

const PAGE_SIZE = 12;

export function Library() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: facets } = useGetLibraryFacets();

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(tag ? { tag } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, category, tag, page],
  );

  const { data, isLoading, isError } = useListLibraryDocuments(params);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const facetTags = facets?.tags.map((t) => t.value) ?? [];

  const resetToFirstPage = () => setPage(1);

  const applySearch = () => {
    setSearch(searchInput.trim());
    resetToFirstPage();
  };

  const selectCategory = (value: string | null) => {
    setCategory(value);
    resetToFirstPage();
  };

  const selectTag = (value: string | null) => {
    setTag(value);
    resetToFirstPage();
  };

  const hasActiveFilters = Boolean(search || category || tag);

  const clearAll = () => {
    setSearch("");
    setSearchInput("");
    setCategory(null);
    setTag(null);
    resetToFirstPage();
  };

  return (
    <div className="space-y-8 fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المكتبة البحثية</h1>
          <p className="text-muted-foreground mt-2">
            تصفّح نماذج الأبحاث والرسائل الأكاديمية الجاهزة واستخدمها كقالب لمشروعك
          </p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالعنوان أو الجامعة أو القسم..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="pr-9"
            />
          </div>
          <Button onClick={applySearch}>بحث</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Facet sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                التصنيفات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-1">
                <button
                  onClick={() => selectCategory(null)}
                  className={`w-full text-right text-sm px-2 py-1.5 rounded transition-colors ${
                    category === null
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  كل التصنيفات
                </button>
                {facets?.categories.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => selectCategory(f.value)}
                    className={`w-full flex items-center justify-between text-right text-sm px-2 py-1.5 rounded transition-colors ${
                      category === f.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{f.value}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{f.count}</Badge>
                  </button>
                ))}
                {(!facets || facets.categories.length === 0) && (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">لا توجد تصنيفات.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                الوسوم
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-wrap gap-2">
                {tag && (
                  <Badge
                    variant="default"
                    className="cursor-pointer gap-1"
                    onClick={() => selectTag(null)}
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </Badge>
                )}
                {facetTags
                  .filter((t) => t !== tag)
                  .map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => selectTag(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                {facetTags.length === 0 && !tag && (
                  <p className="text-xs text-muted-foreground">لا توجد وسوم.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="lg:col-span-3 space-y-6">
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <span className="text-muted-foreground">عوامل التصفية:</span>
              {search && (
                <Badge variant="secondary" className="gap-1">
                  بحث: {search}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => { setSearch(""); setSearchInput(""); resetToFirstPage(); }} />
                </Badge>
              )}
              {category && (
                <Badge variant="secondary" className="gap-1">
                  {category}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => selectCategory(null)} />
                </Badge>
              )}
              {tag && (
                <Badge variant="secondary" className="gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => selectTag(null)} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
                مسح الكل
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse h-56 bg-muted/30" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-red-500 font-medium">
              تعذّر تحميل المكتبة. حاول مرة أخرى.
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                {data.total} نتيجة
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.items.map((doc) => (
                  <Link key={doc.id} href={`/library/${doc.id}`}>
                    <Card className="flex flex-col h-full hover-elevate cursor-pointer hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary">{doc.documentType}</Badge>
                            {doc.degreeLevel && (
                              <Badge variant="outline" className="text-[10px]">{doc.degreeLevel}</Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-2 min-h-[2.5rem]">
                          {doc.description || "لا يوجد وصف"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="text-sm space-y-1.5 text-muted-foreground">
                          {doc.university && (
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 shrink-0" />
                              <span className="truncate">{doc.university}</span>
                            </div>
                          )}
                          {doc.category && (
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 shrink-0" />
                              <span className="truncate">{doc.category}</span>
                            </div>
                          )}
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {doc.tags.slice(0, 4).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-4 border-t bg-muted/10 mt-auto">
                        <span className="w-full flex items-center justify-between text-sm text-primary font-medium">
                          عرض المستند
                          <ArrowLeft className="w-4 h-4" />
                        </span>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
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
                  <span className="text-sm text-muted-foreground px-2">
                    صفحة {page} من {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="gap-1"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">لا توجد مستندات مطابقة لبحثك.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                  مسح عوامل التصفية
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
