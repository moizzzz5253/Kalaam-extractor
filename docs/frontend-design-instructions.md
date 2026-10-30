# Frontend Design Instructions: Kalaam & Stanza PDF Studio

Give this file to Claude Code before it builds any UI. Read it fully before writing components. These instructions override any default styling, template, or component-library look.

---

## 1. Goal

Build a **premium, editorial document-production studio**, not a generic admin dashboard and not a plain HTML page. The user works with religious and literary texts in Urdu, Arabic, and Lisan ud Daawat. The interface should feel calm, dignified, precise, and crafted, like a well-designed rare-book atelier crossed with a professional design tool such as Figma or Lightroom.

The app should feel:

- **Warm and literary**, with paper-like surfaces and considered typography.
- **Precise and technical**, because it handles coordinates, bounding boxes, and PDF layout.
- **Quietly luxurious**, with restraint, generous spacing, and fine detail.
- **Respectful of the content.** The source PDF pages are the stars. The chrome should recede around them.

The app should not feel:

- Like a default Bootstrap, Material, or stock shadcn/ui template left unstyled.
- Like a SaaS landing page with gradients, glowing blobs, or purple-to-blue hero sections.
- Cluttered, noisy, or full of competing colors.
- Childish, or like a cartoon Islamic-themed kitsch design with ornate clip-art.

---

## 2. Aesthetic Direction

Name the direction **"Manuscript Atelier."** Apply it consistently.

- **Surfaces:** Warm off-white "parchment" in light mode, and deep ink-charcoal (not pure black) in dark mode. Avoid pure #FFFFFF and pure #000000 anywhere.
- **Structure:** Thin hairline dividers, subtle inner borders, soft layered shadows only on floating elements such as popovers and the drag ghost. Cards should look like cut paper, with 1px borders and very light shadows.
- **Accent:** A single muted **antique gold** accent for primary actions, selection, and focus. Use it sparingly, as a jewel rather than a paint bucket.
- **Secondary accent:** A deep **teal or emerald** for success and "verified" states only.
- **Warning and error:** Muted terracotta and a deep oxblood. Never neon red or bright orange.
- **Ornament:** Minimal. At most one subtle geometric or arabesque motif, used only in empty states, the app logo, and the export cover preview. Never on working surfaces.

---

## 3. Design Tokens (implement as CSS variables)

Define all colors, radii, spacing, and type scales as tokens in one place, such as `src/styles/tokens.css`. Components must use tokens, never hardcoded hex values.

```css
:root {
  /* Surfaces: light */
  --surface-0: #F7F3EA;   /* app background, parchment */
  --surface-1: #FBF8F1;   /* cards, panels */
  --surface-2: #F0EADB;   /* inset wells, toolbars */
  --surface-3: #E6DCC7;   /* pressed / active */
  --ink-900:   #1E1B16;   /* primary text */
  --ink-700:   #4A443A;   /* secondary text */
  --ink-500:   #7A7263;   /* tertiary, placeholders */
  --hairline:  #D9CFBA;   /* dividers, borders */

  /* Accents */
  --gold-600: #A8822E;    /* primary action */
  --gold-400: #C9A55A;    /* hover, focus ring */
  --gold-100: #F3EAD3;    /* selected row background */
  --teal-600: #1F6F66;    /* verified, success */
  --teal-100: #DCEEEB;
  --terracotta-600: #B2573A;  /* warning */
  --oxblood-600: #7E2B2B;     /* error, destructive */

  /* Bounding-box overlay (see section 7) */
  --box-idle:     rgba(168, 130, 46, 0.55);
  --box-hover:    rgba(168, 130, 46, 0.85);
  --box-selected: #A8822E;
  --box-fill:     rgba(201, 165, 90, 0.12);
  --box-suggest:  #1F6F66;    /* AI-suggested, not yet approved */
}

[data-theme="dark"], :root:not([data-theme="light"]) {
  /* Override in dark mode, same token names */
  --surface-0: #17151F;
  --surface-1: #1F1C27;
  --surface-2: #27232F;
  --surface-3: #332E3D;
  --ink-900:   #F2EDE2;
  --ink-700:   #C9C1AF;
  --ink-500:   #8F8775;
  --hairline:  #3A3445;
  --gold-600:  #D2B06A;
  --gold-400:  #E3C98E;
  --gold-100:  #3A3122;
}
```

**Radii:** 6px for inputs and buttons, 10px for cards, 14px for large panels and modals. Never mix in random values.

**Spacing:** Use a 4px base scale (4, 8, 12, 16, 24, 32, 48). Do not use arbitrary pixel values.

**Elevation:** Three levels only. Flat (no shadow), raised (1px border plus a faint shadow), floating (a stronger shadow for popovers and modals).

---

## 4. Typography

Typography carries much of the identity. Get it right.

**Latin / UI:** Use a refined, highly legible sans-serif for the interface, such as **Geist**, **Inter**, or **IBM Plex Sans**. Choose one and stick with it.

**Display / headings:** Use an elegant serif for page titles, Kalaam titles in the catalogue, and the export cover. Good choices are **Fraunces**, **Newsreader**, or **Cormorant Garamond**. Use it for H1 and H2 only.

**Arabic script:** Load these Google Fonts and apply them through `:lang(ar)`, `:lang(ur)`, and a `.font-arabic` utility class:

- **Amiri** or **Noto Naskh Arabic** for Arabic body and headings.
- **Noto Nastaliq Urdu** for Urdu verse display, because Nastaliq is the traditional Urdu script. Use it for stanza previews and titles, not for dense UI labels, since its line height is large.
- **Scheherazade New** as a fallback for diacritics-heavy text.

Users may also upload their own font. **Al Kanz** is commonly used for Lisan ud Daawat. Support runtime font registration through `@font-face`, but never hardcode it as the only option.

**Type scale** (base 15px for UI, which suits dense tooling):

| Role | Size / line height | Notes |
|---|---|---|
| Display | 40 / 1.1 | Serif, cover and empty states |
| H1 | 28 / 1.2 | Serif |
| H2 | 20 / 1.3 | Serif |
| H3 | 16 / 1.4 | Sans, medium weight |
| Body | 15 / 1.55 | Sans |
| Small / meta | 12.5 / 1.45 | Sans, `--ink-500`, uppercase tracking for labels only |
| Arabic verse preview | 22 / 2.0 | Nastaliq or Naskh, generous line height |

**Rules:**

- Never use all-caps for long text.
- Use `font-variant-numeric: tabular-nums` for page numbers, coordinates, counts, and sizes so they align.
- Coordinates and technical values (x, y, width, height in points) use a **monospace** font, such as JetBrains Mono or IBM Plex Mono, at 12px.
- Use `text-wrap: balance` for headings and `text-wrap: pretty` for body paragraphs.

---

## 5. Bidirectional Text and Internationalization

Do not force the entire application into RTL. The chrome stays left-to-right.

- Wrap every Arabic, Urdu, or Lisan ud Daawat string in an element with `dir="rtl"` and the correct `lang` attribute, or use a `<bdi>` where needed.
- Titles and text in Arabic script should right-align within their own cells or cards, not across the whole layout.
- Numeric stanza and page numbering follows a **separate setting**: Western digits (1, 2, 3), Arabic-Indic (١، ٢، ٣), or Eastern Arabic / Persian (۱، ۲، ۳). Render them with the chosen numeral system using a formatter, not by string replacement.
- Mirror icons only where direction carries meaning, such as a "next" arrow inside an Arabic reading context. Do not mirror the entire UI.
- Test every major screen with a long Urdu title, a short Arabic title, and a mixed Latin-and-Arabic title to confirm that line breaks, alignment, and ellipsis behave correctly.

---

## 6. Layout and Information Architecture

### App shell

- **Left rail (56–64px, icon-only, expands on hover):** Dashboard, Library, Kalaam, Viewer, Stanzas, Handy Book Studio, Settings. Use a thin gold indicator bar for the active item, not a filled background block.
- **Top bar (48px):** Breadcrumb or document title on the left, a central search field (⌘K or Ctrl+K opens a command palette), and an indexing or export status indicator on the right.
- **Content area:** Uses the full remaining space. No wasted outer padding.

### Split-view for the Stanza Editor (the most important screen)

Three columns, resizable with a drag handle:

- **Left (240–320px):** Kalaam navigator. A tree or list of Kalaam with search, stanza counts, and verification badges.
- **Center (flexible, dominant):** PDF canvas with the bounding-box overlay. Background is a slightly darker surface (`--surface-2`) so the white page reads as paper on a desk. Add a subtle inner shadow to the page.
- **Right (280–340px):** Inspector. Shows the selected box's coordinates, stanza number, title, verification state, and detection confidence. Below it sits the "Selected stanzas" list.

Add a **bottom filmstrip** (80px tall) of page thumbnails for fast navigation. Thumbnails are lazily loaded.

### Stanza Library

A **masonry or grid of cards**. Each card shows a cropped preview of the stanza, the Kalaam name, the source document, and the verification state. Hovering shows a larger preview tooltip. Include a toggle between grid and compact list.

### Handy Book Studio

A **storyboard model**:

- **Left:** The ordered content list, grouped by Kalaam, with drag handles on the left edge and collapsible groups.
- **Center:** A **page-spread canvas** showing the A4 or A5 page as a physical sheet. Stanzas are placed as scaled previews with clear margins and safe-area guides, shown as faint dashed lines that appear only while dragging.
- **Right:** Layout controls (page size, orientation, margins, numbering style, background template) in collapsible sections.
- A **page strip** across the bottom shows every page of the book as small thumbnails, which can be dragged to reorder.

### Dashboard

Calm and editorial, not a grid of colorful stat widgets. Use:

- A greeting-style header in the serif display face, for example "Continue your Handy Book."
- A "Continue" section with large recent-project cards.
- A "Processing" strip that appears only while jobs are running.
- Recent documents as a simple refined table, not a chart-heavy panel.

---

## 7. Bounding-Box Editor (critical visual craft)

This is the signature interaction, so give it extra care.

- **Idle box:** A 1px `--box-idle` border with a very light `--box-fill`. No heavy fill.
- **Hover:** Border becomes `--box-hover`, and the fill increases slightly.
- **Selected:** A 2px solid `--box-selected` border with **eight handles**: four corners and four edges. Handles are 8px squares with a surface-colored fill and a gold border. Show them only on selected or hovered boxes.
- **Suggested by AI (unapproved):** A **dashed** `--box-suggest` border, with a small confidence chip in the corner (for example "94%"). Approved boxes switch to solid. This makes review obvious at a glance.
- **Stanza number label:** A small pill in the top-left corner, styled in the serif face for Latin numerals or the Naskh face for Arabic numerals.
- **Dragging:** The box shows a live dimension readout in monospace (w × h in PDF points), and faint alignment guides snap to neighbouring boxes and page margins.
- **Canvas cursor:** Crosshair when drawing, grab when hovering a box, and the appropriate resize cursors on handles.
- **Animations:** 120ms ease-out for hover and selection. Never animate the PDF canvas itself, since that causes flicker and wastes performance.

Keep the overlay rendered as an SVG or absolutely positioned layer above the canvas. The overlay must never block scrolling or zooming unless the user is actively drawing or dragging.

---

## 8. Motion and Micro-interactions

- Use motion sparingly and purposefully. Durations: 120ms for hovers, 200ms for panels and popovers, 280ms for page transitions.
- Easing: `cubic-bezier(0.2, 0, 0, 1)` for most motion.
- Respect `prefers-reduced-motion` by disabling non-essential animation.
- **Loading:** Use skeletons that match the final layout shape, with a gentle shimmer in `--surface-2`. Never use generic spinners for content areas. Spinners are acceptable only for small inline actions.
- **Indexing progress:** A thin gold progress line along the top of the document card, with a short text label such as "Indexed 412 of 5,108 pages · 38 Kalaam found." Keep it honest. Show real numbers, not decorative percentages.
- **Drag and drop in the Handy Book:** The dragged item lifts with a soft shadow and slight rotation no greater than 1°. A gold insertion line marks the drop position. The list reflows smoothly.
- **Toasts:** Appear bottom-right, use the surface-1 background with a colored left border, and dismiss automatically after 4 seconds unless they carry an error.

---

## 9. Empty States and Onboarding

Every screen needs a deliberate empty state. Do not leave blank panels.

- **Empty library:** A serif headline ("Begin with a manuscript"), one sentence of guidance, a primary "Import PDF" button, and a faint line-art illustration of an open book drawn in the gold accent. Keep it simple.
- **No stanzas selected:** A short instruction with a keyboard hint, such as "Press B to draw a box, or click Detect to suggest stanzas."
- **No results in search:** Show the query, then suggest adjusting the filters, and explain whether the document lacks searchable text.

---

## 10. Components and Patterns

Use a component library such as **shadcn/ui** as a foundation, but **restyle every component** through the tokens above. The defaults must not be visible in the final UI.

Build these custom components:

- `<PageCanvas />`: PDF.js canvas with lazy rendering and an overlay layer.
- `<BoundingBox />`: Handles interaction states described in section 7.
- `<KalaamTree />`: Virtualised list for thousands of entries (use `react-virtual` or similar).
- `<StanzaCard />`: Preview with lazy-loaded thumbnail.
- `<BookStoryboard />`: Storyboard canvas for the Handy Book.
- `<NumeralFormatter />`: Renders numbers in the selected numeral system.
- `<ArabicText />`: Wraps any Arabic-script string with the correct `dir`, `lang`, and font.
- `<IndexingStatus />`: Honest progress reporting.
- `<CommandPalette />`: Global search and actions, opened with ⌘K or Ctrl+K.

**Tooltips:** Every icon-only button must have a tooltip showing its name and keyboard shortcut.

**Keyboard shortcuts:** Show a discoverable overlay on `?`. Include arrow keys for nudging a selected box by 1px, Shift plus arrow for 10px, and Alt plus arrow for resizing.

---

## 11. Accessibility

- All text meets WCAG AA contrast in both themes. Check the gold accent on parchment carefully, and use `--gold-600` for text only on light surfaces.
- All interactive elements are keyboard reachable, with a visible focus ring in `--gold-400`, 2px, with 2px offset.
- Bounding boxes must be operable by keyboard alone, with arrow-key nudging and a selectable list of boxes.
- Provide `aria-label`s on canvases and overlays, and announce indexing and export completion through an `aria-live` region.
- Never rely on color alone to convey verification state. Pair each color with an icon or text label.

---

## 12. Performance Rules for UI

- Virtualise every long list: the Kalaam catalogue, the stanza library, and the document list.
- Render only visible PDF pages, and cache rendered thumbnails.
- Avoid re-rendering the whole page canvas when only the overlay changes. Keep them separate components with memoisation.
- Use CSS `contain` and `will-change` sparingly, and only on the canvas layer during drag.
- Debounce search input by about 150ms.
- Do not block the main thread during PDF upload. Show progress and keep the rest of the UI responsive.

---

## 13. Things to Avoid (Anti-patterns Checklist)

Before finishing any screen, verify that none of the following appear:

- [ ] Default shadcn/ui or Tailwind colors left unstyled.
- [ ] Purple, indigo, or blue-to-pink gradients.
- [ ] Glassmorphism or heavy blur on working surfaces.
- [ ] Emoji used as icons.
- [ ] Generic spinners for content loading.
- [ ] Stat cards with decorative sparklines on the dashboard.
- [ ] Pure white or pure black backgrounds.
- [ ] Hardcoded hex values in component files.
- [ ] Arabic text inheriting the Latin font, or left-aligned RTL text.
- [ ] Bounding boxes that look identical whether AI-suggested or approved.
- [ ] Hidden or unlabelled icon buttons.
- [ ] Empty panels without a designed empty state.
- [ ] Decorative Islamic ornament on working screens.
- [ ] Text smaller than 12px.

---

## 14. Process Instructions for Claude Code

1. **Set up the token file and fonts first.** Create `tokens.css`, load the fonts, and build a small `/styleguide` route that renders every token, type style, button state, and box state. Review it visually before building any feature screen.
2. **Build the app shell** (rail, top bar, theme toggle, command palette) and confirm it works in both light and dark modes.
3. **Build one complete screen at a time**, in this order: Library, then the Viewer and Stanza Editor, then the Stanza Library, then the Handy Book Studio, then Settings. Do not start a second screen until the first is polished.
4. **For each screen, verify:** empty state, loading state, error state, populated state, RTL content, dark mode, keyboard navigation, and a narrow window of about 1024px.
5. **Take screenshots** of each screen after completing it, and describe any visual issues you notice before fixing them.
6. **Document any deviation** from these instructions in a `DESIGN_NOTES.md` file, with the reason. Do not deviate silently.

If you are unsure between two visual options, choose the one that is calmer, more typographically refined, and more restrained. Restraint is the core of this design.

---

## 15. Definition of Done for the Design

The UI is complete when:

- A first-time user can import a PDF, find a Kalaam, and draw a box without needing instructions.
- Arabic, Urdu, and English text all look intentional and correctly aligned.
- The source PDF page is clearly the focus of every viewer screen.
- Light and dark themes are both polished, not merely inverted.
- The app looks like a designed product, not a template with the default theme applied.
