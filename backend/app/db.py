"""SQLite persistence via SQLAlchemy. Kept engine-portable for future PostgreSQL."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

INDEX_VERSION = 1  # bump when the inspection output schema changes -> forces re-index


def data_dir() -> Path:
    d = Path(os.environ.get("KX_DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
    (d / "pdfs").mkdir(parents=True, exist_ok=True)
    return d


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    content_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    storage_name: Mapped[str] = mapped_column(String(80))   # internal name only, never a user path
    file_size: Mapped[int] = mapped_column(Integer)
    page_count: Mapped[int] = mapped_column(Integer)
    index_version: Mapped[int] = mapped_column(Integer, default=0)
    index_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    indexing_status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


_engine = None
_Session = None


def init_db() -> None:
    global _engine, _Session
    db_path = data_dir() / "library.sqlite3"
    _engine = create_engine(f"sqlite:///{db_path}", future=True)
    Base.metadata.create_all(_engine)
    _Session = sessionmaker(bind=_engine, expire_on_commit=False)


def session():
    if _Session is None:
        init_db()
    return _Session()


def find_by_hash(sha: str) -> Document | None:
    with session() as s:
        return s.execute(select(Document).where(Document.content_hash == sha)).scalar_one_or_none()


def get_document(doc_id: int) -> Document | None:
    with session() as s:
        return s.get(Document, doc_id)


def list_documents() -> list[Document]:
    with session() as s:
        return list(s.execute(select(Document).order_by(Document.created_at.desc())).scalars())


def save_index(doc_id: int, index_dict: dict) -> None:
    with session() as s:
        doc = s.get(Document, doc_id)
        doc.index_json = json.dumps(index_dict, ensure_ascii=False)
        doc.index_version = INDEX_VERSION
        doc.indexing_status = "indexed"
        s.commit()


def load_index(doc: Document) -> dict | None:
    if doc.index_json and doc.index_version == INDEX_VERSION:
        return json.loads(doc.index_json)
    return None
