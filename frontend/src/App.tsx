import { useCallback, useEffect, useRef, useState } from "react";
import { api, DocumentIndex, DocumentSummary } from "./api";
import Catalogue from "./Catalogue";
import FaultPanel from "./FaultPanel";
import FilesPanel from "./FilesPanel";
import { NoorMark } from "./icons";
import Inspector from "./Inspector";
import PipelineStrip from "./PipelineStrip";
import Styleguide from "./Styleguide";
import { log, setLink, StageId, track, useTelemetry } from "./telemetry";
import Toasts, { Toast } from "./Toasts";
import TopBar from "./TopBar";
import Viewer, { Readout } from "./Viewer";

interface Opened {
  doc: DocumentSummary;
  index: DocumentIndex;
}

const HEALTH_EVERY_MS = 10_000;

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const telemetry = useTelemetry();
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [faultOpen, setFaultOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false); // only matters on narrow windows
  const [readout, setReadout] = useState<Readout | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedStage, setFocusedStage] = useState<StageId | null>(null);
  const toastId = useRef(0);
  const goRef = useRef<((p: number) => void) | null>(null);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // Backend link LED.
  useEffect(() => {
    let stop = false;
    const ping = () =>
      api.health().then(
        () => !stop && setLink("up"),
        () => !stop && setLink("down"),
      );
    ping();
    const t = setInterval(ping, HEALTH_EVERY_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const refresh = useCallback(
    () =>
      track(null, "list_documents", "GET /api/documents", api.listDocuments, (d) => `${d.length} documents`).then(setDocs),
    [],
  );
  useEffect(() => {
    refresh().catch(() => setDocs([]));
  }, [refresh]);

  const upload = async (file: File) => {
    setImporting(file.name);
    try {
      const doc = await track(
        "input",
        "upload_document",
        `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
        () => api.uploadDocument(file),
        (d) => (d.duplicate ? `duplicate of #${d.id}` : `stored as #${d.id} · ${d.page_count} pages`),
      );
      notify(doc.duplicate ? "info" : "ok", doc.duplicate ? `“${doc.title}” is already in the library.` : `Imported “${doc.title}”.`);
      if (!doc.duplicate) setFreshId(doc.id);
      await refresh();
    } catch (e) {
      notify("error", `Import failed: ${(e as Error).message}`);
      setFaultOpen(true);
    } finally {
      setImporting(null);
    }
  };

  const open = async (doc: DocumentSummary) => {
    if (opened?.doc.id === doc.id) return;
    setOpeningId(doc.id);
    try {
      const { index, reused } = await track(
        "index",
        "index_document",
        `#${doc.id} · ${doc.page_count} pages`,
        () => api.indexDocument(doc.id),
        (r) => `${r.reused ? "stored index reused" : "indexed now"} · ${r.index.outline.length} bookmarks · ${r.index.links.length} links`,
      );
      if (index.warnings.length) index.warnings.forEach((w) => log("warn", w));
      setReadout(null);
      setCurrentPage(0);
      setOpened({ doc, index });
      if (!reused) notify("ok", `Indexed “${doc.title}”.`);
    } catch (e) {
      notify("error", `Could not open “${doc.title}”: ${(e as Error).message}`);
      setFaultOpen(true);
    } finally {
      setOpeningId(null);
    }
  };

  const registerGo = useCallback((go: ((p: number) => void) | null) => {
    goRef.current = go;
  }, []);

  if (route === "#styleguide") return <Styleguide />;

  const latestFault = telemetry.faults[0];

  return (
    <div className="app">
      <TopBar
        docTitle={opened?.doc.title ?? null}
        onOpenFaults={() => setFaultOpen((o) => !o && !!latestFault)}
        onToggleInspector={() => setInspectorOpen((o) => !o)}
        inspectorOpen={inspectorOpen}
      />
      <div className="field" aria-hidden="true" />
      <PipelineStrip focused={focusedStage} onInspect={(s) => {
        setFocusedStage((f) => (f === s ? null : s));
        setInspectorOpen(true);
      }} />

      <main className={`grid${inspectorOpen ? " inspector-open" : ""}`}>
        <aside className="col col-left">
          <FilesPanel
            docs={docs}
            activeId={opened?.doc.id ?? null}
            openingId={openingId}
            importing={importing}
            freshId={freshId}
            onImport={upload}
            onOpen={open}
          />
          <Catalogue outline={opened?.index.outline ?? null} currentPage={currentPage} onGo={(p) => goRef.current?.(p)} />
        </aside>

        <section className="col col-center">
          {faultOpen && latestFault && (
            <FaultPanel fault={latestFault} count={telemetry.faults.length} onClose={() => setFaultOpen(false)} />
          )}
          {opened ? (
            <Viewer
              key={opened.doc.id}
              doc={opened.doc}
              index={opened.index}
              active
              onPageChange={setCurrentPage}
              onReadout={setReadout}
              registerGo={registerGo}
            />
          ) : (
            <section className="panel welcome" aria-label="Welcome">
              <h3>
                <span>VIEWER</span>
                <em>no document open</em>
              </h3>
              <div className="welcome-body">
                <div className="star-field" aria-hidden="true" />
                <NoorMark size={56} />
                <h1>Noor Scope</h1>
                <p>
                  {docs && docs.length > 0
                    ? "Choose a document under FILES to open it. Its pages appear here; the signal flow above shows each step as it runs."
                    : "Drop a Kalaam collection PDF into FILES to begin. Each step it goes through lights up in the signal flow above."}
                </p>
              </div>
            </section>
          )}
        </section>

        <aside className="col col-right" aria-label="Inspector">
          <Inspector readout={opened ? readout : null} focusedStage={focusedStage} onClearFocus={() => setFocusedStage(null)} />
        </aside>
      </main>

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
