import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListLibraryDocuments,
  useGetLibraryFacets,
  type FacetCount,
  type LibraryDocumentSummary,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  Eye,
  FilePlus2,
  X,
  GraduationCap,
  Building2,
  Filter,
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
          <Link href={`/library/${doc.id}?use=1`} className="flex-1">
            <Button size="sm" className="w-full gap-1.5">
              <FilePlus2 className="w-4 h-4" />
              استخدام
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function Library() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  // Debounce keyword input so results update live as the user types.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...filters,
      pageSize: 60,
    }),
    [search, filters],
  );

  const { data, isLoading } = useListLibraryDocuments(params);
  const { data: facets } = useGetLibraryFacets();

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

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground">المكتبة البحثية</h1>
        <p className="text-muted-foreground mt-2">
          تصفّح نماذج الرسائل والأبحاث الأكاديمية، عاينها بتنسيقها الأصلي،
          واستخدمها كنقطة انطلاق لبحثك.
        </p>
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
          ) : data && data.items.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {data.total} نتيجة
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {data.items.map((doc) => (
                  <ResearchCard key={doc.id} doc={doc} />
                ))}
              </div>
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
