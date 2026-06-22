const BASE = import.meta.env.BASE_URL;
const ADMIN_TOKEN_KEY = "research_admin_token";

/** Persisted admin session token (HMAC bearer issued by POST /api/admin/login). */
export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore storage failures */
  }
}

/** Bearer header for admin-gated requests; empty object when not signed in. */
export function adminAuthHeader(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Resolve a stored object path / external URL into a browser-loadable URL.
 * Storage paths look like `/objects/<id>` and are served at
 * `/api/storage/objects/<id>` through the shared proxy.
 */
export function resolveStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("/objects/")) return `${BASE}api/storage${path}`;
  if (path.startsWith("/")) return `${BASE.replace(/\/$/, "")}${path}`;
  return path;
}

/**
 * Upload a file to object storage via the presigned-URL flow and return the
 * normalized object path to persist (e.g. as a cover image URL).
 */
export async function uploadPublicFile(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const res = await fetch(`${BASE}api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType }),
  });
  if (!res.ok) throw new Error("فشل في تجهيز رفع الملف");
  const { uploadURL, objectPath } = (await res.json()) as {
    uploadURL: string;
    objectPath: string;
  };
  const put = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) throw new Error("فشل رفع الملف إلى المخزن");
  return objectPath;
}

export interface LibraryDocxMetadata {
  title?: string;
  description?: string;
  documentType?: string;
  coverImageUrl?: string;
  university?: string;
  degreeLevel?: string;
  department?: string;
  category?: string;
  language?: string;
  tags?: string;
  status?: string;
}

/**
 * Upload (or, when `id` is given, replace) a library DOCX with metadata.
 * Uses multipart/form-data against the admin import route.
 */
export async function uploadLibraryDocx(
  file: File,
  metadata: LibraryDocxMetadata,
  id?: number,
): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error("الجلسة غير صالحة، الرجاء تسجيل الدخول من جديد");

  const form = new FormData();
  form.append("file", file);
  if (id != null) form.append("id", String(id));
  for (const [key, value] of Object.entries(metadata)) {
    if (value != null && value !== "") form.append(key, value);
  }

  const res = await fetch(`${BASE}api/admin/library/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "تعذّر رفع الملف");
  }
}

/** Human-readable Arabic labels for the document-type taxonomy. */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  master_template: "قالب رئيسي",
  thesis: "رسالة علمية",
  dissertation: "أطروحة دكتوراه",
  research_paper: "بحث محكم",
  report: "تقرير بحثي",
  article: "مقال علمي",
};

export function documentTypeLabel(value?: string | null): string {
  if (!value) return "";
  return DOCUMENT_TYPE_LABELS[value] ?? value;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  ar: "العربية",
  en: "الإنجليزية",
};

export function languageLabel(value?: string | null): string {
  if (!value) return "";
  return LANGUAGE_LABELS[value] ?? value;
}
