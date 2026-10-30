from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.make_fixture import build


@pytest.fixture(scope="session")
def fixture_pdf(tmp_path_factory) -> Path:
    return build(tmp_path_factory.mktemp("pdf") / "sample.pdf")


def test_outline_is_read_as_zero_based_pages(fixture_pdf):
    from app.pdf_inspect import inspect_pdf
    r = inspect_pdf(fixture_pdf)
    titles = [(o.title, o.target_page, o.level) for o in r.outline]
    assert ("Kalaam A - Sample Noha", 2, 1) in titles   # 1-based 3 -> 0-based 2
    assert ("Kalaam B - Sample Marsiya", 4, 1) in titles
    assert ("Stanza detail", 4, 2) in titles


def test_internal_links_resolve_and_named_links_are_classified(fixture_pdf):
    from app.pdf_inspect import inspect_pdf
    r = inspect_pdf(fixture_pdf)
    on_toc = [l for l in r.links if l.page == 0]
    targets = sorted(l.target_page for l in on_toc if l.kind == "internal")
    assert targets == [2, 4, 6]
    assert any(l.kind == "named" for l in on_toc)  # kept, not silently dropped


def test_page_count(fixture_pdf):
    from app.pdf_inspect import inspect_pdf
    assert inspect_pdf(fixture_pdf).page_count == 8


def test_api_upload_index_reuse_and_render(tmp_path, monkeypatch, fixture_pdf):
    monkeypatch.setenv("KX_DATA_DIR", str(tmp_path / "data"))
    from app import db
    from app.main import app
    db._engine = None
    db._Session = None
    with TestClient(app) as c:
        data = fixture_pdf.read_bytes()

        r = c.post("/api/documents", files={"file": ("My Collection.pdf", data, "application/pdf")})
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["duplicate"] is False and body["page_count"] == 8
        doc_id = body["id"]
        assert "storage_name" not in body and "/" not in str(body)  # no path leakage

        # duplicate detection by content hash
        dup = c.post("/api/documents", files={"file": ("again.pdf", data, "application/pdf")}).json()
        assert dup["duplicate"] is True and dup["id"] == doc_id

        # first index computes, second reuses the stored index
        first = c.post(f"/api/documents/{doc_id}/index").json()
        assert first["reused"] is False
        second = c.post(f"/api/documents/{doc_id}/index").json()
        assert second["reused"] is True

        # on-demand page render returns a PNG
        png = c.get(f"/api/documents/{doc_id}/pages/2.png")
        assert png.status_code == 200 and png.content[:8] == b"\x89PNG\r\n\x1a\n"

        # rejects non-PDF
        bad = c.post("/api/documents", files={"file": ("x.pdf", b"hello", "application/pdf")})
        assert bad.status_code == 400
