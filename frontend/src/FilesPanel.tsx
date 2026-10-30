import { useState } from "react";
import { DocumentSummary } from "./api";
import { formatBytes } from "./format";

interface Props {
  docs: DocumentSummary[] | null; // null while the first load is in flight
  activeId: number | null;
  openingId: number | null;
  importing: string | null;
  freshId: number | null; // just-imported document, gets the slide-in once
  onImport: (file: File) => void;
  onOpen: (doc: DocumentSummary) => void;
}

export default function FilesPanel({ docs, activeId, openingId, importing, freshId, onImport, onOpen }: Props) {
  const [over, setOver] = useState(false);
  const busy = importing !== null || openingId !== null;

  return (
    <section className="panel files-panel" aria-label="Files">
      <h3>
        <span>FILES</span>
        <em>{docs ? `${docs.length} document${docs.length === 1 ? "" : "s"}` : "loading"}</em>
      </h3>

      <label
        className={`drop${over ? " over" : ""}${importing ? " busy" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f && !busy) onImport(f);
        }}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
        <b>{importing ? "IMPORTING" : "DROP PDF HERE"}</b>
        <span dir="auto">{importing ?? "or click to choose · original is never modified"}</span>
        <div className="rx" aria-hidden="true" />
      </label>

      {docs === null ? (
        <ul className="file-list" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="skeleton-row">
              <span className="skeleton" style={{ width: "70%" }} />
              <span className="skeleton" style={{ width: "40%" }} />
            </li>
          ))}
        </ul>
      ) : docs.length === 0 ? (
        <div className="empty-state small">
          <p className="empty-title">Begin with a manuscript</p>
          <p>Drop a Kalaam collection PDF above. It is indexed once; its pages are never changed.</p>
        </div>
      ) : (
        <ul className="file-list">
          {docs.map((d) => {
            const on = d.id === activeId;
            const opening = d.id === openingId;
            return (
              <li key={d.id} className={`${on ? "on" : ""}${d.id === freshId ? " fresh" : ""}`}>
                <button className="file-row" onClick={() => onOpen(d)} disabled={busy && !on} aria-current={on || undefined}>
                  <span className="kind k-pdf">PDF</span>
                  <span className="fname" dir="auto" title={d.title}>
                    {d.title}
                  </span>
                  <span className="fmeta">
                    {opening ? (
                      <span className="busy-text">indexing…</span>
                    ) : (
                      <>
                        {d.page_count.toLocaleString()} pp · {formatBytes(d.file_size)}
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
