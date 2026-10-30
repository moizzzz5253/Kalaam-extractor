# Kalaam & Stanza PDF Extractor — Noor Scope

## Status
| Capability | State |
|---|---|
| PDF upload (streamed, size-limited, `%PDF-` check) | Done, tested |
| Duplicate detection by SHA-256 content hash | Done, tested |
| Original PDF stored under an internal name (no user paths exposed) | Done, tested |
| Outline / bookmark extraction (0-based physical pages) | Done, tested |
| Internal GOTO link extraction (contents-page links) | Done, tested |
| Named / external / unresolved link classification | Done, tested |
| Once-only indexing (stored index reused, versioned by `INDEX_VERSION`) | Done, tested |
| On-demand single-page PNG rendering | Done, tested |
| React + PDF.js viewer, bookmark/link navigation UI | Done, verified in a browser |
| Arabic/Urdu rendering with a real Kalaam PDF | Verified with the 30-page sample |
| Stanza selection: draw, move, resize, nudge, stamp a size, paste, verify, focus mode | Done, tested (API) and verified in a browser |
| Handy Book builder (flow layout, full-page previews) | Next milestone |
| PDF export | Not started |

## Run
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m pytest -q          # 8 tests
python3 -m uvicorn app.main:app --port 8000
```
Data (SQLite DB + stored PDFs) lives in `backend/data/` unless `KX_DATA_DIR` is set.

## API
- `GET  /api/health`
- `GET  /api/documents`
- `POST /api/documents` (multipart `file`) → 201, `duplicate: true` if already imported
- `GET  /api/documents/{id}`
- `POST /api/documents/{id}/index?force=false` → reuses stored index unless `force=true`
- `GET  /api/documents/{id}/index`
- `GET  /api/documents/{id}/pdf` (original file, for PDF.js)
- `GET  /api/documents/{id}/pages/{page0}.png?zoom=1.5` (0-based page)
- `GET  /api/documents/{id}/stanzas` → stanzas in reading order (page, then top to bottom)
- `POST /api/documents/{id}/stanzas` `{page, rect:[x0,y0,x1,y1], number?, title?}` → 201.
  `rect` is in PDF points, top-left origin; it is normalised and clamped to the page, and must be at
  least 4 pt each way. `number` defaults to the highest number in the document + 1.
- `PATCH /api/stanzas/{id}` any of `{rect, number, title, verified, new_page}`
- `DELETE /api/stanzas/{id}` → 204

Stanzas are metadata only; the original PDF is never modified. `new_page` tells the Handy Book
builder to start that stanza on a fresh output page; otherwise stanzas flow several per page.

## Known limitations
- Encrypted PDFs are rejected with a clear error.
- Named-destination links are classified but not yet resolved to pages.
- Link hit-areas and stanza boxes assume an unrotated page with no CropBox offset.
- New database columns are added by `create_all` only for new tables; there are no migrations yet.

## Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :8000)
npm run typecheck
npm run build
```
If the backend runs on another port, set `KX_API_URL` (e.g. in a git-ignored `frontend/.env.local`:
`KX_API_URL=http://127.0.0.1:8010`).

UI: **Noor Scope** (`docs/frontend-design-instructions.md`). Top bar with backend LINK light and FAULTS,
signal-flow pipeline with real step timings, FILES and KALAAM (with stanza counts per bookmark) on the
left, viewer in the centre, inspector on the right (selection editor, stanza list, page geometry, step
inspector, API timing trace, API log), readable fault reports, four theme presets plus custom colours.
Style guide with a live contrast table: `http://localhost:5173/#styleguide`.
Deviations from the design brief are listed in `DESIGN_NOTES.md`.

### Selecting stanzas
| Action | How |
|---|---|
| Draw a box | **B** (or DRAW BOX), then drag across the stanza |
| Select / move / resize | Click a box; drag it; drag any of its 8 handles |
| Nudge / resize by keyboard | Arrows 1 pt, Shift+arrows 10 pt, Alt+arrows resize |
| Reuse a box's size | Select a box → "use this size" (or Ctrl+C then **S**), then click where each similar stanza starts |
| Same position on another page | Ctrl+C, go to the page, Ctrl+V; or "same box on page N →" |
| Full-screen page | **F** (or FOCUS): whole page fitted, side panels hidden; F or Esc to leave |
| Previous / next stanza | **[** and **]** |
| Number, title, exact x/y/w/h, verified, start on new page | SELECTION panel in the inspector |
| Delete | Delete key or the delete button; the notice offers UNDO |

Changes save automatically. Rapid edits to one stanza are merged into one save.

Verified in a real browser with the real 30-page sample: drawing, moving, resizing, keyboard nudging
(four quick keys combine correctly), delete and undo, [ ] navigation, stamping a copied size, Ctrl+V,
focus mode at 1024 × 768 (whole page fits) and leaving it (previous zoom restored), no faults.
