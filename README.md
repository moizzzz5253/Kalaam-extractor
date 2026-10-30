# Kalaam & Stanza PDF Extractor — Milestone 1 (backend foundation)

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
| React + PDF.js viewer, bookmark/link navigation UI | **Not yet — next milestone** |
| Bounding boxes, stanza selection, Handy Book, PDF export | Not started |
| Arabic/Urdu rendering verified with a real Kalaam PDF | **Not yet — needs a sample file** |

## Run
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m pytest -q          # 4 tests
python3 -m uvicorn app.main:app --port 8000
```
Data (SQLite DB + stored PDFs) lives in `backend/data/` unless `KX_DATA_DIR` is set.

## API (Milestone 1)
- `GET  /api/health`
- `GET  /api/documents`
- `POST /api/documents` (multipart `file`) → 201, `duplicate: true` if already imported
- `GET  /api/documents/{id}`
- `POST /api/documents/{id}/index?force=false` → reuses stored index unless `force=true`
- `GET  /api/documents/{id}/index`
- `GET  /api/documents/{id}/pdf` (original file, for PDF.js)
- `GET  /api/documents/{id}/pages/{page0}.png?zoom=1.5` (0-based page)

## Known limitations
- Encrypted PDFs are rejected with a clear error.
- Named-destination links are classified but not yet resolved to pages.
- The test PDF is synthetic; it does not validate Arabic-script shaping.

## Frontend (Milestone 1b — viewer)
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :8000)
npm run typecheck
npm run build
```
If the backend runs on another port, set `KX_API_URL` (e.g. in a git-ignored `frontend/.env.local`:
`KX_API_URL=http://127.0.0.1:8010`).

Implemented: library list, PDF import with duplicate feedback, indexing on open (stored index reused),
lazy page rendering with a bounded canvas count, bookmark navigation, page jump, internal link hit-areas.

UI follows `docs/frontend-design-instructions.md` ("Manuscript Atelier"): icon rail and top bar,
light/dark themes, drag-and-drop import, bookmark filter, floating page/zoom toolbar with fit-to-width,
page filmstrip, keyboard shortcuts (← → Home End + −). Deviations are listed in `DESIGN_NOTES.md`.

Verified: typecheck and production build pass; `/api` proxy verified end to end with curl.
Verified in a real browser with the synthetic fixture and the real 30-page sample: library, opening,
page rendering, bookmarks, index-grid links, filmstrip, previous/next, page jump, zoom (current page
stays anchored), fit width, keyboard shortcuts, returning from the library keeps the page, both themes.

Known simplifications: link hit-areas assume an unrotated page with no CropBox offset;
named destinations are not navigable yet.
