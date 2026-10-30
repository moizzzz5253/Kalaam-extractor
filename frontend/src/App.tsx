import { useCallback, useEffect, useState } from "react";
import { api, DocumentIndex, DocumentSummary } from "./api";
import Viewer from "./Viewer";

interface Opened {
  doc: DocumentSummary;
  index: DocumentIndex;
  reused: boolean;
}

export default function App() {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => api.listDocuments().then(setDocs), []);
  useEffect(() => {
    refresh().catch((e) => setMessage(String(e)));
  }, [refresh]);

  const upload = async (file: File) => {
    setBusy(`Importing ${file.name}…`);
    setMessage(null);
    try {
      const doc = await api.uploadDocument(file);
      setMessage(doc.duplicate ? `"${doc.title}" is already in your library.` : `Imported "${doc.title}".`);
      await refresh();
    } catch (e) {
      setMessage(`Import failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const open = async (doc: DocumentSummary) => {
    setBusy(`Indexing ${doc.title}…`);
    setMessage(null);
    try {
      const { index, reused } = await api.indexDocument(doc.id);
      setOpened({ doc, index, reused });
    } catch (e) {
      setMessage(`Could not open: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  if (opened) {
    return (
      <Viewer
        key={opened.doc.id}
        docId={opened.doc.id}
        title={opened.doc.title}
        index={opened.index}
        onBack={() => {
          setOpened(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="library">
      <header>
        <h1>Kalaam &amp; Stanza Extractor</h1>
        <label className="upload">
          Import PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </header>

      {busy && <p className="status">{busy}</p>}
      {message && <p className="status">{message}</p>}

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Pages</th>
            <th>Size</th>
            <th>Imported</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>{d.page_count.toLocaleString()}</td>
              <td>{(d.file_size / 1024 / 1024).toFixed(1)} MB</td>
              <td>{new Date(d.created_at).toLocaleString()}</td>
              <td>
                <button onClick={() => open(d)} disabled={!!busy}>
                  Open
                </button>
              </td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No documents yet. Import a PDF to begin.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
