import { useCallback, useEffect, useRef, useState } from "react";
import { api, DocumentIndex, DocumentSummary, Rect, Stanza } from "./api";
import Catalogue from "./Catalogue";
import FaultPanel from "./FaultPanel";
import FilesPanel from "./FilesPanel";
import { NoorMark } from "./icons";
import Inspector from "./Inspector";
import PipelineStrip from "./PipelineStrip";
import SelectionPanel from "./SelectionPanel";
import { useStanzas } from "./stanzas";
import Styleguide from "./Styleguide";
import { log, setLink, StageId, track, useTelemetry } from "./telemetry";
import Toasts, { Toast } from "./Toasts";
import TopBar from "./TopBar";
import Viewer, { Readout, ViewerNav } from "./Viewer";

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
  const [drawMode, setDrawMode] = useState(false);
  const [focus, setFocus] = useState(false);
  const [clip, setClip] = useState<Rect | null>(null);
  const [stampMode, setStampMode] = useState(false);
  const toastId = useRef(0);
  const navRef = useRef<ViewerNav | null>(null);

  const notify = useCallback((kind: Toast["kind"], text: string, action?: Toast["action"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text, action }]);
  }, []);

  const onStanzaError = useCallback(
    (msg: string) => {
      notify("error", msg);
      setFaultOpen(true);
    },
    [notify],
  );
  const st = useStanzas(opened?.doc.id ?? null, onStanzaError);
  const selected = st.stanzas.find((s) => s.id === st.selectedId) ?? null;

  const onSelect = useCallback((id: number | null) => st.setSelectedId(id), [st.setSelectedId]);
  const onCreate = useCallback((page0: number, rect: Rect) => st.create(page0, rect), [st.create]);
  const onChangeRect = useCallback((id: number, rect: Rect) => st.update(id, { rect }), [st.update]);
  // Draw and stamp are mutually exclusive ways of adding boxes.
  const onToggleDraw = useCallback((on?: boolean) => {
    setDrawMode((d) => {
      const next = on ?? !d;
      if (next) setStampMode(false);
      return next;
    });
  }, []);
  const onToggleStamp = useCallback((on?: boolean) => {
    setStampMode((s) => {
      const next = on ?? !s;
      if (next) setDrawMode(false);
      return next;
    });
  }, []);
  const { remove, restore } = st;
  const onDelete = useCallback(
    async (id: number) => {
      const gone = await remove(id);
      if (gone) notify("info", `Deleted stanza ${gone.number}.`, { label: "UNDO", run: () => restore(gone) });
    },
    [remove, restore, notify],
  );
  const pickStanza = useCallback(
    (s: Stanza) => {
      st.setSelectedId(s.id);
      navRef.current?.goStanza(s);
    },
    [st.setSelectedId],
  );

  // Reuse a box: its size can be stamped anywhere (S, then click), or Ctrl+V pastes it at the same position.
  const onCopy = useCallback(
    (rect: Rect) => {
      setClip(rect);
      notify(
        "info",
        `Copied ${Math.round(rect[2] - rect[0])} × ${Math.round(rect[3] - rect[1])} pt. Press S and click where the next stanza starts, or Ctrl+V for the same position.`,
      );
    },
    [notify],
  );
  const useSize = useCallback(
    (rect: Rect) => {
      setClip(rect);
      onToggleStamp(true);
      notify("info", `Stamping ${Math.round(rect[2] - rect[0])} × ${Math.round(rect[3] - rect[1])} pt boxes. Click where each stanza starts; Esc stops.`);
    },
    [notify, onToggleStamp],
  );
  const { create } = st;
  const sameBoxOnPage = useCallback(
    (s: Stanza, page0: number) => {
      if (!opened || page0 < 0 || page0 >= opened.doc.page_count) return;
      create(page0, s.rect);
      navRef.current?.goStanza({ ...s, page: page0 });
    },
    [opened, create],
  );

  // Focus = real full screen (when the browser allows it) plus a layout with only the page and toolbar.
  const toggleFocus = useCallback(() => setFocus((f) => !f), []);
  useEffect(() => {
    const el = document.documentElement;
    if (focus && !document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    if (!focus && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [focus]);
  useEffect(() => {
    // Esc in the browser leaves full screen; follow it.
    const sync = () => !document.fullscreenElement && setFocus(false);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
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

  // When the backend comes back after being down, load the library again.
  const prevLink = useRef(telemetry.link);
  useEffect(() => {
    if (prevLink.current === "down" && telemetry.link === "up") refresh().catch(() => {});
    prevLink.current = telemetry.link;
  }, [telemetry.link, refresh]);

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
      setDrawMode(false);
      setStampMode(false);
      setClip(null);
      setOpened({ doc, index });
      if (!reused) notify("ok", `Indexed “${doc.title}”.`);
    } catch (e) {
      notify("error", `Could not open “${doc.title}”: ${(e as Error).message}`);
      setFaultOpen(true);
    } finally {
      setOpeningId(null);
    }
  };

  const registerNav = useCallback((nav: ViewerNav | null) => {
    navRef.current = nav;
  }, []);

  if (route === "#styleguide") return <Styleguide />;

  const latestFault = telemetry.faults[0];

  return (
    <div className={`app${focus && opened ? " is-focus" : ""}`}>
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
          <Catalogue
            outline={opened?.index.outline ?? null}
            stanzas={st.stanzas}
            totalPages={opened?.doc.page_count ?? 0}
            currentPage={currentPage}
            onGo={(p) => navRef.current?.goPage(p)}
          />
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
              registerNav={registerNav}
              stanzas={st.stanzas}
              getStanza={st.getStanza}
              selectedId={st.selectedId}
              drawMode={drawMode}
              onToggleDraw={onToggleDraw}
              onSelect={onSelect}
              onCreate={onCreate}
              onChange={onChangeRect}
              onDelete={onDelete}
              focus={focus}
              onToggleFocus={toggleFocus}
              clip={clip}
              onCopy={onCopy}
              stampMode={stampMode}
              onToggleStamp={onToggleStamp}
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
          <Inspector
            selection={
              <SelectionPanel
                stanzas={st.stanzas}
                selected={selected}
                onPatch={st.update}
                onDelete={onDelete}
                onPick={pickStanza}
                hasDocument={!!opened}
                pageCount={opened?.doc.page_count ?? 0}
                onUseSize={useSize}
                onSameBoxOnPage={sameBoxOnPage}
              />
            }
            readout={opened ? readout : null}
            focusedStage={focusedStage}
            onClearFocus={() => setFocusedStage(null)}
          />
        </aside>
      </main>

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
