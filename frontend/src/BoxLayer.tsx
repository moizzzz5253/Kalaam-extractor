import { memo, useEffect, useRef, useState } from "react";
import type { Rect, Stanza } from "./api";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_PT = 4; // same floor as the backend

type Drag =
  | { kind: "draw"; start: [number, number] }
  | { kind: "move"; id: number; start: [number, number]; orig: Rect }
  | { kind: "resize"; id: number; handle: Handle; orig: Rect };

interface Props {
  page0: number;
  size: { w: number; h: number }; // page size in PDF points
  scale: number; // CSS px per point
  stanzas: Stanza[]; // boxes on this page only
  selectedId: number | null;
  drawMode: boolean;
  stampSize: { w: number; h: number } | null; // stamp mode: click places a box of this size
  onSelect: (id: number) => void;
  onCreate: (page0: number, rect: Rect) => void;
  onChange: (id: number, rect: Rect) => void;
}

/**
 * Stanza boxes over one rendered page. The canvas underneath is never re-rendered by anything here.
 * The layer only catches the pointer while drawing; otherwise only the boxes do, so scrolling and
 * the page's own links keep working.
 */
export default memo(function BoxLayer({ page0, size, scale, stanzas, selectedId, drawMode, stampSize, onSelect, onCreate, onChange }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<Rect | null>(null);
  const [ghost, setGhost] = useState<Rect | null>(null); // stamp preview under the pointer
  const ghostFrame = useRef(0);

  // Top-left corner at the pointer, kept inside the page.
  const stampAt = (x: number, y: number): Rect => moveWithin([0, 0, stampSize!.w, stampSize!.h], x, y, size);
  const dragRef = useRef<Drag | null>(null);
  const liveRef = useRef<Rect | null>(null);

  const toPt = (clientX: number, clientY: number): [number, number] => {
    const r = layerRef.current!.getBoundingClientRect();
    return [clamp((clientX - r.left) / scale, 0, size.w), clamp((clientY - r.top) / scale, 0, size.h)];
  };

  const begin = (d: Drag, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = d;
    setDrag(d);
    const first = d.kind === "draw" ? ([...d.start, ...d.start] as Rect) : d.orig;
    liveRef.current = first;
    setLive(first);
  };

  // Track the pointer on window during a drag, one update per animation frame.
  useEffect(() => {
    if (!drag) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const compute = () => {
      frame = 0;
      const d = dragRef.current;
      if (!d || !last) return;
      const [x, y] = toPt(last.clientX, last.clientY);
      let next: Rect;
      if (d.kind === "draw") next = norm([d.start[0], d.start[1], x, y]);
      else if (d.kind === "move") next = moveWithin(d.orig, x - d.start[0], y - d.start[1], size);
      else next = resize(d.orig, d.handle, x, y);
      liveRef.current = next;
      setLive(next);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(compute);
    };
    const onUp = () => {
      if (frame) cancelAnimationFrame(frame);
      const d = dragRef.current;
      const r = liveRef.current;
      dragRef.current = null;
      liveRef.current = null;
      setDrag(null);
      setLive(null);
      if (!d || !r) return;
      const big = r[2] - r[0] >= MIN_PT && r[3] - r[1] >= MIN_PT;
      if (d.kind === "draw") {
        if (big) onCreate(page0, round(r));
      } else if (big && !same(r, d.orig)) {
        onChange(d.id, round(r));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return; // cancel the drag, keep the old box
      dragRef.current = null;
      setDrag(null);
      setLive(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, scale, size.w, size.h]);

  const px = (r: Rect) => ({
    left: r[0] * scale,
    top: r[1] * scale,
    width: (r[2] - r[0]) * scale,
    height: (r[3] - r[1]) * scale,
  });

  return (
    <div
      ref={layerRef}
      className={`box-layer${drawMode || stampSize || drag ? " is-capturing" : ""}${drawMode || stampSize ? " is-drawing" : ""}`}
      aria-label={`Stanza boxes on page ${page0 + 1}`}
      onPointerDown={(e) => {
        if (e.button !== 0 || e.target !== layerRef.current) return;
        if (stampSize) {
          e.preventDefault();
          const [x, y] = toPt(e.clientX, e.clientY);
          onCreate(page0, round(stampAt(x, y)));
          setGhost(null);
        } else if (drawMode) {
          begin({ kind: "draw", start: toPt(e.clientX, e.clientY) }, e);
        }
      }}
      onPointerMove={(e) => {
        if (!stampSize || drag) return;
        const { clientX, clientY } = e;
        if (ghostFrame.current) return;
        ghostFrame.current = requestAnimationFrame(() => {
          ghostFrame.current = 0;
          if (!layerRef.current) return;
          const [x, y] = toPt(clientX, clientY);
          setGhost(stampAt(x, y));
        });
      }}
      onPointerLeave={() => setGhost(null)}
    >
      {stanzas.map((s) => {
        const dragging = drag && drag.kind !== "draw" && drag.id === s.id;
        const r = dragging && live ? live : s.rect;
        const selected = s.id === selectedId;
        return (
          <div
            key={s.id}
            className={`bbox${selected ? " is-selected" : ""}${s.verified ? " is-verified" : ""}${s.id < 0 ? " is-saving" : ""}`}
            style={px(r)}
            role="button"
            tabIndex={-1}
            aria-label={`Stanza ${s.number || "new"}${s.title ? `, ${s.title}` : ""}, ${s.verified ? "verified" : "not verified"}`}
            aria-pressed={selected}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              onSelect(s.id);
              begin({ kind: "move", id: s.id, start: toPt(e.clientX, e.clientY), orig: s.rect }, e);
            }}
          >
            <span className="bbox-pill">{s.number > 0 ? s.number : "…"}</span>
            {s.verified && <span className="bbox-mark" aria-hidden="true">✓</span>}
            {selected &&
              HANDLES.map((h) => (
                <i
                  key={h}
                  className={`bbox-h h-${h}`}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    begin({ kind: "resize", id: s.id, handle: h, orig: s.rect }, e);
                  }}
                />
              ))}
            {dragging && live && <Readout r={live} />}
          </div>
        );
      })}
      {drag?.kind === "draw" && live && (
        <div className="bbox is-drawing-box" style={px(live)}>
          <Readout r={live} />
        </div>
      )}
      {stampSize && ghost && !drag && (
        <div className="bbox is-drawing-box is-ghost" style={px(ghost)}>
          <span className="bbox-readout">click to place · {fmt(stampSize.w)} × {fmt(stampSize.h)} pt</span>
        </div>
      )}
    </div>
  );
});

function Readout({ r }: { r: Rect }) {
  return (
    <span className="bbox-readout">
      {fmt(r[2] - r[0])} × {fmt(r[3] - r[1])} pt · x {fmt(r[0])} y {fmt(r[1])}
    </span>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function norm(r: Rect): Rect {
  return [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])];
}

function round(r: Rect): Rect {
  return r.map((v) => Math.round(v * 10) / 10) as Rect;
}

function same(a: Rect, b: Rect) {
  return a.every((v, i) => Math.abs(v - b[i]) < 0.05);
}

function fmt(v: number) {
  return v.toFixed(1);
}

/** Move a box by (dx, dy) without letting it leave the page. */
export function moveWithin(r: Rect, dx: number, dy: number, size: { w: number; h: number }): Rect {
  const w = r[2] - r[0];
  const h = r[3] - r[1];
  const x0 = clamp(r[0] + dx, 0, size.w - w);
  const y0 = clamp(r[1] + dy, 0, size.h - h);
  return [x0, y0, x0 + w, y0 + h];
}

function resize(r: Rect, h: Handle, x: number, y: number): Rect {
  let [x0, y0, x1, y1] = r;
  if (h.includes("w")) x0 = x;
  if (h.includes("e")) x1 = x;
  if (h.includes("n")) y0 = y;
  if (h.includes("s")) y1 = y;
  return norm([x0, y0, x1, y1]);
}
