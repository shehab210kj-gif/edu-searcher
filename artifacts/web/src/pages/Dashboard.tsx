import { useGetStats, useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, CheckCircle2, TrendingUp, Clock, BookOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetStats();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects();

  const isLoading = isStatsLoading || isProjectsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 fade-in-up">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50"></CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">نظرة عامة على أبحاثك ومشاريعك الأكاديمية</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المشاريع</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">مشروع مسجل</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط الجاهزية</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgReadiness)}%</div>
              <p className="text-xs text-muted-foreground mt-1">متوسط تقييم الذكاء الاصطناعي</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">المشاريع المكتملة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">بحث تم الانتهاء منه</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">أحدث المشاريع</h2>
            <Link href="/projects/new" className="text-sm text-primary hover:underline font-medium">
              مشروع جديد &larr;
            </Link>
          </div>
          
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.slice(0, 5).map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group hover-elevate">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="bg-muted px-2 py-0.5 rounded-md">{project.workType}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(project.updatedAt), "dd MMMM yyyy", { locale: ar })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left shrink-0 mr-4">
                        {project.readinessScore != null ? (
                          <div className={`text-lg font-bold ${project.readinessScore >= 80 ? 'text-green-600' : project.readinessScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {project.readinessScore}%
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            <span>غير مقيم</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">لا توجد مشاريع بعد</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  ابدأ مشروعك الأكاديمي الأول ودع الذكاء الاصطناعي يساعدك في التنظيم والتنسيق
                </p>
                <Link href="/projects/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                  إنشاء مشروع
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-6">أنواع الأبحاث</h2>
          <Card>
            <CardContent className="p-6">
              {stats?.byWorkType && stats.byWorkType.length > 0 ? (
                <div className="space-y-4">
                  {stats.byWorkType.map((wt) => (
                    <div key={wt.workType} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{wt.workType}</span>
                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">{wt.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات كافية</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}