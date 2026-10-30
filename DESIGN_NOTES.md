# Design notes

Deviations from `docs/frontend-design-instructions.md` ("Noor Scope"), with reasons (brief §13 asks for this file).
Reference used: PDF//SCOPE `app/static/style.css`, `theme.js`, `index.html` (`moizzzz5253/pdf-editor`).

## First pass: tokens, theme, shell, pipeline, Library and Viewer

### Built as specified
- Tokens: `frontend/src/styles/tokens.css` (spacing, type, motion) and `frontend/src/theme.ts` (the four
  presets, custom accent/background pickers, saved in `localStorage`, applied before first paint). Same
  variable names as PDF//SCOPE.
- Top bar: NOOR//SCOPE wordmark with the eight-point star mark (draws in once on the first visit),
  LINK LED (polls `/api/health` every 10 s), DOC chip, THEME panel, FAULTS counter.
- Signal-flow strip: INPUT → INDEX → SELECT → COMPOSE → EXPORT. States and timings are real, measured in
  the browser around the actual API calls (`telemetry.ts`). SELECT, COMPOSE and EXPORT are shown as
  "not built".
- Grid 268px / 1fr / 372px with clipped-corner panels; static star tessellation background at 3% opacity
  (6% on the light preset), never behind the PDF page.
- Left: FILES (drop zone with sweep while uploading, kind badge, slide-in for a new file) and KALAAM
  (search debounced 150 ms).
- Centre: viewer on a darker desk, page/zoom toolbar with fit-to-width, filmstrip, keyboard shortcuts.
- Right: SELECTION (empty state), PAGE GEOMETRY (units on every value; hover shows the formula),
  STEP INSPECTOR, SCOPE trace, API LOG (errors-only filter).
- Readable fault report with copy button. Toasts bottom-right, errors stay.
- Style guide at `#styleguide` (also linked from the THEME panel): tokens, live WCAG contrast table for
  all four presets, type, LEDs, buttons, node states, bounding-box states.

### Verified in a real browser
- All four presets pass WCAG AA (4.5:1) for every text/surface pair in the style guide table.
  Weakest: Ivory `--dim` on `--panel2` = 4.98.
- 1024 × 768 and 800 × 600 windows. Opening the real 30-page sample; pipeline timings; geometry readout.
- No infinite animations run while idle (checked with `document.getAnimations()`).
- Theme choice persists across reloads.

### Deviations
| Brief | What we did | Why |
|---|---|---|
| SCOPE shows indexing pages per second (§6, §7) | SCOPE shows API round-trip time per request | The backend indexes in one request and reports no progress yet. Switch once indexing streams progress. |
| Backend Log (§6) | "API LOG": the browser's record of each request, timing and result | The backend exposes no log endpoint yet. |
| Step Inspector lists backend steps such as `parse_outline` (§11) | Lists browser-side steps: `upload_document`, `index_document`, `pdfjs_open`, `list_documents` | Same reason: the backend does not report its internal steps yet. |
| STOP SERVER chip (§6) | Not shown | The backend has no stop endpoint. |
| FAULTS chip blinks while a fault is open (§6, §9) | Steady red when faults exist | Keeps the infinite-animation count within 3 during an import or index. |
| Ruler in PDF points (§6) | Not built yet | Comes with the bounding-box editor, where coordinates matter. |
| Empty-state star tile turns slowly (§9) | Static | Saves an infinite animation; looks the same at a glance. |
| Kalaam catalogue grouped with stanza counts and virtualised (§6, §10) | Lists the PDF's bookmarks; not virtualised | Stanzas do not exist yet; bookmark lists are short. Needed before 5,000-page PDFs (the filmstrip also creates one lazy `<img>` per page). |
| Inspector always visible (§6) | Below 1280px wide it becomes a drawer (INSPECTOR chip); below 860px the page stacks and scrolls | At 1024px the three columns leave the viewer under 400px wide. |
| Indexing and export in a background worker (§10) | Indexing runs in the backend request; PDF.js renders in its own worker | Export does not exist yet. |
| `?` shortcut overlay, Ctrl+K palette, undo/redo (§11) | Not built yet | Arrive with the stanza editor. |
| Numeral style setting (§5) | Not built yet | Arrives with output page numbering. |

## Second pass: stanza selector (bounding-box editor, brief §8)

### Built as specified
- Box states: idle, hover (cyan), selected (amber, 8 handles, page outside dimmed with a large
  box-shadow), approved/verified (solid green with a check mark), stanza number pill.
- Live readout while dragging: w × h and x, y in PDF points. Pointer moves are handled once per animation
  frame. The overlay sits above the canvas and only captures the pointer while drawing or stamping, so
  scrolling and page links keep working. The PDF canvas is never re-rendered by box changes.
- Keyboard: arrows nudge 1 pt, Shift 10 pt, Alt resize, Delete, [ ] previous/next stanza, B draw, Esc.

### Added at the owner's request
- FOCUS mode (F): real full screen when the browser allows it, otherwise a full-window layout; only the
  page, toolbar and filmstrip remain, and the whole page is fitted. Leaving restores the previous zoom.
- Fit whole page button.
- STAMP (S): reuse a box's width and height for another stanza of similar size; a ghost box follows the
  pointer and a click places it with its top-left corner there.
- Ctrl+C / Ctrl+V: paste a box at the same position on another page; "same box on next page" button.
- Per-stanza "start on a new page" flag for the Handy Book flow layout.

### Deviations
| Brief | What we did | Why |
|---|---|---|
| Snap guides to neighbouring boxes and margins (§8) | Not built yet | Stamping and nudging cover alignment for now; add if boxes drift. |
| Suggested (AI) boxes with confidence chip (§8) | Style only (style guide); no detection | Stanzas are selected by hand (project decision). |
| Undo / redo with Ctrl+Z (§11) | UNDO on the delete notice only | Move and resize are easy to reverse with the keyboard; full history later. |
| Stanza label in Amiri for Arabic-Indic numerals (§8) | Western digits in the editor | The numeral-style setting is not built yet. |
| Single gold pulse on approval (§9) | Colour change only | Keeps motion minimal; easy to add. |

### Not yet checked
- Long Urdu, short Arabic and mixed titles in FILES and KALAAM (the sample's titles are Latin).
- Keyboard-only walk-through of every control, and screen-reader output.
- Fonts load from Google Fonts; offline the UI falls back to system monospace and serif.
- Shell interactive time and drag frame rate (§10 targets) have not been measured.
