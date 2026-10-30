import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { api, DocumentIndex, DocumentSummary, OutlineItem } from "./api";
import { formatBytes } from "./format";
import {
  IconBookmark,
  IconChevronLeft,
  IconChevronRight,
  IconFitWidth,
  IconMinus,
  IconPlus,
  IconSearch,
  IconStanza,
  IconWarning,
} from "./icons";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const DEFAULT_SCALE = 1.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const TOP_CLEARANCE = 64; // px left above a page we jump to, so the floating toolbar does not cover it
const THUMB_ZOOM = 0.25; // backend minimum; thumbnails are rendered server-side and cached by the browser

type Size = { w: number; h: number };

interface Props {
  doc: DocumentSummary;
  index: DocumentIndex;
  active: boolean; // false while hidden behind another screen: keyboard shortcuts are off
}

export default function Viewer({ doc, index, active }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [baseSize, setBaseSize] = useState<Size | null>(null); // page 1 at scale 1, used for unrendered pages
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const deskRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const currentRef = useRef(0);
  currentRef.current = currentPage;

  // Load the document once; pages are fetched lazily below.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url: api.pdfUrl(doc.id), withCredentials: false });
    task.promise
      .then(async (d) => {
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setBaseSize({ w: vp.width, h: vp.height });
        setPdf(d);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [doc.id]);

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

  // Zooming, or returning from another screen, keeps the current page anchored at the top.
  useLayoutEffect(() => {
    if (active) goToPage(currentRef.current);
  }, [scale, goToPage, active]);

  const zoomBy = (d: number) => setScale((s) => clampScale(Math.round((s + d) * 100) / 100));
  const fitWidth = () => {
    if (!deskRef.current || !baseSize) return;
    const avail = deskRef.current.clientWidth - 2 * 32;
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
    // While hidden (display: none) every offset reads 0, which would jump to the last page.
    if (!active) return;
    // cheap "current page" estimate from scroll position
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
    <div className="viewer">
      <aside className="panel nav-panel" aria-label="Document navigator">
        <div className="panel-section doc-head">
          <p className="eyebrow">Document</p>
          <h2 dir="auto" title={doc.title}>{doc.title}</h2>
          <p className="meta">
            {total.toLocaleString()} pages · {formatBytes(doc.file_size)}
          </p>
        </div>

        <OutlinePanel items={index.outline} current={currentPage} onGo={goToPage} />

        {index.warnings.length > 0 && (
          <div className="panel-section">
            <h3 className="section-label">Notices</h3>
            <ul className="notices">
              {index.warnings.map((w, i) => (
                <li key={i}>
                  <IconWarning size={16} />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="panel-section panel-empty">
          <IconStanza size={22} />
          <p>
            <strong>Stanza selection</strong> arrives in the next milestone. You will draw a box around a stanza
            right on the page.
          </p>
        </div>
      </aside>

      <section className="stage" aria-label="Pages">
        <div className="toolbar" role="toolbar" aria-label="Page and zoom controls">
          <button className="icon-btn" aria-label="Previous page" data-tip="Previous page · ←" onClick={() => goToPage(currentPage - 1)} disabled={!pdf || currentPage === 0}>
            <IconChevronLeft size={18} />
          </button>
          <PageInput current={currentPage} total={total} onGo={goToPage} disabled={!pdf} />
          <button className="icon-btn" aria-label="Next page" data-tip="Next page · →" onClick={() => goToPage(currentPage + 1)} disabled={!pdf || currentPage >= total - 1}>
            <IconChevronRight size={18} />
          </button>
          <span className="toolbar-sep" />
          <button className="icon-btn" aria-label="Zoom out" data-tip="Zoom out · −" onClick={() => zoomBy(-0.25)} disabled={!pdf || scale <= MIN_SCALE}>
            <IconMinus size={18} />
          </button>
          <span className="zoom-readout">{Math.round(scale * 100)}%</span>
          <button className="icon-btn" aria-label="Zoom in" data-tip="Zoom in · +" onClick={() => zoomBy(0.25)} disabled={!pdf || scale >= MAX_SCALE}>
            <IconPlus size={18} />
          </button>
          <button className="icon-btn" aria-label="Fit to width" data-tip="Fit to width" onClick={fitWidth} disabled={!pdf}>
            <IconFitWidth size={18} />
          </button>
        </div>

        <div className="desk" ref={deskRef} onScroll={onScroll}>
          {error ? (
            <div className="desk-message">
              <IconWarning size={22} />
              <h2>This PDF could not be opened</h2>
              <p>{error}</p>
            </div>
          ) : !pdf || !baseSize ? (
            <div className="page page-skeleton" style={{ width: 595 * scale, height: 842 * scale }} aria-busy="true">
              <div className="page-skeleton-label">
                <span className="spinner-sm" aria-hidden="true" />
                Opening document · {formatBytes(doc.file_size)}
              </div>
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
    </div>
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

function OutlinePanel({ items, current, onGo }: { items: OutlineItem[]; current: number; onGo: (p: number) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((o) => o.title.toLowerCase().includes(q)) : items;
  // The bookmark whose start page is the latest one at or before the current page.
  const activeIdx = useMemo(() => {
    let best = -1;
    items.forEach((o, i) => {
      if (o.target_page !== null && o.target_page <= current && (best < 0 || o.target_page >= items[best].target_page!)) best = i;
    });
    return best;
  }, [items, current]);

  return (
    <div className="panel-section outline-section">
      <h3 className="section-label">
        Bookmarks <span className="count">{items.length}</span>
      </h3>
      {items.length > 8 && (
        <label className="search-field">
          <IconSearch size={16} />
          <span className="sr-only">Filter bookmarks</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter bookmarks" />
        </label>
      )}
      {items.length === 0 ? (
        <p className="muted small">This PDF has no bookmarks. Use the page links or the filmstrip below to move around.</p>
      ) : shown.length === 0 ? (
        <p className="muted small">No bookmark matches “{query}”.</p>
      ) : (
        <ul className="outline">
          {shown.map((o) => {
            const i = items.indexOf(o);
            const isActive = i === activeIdx;
            return (
              <li key={i} style={{ paddingLeft: (o.level - 1) * 14 }}>
                {o.target_page === null ? (
                  <span className="outline-item is-dead" dir="auto">{o.title}</span>
                ) : (
                  <button className={`outline-item${isActive ? " is-active" : ""}`} onClick={() => onGo(o.target_page!)}>
                    <IconBookmark size={14} />
                    <span className="outline-title" dir="auto">{o.title}</span>
                    <span className="outline-page">{o.target_page + 1}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
  // Keep the active thumbnail in view without scrolling the page itself.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-thumb="${current}"]`);
    if (!strip || !el) return;
    const left = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [current]);

  return (
    <div className="filmstrip" ref={stripRef} aria-label="Page thumbnails">
      {Array.from({ length: total }, (_, p) => (
        <button
          key={p}
          data-thumb={p}
          className={`thumb${p === current ? " is-active" : ""}`}
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
      renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
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
    <div
      className={`page${rendered ? " is-rendered" : ""}`}
      ref={wrapRef}
      style={style}
      data-page={pageIndex + 1}
      aria-label={`Page ${pageIndex + 1}`}
    >
      {visible && <canvas ref={canvasRef} style={style} />}
      {!rendered && <div className="page-number-ghost">{pageIndex + 1}</div>}
      {/* Internal link hit-areas. Rects are PyMuPDF points (top-left origin, unrotated). */}
      {natural &&
        links.map((l, i) => (
          <button
            key={i}
            className="linkhit"
            aria-label={`Go to page ${(l.target_page ?? 0) + 1}`}
            title={`Go to page ${(l.target_page ?? 0) + 1}`}
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
