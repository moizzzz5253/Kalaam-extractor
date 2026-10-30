// Stanza state for the open document. Edits show at once (optimistic) and are saved in the
// background; rapid edits to one stanza (nudging, typing) are merged into a single PATCH.

import { useCallback, useEffect, useRef, useState } from "react";
import { api, Rect, Stanza, StanzaPatch } from "./api";
import { track } from "./telemetry";

const SAVE_DELAY_MS = 350;

export function sortStanzas(list: Stanza[]): Stanza[] {
  return [...list].sort((a, b) => a.page - b.page || a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0]);
}

export function useStanzas(docId: number | null, onError: (msg: string) => void) {
  const [stanzas, setStanzasState] = useState<Stanza[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Latest list, updated synchronously, so several edits in one tick (fast key repeat) build on each other.
  const latest = useRef<Stanza[]>([]);
  const setStanzas = useCallback((next: Stanza[] | ((l: Stanza[]) => Stanza[])) => {
    latest.current = typeof next === "function" ? next(latest.current) : next;
    setStanzasState(latest.current);
  }, []);
  const getStanza = useCallback((id: number) => latest.current.find((s) => s.id === id) ?? null, []);
  const pending = useRef(new Map<number, { patch: StanzaPatch; timer: number }>());
  const tempId = useRef(-1);

  const reload = useCallback(async () => {
    if (docId === null) return;
    const list = await track(null, "list_stanzas", `document #${docId}`, () => api.listStanzas(docId), (l) => `${l.length} stanzas`);
    setStanzas(sortStanzas(list));
  }, [docId, setStanzas]);

  useEffect(() => {
    setStanzas([]);
    setSelectedId(null);
    if (docId !== null) reload().catch(() => {});
  }, [docId, reload, setStanzas]);

  // Save anything still waiting when the document changes or the page closes.
  useEffect(() => {
    const map = pending.current;
    const flushAll = () => {
      for (const [id, p] of map) {
        clearTimeout(p.timer);
        api.updateStanza(id, p.patch).catch(() => {});
      }
      map.clear();
    };
    window.addEventListener("beforeunload", flushAll);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      flushAll();
    };
  }, [docId]);

  const create = useCallback(
    async (page: number, rect: Rect) => {
      if (docId === null) return;
      const tid = tempId.current--;
      const draft: Stanza = { id: tid, document_id: docId, page, rect, number: 0, title: "", verified: false, new_page: false, updated_at: "" };
      setStanzas((l) => sortStanzas([...l, draft]));
      setSelectedId(tid);
      try {
        const saved = await track(
          "select",
          "create_stanza",
          `page ${page + 1} · [${rect.map((v) => Math.round(v)).join(", ")}] pt`,
          () => api.createStanza(docId, { page, rect }),
          (s) => `stanza ${s.number} · #${s.id}`,
        );
        setStanzas((l) => sortStanzas(l.map((s) => (s.id === tid ? saved : s))));
        setSelectedId((cur) => (cur === tid ? saved.id : cur));
      } catch (e) {
        setStanzas((l) => l.filter((s) => s.id !== tid));
        setSelectedId((cur) => (cur === tid ? null : cur));
        onError(`Box not saved: ${(e as Error).message}`);
      }
    },
    [docId, onError],
  );

  const update = useCallback(
    (id: number, patch: StanzaPatch) => {
      setStanzas((l) => sortStanzas(l.map((s) => (s.id === id ? { ...s, ...patch } : s))));
      if (id < 0) return; // still being created; the create response wins
      const prev = pending.current.get(id);
      if (prev) clearTimeout(prev.timer);
      const merged = { ...prev?.patch, ...patch };
      const timer = window.setTimeout(() => {
        pending.current.delete(id);
        const fields = Object.keys(merged).join(", ");
        track("select", "update_stanza", `#${id} · ${fields}`, () => api.updateStanza(id, merged), (s) => `stanza ${s.number} saved`)
          .then((saved) => setStanzas((l) => sortStanzas(l.map((s) => (s.id === id ? saved : s)))))
          .catch((e) => {
            onError(`Change not saved: ${(e as Error).message}`);
            reload().catch(() => {});
          });
      }, SAVE_DELAY_MS);
      pending.current.set(id, { patch: merged, timer });
    },
    [onError, reload],
  );

  const remove = useCallback(
    async (id: number): Promise<Stanza | null> => {
      const victim = latest.current.find((s) => s.id === id) ?? null;
      if (!victim || id < 0) return null;
      const p = pending.current.get(id);
      if (p) {
        clearTimeout(p.timer);
        pending.current.delete(id);
      }
      setStanzas((l) => l.filter((s) => s.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
      try {
        await track("select", "delete_stanza", `#${id} · stanza ${victim.number}`, () => api.deleteStanza(id));
        return victim;
      } catch (e) {
        onError(`Delete failed: ${(e as Error).message}`);
        reload().catch(() => {});
        return null;
      }
    },
    [onError, reload, setStanzas],
  );

  /** Undo a delete: re-create the stanza with its old number, title and verification. */
  const restore = useCallback(
    async (s: Stanza) => {
      if (docId === null) return;
      try {
        let back = await track("select", "restore_stanza", `stanza ${s.number}`, () =>
          api.createStanza(docId, { page: s.page, rect: s.rect, number: s.number, title: s.title }),
        );
        if (s.verified || s.new_page) back = await api.updateStanza(back.id, { verified: s.verified, new_page: s.new_page });
        setStanzas((l) => sortStanzas([...l, back]));
        setSelectedId(back.id);
      } catch (e) {
        onError(`Undo failed: ${(e as Error).message}`);
      }
    },
    [docId, onError],
  );

  return { stanzas, getStanza, selectedId, setSelectedId, create, update, remove, restore };
}
