# Design notes

Deviations from `docs/frontend-design-instructions.md`, with reasons (section 14.6 asks for this file).

## First pass: "Manuscript Atelier" applied to the existing screens (Library, Viewer)

### Done as specified
- Tokens in `frontend/src/styles/tokens.css`. Components use tokens only. The single literal colour is the
  white of a rendered PDF page (`.page.is-rendered`), because the page is the source paper itself.
- Fonts: Inter (UI), Fraunces (H1/H2), JetBrains Mono (zoom readout), Noto Naskh Arabic / Amiri /
  Noto Nastaliq Urdu (Arabic script). Arabic glyphs in the UI fall back to Noto Naskh through the font stack.
- App shell: 60px icon rail with a gold indicator bar and tooltips, a 48px top bar with breadcrumb and status chip.
- Library: serif heading, refined table, drag-and-drop import, skeleton loading, designed empty state with
  line-art book, toasts bottom-right (errors stay until dismissed).
- Viewer: navigator panel (document, bookmarks with filter and active item, notices), PDF on a darker "desk",
  floating toolbar (page, zoom, fit width), lazy-loaded bottom filmstrip.
- Keyboard: ← / → page, Home / End, + / − zoom. Focus ring is `--gold-400`, 2px, 2px offset.
- Light and dark themes; respects `prefers-reduced-motion`.

### Deviations
| Spec | What we did | Why |
|---|---|---|
| Dark-mode selector `[data-theme="dark"], :root:not([data-theme="light"])` (§3) | OS preference via `prefers-color-scheme`, overridden by the rail's theme toggle (`data-theme`) | The spec's selector makes dark the default for everyone, ignoring the OS setting. |
| shadcn/ui as a foundation (§10) | Plain CSS and hand-drawn SVG icons, no new npm packages | Keeps the dependency list small; the connection used for setup was slow and unreliable. Can be revisited. |
| `/styleguide` route first (§14.1) | Not built yet | Reviewed directly on the real screens instead. Planned before the Stanza Editor. |
| Command palette, Ctrl+K search, `?` shortcut overlay (§6, §10) | Not built yet | No search backend yet; added with the Kalaam catalogue. |
| Dashboard, Kalaam, Stanzas, Handy Book, Settings screens (§6) | Shown in the rail as disabled, with a "coming" tooltip | Those features do not exist yet. |
| Three-column Stanza Editor with inspector (§6) | Two columns (navigator and canvas) | The inspector has nothing to show until bounding boxes exist. |
| Virtualised lists (§12) | Not virtualised yet (bookmarks, filmstrip, library) | Fine at the current sizes (30 pages). Needed before 5,000-page PDFs: the filmstrip creates one `<img loading="lazy">` per page. |
| Numeral system setting (§5) | Not built yet | Arrives with output page numbering. |

### Known gaps to check later
- Fonts load from Google Fonts. Offline, the UI falls back to system fonts.
- Not yet tested with a long Urdu title, a short Arabic title, or a mixed title in the library (§5).
