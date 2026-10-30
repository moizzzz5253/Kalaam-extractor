import { useEffect, useMemo, useState } from "react";
import { OutlineItem } from "./api";
import { IconSearch } from "./icons";

interface Props {
  outline: OutlineItem[] | null; // null: no document open
  currentPage: number;
  onGo: (page0: number) => void;
}

/** Kalaam catalogue. For now it lists the PDF's bookmarks; stanza counts arrive with selection. */
export default function Catalogue({ outline, currentPage, onGo }: Props) {
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
