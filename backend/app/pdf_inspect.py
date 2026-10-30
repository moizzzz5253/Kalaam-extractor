"""Read-only PDF inspection: page count, outline (bookmarks), internal links.

Coordinates are stored in PDF user space (points, origin bottom-left) via
PyMuPDF's unrotated page space. Page numbers exposed by this module are
**0-based physical indexes**; the UI converts to 1-based for display.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from pathlib import Path

import pymupdf  # PyMuPDF


@dataclass
class OutlineItem:
    title: str
    level: int
    target_page: int | None  # 0-based physical index, None if unresolved
    kind: str                # "internal" | "external" | "unresolved"


@dataclass
class LinkItem:
    page: int                       # 0-based source page
    rect: tuple[float, float, float, float]  # PDF points, top-left origin (PyMuPDF native)
    target_page: int | None
    kind: str                       # "internal" | "external" | "named" | "unresolved"
    uri: str | None = None


@dataclass
class InspectionResult:
    page_count: int
    metadata: dict
    page_labels_present: bool
    outline: list[OutlineItem] = field(default_factory=list)
    links: list[LinkItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "page_count": self.page_count,
            "metadata": self.metadata,
            "page_labels_present": self.page_labels_present,
            "outline": [asdict(o) for o in self.outline],
            "links": [asdict(l) for l in self.links],
            "warnings": self.warnings,
        }


def file_sha256(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def open_pdf(path: Path) -> pymupdf.Document:
    doc = pymupdf.open(str(path))
    if doc.needs_pass:
        doc.close()
        raise ValueError("PDF is encrypted; password-protected files are not supported yet")
    return doc


def _resolve_link_target(doc: pymupdf.Document, link: dict) -> tuple[int | None, str]:
    kind = link.get("kind")
    if kind == pymupdf.LINK_GOTO:
        page = link.get("page")
        if page is None or page < 0 or page >= doc.page_count:
            return None, "unresolved"
        return page, "internal"
    if kind == pymupdf.LINK_NAMED:
        return None, "named"
    if kind == pymupdf.LINK_URI:
        return None, "external"
    return None, "unresolved"


def inspect_pdf(path: Path) -> InspectionResult:
    doc = open_pdf(path)
    try:
        warnings: list[str] = []
        result = InspectionResult(
            page_count=doc.page_count,
            metadata={k: v for k, v in (doc.metadata or {}).items() if v},
            page_labels_present=bool(doc.get_page_labels()),
        )

        # ---- Outline / bookmarks ----
        for level, title, page_no, *_ in doc.get_toc(simple=True):
            # page_no is 1-based, or -1 / 0 when the destination is not a page
            if page_no and 1 <= page_no <= doc.page_count:
                result.outline.append(OutlineItem(title.strip(), level, page_no - 1, "internal"))
            else:
                result.outline.append(OutlineItem(title.strip(), level, None, "unresolved"))
        if not result.outline:
            warnings.append("No bookmarks/outline found; rely on the contents-page links.")

        # ---- Internal links on every page (lazy-safe: we read link lists, not pixels) ----
        unresolved = 0
        for pno in range(doc.page_count):
            page = doc[pno]
            for link in page.get_links():
                target, kind = _resolve_link_target(doc, link)
                if kind == "unresolved":
                    unresolved += 1
                uri = link.get("uri") if kind == "external" else None
                result.links.append(
                    LinkItem(
                        page=pno,
                        rect=tuple(link["from"]),
                        target_page=target,
                        kind=kind,
                        uri=uri,
                    )
                )
        if unresolved:
            warnings.append(f"{unresolved} link(s) could not be resolved to a page.")

        return result
    finally:
        doc.close()


def render_page_png(path: Path, page_index: int, zoom: float = 1.5) -> bytes:
    """Render a single page on demand. Never renders the whole document."""
    doc = open_pdf(path)
    try:
        if not 0 <= page_index < doc.page_count:
            raise IndexError(page_index)
        pix = doc[page_index].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()
