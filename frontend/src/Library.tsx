import { useState } from "react";
import { DocumentSummary } from "./api";
import { formatBytes, formatDate } from "./format";
import { IconChevronRight, IconUpload } from "./icons";

interface Props {
  docs: DocumentSummary[] | null; // null while the first load is in flight
  openingId: number | null;
  importing: string | null;
  onImport: (file: File) => void;
  onOpen: (doc: DocumentSummary) => void;
}

export default function Library({ docs, openingId, importing, onImport, onOpen }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const busy = openingId !== null || importing !== null;

  return (
    <div
      className={`library${dragOver ? " is-dragover" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !busy) onImport(f);
      }}
    >
      <header className="page-head">
        <div>
          <p className="eyebrow">Source manuscripts</p>
          <h1>Library</h1>
        </div>
        <ImportButton onImport={onImport} disabled={busy} />
      </header>

      {importing && (
        <div className="progress-card" role="status">
          <div className="progress-line is-indeterminate" />
          <span>Importing {importing}…</span>
        </div>
      )}

      {docs === null ? (
        <SkeletonTable />
      ) : docs.length === 0 ? (
        <EmptyLibrary onImport={onImport} disabled={busy} />
      ) : (
        <div className="card table-card">
          <table className="doc-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col" className="num">Pages</th>
                <th scope="col" className="num">Size</th>
                <th scope="col" className="col-date">Imported</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const opening = openingId === d.id;
                return (
                  <tr
                    key={d.id}
                    className={opening ? "is-opening" : undefined}
                    onDoubleClick={() => !busy && onOpen(d)}
                  >
                    <td className="doc-title">
                      <span dir="auto">{d.title}</span>
                      <span className="doc-file" dir="auto">{d.original_filename}</span>
                      {opening && <div className="progress-line is-indeterminate row-progress" />}
                    </td>
                    <td className="num">{d.page_count.toLocaleString()}</td>
                    <td className="num">{formatBytes(d.file_size)}</td>
                    <td className="meta col-date">{formatDate(d.created_at)}</td>
                    <td className="actions">
                      <button className="btn btn-quiet" onClick={() => onOpen(d)} disabled={busy}>
                        {opening ? "Reading links…" : "Open"}
                        {!opening && <IconChevronRight size={16} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {docs && docs.length > 0 && (
        <p className="hint">Tip: drop a PDF anywhere on this page to import it. Double-click a row to open.</p>
      )}

      {dragOver && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <IconUpload size={28} />
            <p>Drop PDF to import</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportButton({ onImport, disabled, large }: { onImport: (f: File) => void; disabled: boolean; large?: boolean }) {
  return (
    <label className={`btn btn-primary${large ? " btn-lg" : ""}${disabled ? " is-disabled" : ""}`}>
      <IconUpload size={18} />
      Import PDF
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function EmptyLibrary({ onImport, disabled }: { onImport: (f: File) => void; disabled: boolean }) {
  return (
    <div className="empty">
      <OpenBookArt />
      <h2>Begin with a manuscript</h2>
      <p>Import a Kalaam collection PDF. The original file is kept untouched; everything you select is stored alongside it.</p>
      <ImportButton onImport={onImport} disabled={disabled} large />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="card table-card" aria-busy="true" aria-label="Loading documents">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-row">
          <span className="skeleton" style={{ width: "38%" }} />
          <span className="skeleton" style={{ width: "8%" }} />
          <span className="skeleton" style={{ width: "10%" }} />
          <span className="skeleton" style={{ width: "18%" }} />
        </div>
      ))}
    </div>
  );
}

function OpenBookArt() {
  return (
    <svg className="empty-art" width="120" height="84" viewBox="0 0 120 84" fill="none" aria-hidden="true">
      <path d="M60 18C48 10 30 7 12 8v62c18-1 36 2 48 10 12-8 30-11 48-10V8C90 7 72 10 60 18z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M60 18v62" stroke="currentColor" strokeWidth="1.25" />
      <path d="M22 24c10 0 20 2 28 6M22 34c10 0 20 2 28 6M22 44c10 0 20 2 28 6M70 30c8-4 18-6 28-6M70 40c8-4 18-6 28-6M70 50c8-4 18-6 28-6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}
