# Frontend Design Instructions: Kalaam & Stanza PDF Extractor — "Noor Scope"

Give this file to Claude Code before it builds any UI. Read it fully before writing components. These instructions override any default styling, template, or component-library look.

This brief reuses the **design concept of PDF//SCOPE** (the owner's PDF workbench, repo `moizzzz5253/pdf-editor`): a phosphor oscilloscope look, a signal-flow pipeline, glowing status LEDs, clipped-corner panels, live step inspector, and a theme system with presets. It is re-skinned for a devotional Kalaam collection in an Islamic and Dawoodi Bohra sensibility, and it is built for a mechatronic engineer who wants to see how the software works.

---

## 1. Goal and Identity

Build a **signal-flow workbench for devotional texts**. The user imports a large PDF of Kalaam, selects stanzas with bounding boxes, and composes a Handy Book. Every step of that process is visible as a live signal, so the user can see what the software is doing.

The name for the app is **Noor Scope** (*noor* means light, which fits the phosphor-glow concept). Change the name only if the owner asks.

The app must feel:

- **Calm and devotional.** Restrained, dignified, unhurried. Geometry and light, not ornament.
- **Technical and honest.** Every value has a unit, every step has a timing, every fault has a readable report.
- **Fast.** Animation is a signal, never a delay. The user is never made to wait for an effect to finish.

The app must not feel:

- Like a neon gaming HUD, sci-fi cockpit, or "cyberpunk" poster. Glow is used as information, not as decoration.
- Like a cartoon or clip-art Islamic design. Ornament is geometric, faint, and kept away from working surfaces.
- Like a stock admin template with a green colour swapped in.

---

## 2. Design Concept: "Phosphor Manuscript"

Four principles govern every decision:

1. **Show the signal.** The pipeline (INPUT → INDEX → SELECT → COMPOSE → EXPORT) is always visible. A user should be able to glance at it and know what is happening.
2. **Glow means state.** A glowing LED, edge, or wire means something is active, healthy, or selected. A glow that carries no meaning is removed.
3. **Sacred restraint.** Islamic geometric patterns appear only in the background field, the empty states, and the export cover preview. They never sit behind text, PDF pages, or bounding boxes.
4. **Engineer's transparency.** Numbers, coordinates, timings, and step logs are always one click away. Nothing is hidden behind "magic".

---

## 3. Cultural and Religious Respect (mandatory)

- **Do not depict any person, living or deceased, in any form.** No portraits, silhouettes, avatars, or photographs of religious figures. No images of any named religious leader, in the UI, copy, placeholder data, screenshots, or the README.
- **Do not use any logo, emblem, or branding of any organisation.** Use only the Noor Scope mark, which is a geometric eight-point star drawn in SVG. If the owner later wants a custom mark, they will supply it.
- **Use respectful language.** Say "Kalaam", "stanza", and "Handy Book". Do not describe the content as "poems", "songs", or "entertainment".
- **Quranic or devotional text** may appear only where the owner supplies it, and always with the owner's own wording. Claude must not invent or translate devotional phrases.
- **Placeholder content** (sample titles and stanza text) must be generic, such as "Kalaam A — Sample Title", so no real composition text appears in screenshots.
- **Colours**: emerald and gold are used because they feel devotional and well-crafted. Do not use bright red, gambling-style gold, or alcohol-themed amber tones.

---

## 4. Design Tokens (CSS variables, same mechanism as PDF//SCOPE)

All colours live in CSS variables set on `:root`. Components reference `var(--name)` and never hardcode hex values. The variable names match PDF//SCOPE exactly, so the theme mechanism can be reused.

### Default preset: "Noor Night" (dark)

```css
:root {
  --bg:     #040f0c;   /* page background, deep emerald-black */
  --top:    #061511;   /* top bar */
  --panel:  #0a1b16;   /* panels */
  --panel2: #0d221c;   /* inset rows, cards */
  --line:   #173a31;   /* hairlines */
  --line2:  #22584a;   /* borders, focus frames */
  --phos:   #3ee6a8;   /* primary signal glow: OK, healthy, selected-ok */
  --amber:  #e0b35a;   /* gold: active, selection, "working now" */
  --cyan:   #7fd6e8;   /* information, suggestions, links */
  --red:    #e0606a;   /* fault, destructive (muted, never neon) */
  --violet: #b9a3e3;   /* secondary data series only */
  --text:   #efe8d4;   /* ivory text */
  --dim:    #8fa79c;   /* secondary text, meta */
  --mono: "JetBrains Mono", ui-monospace, Consolas, Menlo, monospace;
  --arabic: "Amiri", "Noto Naskh Arabic", serif;
}
```

### Preset: "Ivory Manuscript" (light)

```css
--bg:#f6f1e4; --top:#ece5d2; --panel:#fffdf6; --panel2:#f7f2e3;
--line:#d8cdb0; --line2:#b9aa86; --phos:#0f7a58; --amber:#9a6b12;
--cyan:#1d6f8a; --red:#b03a3a; --violet:#6b4fa0; --text:#1f2a24; --dim:#5f6b62;
```

### Preset: "Emerald Court" (deeper green)

```css
--bg:#02100b; --top:#04170f; --panel:#08200f; --panel2:#0b2a16;
--line:#1b4a2c; --line2:#2b6b40; --phos:#7cf0a0; --amber:#e8c770;
--cyan:#9ee8d0; --red:#e87070; --violet:#c3b0f0; --text:#eef5e6; --dim:#90ab92;
```

### Preset: "Gold Dusk" (warm dark)

```css
--bg:#110c06; --top:#180f08; --panel:#201509; --panel2:#2a1c0c;
--line:#4a3418; --line2:#6e4f22; --phos:#f0c96a; --amber:#ffdf8a;
--cyan:#e8b07a; --red:#e86a5a; --violet:#d0a8e0; --text:#f7ecd6; --dim:#b09a74;
```

**Presets** are switched from a THEME panel in the top bar (same as PDF//SCOPE): four preset buttons with colour swatches, plus an accent colour picker and a background colour picker. The choice is saved in `localStorage`. The **Reset** button returns to Noor Night.

**Contrast:** every text colour must pass WCAG AA (4.5:1) on its panel in every preset. Check `--dim` on `--panel2` carefully, because it is the weakest pair.

**Radii:** 0px on panels and inputs, matching PDF//SCOPE's sharp technical edges. Use 2px only on LEDs and pills.

**Spacing:** a 4px scale (4, 8, 12, 16, 24, 32). No arbitrary values.

---

## 5. Typography

- **Interface, data, coordinates, logs:** JetBrains Mono, 13px base, line height 1.45. Use `font-variant-numeric: tabular-nums` for all numbers.
- **Display headings and the empty-state titles:** Amiri (SIL OFL, free to use). Use it for H1 and the cover preview only.
- **Arabic labels in the UI** (buttons, chips, stanza pills): Noto Naskh Arabic, wrapped in `<bdi lang="ar" dir="rtl">`.
- **Urdu verse previews only:** Noto Nastaliq Urdu, large line height (2.0+). Never in dense UI labels.
- **Diacritics-heavy text:** Scheherazade New as the fallback.
- **Arabic-Indic numerals (١٢٣)** are the default for page numbers in the output, as the project brief specifies. Western digits are the default in the app chrome. Numeral style is a separate setting.
- **Al Kanz** is not confirmed as available. Support registering a user-uploaded font through `@font-face`, but never make it the only option.

Panel headers use the PDF//SCOPE pattern: uppercase, 11px, letter-spacing 0.18em, `--phos` colour, on a faint gradient bar. Uppercase is allowed only for these short labels, never for long text.

---

## 6. Layout

### Top bar (46px)

- Left: the Noor Scope mark (eight-point star, SVG) and the wordmark `NOOR//SCOPE`, with the subtitle "signal-flow Kalaam workbench".
- Right: status chips with LEDs for **LINK** (backend up), the **active document** name, **THEME**, **STOP SERVER**, and **FAULTS n** (blinks when a fault is open).

### Pipeline strip (under the top bar, 56px)

Five nodes joined by wires: **INPUT → INDEX → SELECT → COMPOSE → EXPORT**. This is the signature element of the app.

- Each node shows a name, a small LED, and the last step's timing in milliseconds.
- Node states: idle (dim), active (gold, blinking LED), done (emerald), error (red, shakes once).
- Wires show a moving pulse while data flows between nodes.
- Clicking a node opens the Step Inspector for that stage.

### Main grid (same proportions as PDF//SCOPE)

`grid-template-columns: 268px minmax(0,1fr) 372px`, gap 12px, padding 12px.

- **Left column — Library and Catalogue**
  - FILES panel: drop zone, document list with status and page counts.
  - KALAAM panel: searchable catalogue, grouped by document, with stanza counts and verification state. Virtualised for thousands of entries.
- **Centre column — Viewer and Stanza Editor** (dominant)
  - Source PDF page on a darker field, so the white page reads as paper on a desk.
  - Bounding-box overlay (section 8).
  - Page filmstrip along the bottom, thumbnails loaded lazily.
  - A thin **ruler** along the top and left edges, marked in PDF points, so the user can see coordinates.
- **Right column — Inspector**
  - Selected box: coordinates in PDF points, stanza number, title, verification, detection confidence.
  - SELECTED STANZAS list and the HANDY BOOK queue.
  - Technical readout: MediaBox, CropBox, rotation, device pixel ratio, zoom.
  - Step Inspector (the real backend steps with timings), a small **SCOPE** trace of indexing throughput (pages per second), and the Backend Log.

### Handy Book Studio

Same grid as the rest of the app, but the centre column becomes a **page-spread canvas** showing the A4 or A5 sheet with clear margins and safe-area guides. Guides appear only while dragging. A **page strip** along the bottom shows every page of the book as a thumbnail that can be reordered.

### Clipped-corner panels

Every panel uses the PDF//SCOPE clipped corner (a 12px diagonal cut on the top-right), via `clip-path`. Use the same corner on the Noor Scope mark's container. Keep the clip-path off the PDF canvas itself.

### Background field

The page background is a faint **eight-point star tessellation** drawn as a static SVG tile, at 3% opacity, in `--phos`. It replaces the square grid of PDF//SCOPE. It is static and never animated. Do not place it behind the PDF page.

---

## 7. Components

Build these components. Names are suggestions; keep them consistent.

| Component | Purpose | Notes |
|---|---|---|
| `<TopBar />` | Brand, status chips, theme button | Brand mark is an SVG |
| `<PipelineStrip />` | Five-stage signal flow | Node and wire states per section 6 |
| `<PipelineNode />` / `<Wire />` | Stage and connection | Pulse uses transform only |
| `<PanelHeader />` | Uppercase label bar with count | Matches PDF//SCOPE `.panel h3` |
| `<FileList />` | Documents with kind badges | Virtualised; fresh-item slide-in |
| `<KalaamCatalogue />` | Searchable, virtualised Kalaam list | Search debounced 150 ms |
| `<PageCanvas />` | PDF.js canvas, lazy rendered | Never animated; overlay is separate |
| `<BoundingBox />` / `<BoxOverlay />` | Stanza selection layer | Section 8 |
| `<Ruler />` | PDF-point ruler on top and left edges | Tick marks every 10 pt, labels every 50 pt |
| `<StepInspector />` | Real backend steps with timings | Click a step to see its details |
| `<ScopeTrace />` | Oscilloscope line of pages/second | Canvas, redraws on a 250 ms batch |
| `<BackendLog />` | Log lines, colour by level | `aria-live="polite"`, throttled |
| `<HandyBookStrip />` | Ordered page thumbnails | Drag to reorder |
| `<FaultPanel />` | Readable fault report with copy button | Shows code, cause, fix, file:line |
| `<Toast />` | Bottom-right notifications | Auto-dismiss 4 s; errors stay |
| `<ThemePanel />` | Preset buttons, accent and background pickers | Saves to `localStorage` |
| `<NumeralFormatter />` | Western, Arabic-Indic, or Persian digits | Uses a formatter, not string replacement |
| `<ArabicText />` | Wraps Arabic-script text with `dir`, `lang`, and font | Used for every Arabic or Urdu string |

---

## 8. Bounding-Box Editor (signature interaction)

| State | Visual |
|---|---|
| Idle | 1px `--line2` border, no fill |
| Hover | 1px `--cyan` border, 6% `--cyan` fill |
| Selected | 2px `--amber` border, eight handles (8px squares, `--panel` fill, `--amber` border) |
| Suggested by detection (not approved) | Dashed 1px `--cyan` border, confidence chip in the corner ("94%") |
| Approved | Solid 1px `--phos` border; a single gold pulse on approval (400 ms) |
| Outside the box | The page is dimmed with a large `box-shadow` (the PDF//SCOPE technique) so the selected region stands out |

Other rules:

- **Stanza label:** a small pill in the top-left corner. Use Amiri for Arabic-Indic numerals and JetBrains Mono for Western digits.
- **Live readout:** while dragging, show width × height in PDF points in monospace, and show the `x, y` origin.
- **Snap guides:** faint `--cyan` lines snap to neighbouring boxes and to margins.
- **Cursors:** crosshair when drawing, grab on a box, resize cursors on handles.
- **Overlay layer:** an absolutely positioned SVG above the canvas. It must not capture wheel or scroll events unless the user is drawing or dragging.
- **Keyboard:** arrows nudge 1 pt, Shift+arrows 10 pt, Alt+arrows resize. The current box is announced to screen readers.

---

## 9. Animation Catalogue

Every animation has a purpose. If an animation does not tell the user something, do not add it.

| Trigger | Effect | Timing | Notes |
|---|---|---|---|
| App first load | Scope trace draws in the brand mark | 900 ms, once | Skipped on repeat visits and under reduced motion |
| Pipeline node becomes active | LED blinks gold | 0.5 s steps, infinite while active | Stops when the node finishes |
| Data flows between nodes | Pulse moves along the wire | 0.6 s linear, infinite while running | `transform` only |
| Node finishes | LED turns steady emerald with a short flash | 300 ms | One time |
| Node fails | Node shakes once and glows red | 400 ms shake | Also writes the fault to the log |
| Indexing running | ScopeTrace draws live pages/second | Redraws every 250 ms | Pauses when the tab is hidden |
| File dropped | Progress bar sweeps the drop zone | 1 s linear, infinite while uploading | `transform` only |
| New file added to list | Slides in from the left with an emerald flash | 700 ms | Once per item |
| Stanza drawn | Cyan scan line sweeps across the box once | 1 s ease-in-out | Shows the box is being created |
| Suggestion approved | Box turns solid emerald with a gold pulse | 400 ms | Once |
| Stanza added to Handy Book | Item drops in with a small overshoot and an emerald ring | 800 ms, `cubic-bezier(.2,.9,.3,1.2)` | Once |
| Stanza removed | Spins out, flashes red, fades | 850 ms, ease-in | Once; the list then reflows |
| Thumbnail hover | Lifts 2 px | 200 ms | `transform` only |
| Export starts | Cover reveals top to bottom with a scan line | 1 s, once | The reveal is a clip-path inset |
| Export finishes | Success toast slides in | 400 ms | Then auto-dismisses |
| Fault opens | Panel glitches in (short horizontal jitter) | 500 ms | FAULTS chip blinks while the panel is open |
| Theme change | Background and text colours cross-fade | 250 ms | Only on `body` and `:root`, never on every element |
| Empty state | Faint star tile turns slowly | 90 s per turn, infinite | Only in empty states, paused when off-screen, off under reduced motion |

**Motion rules**

- Animate only `transform`, `opacity`, and `clip-path`. Avoid animating `top`, `left`, `width`, or `height`.
- Use `box-shadow` glow only on small elements (LEDs, nodes, handles), never on large panels or the PDF page.
- No more than **three** infinite animations on screen at once. Count them when adding a new one.
- Pause every infinite animation when `document.visibilityState === "hidden"` (add a class on `<html>`).
- Respect `prefers-reduced-motion: reduce`: remove all non-essential animations and keep state changes as colour changes only.
- Durations: 120 ms for hover, 200 ms for panels, 250–400 ms for state changes, up to 1 s for one-off effects.
- Easing: `cubic-bezier(.2,.9,.3,1.2)` for entries that should feel physical, `ease-in` for removals, `linear` for flow pulses.

---

## 10. Speed Without Compromise

The design must not cost speed. Targets below are **goals to measure**, not promises. Claude Code must measure them in a real browser before claiming any of them.

- **Lazy rendering:** only visible PDF pages are rendered by PDF.js. Thumbnails are cached and rendered at low resolution.
- **Virtualised lists:** the file list, the Kalaam catalogue, and the stanza library use windowing.
- **Overlay separation:** the bounding-box overlay re-renders alone. The PDF canvas is never re-rendered when a box moves.
- **Pointer events** are throttled to one update per animation frame (`requestAnimationFrame`).
- **CSS containment:** apply `contain: layout paint` to each panel and to the viewer, so one panel's changes do not force the whole page to recalculate.
- **Backend log and ScopeTrace** are updated in batches every 250 ms, not on every message.
- **Search** is debounced at 150 ms and runs on an indexed catalogue, not on the rendered list.
- **No `backdrop-filter`** on working surfaces. It is expensive on large views.
- **Static SVG** for the background tile and brand mark, so they are not re-rasterised on each frame.
- **Indexing and export run in a background worker.** The UI stays responsive during upload and processing.

**Targets to measure** (record actual numbers, not estimates):
- Shell interactive in under 1 s on the owner's machine (cold, local).
- Pointer-driven box drag stays near 60 fps (check the Chrome Performance panel).
- Opening a 5,000-page document shows the first page without rendering the rest.

---

## 11. Engineer-Friendly Behaviour

- **Units everywhere.** Coordinates are PDF points, sizes are millimetres or points, times are milliseconds. Never show a bare number.
- **Hover reveals the formula.** For example, hovering the scaled-size readout shows `scale = output_w / source_w` with the values filled in.
- **"Show technical details" toggle** on every panel that shows a computed value. Off by default for a clean view.
- **Step Inspector** lists the real backend steps (for example `parse_outline`, `resolve_link`, `clip_region`), each with its duration and inputs.
- **Copyable fault reports** with the error code, cause, fix suggestion, failing step, file and line, and stack trace.
- **Keyboard shortcuts** shown with `?`: `B` draw box, `Delete` remove, `Ctrl/⌘+Z` undo, `Ctrl/⌘+Shift+Z` redo, `Ctrl/⌘+K` command palette, `[` and `]` previous and next stanza.

---

## 12. Accessibility

- All text passes WCAG AA contrast in every preset. Check it, do not assume it.
- Never rely on colour alone. Each LED state is paired with a text label or icon.
- All controls are keyboard reachable with a visible focus ring in `--amber`, 2px, with 2px offset.
- Canvases and overlays have `aria-label`s. The backend log uses `aria-live="polite"` and is throttled so screen readers are not flooded.
- Reduced motion removes the animations in section 9 (except state colour changes).

---

## 13. Process for Claude Code

Read the reference first: the owner's PDF//SCOPE repo at `github.com/moizzzz5253/pdf-editor`, in particular `app/static/style.css`, `app/static/theme.js`, and `app/static/index.html`. Use it to match the look and motion. Port the approach (CSS variables on `:root`, presets saved to `localStorage`, the clipped panel, and the LED and pipeline patterns). Do not copy its vanilla JavaScript; this app is React and TypeScript.

Then build in this order:

1. **Tokens and theme.** Create `tokens.css` with the four presets. Port `theme.js` as a small React hook. Build a `/styleguide` route that shows every token, button, LED state, box state, and animation, so the owner can review them before any feature screen is built.
2. **Shell and pipeline.** Top bar, pipeline strip with the five stages (with fake timing data, clearly labelled as sample), and the theme panel.
3. **Library.** Upload, file list, Kalaam catalogue. Show the empty, loading, error, and populated states.
4. **Viewer and Stanza Editor.** PDF.js page, box overlay, ruler, filmstrip, Step Inspector.
5. **Handy Book Studio.** Page-spread canvas and strip.
6. **Settings.**

For each screen, check:
- Empty, loading, error, and populated states.
- Arabic and Urdu text (a long Urdu title, a short Arabic title, and a mixed Latin-Arabic title).
- All four presets, including contrast.
- A 1024px-wide window.
- Keyboard-only navigation.
- Reduced motion turned on.
- The count of infinite animations on screen (must stay at three or fewer).

**Browser testing is required.** The project brief says the viewer has not yet been verified in a real browser. Do not mark any screen as done until it has been checked in a real browser, and say clearly what was and was not tested.

Take screenshots after each screen, describe any visual problems you see, then fix them.

Record every deviation from this brief in `DESIGN_NOTES.md` with the reason. Do not deviate silently.

---

## 14. Anti-patterns Checklist

Before finishing any screen, verify that none of these appear:

- [ ] Hardcoded hex colours in component files (use the tokens).
- [ ] Neon glows on large panels, the PDF page, or body text.
- [ ] Animations on `top`, `left`, `width`, or `height`.
- [ ] More than three infinite animations on one screen.
- [ ] Islamic ornament behind text, the PDF page, or a bounding box.
- [ ] Any depiction of a person, or any logo or emblem of an organisation.
- [ ] Arabic or Urdu text in the Latin font, or left-aligned RTL text.
- [ ] Bounding boxes that look the same when suggested and when approved.
- [ ] Numbers without units.
- [ ] Icon-only buttons without a tooltip and shortcut.
- [ ] Generic spinners for content areas.
- [ ] Blank panels without an empty state.
- [ ] Text smaller than 12px.
- [ ] A feature marked as done before it has been checked in a real browser.

---

## 15. Definition of Done

The UI is complete when:

- A first-time user can see the pipeline, import a PDF, find a Kalaam, and draw a box without reading any instructions.
- The pipeline shows real state and real timings, so a user can tell what the software is doing at any moment.
- Arabic, Urdu, and English text all look intentional and correctly aligned, in every preset.
- The source PDF page is clearly the focus of every viewer screen, and nothing sits on top of it except the box overlay.
- All four presets pass contrast checks, and the theme choice persists across reloads.
- Animations add meaning, stay under the performance limits in section 9, and are off under reduced motion.
- The app feels like the PDF//SCOPE concept, reskinned for Kalaam, not like a generic dashboard with a green colour.
- Nothing in the app depicts a person or uses a logo or emblem of any organisation.
