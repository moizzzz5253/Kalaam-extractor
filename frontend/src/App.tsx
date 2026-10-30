import { useCallback, useEffect, useRef, useState } from "react";
import { api, DocumentIndex, DocumentSummary } from "./api";
import Library from "./Library";
import Shell, { Screen, Theme } from "./Shell";
import Toasts, { Toast } from "./Toasts";
import Viewer from "./Viewer";

interface Opened {
  doc: DocumentSummary;
  index: DocumentIndex;
  reused: boolean;
}

const THEME_KEY = "kx-theme";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [screen, setScreen] = useState<Screen>("library");
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refresh = useCallback(() => api.listDocuments().then(setDocs), []);
  useEffect(() => {
    refresh().catch((e) => {
      setDocs([]);
      notify("error", `Could not reach the backend. Is it running? (${(e as Error).message})`);
    });
  }, [refresh, notify]);

  const upload = async (file: File) => {
    setImporting(file.name);
    try {
      const doc = await api.uploadDocument(file);
      notify(
        doc.duplicate ? "info" : "success",
        doc.duplicate ? `“${doc.title}” is already in your library.` : `Imported “${doc.title}”.`,
      );
      await refresh();
    } catch (e) {
      notify("error", `Import failed: ${(e as Error).message}`);
    } finally {
      setImporting(null);
    }
  };

  const open = async (doc: DocumentSummary) => {
    if (opened?.doc.id === doc.id) {
      setScreen("viewer");
      return;
    }
    setOpeningId(doc.id);
    try {
      const { index, reused } = await api.indexDocument(doc.id);
      setOpened({ doc, index, reused });
      setScreen("viewer");
    } catch (e) {
      notify("error", `Could not open “${doc.title}”: ${(e as Error).message}`);
    } finally {
      setOpeningId(null);
    }
  };

  const crumbs = screen === "viewer" && opened ? ["Library", opened.doc.title] : ["Library"];

  return (
    <Shell
      screen={screen}
      canOpenViewer={!!opened}
      onNavigate={(s) => {
        setScreen(s);
        if (s === "library") refresh().catch(() => {});
      }}
      crumbs={crumbs}
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      status={
        screen === "viewer" && opened ? (
          <span className="chip chip-teal" title={opened.reused ? "Stored index reused" : "Indexed just now"}>
            Indexed · {opened.index.outline.length} bookmarks · {opened.index.links.length} links
          </span>
        ) : null
      }
    >
      {screen === "library" && (
        <Library docs={docs} openingId={openingId} importing={importing} onImport={upload} onOpen={open} />
      )}
      {/* Keep the viewer mounted while browsing the library so large PDFs are not reloaded. */}
      {opened && (
        <div className="screen-host" hidden={screen !== "viewer"}>
          <Viewer key={opened.doc.id} doc={opened.doc} index={opened.index} active={screen === "viewer"} />
        </div>
      )}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </Shell>
  );
}
