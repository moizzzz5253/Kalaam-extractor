"""Generates a synthetic PDF with a contents page of internal links and bookmarks.

This is a *stand-in* for a real Kalaam collection; it exercises the same code paths
(GOTO links, outline entries, out-of-range links). Real Arabic/Urdu glyph rendering
must be verified separately with a real source PDF and an Arabic-capable font.
"""
from pathlib import Path
import pymupdf


def build(path: Path) -> Path:
    doc = pymupdf.open()
    # Create every page first so link targets exist.
    toc = doc.new_page(width=595, height=842)
    for n in range(1, 8):
        pg = doc.new_page(width=595, height=842)
        pg.insert_text((72, 100), f"Page {n + 1} body", fontsize=14)
        # simulated stanzas as labelled blocks (stand-in for real text blocks)
        for s in range(3):
            y = 160 + s * 200
            pg.insert_text((300, y), f"Stanza {s + 1}", fontsize=12)
            pg.draw_rect(pymupdf.Rect(72, y - 14, 520, y + 120), color=(0, 0, 0), width=0.5)

    # page 0: contents, with clickable links to kalaam start pages.
    # Re-fetch by index: a page handle created before later pages were added can go stale.
    toc = doc[0]
    toc.insert_text((72, 80), "Contents", fontsize=20)
    entries = [("Kalaam A - Sample Noha", 2), ("Kalaam B - Sample Marsiya", 4), ("Kalaam C - Sample Madeh", 6)]
    for i, (label, target) in enumerate(entries):
        y = 130 + i * 30
        toc.insert_text((72, y), label, fontsize=12)
        rect = pymupdf.Rect(72, y - 12, 400, y + 4)
        toc.insert_link({"kind": pymupdf.LINK_GOTO, "from": rect, "page": target, "to": pymupdf.Point(0, 0)})
    # A named-destination link (not a direct page GOTO) — must be classified as "named", not dropped.
    toc.insert_text((72, 260), "Named destination", fontsize=12)
    toc.insert_link({"kind": pymupdf.LINK_NAMED, "from": pymupdf.Rect(72, 248, 300, 264), "name": "NextPage"})

    doc.set_toc([[1, "Kalaam A - Sample Noha", 3], [1, "Kalaam B - Sample Marsiya", 5], [2, "Stanza detail", 5]])
    doc.save(str(path))
    doc.close()
    return path


if __name__ == "__main__":
    import sys
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "fixture.pdf")
    print(build(out))
