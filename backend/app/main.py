"""FastAPI application — Milestone 1: library, inspection, on-demand page rendering."""
from __future__ import annotations

import re
import secrets
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .pdf_inspect import file_sha256, inspect_pdf, render_page_png

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
        from .pdf_inspect import open_pdf
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
