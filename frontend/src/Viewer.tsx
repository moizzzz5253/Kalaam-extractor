import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { api, DocumentIndex, OutlineItem } from "./api";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_CANVASES = 12; // bounded memory: only this many pages keep a rendered canvas
const DEFAULT_SCALE = 1.25;

interface Props {
  docId: number;
  title: string;
  index: DocumentIndex;
  onBack: () => void;
}

export default function Viewer({ docId, title, index, onBack }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load the document once; pages are fetched lazily below.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url: api.pdfUrl(docId), withCredentials: false });
    task.promise
      .then((d) => !cancelled && setPdf(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [docId]);

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

  const goToPage = (p: number) => {
    const el = pageRefs.current.get(p);
    if (el && scrollRef.current) {
      scrollRef.current.scrollTop = el.offsetTop - 8;
      setCurrentPage(p);
    }
  };

  if (error) return <div className="panel error">Could not open PDF: {error}</div>;
  if (!pdf) return <div className="panel">Loading PDF…</div>;

  return (
    <div className="viewer">
      <aside className="sidebar">
        <button onClick={onBack}>← Library</button>
        <h2 title={title}>{title}</h2>
        <PageNav current={currentPage} total={pdf.numPages} onGo={goToPage} />
        <div className="zoom">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.25))}>+</button>
        </div>
        <h3>Bookmarks ({index.outline.length})</h3>
        <OutlineList items={index.outline} onGo={goToPage} />
        {index.warnings.length > 0 && (
          <div className="warnings">
            {index.warnings.map((w, i) => (
              <p key={i}>⚠ {w}</p>
            ))}
          </div>
        )}
      </aside>

      <div
        className="pages"
        ref={scrollRef}
        onScroll={() => {
          // cheap "current page" estimate from scroll position
          const top = scrollRef.current?.scrollTop ?? 0;
          let best = 0;
          for (const [p, el] of pageRefs.current) {
            if (el.offsetTop <= top + 40 && p >= best) best = p;
          }
          setCurrentPage(best);
        }}
      >
        {Array.from({ length: pdf.numPages }, (_, p) => (
          <LazyPage
            key={p}
            pageIndex={p}
            pdf={pdf}
            scale={scale}
            scrollRoot={scrollRef}
            links={linksByPage.get(p) ?? []}
            onInternalLink={goToPage}
            registerRef={(el) => {
              if (el) pageRefs.current.set(p, el);
              else pageRefs.current.delete(p);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PageNav({ current, total, onGo }: { current: number; total: number; onGo: (p: number) => void }) {
  const [draft, setDraft] = useState(String(current + 1));
  useEffect(() => setDraft(String(current + 1)), [current]);
  return (
    <div className="pagenav">
      <button onClick={() => onGo(Math.max(0, current - 1))}>‹</button>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = parseInt(draft, 10);
            if (Number.isFinite(n) && n >= 1 && n <= total) onGo(n - 1);
          }
        }}
        aria-label="Page number"
      />
      <span>/ {total}</span>
      <button onClick={() => onGo(Math.min(total - 1, current + 1))}>›</button>
    </div>
  );
}

function OutlineList({ items, onGo }: { items: OutlineItem[]; onGo: (p: number) => void }) {
  if (items.length === 0) return <p className="muted">No bookmarks in this PDF.</p>;
  return (
    <ul className="outline">
      {items.map((o, i) => (
        <li key={i} style={{ paddingLeft: (o.level - 1) * 12 }}>
          {o.target_page === null ? (
            <span className="muted">{o.title}</span>
          ) : (
            <button className="link" onClick={() => onGo(o.target_page!)}>
              {o.title} <span className="muted">p.{o.target_page + 1}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

interface LazyPageProps {
  pageIndex: number;
  pdf: PDFDocumentProxy;
  scale: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  links: DocumentIndex["links"];
  onInternalLink: (p: number) => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

/**
 * Renders a page only when it is near the viewport. Off-screen pages keep their
 * placeholder size so scrolling and jump-to-page stay accurate for 5,000+ pages.
 */
function LazyPage({ pageIndex, pdf, scale, scrollRoot, links, onInternalLink, registerRef }: LazyPageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    registerRef(wrapRef.current);
    return () => registerRef(null);
  }, [registerRef]);

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
    if (!visible) return;
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;
    pdf.getPage(pageIndex + 1).then((page: PDFPageProxy) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setSize({ w: viewport.width, h: viewport.height });
      const ctx = canvas.getContext("2d")!;
      renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
      renderTask.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [visible, pdf, pageIndex, scale]);

  const style = size
    ? { width: size.w, height: size.h }
    : { width: 595 * scale, height: 842 * scale }; // placeholder until first render

  return (
    <div className="page" ref={wrapRef} style={style} data-page={pageIndex + 1}>
      {visible && <canvas ref={canvasRef} />}
      {!visible && <div className="placeholder">Page {pageIndex + 1}</div>}
      {/* Internal link hit-areas. Rects are PyMuPDF points (top-left origin, unrotated). */}
      {size &&
        links.map((l, i) => (
          <button
            key={i}
            className="linkhit"
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
}
