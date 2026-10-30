"""FastAPI application — Milestone 1: library, inspection, on-demand page rendering."""
from __future__ import annotations

import re
import secrets
import shutil
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db
from .pdf_inspect import file_sha256, inspect_pdf, open_pdf, render_page_png

MAX_UPLOAD_BYTES = 1024 * 1024 * 1024  # 1 GB, configurable later via settings

from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Kalaam & Stanza PDF Extractor", version="0.1.0", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_title(filename: str) -> str:
    stem = Path(filename).stem
    cleaned = re.sub(r"[^\w\- .()؀-ۿ]", "_", stem).strip()
    return (cleaned or "document")[:200]


def _pdf_path(doc: db.Document) -> Path:
    return db.data_dir() / "pdfs" / doc.storage_name


def _doc_out(doc: db.Document) -> dict:
    return {
        "id": doc.id,
        "title": doc.title,
        "original_filename": doc.original_filename,
        "file_size": doc.file_size,
        "page_count": doc.page_count,
        "indexing_status": doc.indexing_status,
        "created_at": doc.created_at.isoformat(),
    }


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "version": app.version}


@app.get("/api/documents")
def list_documents() -> list[dict]:
    return [_doc_out(d) for d in db.list_documents()]


@app.post("/api/documents", status_code=201)
def upload_document(file: UploadFile = File(...)) -> dict:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Only .pdf files are accepted")
    if file.content_type not in ("application/pdf", "application/octet-stream", None):
        raise HTTPException(400, "Unexpected content type for PDF")

    # Stage the upload under a random name, hash it, then decide reuse vs. store.
    staging = db.data_dir() / "pdfs" / f".staging-{secrets.token_hex(8)}.part"
    size = 0
    with open(staging, "wb") as out:
        while chunk := file.file.read(1 << 20):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                staging.unlink(missing_ok=True)
                raise HTTPException(413, "File exceeds upload limit")
            out.write(chunk)

    with open(staging, "rb") as fh:
        header = fh.read(5)
    if header != b"%PDF-":
        staging.unlink(missing_ok=True)
        raise HTTPException(400, "File is not a valid PDF (missing %PDF header)")

    sha = file_sha256(staging)
    existing = db.find_by_hash(sha)
    if existing:  # duplicate upload: do not store or index twice
        staging.unlink(missing_ok=True)
        return {**_doc_out(existing), "duplicate": True}

    storage_name = f"{sha[:16]}-{secrets.token_hex(4)}.pdf"
    final = db.data_dir() / "pdfs" / storage_name
    shutil.move(str(staging), final)

    try:
        d = open_pdf(final)
        pages = d.page_count
        d.close()
    except Exception as exc:  # malformed / encrypted
        final.unlink(missing_ok=True)
        raise HTTPException(422, f"Could not open PDF: {exc}")

    with db.session() as s:
        doc = db.Document(
            title=_safe_title(file.filename),
            original_filename=Path(file.filename).name[:255],
            content_hash=sha,
            storage_name=storage_name,
            file_size=size,
            page_count=pages,
            indexing_status="pending",
        )
        s.add(doc)
        s.commit()
        s.refresh(doc)
        out = _doc_out(doc)
    return {**out, "duplicate": False}


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: int) -> dict:
    doc = _require(doc_id)
    return _doc_out(doc)


@app.post("/api/documents/{doc_id}/index")
def index_document(doc_id: int, force: bool = False) -> dict:
    doc = _require(doc_id)
    if not force:
        cached = db.load_index(doc)
        if cached is not None:  # once-only indexing: reuse stored index
            return {"reused": True, "index": cached}
    result = inspect_pdf(_pdf_path(doc))
    index = result.to_dict()
    db.save_index(doc_id, index)
    return {"reused": False, "index": index}


@app.get("/api/documents/{doc_id}/index")
def get_index(doc_id: int) -> dict:
    doc = _require(doc_id)
    cached = db.load_index(doc)
    if cached is None:
        raise HTTPException(404, "Document not indexed yet; POST /index first")
    return cached


@app.get("/api/documents/{doc_id}/pdf")
def get_pdf(doc_id: int) -> Response:
    """Serves the immutable original for PDF.js in the browser."""
    doc = _require(doc_id)
    path = _pdf_path(doc)
    if not path.exists():
        raise HTTPException(410, "Source PDF is missing; relink required")
    return Response(content=path.read_bytes(), media_type="application/pdf")


@app.get("/api/documents/{doc_id}/pages/{page}.png")
def get_page_png(doc_id: int, page: int, zoom: float = 1.5) -> Response:
    """0-based page index. Rendered on demand for thumbnails / previews."""
    doc = _require(doc_id)
    zoom = min(max(zoom, 0.25), 4.0)
    try:
        png = render_page_png(_pdf_path(doc), page, zoom)
    except IndexError:
        raise HTTPException(404, "Page out of range")
    return Response(content=png, media_type="image/png")


def _require(doc_id: int) -> db.Document:
    doc = db.get_document(doc_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return doc


# ---------- Stanzas: hand-drawn boxes, stored as metadata pointing into the original PDF ----------

MIN_STANZA_PT = 4.0  # smaller boxes are almost certainly a stray click


class StanzaIn(BaseModel):
    page: int = Field(ge=0)
    rect: tuple[float, float, float, float]  # x0, y0, x1, y1 in PDF points, top-left origin
    number: int | None = Field(default=None, ge=1)
    title: str = Field(default="", max_length=500)


class StanzaPatch(BaseModel):
    rect: tuple[float, float, float, float] | None = None
    number: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, max_length=500)
    verified: bool | None = None
    new_page: bool | None = None


def _stanza_out(st: db.Stanza) -> dict:
    return {
        "id": st.id,
        "document_id": st.document_id,
        "page": st.page,
        "rect": [st.x0, st.y0, st.x1, st.y1],
        "number": st.number,
        "title": st.title,
        "verified": st.verified,
        "new_page": st.new_page,
        "updated_at": st.updated_at.isoformat(),
    }


@lru_cache(maxsize=16)
def _page_sizes(storage_name: str) -> tuple[tuple[float, float], ...]:
    """Every page's size in points, read once per stored PDF (originals never change)."""
    d = open_pdf(db.data_dir() / "pdfs" / storage_name)
    try:
        return tuple((p.rect.width, p.rect.height) for p in d)
    finally:
        d.close()


def _page_size(doc: db.Document, page: int) -> tuple[float, float]:
    if not 0 <= page < doc.page_count:
        raise HTTPException(422, f"Page {page} is outside 0..{doc.page_count - 1}")
    return _page_sizes(doc.storage_name)[page]


def _clean_rect(rect: tuple[float, float, float, float], size: tuple[float, float]) -> tuple[float, ...]:
    """Normalise corner order, clamp to the page and reject boxes too small to be a stanza."""
    w, h = size
    x0, x1 = sorted((rect[0], rect[2]))
    y0, y1 = sorted((rect[1], rect[3]))
    x0, x1 = max(0.0, x0), min(w, x1)
    y0, y1 = max(0.0, y0), min(h, y1)
    if x1 - x0 < MIN_STANZA_PT or y1 - y0 < MIN_STANZA_PT:
        raise HTTPException(422, f"Box must be at least {MIN_STANZA_PT:g} pt wide and tall inside the page")
    return tuple(round(v, 2) for v in (x0, y0, x1, y1))


@app.get("/api/documents/{doc_id}/stanzas")
def list_stanzas(doc_id: int) -> list[dict]:
    _require(doc_id)
    return [_stanza_out(s) for s in db.list_stanzas(doc_id)]


@app.post("/api/documents/{doc_id}/stanzas", status_code=201)
def create_stanza(doc_id: int, body: StanzaIn) -> dict:
    doc = _require(doc_id)
    x0, y0, x1, y1 = _clean_rect(body.rect, _page_size(doc, body.page))
    with db.session() as s:
        st = db.Stanza(
            document_id=doc_id, page=body.page, x0=x0, y0=y0, x1=x1, y1=y1,
            number=body.number or db.next_stanza_number(doc_id), title=body.title.strip(),
        )
        s.add(st)
        s.commit()
        s.refresh(st)
        return _stanza_out(st)


@app.patch("/api/stanzas/{stanza_id}")
def update_stanza(stanza_id: int, body: StanzaPatch) -> dict:
    with db.session() as s:
        st = s.get(db.Stanza, stanza_id)
        if st is None:
            raise HTTPException(404, "Stanza not found")
        if body.rect is not None:
            doc = _require(st.document_id)
            st.x0, st.y0, st.x1, st.y1 = _clean_rect(body.rect, _page_size(doc, st.page))
        if body.number is not None:
            st.number = body.number
        if body.title is not None:
            st.title = body.title.strip()
        if body.verified is not None:
            st.verified = body.verified
        if body.new_page is not None:
            st.new_page = body.new_page
        s.commit()
        s.refresh(st)
        return _stanza_out(st)


@app.delete("/api/stanzas/{stanza_id}", status_code=204)
def delete_stanza(stanza_id: int) -> Response:
    with db.session() as s:
        st = s.get(db.Stanza, stanza_id)
        if st is None:
            raise HTTPException(404, "Stanza not found")
        s.delete(st)
        s.commit()
    return Response(status_code=204)
