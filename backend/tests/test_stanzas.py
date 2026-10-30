from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tests.make_fixture import build


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KX_DATA_DIR", str(tmp_path / "data"))
    from app import db
    from app.main import app
    db._engine = None
    db._Session = None
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def doc_id(client, tmp_path) -> int:
    pdf: Path = build(tmp_path / "sample.pdf")  # 8 pages, 595 x 842 pt
    r = client.post("/api/documents", files={"file": ("s.pdf", pdf.read_bytes(), "application/pdf")})
    return r.json()["id"]


def test_create_numbers_sequentially_and_lists_in_reading_order(client, doc_id):
    a = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 2, "rect": [72, 346, 520, 480]})
    b = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 2, "rect": [72, 146, 520, 280], "title": " Kalaam A "})
    c = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 1, "rect": [72, 146, 520, 280]})
    assert a.status_code == b.status_code == c.status_code == 201, a.text
    assert [a.json()["number"], b.json()["number"], c.json()["number"]] == [1, 2, 3]
    assert b.json()["title"] == "Kalaam A"  # trimmed
    assert b.json()["verified"] is False

    listed = client.get(f"/api/documents/{doc_id}/stanzas").json()
    # page first, then top to bottom
    assert [(s["page"], s["rect"][1]) for s in listed] == [(1, 146), (2, 146), (2, 346)]


def test_rect_is_normalised_and_clamped_to_the_page(client, doc_id):
    r = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 0, "rect": [600, 900, -10, 800]})
    assert r.status_code == 201, r.text
    assert r.json()["rect"] == [0, 800, 595, 842]


def test_rejects_tiny_boxes_and_bad_pages(client, doc_id):
    tiny = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 0, "rect": [10, 10, 12, 50]})
    assert tiny.status_code == 422
    off = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 8, "rect": [10, 10, 100, 100]})
    assert off.status_code == 422
    missing = client.post("/api/documents/999/stanzas", json={"page": 0, "rect": [10, 10, 100, 100]})
    assert missing.status_code == 404


def test_update_and_delete(client, doc_id):
    sid = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 3, "rect": [72, 146, 520, 280]}).json()["id"]

    r = client.patch(f"/api/stanzas/{sid}", json={"rect": [80, 150, 500, 300], "number": 7, "title": "x", "verified": True})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rect"] == [80, 150, 500, 300] and body["number"] == 7 and body["verified"] is True

    # partial update keeps other fields
    body = client.patch(f"/api/stanzas/{sid}", json={"title": "y"}).json()
    assert body["number"] == 7 and body["title"] == "y" and body["new_page"] is False

    assert client.patch(f"/api/stanzas/{sid}", json={"new_page": True}).json()["new_page"] is True

    # new stanzas continue after the highest number
    nxt = client.post(f"/api/documents/{doc_id}/stanzas", json={"page": 3, "rect": [72, 346, 520, 480]}).json()
    assert nxt["number"] == 8

    assert client.delete(f"/api/stanzas/{sid}").status_code == 204
    assert client.delete(f"/api/stanzas/{sid}").status_code == 404
    assert [s["id"] for s in client.get(f"/api/documents/{doc_id}/stanzas").json()] == [nxt["id"]]
