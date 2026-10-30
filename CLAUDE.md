# Kalaam & Stanza PDF Extractor — project brief for Claude Code

## Who this is for
The owner is a mechatronic engineer who is a capable learner but not an experienced coder.
Explain what you are doing in plain language, step by step. Show what changed and how to run it.
Ask questions as multiple-choice options (with a recommended choice first) when a decision matters.
Do not ask the owner to re-confirm decisions already listed below.

## Goal
A local web app that imports a large PDF (thousands of pages) of Kalaam (Arabic/Urdu/Lisan ud Daawat
religious compositions), lets the user draw bounding boxes around stanzas, saves them, and builds a
new "Handy Book" PDF from the selected stanzas, using a background template.

## Decisions already made
- Stanzas are selected by hand (bounding box drawn on the page). Automatic grouping is optional later.
  Any number of boxes may be drawn on the same source page.
- Handy Book layout: stanzas FLOW, several per output page, in order, at original size where possible.
  A new output page starts only when the next stanza does not fit, or when that stanza is marked
  "start on a new page" (stored per stanza as `new_page`).
- Full-page display is a must: the stanza selector has a FOCUS mode (full screen, whole page fitted),
  and the Handy Book composer must preview every output page as a whole page in the same way.
- Box reuse means reusing a box's SIZE for another stanza of similar size (STAMP: click where the stanza
  starts). Pasting at the same position (Ctrl+V) is a secondary option.
- Output page numbers: sequential across the whole book, written in Arabic-Indic digits (١٢٣).
- Default output page size: A4. A5 and smaller must be selectable for printing.
- Scaling: keep original size where possible. Warn when a stanza would shrink below 70% of its original size.
- One background template for all pages, plus a separate front-page (cover) template.
- Automatically exclude the third-party promo overlay ("Click Here To Ask For Updated Latest Version"
  and its WhatsApp link) from detection and export.
- Fonts: Al Kanz is not confirmed available. Amiri (SIL OFL) is the default for new text such as
  headings and numbers. Fonts embedded in source PDFs are kept as they are.
- Preserve the original PDF appearance (clip source content) rather than re-typing text.
- The original PDF is never modified. Selections are stored as metadata that points into it.

## Architecture
- backend/  FastAPI + PyMuPDF (pymupdf) + SQLAlchemy/SQLite. Entry: backend/app/main.py
- frontend/ React + TypeScript + Vite + PDF.js. Entry: frontend/src/main.tsx
- README.md has the status table and API list. Keep it updated when features change.

## Run locally
- Backend:  cd backend && python3 -m pip install -r requirements.txt && python3 -m uvicorn app.main:app --port 8000
- Frontend: cd frontend && npm install && npm run dev   (open http://localhost:5173)
- Tests:    cd backend && python3 -m pytest -q
- Typecheck: cd frontend && npm run typecheck

## Current status (Milestone 1)
- Done and tested: upload, duplicate detection, outline and link extraction, once-only indexing,
  on-demand page rendering, library and lazy viewer.
- Viewer verified in a real browser with the synthetic fixture and the real 30-page sample
  (Arabic renders correctly; index-grid links navigate). First page of the 37 MB sample takes ~10 s.
- Milestone 2 (stanza selector) done: draw / move / resize boxes, keyboard nudging, stamp a copied size,
  paste at same position, focus mode, verify flag, saved via /api/.../stanzas.
- Next: Handy Book builder (COMPOSE) with full-page previews, then PDF export.

## Test data
- A 30-page sample PDF exists (ZikreHusain1446-30pgs.pdf). It is a third-party document: do NOT commit it.
  Keep sample PDFs in backend/data/ (git-ignored) or another ignored folder.
- Its index page (page 2) has grid links; each link's text is a Kalaam first line. Kalaam pages are
  numbered-line tables (1..N) under a banner, with a back link on each page.
- Arabic text from the text layer comes out in visual order, so do not rely on it for stanza boundaries.

## Working rules
- Commit with clear messages. Push to origin main when a milestone works.
- Never delete the user's data folder or original PDFs.
- Test before claiming something works. Say clearly what was not tested.
