import { useListTemplates } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Templates() {
  const { data: templates, isLoading } = useListTemplates();

  if (isLoading) {
    return (
      <div className="space-y-6 fade-in-up">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/30"></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground">قوالب التنسيق</h1>
        <p className="text-muted-foreground mt-2">مكتبة من القوالب الأكاديمية المعتمدة للمؤسسات والمجلات العلمية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
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
        {templates?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            لا توجد قوالب متاحة.
          </div>
        )}
      </div>
    </div>
  );
}