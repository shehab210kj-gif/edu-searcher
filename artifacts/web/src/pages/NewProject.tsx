import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useListTemplates } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, FileText } from "lucide-react";
import { getListProjectsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";

const WORK_TYPES = ["رسالة ماجستير", "أطروحة دكتوراه", "بحث محكم", "بحث جامعي", "مقال علمي", "تقرير بحثي"];
const CITATION_STYLES = ["APA", "MLA", "Harvard", "Chicago", "IEEE", "Vancouver"];
const LANGUAGES = ["العربية", "English"];

const formSchema = z.object({
  title: z.string().min(3, "عنوان المشروع يجب أن يكون 3 أحرف على الأقل"),
  workType: z.string().min(1, "الرجاء اختيار نوع البحث"),
  citationStyle: z.string().min(1, "الرجاء اختيار نمط التوثيق"),
  language: z.string().min(1, "الرجاء اختيار لغة البحث"),
  templateId: z.coerce.number().optional(),
  rawContent: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();
  const { data: templates } = useListTemplates();

  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      workType: "",
      citationStyle: "",
      language: "العربية",
      rawContent: ""
    }
  });

  const onSubmit = (values: FormValues) => {
    createProject.mutate({
      data: {
        title: values.title,
        workType: values.workType,
        citationStyle: values.citationStyle,
        language: values.language,
        templateId: values.templateId || null,
        rawContent: values.rawContent || ""
      }
    }, {
      onSuccess: (data) => {
        toast({ title: "تم إنشاء المشروع بنجاح" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setLocation(`/projects/${data.id}`);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء إنشاء المشروع", variant: "destructive" });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/parse-document`, {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) throw new Error("فشل في معالجة الملف");
      
      const data = await response.json();
      form.setValue("rawContent", data.text);
      toast({ title: "تم استخراج النص بنجاح" });
    } catch (err) {
      toast({ title: "فشل استخراج النص", description: "تأكد من أن الملف بصيغة مدعومة وحاول مرة أخرى.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // clear input
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground">مشروع جديد</h1>
        <p className="text-muted-foreground mt-2">قم بإنشاء مشروع بحثي جديد لإعداده وتنسيقه</p>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>تفاصيل المشروع</CardTitle>
            <CardDescription>الرجاء إدخال البيانات الأساسية لبحثك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان البحث</Label>
              <Input
                id="title"
                placeholder="أدخل عنوان البحث كاملاً..."
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>نوع البحث</Label>
                <Select onValueChange={(val) => form.setValue("workType", val)} defaultValue={form.getValues("workType")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع البحث" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map(wt => <SelectItem key={wt} value={wt}>{wt}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.workType && <p className="text-sm text-destructive">{form.formState.errors.workType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>لغة البحث</Label>
                <Select onValueChange={(val) => form.setValue("language", val)} defaultValue={form.getValues("language")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نمط التوثيق (Citation Style)</Label>
                <Select onValueChange={(val) => form.setValue("citationStyle", val)} defaultValue={form.getValues("citationStyle")}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نمط التوثيق" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITATION_STYLES.map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.citationStyle && <p className="text-sm text-destructive">{form.formState.errors.citationStyle.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>قالب التنسيق (اختياري)</Label>
                <Select onValueChange={(val) => form.setValue("templateId", parseInt(val))} defaultValue={form.getValues("templateId")?.toString()}>
                  <SelectTrigger>
                    <SelectValue placeholder="بدون قالب مسبق" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">محتوى البحث</Label>
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع ملف (Word / PDF)</span>
                  </Label>
                  <Input id="file-upload" type="file" accept=".docx,.doc,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </div>
              </div>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-3 rounded-md">
                  <FileText className="w-4 h-4" />
                  تم تحميل: {fileName}
                </div>
              )}
              <Textarea 
                placeholder="أو قم بلصق نص البحث هنا..." 
                className="min-h-[200px]"
                {...form.register("rawContent")}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6 bg-muted/20">
            <Button type="submit" size="lg" disabled={createProject.isPending}>
              {createProject.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              إنشاء المشروع
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}