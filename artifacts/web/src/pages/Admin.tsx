import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminLogin,
  useListAdminLibrary,
  useUpdateLibraryDocument,
  useDeleteLibraryDocument,
  useListLibraryCategories,
  useCreateLibraryCategory,
  useDeleteLibraryCategory,
  getListAdminLibraryQueryKey,
  getListLibraryDocumentsQueryKey,
  getGetLibraryFacetsQueryKey,
  getListLibraryCategoriesQueryKey,
  type LibraryDocument,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  Loader2,
  UploadCloud,
  Pencil,
  Trash2,
  LogOut,
  Plus,
  ImageIcon,
  RefreshCw,
} from "lucide-react";
import {
  getAdminToken,
  setAdminToken,
  adminAuthHeader,
  resolveStorageUrl,
  uploadPublicFile,
  uploadLibraryDocx,
  documentTypeLabel,
  DOCUMENT_TYPE_LABELS,
  type LibraryDocxMetadata,
} from "@/lib/library";

const DOC_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS);
const STATUS_OPTIONS = [
  { value: "published", label: "منشور" },
  { value: "draft", label: "مسودة" },
];
const LANGUAGE_OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
];

interface MetaState {
  title: string;
  description: string;
  documentType: string;
  university: string;
  degreeLevel: string;
  department: string;
  category: string;
  language: string;
  tags: string;
  status: string;
  coverImageUrl: string;
}

const emptyMeta: MetaState = {
  title: "",
  description: "",
  documentType: "master_template",
  university: "",
  degreeLevel: "",
  department: "",
  category: "",
  language: "ar",
  tags: "",
  status: "published",
  coverImageUrl: "",
};

function metaFromDoc(doc: LibraryDocument): MetaState {
  return {
    title: doc.title,
    description: doc.description ?? "",
    documentType: doc.documentType,
    university: doc.university ?? "",
    degreeLevel: doc.degreeLevel ?? "",
    department: doc.department ?? "",
    category: doc.category ?? "",
    language: doc.language,
    tags: doc.tags.join(", "),
    status: doc.status,
    coverImageUrl: doc.coverImageUrl ?? "",
  };
}

/* ── Login ─────────────────────────────────────────────────────────── */
function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const login = useAdminLogin();
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { password } },
      {
        onSuccess: (session) => {
          setAdminToken(session.token);
          onSuccess();
        },
        onError: () => {
          toast({ title: "كلمة المرور غير صحيحة", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="max-w-md mx-auto mt-12 fade-in-up">
      <Card>
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle>لوحة إدارة المكتبة</CardTitle>
          <CardDescription>أدخل كلمة مرور المشرف للمتابعة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">كلمة المرور</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={login.isPending || !password}
            >
              {login.isPending && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              )}
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Shared metadata fields ────────────────────────────────────────── */
function MetaFields({
  meta,
  setMeta,
}: {
  meta: MetaState;
  setMeta: (m: MetaState) => void;
}) {
  const set = (k: keyof MetaState, v: string) => setMeta({ ...meta, [k]: v });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5 md:col-span-2">
        <Label>العنوان</Label>
        <Input value={meta.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>الوصف</Label>
        <Textarea
          value={meta.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label>نوع المستند</Label>
        <Select value={meta.documentType} onValueChange={(v) => set("documentType", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPE_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>الحالة</Label>
        <Select value={meta.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>الجامعة</Label>
        <Input value={meta.university} onChange={(e) => set("university", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>الدرجة العلمية</Label>
        <Input value={meta.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>القسم</Label>
        <Input value={meta.department} onChange={(e) => set("department", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>التصنيف</Label>
        <Input value={meta.category} onChange={(e) => set("category", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>اللغة</Label>
        <Select value={meta.language} onValueChange={(v) => set("language", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>الكلمات المفتاحية (مفصولة بفاصلة)</Label>
        <Input value={meta.tags} onChange={(e) => set("tags", e.target.value)} />
      </div>
    </div>
  );
}

function CoverField({
  meta,
  setMeta,
}: {
  meta: MetaState;
  setMeta: (m: MetaState) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const cover = resolveStorageUrl(meta.coverImageUrl);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadPublicFile(file);
      setMeta({ ...meta, coverImageUrl: path });
      toast({ title: "تم رفع صورة الغلاف" });
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>صورة الغلاف</Label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-20 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="cover-pick"
            className="cursor-pointer inline-flex items-center gap-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            اختر صورة
          </Label>
          <Input
            id="cover-pick"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
            disabled={uploading}
          />
          {meta.coverImageUrl && (
            <button
              type="button"
              className="block text-xs text-destructive hover:underline"
              onClick={() => setMeta({ ...meta, coverImageUrl: "" })}
            >
              إزالة الصورة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Upload (create) form ──────────────────────────────────────────── */
function UploadForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [meta, setMeta] = useState<MetaState>(emptyMeta);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "الرجاء اختيار ملف Word", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await uploadLibraryDocx(file, meta as LibraryDocxMetadata);
      toast({ title: "تمت إضافة المستند بنجاح" });
      setMeta(emptyMeta);
      setFile(null);
      onDone();
    } catch (err) {
      toast({
        title: "تعذّر رفع المستند",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة مستند جديد</CardTitle>
        <CardDescription>
          ارفع ملف Word (.docx) مع بياناته الوصفية لإضافته إلى المكتبة.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>ملف Word (.docx)</Label>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="docx-pick"
                className="cursor-pointer inline-flex items-center gap-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
              >
                <UploadCloud className="w-4 h-4" />
                اختر ملف
              </Label>
              <Input
                id="docx-pick"
                type="file"
                accept=".docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <span className="text-sm text-primary truncate">{file.name}</span>
              )}
            </div>
          </div>

          <MetaFields meta={meta} setMeta={setMeta} />
          <CoverField meta={meta} setMeta={setMeta} />

          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            إضافة إلى المكتبة
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Edit dialog ───────────────────────────────────────────────────── */
function EditDialog({
  doc,
  open,
  onOpenChange,
  onSaved,
}: {
  doc: LibraryDocument;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [meta, setMeta] = useState<MetaState>(metaFromDoc(doc));
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const update = useUpdateLibraryDocument({
    request: { headers: adminAuthHeader() },
  });

  const toMetadata = (): LibraryDocxMetadata => ({
    title: meta.title,
    description: meta.description,
    documentType: meta.documentType,
    coverImageUrl: meta.coverImageUrl,
    university: meta.university,
    degreeLevel: meta.degreeLevel,
    department: meta.department,
    category: meta.category,
    language: meta.language,
    tags: meta.tags,
    status: meta.status,
  });

  const save = async () => {
    setSaving(true);
    try {
      if (replaceFile) {
        // Replacing the file re-parses content and refreshes metadata.
        await uploadLibraryDocx(replaceFile, toMetadata(), doc.id);
      } else {
        await update.mutateAsync({
          id: doc.id,
          data: {
            title: meta.title,
            description: meta.description,
            documentType: meta.documentType,
            coverImageUrl: meta.coverImageUrl || null,
            university: meta.university || null,
            degreeLevel: meta.degreeLevel || null,
            department: meta.department || null,
            category: meta.category || null,
            language: meta.language,
            tags: meta.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            status: meta.status,
          },
        });
      }
      toast({ title: "تم حفظ التغييرات" });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "تعذّر حفظ التغييرات",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل المستند</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <MetaFields meta={meta} setMeta={setMeta} />
          <CoverField meta={meta} setMeta={setMeta} />
          <div className="space-y-1.5 border-t pt-4">
            <Label className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              استبدال ملف Word (اختياري)
            </Label>
            <div className="flex items-center gap-3">
              <Label
                htmlFor="replace-pick"
                className="cursor-pointer inline-flex items-center gap-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
              >
                <UploadCloud className="w-4 h-4" />
                اختر ملف بديل
              </Label>
              <Input
                id="replace-pick"
                type="file"
                accept=".docx"
                className="hidden"
                onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
              />
              {replaceFile && (
                <span className="text-sm text-primary truncate">
                  {replaceFile.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              عند اختيار ملف بديل سيُعاد استخراج محتوى المستند وتنسيقه.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Documents table ───────────────────────────────────────────────── */
function DocumentsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: docs, isLoading } = useListAdminLibrary({
    request: { headers: adminAuthHeader() },
  });
  const del = useDeleteLibraryDocument({
    request: { headers: adminAuthHeader() },
  });
  const [editing, setEditing] = useState<LibraryDocument | null>(null);
  const [deleting, setDeleting] = useState<LibraryDocument | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminLibraryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListLibraryDocumentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLibraryFacetsQueryKey() });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          toast({ title: "تم حذف المستند" });
          invalidate();
          setDeleting(null);
        },
        onError: () => {
          toast({ title: "تعذّر حذف المستند", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <UploadForm onDone={invalidate} />

      <Card>
        <CardHeader>
          <CardTitle>مستندات المكتبة</CardTitle>
          <CardDescription>
            {docs ? `${docs.length} مستند` : "إدارة المستندات الموجودة"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : docs && docs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المستند</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الجامعة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const cover = resolveStorageUrl(doc.coverImageUrl);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-12 rounded border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {cover ? (
                                <img
                                  src={cover}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                              )}
                            </div>
                            <span className="font-medium line-clamp-2 max-w-xs">
                              {doc.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {documentTypeLabel(doc.documentType)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.university || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doc.status === "published" ? "default" : "secondary"
                            }
                          >
                            {doc.status === "published" ? "منشور" : "مسودة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(doc)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(doc)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              لا توجد مستندات بعد. ابدأ بإضافة مستند من النموذج بالأعلى.
            </p>
          )}
        </CardContent>
      </Card>

      {editing && (
        <EditDialog
          key={editing.id}
          doc={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={invalidate}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستند؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.title}» نهائيًا من المكتبة. لا يمكن التراجع عن
              هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Categories tab ────────────────────────────────────────────────── */
function CategoriesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListLibraryCategories();
  const create = useCreateLibraryCategory({
    request: { headers: adminAuthHeader() },
  });
  const del = useDeleteLibraryCategory({
    request: { headers: adminAuthHeader() },
  });
  const [kind, setKind] = useState("category");
  const [name, setName] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getListLibraryCategoriesQueryKey(),
    });

  const KIND_LABELS: Record<string, string> = {
    category: "تصنيف",
    department: "قسم",
    degree_level: "درجة علمية",
    university: "جامعة",
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { data: { kind, name: name.trim() } },
      {
        onSuccess: () => {
          toast({ title: "تمت إضافة التصنيف" });
          setName("");
          invalidate();
        },
        onError: () => toast({ title: "تعذّر الإضافة", variant: "destructive" }),
      },
    );
  };

  const remove = (id: number) => {
    del.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "تم الحذف" });
          invalidate();
        },
        onError: () => toast({ title: "تعذّر الحذف", variant: "destructive" }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة التصنيفات</CardTitle>
        <CardDescription>
          نظّم التصنيفات المستخدمة في عوامل تصفية المكتبة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="اسم التصنيف"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            {create.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>

        {isLoading ? (
          <div className="h-24 bg-muted/40 rounded animate-pulse" />
        ) : categories && categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge
                key={c.id}
                variant="secondary"
                className="gap-1.5 py-1.5 px-3"
              >
                <span className="text-muted-foreground text-[10px]">
                  {KIND_LABELS[c.kind] ?? c.kind}
                </span>
                {c.name}
                <button
                  onClick={() => remove(c.id)}
                  className="text-destructive hover:text-destructive/80"
                  aria-label="حذف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            لا توجد تصنيفات بعد.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Admin shell ───────────────────────────────────────────────────── */
export function Admin() {
  const [authed, setAuthed] = useState(() => !!getAdminToken());

  const logout = () => {
    setAdminToken(null);
    setAuthed(false);
  };

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المكتبة</h1>
          <p className="text-muted-foreground mt-2">
            رفع وتنظيم وإدارة المستندات والتصنيفات.
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" />
          خروج
        </Button>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">المستندات</TabsTrigger>
          <TabsTrigger value="categories">التصنيفات</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-6">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
