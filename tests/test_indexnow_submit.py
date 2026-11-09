from __future__ import annotations

import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "indexnow_submit.py"
spec = importlib.util.spec_from_file_location("indexnow_submit", MODULE_PATH)
assert spec and spec.loader
indexnow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(indexnow)

KEY = "0123456789abcdef0123456789abcdef"


def sitemap(*entries: tuple[str, str]) -> str:
    urls = "".join(
        f"<url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>"
        for loc, lastmod in entries
    )
    return (
        '\n<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}</urlset>\n"
    )


def test_parse_sitemap_tolerates_leading_whitespace() -> None:
    parsed = indexnow.parse_sitemap(sitemap(("https://x.com/a/", "2026-11-08")))
    assert parsed == {"https://x.com/a/": "2026-11-08"}


def test_changed_urls_reports_new_and_updated_only() -> None:
    prev = {"https://x.com/a/": "1", "https://x.com/b/": "1", "https://x.com/gone/": "1"}
    cur = {"https://x.com/a/": "1", "https://x.com/b/": "2", "https://x.com/c/": "1"}
    assert indexnow.changed_urls(prev, cur) == ["https://x.com/b/", "https://x.com/c/"]


def test_build_payload_shape() -> None:
    payload = indexnow.build_payload(["https://timetobuildbob.com/blog/x/"], KEY,
                                     "https://timetobuildbob.com")
    assert payload == {
        "host": "timetobuildbob.com",
        "key": KEY,
        "keyLocation": f"https://timetobuildbob.com/{KEY}.txt",
        "urlList": ["https://timetobuildbob.com/blog/x/"],
    }


def test_find_key_requires_matching_content(tmp_path: Path) -> None:
    (tmp_path / "robots.txt").write_text("User-agent: *")
    (tmp_path / f"{KEY}.txt").write_text("wrong")
    assert indexnow.find_key(tmp_path) is None
    (tmp_path / f"{KEY}.txt").write_text(KEY)
    assert indexnow.find_key(tmp_path) == KEY


def _site(tmp_path: Path, xml: str) -> Path:
    site = tmp_path / "_site"
    site.mkdir()
    (site / "sitemap.xml").write_text(xml)
    (site / f"{KEY}.txt").write_text(KEY)
    return site


def test_missing_previous_sitemap_submits_nothing(tmp_path: Path, monkeypatch) -> None:
    site = _site(tmp_path, sitemap(("https://x.com/a/", "1")))
    monkeypatch.setattr(indexnow, "submit", lambda *_: (_ for _ in ()).throw(AssertionError))
    assert indexnow.main(["--previous", str(tmp_path / "nope.xml"),
                          "--site-dir", str(site)]) == 0


def test_cap_skips_mass_change(tmp_path: Path, monkeypatch) -> None:
    entries = [(f"https://x.com/{i}/", "1") for i in range(indexnow.MAX_URLS + 1)]
    site = _site(tmp_path, sitemap(*entries))
    prev = tmp_path / "prev.xml"
    prev.write_text(sitemap())
    monkeypatch.setattr(indexnow, "submit", lambda *_: (_ for _ in ()).throw(AssertionError))
    assert indexnow.main(["--previous", str(prev), "--site-dir", str(site)]) == 0


def test_submits_only_live_new_urls(tmp_path: Path, monkeypatch) -> None:
    site = _site(tmp_path, sitemap(("https://x.com/old/", "1"), ("https://x.com/new/", "2")))
    prev = tmp_path / "prev.xml"
    prev.write_text(sitemap(("https://x.com/old/", "1")))
    sent: list[dict] = []
    monkeypatch.setattr(indexnow, "_status", lambda url, timeout=10.0: 200)
    monkeypatch.setattr(indexnow, "submit", lambda payload, timeout=30.0: sent.append(payload) or 200)
    assert indexnow.main(["--previous", str(prev), "--site-dir", str(site),
                          "--site-url", "https://x.com"]) == 0
    assert len(sent) == 1
    assert sent[0]["urlList"] == ["https://x.com/new/"]
    assert sent[0]["host"] == "x.com"
