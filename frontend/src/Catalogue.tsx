import { useEffect, useMemo, useState } from "react";
import { OutlineItem, Stanza } from "./api";
import { IconSearch } from "./icons";

interface Props {
  outline: OutlineItem[] | null; // null: no document open
  stanzas: Stanza[];
  totalPages: number;
  currentPage: number;
  onGo: (page0: number) => void;
}

/** Kalaam catalogue: the PDF's bookmarks, each with the number of stanzas selected in its page range. */
export default function Catalogue({ outline, stanzas, totalPages, currentPage, onGo }: Props) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(draft.trim().toLowerCase()), 150); // debounce (brief §10)
    return () => clearTimeout(t);
  }, [draft]);

  const items = outline ?? [];
  const shown = useMemo(
    () => (query ? items.filter((o) => o.title.toLowerCase().includes(query)) : items),
    [items, query],
  );
  // A bookmark covers its start page up to the next bookmark that starts later.
  const counts = useMemo(() => {
    const starts = [...new Set(items.map((o) => o.target_page).filter((p): p is number => p !== null))].sort((a, b) => a - b);
    return items.map((o) => {
      if (o.target_page === null) return null;
      const end = starts.find((p) => p > o.target_page!) ?? totalPages;
      const inRange = stanzas.filter((s) => s.page >= o.target_page! && s.page < end);
      return { total: inRange.length, verified: inRange.filter((s) => s.verified).length };
    });
  }, [items, stanzas, totalPages]);

  // Bookmark whose start page is the latest one at or before the current page.
  const activeIdx = useMemo(() => {
    let best = -1;
    items.forEach((o, i) => {
      if (o.target_page !== null && o.target_page <= currentPage && (best < 0 || o.target_page >= items[best].target_page!))
        best = i;
    });
    return best;
  }, [items, currentPage]);

  return (
    <section className="panel catalogue-panel" aria-label="Kalaam catalogue">
      <h3>
        <span>KALAAM</span>
        <em>{outline ? `${items.length} bookmark${items.length === 1 ? "" : "s"}` : "no document"}</em>
      </h3>

      {outline === null ? (
        <div className="empty-state small">
          <p>Open a document to see its Kalaam.</p>
        </div>
      ) : (
        <>
          <label className="search-field">
            <IconSearch size={14} />
            <span className="sr-only">Search Kalaam</span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="search titles" />
          </label>
          {items.length === 0 ? (
            <div className="empty-state small">
              <p>This PDF has no bookmarks. Use the index page links or the filmstrip.</p>
            </div>
          ) : shown.length === 0 ? (
            <div className="empty-state small">
              <p>
                No title matches “<bdi>{draft}</bdi>”. Titles come from the PDF's bookmarks only; the page text is
                not searched yet.
              </p>
            </div>
          ) : (
            <ul className="kalaam-list">
              {shown.map((o) => {
                const i = items.indexOf(o);
                return (
                  <li key={i} style={{ paddingInlineStart: (o.level - 1) * 12 }}>
                    <button
                      className={`kalaam-item${i === activeIdx ? " on" : ""}`}
                      onClick={() => o.target_page !== null && onGo(o.target_page)}
                      disabled={o.target_page === null}
                    >
                      <span className="k-title" dir="auto">
                        {o.title}
                      </span>
                      {counts[i] && counts[i]!.total > 0 && (
                        <span
                          className={`k-count${counts[i]!.verified === counts[i]!.total ? " all-ok" : ""}`}
                          title={`${counts[i]!.total} stanzas, ${counts[i]!.verified} verified`}
                        >
                          {counts[i]!.verified}/{counts[i]!.total}
                        </span>
                      )}
                      <span className="k-page">{o.target_page === null ? "—" : `p ${o.target_page + 1}`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
