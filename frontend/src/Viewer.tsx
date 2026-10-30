import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { api, DocumentIndex, DocumentSummary } from "./api";
import { formatBytes } from "./format";
import { IconChevronLeft, IconChevronRight, IconFitWidth, IconMinus, IconPlus } from "./icons";
import { track } from "./telemetry";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const DEFAULT_SCALE = 1.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const TOP_CLEARANCE = 16; // px left above a page we jump to
const THUMB_ZOOM = 0.25; // backend minimum; thumbnails are rendered server-side and cached by the browser

type Size = { w: number; h: number };

/** Technical values for the inspector, all in PDF points unless named otherwise. */
export interface Readout {
  page0: number;
  total: number;
  scale: number;
  dpr: number;
  view: [number, number, number, number]; // page.view: the crop box PDF.js renders
  rotate: number;
}

interface Props {
  doc: DocumentSummary;
  index: DocumentIndex;
  active: boolean; // false while hidden: keyboard shortcuts and scroll tracking are off
  onPageChange: (page0: number) => void;
  onReadout: (r: Readout) => void;
  registerGo: (go: ((page0: number) => void) | null) => void;
}

export default function Viewer({ doc, index, active, onPageChange, onReadout, registerGo }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [baseSize, setBaseSize] = useState<Size | null>(null); // page 1 at scale 1, for unrendered pages
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const deskRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const currentRef = useRef(0);
  currentRef.current = currentPage;

  // Load the document once (timed as an INDEX step); pages are fetched lazily below.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url: api.pdfUrl(doc.id), withCredentials: false });
    track(
      "index",
      "pdfjs_open",
      `${formatBytes(doc.file_size)} via PDF.js`,
      async () => {
        const d = await task.promise;
        const first = await d.getPage(1);
        return { d, vp: first.getViewport({ scale: 1 }) };
      },
      ({ d, vp }) => `${d.numPages} pages · page 1 ${Math.round(vp.width)} × ${Math.round(vp.height)} pt`,
      () => cancelled,
    )
      .then(({ d, vp }) => {
        if (cancelled) return;
        setBaseSize({ w: vp.width, h: vp.height });
        setPdf(d);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [doc.id, doc.file_size]);

  const linksByPage = useMemo(() => {
    const m = new Map<number, DocumentIndex["links"]>();
    for (const l of index.links) {
      if (l.kind !== "internal" || l.target_page === null) continue;
      const arr = m.get(l.page) ?? [];
      arr.push(l);
      m.set(l.page, arr);
    }
    return m;
  }, [index]);

  const total = pdf?.numPages ?? doc.page_count;

  const goToPage = useCallback(
    (p: number) => {
      const target = Math.min(Math.max(0, p), total - 1);
      const el = pageRefs.current.get(target);
      if (el && deskRef.current) {
        deskRef.current.scrollTop = el.offsetTop - TOP_CLEARANCE;
        setCurrentPage(target);
      }
    },
    [total],
  );

  useEffect(() => {
    registerGo(goToPage);
    return () => registerGo(null);
  }, [goToPage, registerGo]);

  useEffect(() => onPageChange(currentPage), [currentPage, onPageChange]);

  // Technical readout for the current page.
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    pdf.getPage(currentPage + 1).then((p) => {
      if (cancelled) return;
      onReadout({
        page0: currentPage,
        total: pdf.numPages,
        scale,
        dpr: window.devicePixelRatio || 1,
        view: p.view as [number, number, number, number],
        rotate: p.rotate,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, currentPage, scale, onReadout]);

  // Zooming, or returning from another screen, keeps the current page anchored at the top.
  useLayoutEffect(() => {
    if (active) goToPage(currentRef.current);
  }, [scale, goToPage, active]);

  const zoomBy = (d: number) => setScale((s) => clampScale(Math.round((s + d) * 100) / 100));
  const fitWidth = () => {
    if (!deskRef.current || !baseSize) return;
    const avail = deskRef.current.clientWidth - 2 * 24;
    setScale(clampScale(Math.floor((avail / baseSize.w) * 100) / 100));
  };

  // Keyboard: ←/→ page, +/− zoom, Home/End. Ignored while typing in a field.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight") goToPage(currentRef.current + 1);
      else if (e.key === "ArrowLeft") goToPage(currentRef.current - 1);
      else if (e.key === "Home") goToPage(0);
      else if (e.key === "End") goToPage(total - 1);
      else if (e.key === "+" || e.key === "=") zoomBy(0.25);
      else if (e.key === "-") zoomBy(-0.25);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goToPage, total]);

  const onScroll = () => {
    // While hidden every offset reads 0, which would jump to the last page.
    if (!active) return;
    const top = deskRef.current?.scrollTop ?? 0;
    let best = 0;
    for (const [p, el] of pageRefs.current) {
      if (el.offsetTop <= top + TOP_CLEARANCE + 16 && p >= best) best = p;
    }
    if (best !== currentRef.current) setCurrentPage(best);
  };

  const registerRef = useCallback((p: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(p, el);
    else pageRefs.current.delete(p);
  }, []);

  return (
    <section className="panel viewer-panel" aria-label="Viewer">
      <h3>
        <span>VIEWER</span>
        <em dir="auto">{doc.title}</em>
      </h3>

      <div className="toolbar" role="toolbar" aria-label="Page and zoom controls">
        <button className="tbtn" aria-label="Previous page" data-tip="Previous page · ←" onClick={() => goToPage(currentPage - 1)} disabled={!pdf || currentPage === 0}>
          <IconChevronLeft />
        </button>
        <PageInput current={currentPage} total={total} onGo={goToPage} disabled={!pdf} />
        <button className="tbtn" aria-label="Next page" data-tip="Next page · →" onClick={() => goToPage(currentPage + 1)} disabled={!pdf || currentPage >= total - 1}>
          <IconChevronRight />
        </button>
        <span className="tsep" />
        <button className="tbtn" aria-label="Zoom out" data-tip="Zoom out · −" onClick={() => zoomBy(-0.25)} disabled={!pdf || scale <= MIN_SCALE}>
          <IconMinus />
        </button>
        <span className="zoom-readout" title="Zoom: CSS pixels per PDF point">
          {Math.round(scale * 100)}%
        </span>
        <button className="tbtn" aria-label="Zoom in" data-tip="Zoom in · +" onClick={() => zoomBy(0.25)} disabled={!pdf || scale >= MAX_SCALE}>
          <IconPlus />
        </button>
        <button className="tbtn" aria-label="Fit to width" data-tip="Fit to width" onClick={fitWidth} disabled={!pdf}>
          <IconFitWidth />
        </button>
      </div>

      <div className="desk" ref={deskRef} onScroll={onScroll} aria-label={`Pages of ${doc.title}`}>
        {error ? (
          <div className="desk-message">
            <b>PDF COULD NOT BE OPENED</b>
            <p>{error}</p>
            <p className="dim">The fault report has the details (FAULTS in the top bar).</p>
          </div>
        ) : !pdf || !baseSize ? (
          <div className="page page-skeleton" style={{ width: 595 * scale, height: 842 * scale }} aria-busy="true">
            <span className="skeleton-label">opening · {formatBytes(doc.file_size)} · PDF.js</span>
            <div className="scanline" aria-hidden="true" />
          </div>
        ) : (
          Array.from({ length: pdf.numPages }, (_, p) => (
            <LazyPage
              key={p}
              pageIndex={p}
              pdf={pdf}
              scale={scale}
              fallback={baseSize}
              scrollRoot={deskRef}
              links={linksByPage.get(p) ?? []}
              onInternalLink={goToPage}
              registerRef={registerRef}
            />
          ))
        )}
      </div>

      <Filmstrip docId={doc.id} total={total} current={currentPage} onGo={goToPage} disabled={!pdf} />
    </section>
  );
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function PageInput({ current, total, onGo, disabled }: { current: number; total: number; onGo: (p: number) => void; disabled: boolean }) {
  const [draft, setDraft] = useState(String(current + 1));
  useEffect(() => setDraft(String(current + 1)), [current]);
  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 1 && n <= total) onGo(n - 1);
    else setDraft(String(current + 1));
  };
  return (
    <label className="page-input">
      <span className="sr-only">Page number</span>
      <input
        value={draft}
        inputMode="numeric"
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setDraft(String(current + 1));
        }}
      />
      <span className="page-total">/ {total.toLocaleString()}</span>
    </label>
  );
}

const Filmstrip = memo(function Filmstrip({
  docId,
  total,
  current,
  onGo,
  disabled,
}: {
  docId: number;
  total: number;
  current: number;
  onGo: (p: number) => void;
  disabled: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  // Keep the active thumbnail in view without scrolling anything else.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-thumb="${current}"]`);
    if (!strip || !el) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [current]);

  return (
    <div className="filmstrip" ref={stripRef} aria-label="Page thumbnails">
      {Array.from({ length: total }, (_, p) => (
        <button
          key={p}
          data-thumb={p}
          className={`thumb${p === current ? " on" : ""}`}
          onClick={() => onGo(p)}
          disabled={disabled}
          aria-label={`Page ${p + 1}`}
          aria-current={p === current ? "page" : undefined}
        >
          <img src={api.pageImageUrl(docId, p, THUMB_ZOOM)} alt="" loading="lazy" decoding="async" />
          <span>{p + 1}</span>
        </button>
      ))}
    </div>
  );
});

interface LazyPageProps {
  pageIndex: number;
  pdf: PDFDocumentProxy;
  scale: number;
  fallback: Size;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  links: DocumentIndex["links"];
  onInternalLink: (p: number) => void;
  registerRef: (p: number, el: HTMLDivElement | null) => void;
}

/**
 * Renders a page only when it is near the viewport. Off-screen pages keep a placeholder
 * of the right size so scrolling and jump-to-page stay accurate for 5,000+ pages.
 * Sizes are tracked at scale 1, so zooming resizes every page in the same frame.
 */
const LazyPage = memo(function LazyPage({
  pageIndex,
  pdf,
  scale,
  fallback,
  scrollRoot,
  links,
  onInternalLink,
  registerRef,
}: LazyPageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [natural, setNatural] = useState<Size | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    registerRef(pageIndex, wrapRef.current);
    return () => registerRef(pageIndex, null);
  }, [pageIndex, registerRef]);

  // Observe proximity to the viewport (one screen above and below).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { root: scrollRoot.current, rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scrollRoot]);

  // Render when visible; drop the canvas when far away to bound memory.
  useEffect(() => {
    if (!visible) {
      setRendered(false);
      return;
    }
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;
    pdf.getPage(pageIndex + 1).then((page: PDFPageProxy) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      setNatural({ w: base.width, h: base.height });
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      const ctx = canvas.getContext("2d")!;
      renderTask = page.render({ canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] });
      renderTask.promise.then(() => !cancelled && setRendered(true)).catch(() => {});
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [visible, pdf, pageIndex, scale]);

  const size = natural ?? fallback;
  const style = { width: size.w * scale, height: size.h * scale };

  return (
    <div className={`page${rendered ? " is-rendered" : ""}`} ref={wrapRef} style={style} aria-label={`Page ${pageIndex + 1}`}>
      {visible && <canvas ref={canvasRef} style={style} />}
      {!rendered && <div className="page-ghost">{pageIndex + 1}</div>}
      {/* Internal link hit-areas. Rects are PyMuPDF points (top-left origin, unrotated). */}
      {natural &&
        links.map((l, i) => (
          <button
            key={i}
            className="linkhit"
            aria-label={`Go to page ${(l.target_page ?? 0) + 1}`}
            title={`→ page ${(l.target_page ?? 0) + 1}`}
            style={{
              left: l.rect[0] * scale,
              top: l.rect[1] * scale,
              width: (l.rect[2] - l.rect[0]) * scale,
              height: (l.rect[3] - l.rect[1]) * scale,
            }}
            onClick={() => onInternalLink(l.target_page!)}
          />
        ))}
    </div>
  );
});
