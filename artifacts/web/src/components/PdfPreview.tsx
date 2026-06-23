import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2, AlertCircle } from "lucide-react";

GlobalWorkerOptions.workerSrc = workerUrl;

type Props = {
  /** URL of the PDF to render. */
  src: string;
  /** Bump this to force a fresh fetch + re-render. */
  reloadKey?: number;
  className?: string;
};

/**
 * Renders a PDF into stacked A4 canvases using PDF.js. This avoids the native
 * browser PDF viewer (which Chrome blocks inside the proxied workspace iframe).
 * The PDF bytes are fetched directly, so it works regardless of how the host
 * frames the app.
 */
export function PdfPreview({ src, reloadKey = 0, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    const container = containerRef.current;

    async function render() {
      if (!container) return;
      setStatus("loading");
      container.innerHTML = "";

      try {
        const res = await fetch(src, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        loadingTask = getDocument({ data });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPageCount(doc.numPages);

        // Render width tracks the container so pages fill the pane crisply.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const available = container.clientWidth || 800;
        const targetWidth = Math.min(available, 900);

        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = targetWidth / base.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className =
            "mx-auto mb-4 bg-white shadow-md rounded-sm";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          container.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
        }

        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("PDF preview failed", err);
          setStatus("error");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, reloadKey]);

  return (
    <div className={className}>
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">جارٍ تجهيز المعاينة…</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
          <AlertCircle className="w-6 h-6" />
          <span className="text-sm">تعذّر تحميل المعاينة. حاول التحديث.</span>
        </div>
      )}
      <div
        ref={containerRef}
        dir="ltr"
        className={status === "ready" ? "" : "hidden"}
      />
      {status === "ready" && pageCount > 0 && (
        <p className="text-center text-xs text-muted-foreground pt-1 pb-3">
          {pageCount} صفحة
        </p>
      )}
    </div>
  );
}
