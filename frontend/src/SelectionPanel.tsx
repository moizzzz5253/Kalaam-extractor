import { useEffect, useState } from "react";
import type { Rect, Stanza, StanzaPatch } from "./api";
import { IconTrash } from "./icons";

const PT_PER_MM = 72 / 25.4;

interface Props {
  stanzas: Stanza[]; // reading order
  selected: Stanza | null;
  onPatch: (id: number, patch: StanzaPatch) => void;
  onDelete: (id: number) => void;
  onPick: (s: Stanza) => void;
  hasDocument: boolean;
  pageCount: number;
  onUseSize: (rect: Rect) => void;
  onSameBoxOnPage: (s: Stanza, page0: number) => void;
}

/** The selected box (editable, in PDF points) and the list of all stanzas in the document. */
export default function SelectionPanel({ stanzas, selected, onPatch, onDelete, onPick, hasDocument, pageCount, onUseSize, onSameBoxOnPage }: Props) {
  const verified = stanzas.filter((s) => s.verified).length;
  return (
    <>
      <section className="panel" aria-label="Selection">
        <h3>
          <span>SELECTION</span>
          <em>{selected ? `stanza ${selected.number || "…"} · page ${selected.page + 1}` : "nothing selected"}</em>
        </h3>
        {selected ? (
          <>
            <SelectedEditor key={selected.id} s={selected} onPatch={onPatch} onDelete={onDelete} />
            <div className="reuse" aria-label="Reuse this box">
              <span className="dim">reuse box</span>
              <button
                className="btn sm"
                onClick={() => onUseSize(selected.rect)}
                disabled={selected.id < 0}
                title="Stamp boxes of this width and height: click where each similar stanza starts (S)"
              >
                use this size · S
              </button>
              <button
                className="btn sm"
                onClick={() => onSameBoxOnPage(selected, selected.page + 1)}
                disabled={selected.id < 0 || selected.page + 1 >= pageCount}
                title="Create a box with the same coordinates on the next page"
              >
                same box on page {selected.page + 2} →
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state small">
            <p className="empty-title">No stanza selected</p>
            <p>{hasDocument ? "Press B (or DRAW BOX), then drag across a stanza on the page. Click a box to select it." : "Open a document first."}</p>
          </div>
        )}
      </section>

      <section className="panel" aria-label="Stanzas">
        <h3>
          <span>STANZAS</span>
          <em>
            {stanzas.length} total · {verified} verified
          </em>
        </h3>
        {stanzas.length === 0 ? (
          <div className="empty-state small">
            <p>Boxes you draw are listed here in reading order (page, then top to bottom).</p>
          </div>
        ) : (
          <ol className="stanza-list">
            {stanzas.map((s) => (
              <li key={s.id}>
                <button className={`stanza-row${selected?.id === s.id ? " on" : ""}`} onClick={() => onPick(s)}>
                  <span className="sn">{s.number > 0 ? s.number : "…"}</span>
                  <span className="st" dir="auto">
                    {s.title || <span className="dim">untitled</span>}
                  </span>
                  <span className="sp">
                    {s.new_page && <span title="Starts a new Handy Book page">↵ </span>}p {s.page + 1}
                  </span>
                  <span className={`badge ${s.verified ? "ok" : ""}`}>{s.verified ? "✓ verified" : "draft"}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="hint">
          Keys: B draw · S stamp the copied size · F full screen · [ ] previous / next stanza · arrows nudge 1 pt ·
          Shift 10 pt · Alt resize · Ctrl+C copy size · Ctrl+V paste at same position · Delete removes
        </p>
      </section>
    </>
  );
}

function SelectedEditor({ s, onPatch, onDelete }: { s: Stanza; onPatch: Props["onPatch"]; onDelete: Props["onDelete"] }) {
  const [x0, y0, x1, y1] = s.rect;
  const w = x1 - x0;
  const h = y1 - y0;
  const saving = s.id < 0;

  const setRect = (r: Rect) => onPatch(s.id, { rect: r });

  return (
    <div className="sel-editor">
      <div className="sel-row">
        <label className="field">
          <span>number</span>
          <NumberInput value={s.number} min={1} disabled={saving} onCommit={(v) => onPatch(s.id, { number: Math.round(v) })} />
        </label>
        <label className="field grow">
          <span>title</span>
          <TextInput value={s.title} disabled={saving} placeholder="Kalaam or first line" onCommit={(v) => onPatch(s.id, { title: v })} />
        </label>
      </div>

      <div className="sel-grid" title="PDF points, top-left origin. Edit and press Enter.">
        <label className="field">
          <span>x pt</span>
          <NumberInput value={x0} disabled={saving} onCommit={(v) => setRect([v, y0, v + w, y0 + h])} />
        </label>
        <label className="field">
          <span>y pt</span>
          <NumberInput value={y0} disabled={saving} onCommit={(v) => setRect([x0, v, x0 + w, v + h])} />
        </label>
        <label className="field">
          <span>w pt</span>
          <NumberInput value={w} min={4} disabled={saving} onCommit={(v) => setRect([x0, y0, x0 + v, y1])} />
        </label>
        <label className="field">
          <span>h pt</span>
          <NumberInput value={h} min={4} disabled={saving} onCommit={(v) => setRect([x0, y0, x1, y0 + v])} />
        </label>
      </div>
      <p className="sel-meta" title="mm = pt × 25.4 / 72">
        {(w / PT_PER_MM).toFixed(1)} × {(h / PT_PER_MM).toFixed(1)} mm · page {s.page + 1}
        {saving && <span className="busy-text"> · saving…</span>}
      </p>

      <label className="check" title="In the Handy Book, begin a fresh output page before this stanza">
        <input type="checkbox" checked={s.new_page} disabled={saving} onChange={(e) => onPatch(s.id, { new_page: e.target.checked })} />
        <span>Start on a new page in the Handy Book</span>
      </label>

      <div className="sel-actions">
        <label className="check verify">
          <input type="checkbox" checked={s.verified} disabled={saving} onChange={(e) => onPatch(s.id, { verified: e.target.checked })} />
          <span>{s.verified ? "✓ Verified" : "Mark as verified"}</span>
        </label>
        <button className="btn sm danger" onClick={() => onDelete(s.id)} disabled={saving}>
          <IconTrash size={14} /> delete
        </button>
      </div>
    </div>
  );
}

function NumberInput({ value, min, disabled, onCommit }: { value: number; min?: number; disabled?: boolean; onCommit: (v: number) => void }) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const commit = () => {
    const v = parseFloat(draft);
    if (Number.isFinite(v) && (min === undefined || v >= min) && String(v) !== shown) onCommit(v);
    else setDraft(shown);
  };
  return (
    <input
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(shown);
      }}
    />
  );
}

function TextInput({ value, placeholder, disabled, onCommit }: { value: string; placeholder?: string; disabled?: boolean; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      dir="auto"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={500}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft.trim() !== value && onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(value);
      }}
    />
  );
}
