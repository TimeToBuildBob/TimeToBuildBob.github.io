from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "check_live_deploy.py"
spec = importlib.util.spec_from_file_location("check_live_deploy", MODULE_PATH)
assert spec and spec.loader
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)

FEED = """<rss><channel><link>https://x/</link>
<item><title>B</title><link>https://x/blog/b/</link></item>
<item><title>A</title><link>https://x/blog/a/</link></item>
</channel></rss>"""


@pytest.mark.parametrize(
    "headers, method",
    [
        (None, "GET"),
        ({"Authorization": "Bearer test", "Accept": "application/json"}, "POST"),
    ],
)
def test_fetch_identifies_deploy_checker_without_dropping_headers(
    monkeypatch, headers, method
) -> None:
    from io import BytesIO

    requests = []

    def urlopen(request, timeout):
        requests.append(request)
        assert timeout == 30
        return BytesIO(b"response")

    monkeypatch.setattr(live.urllib.request, "urlopen", urlopen)
    assert live.fetch("https://example.com/feed.xml", headers, method) == "response"
    request = requests[0]
    assert request.get_header("User-agent") == "Bob-Deploy-Check/1.0"
    assert request.get_method() == method
    for name, value in (headers or {}).items():
        assert request.get_header(name.capitalize()) == value


def test_fetch_preserves_explicit_user_agent(monkeypatch) -> None:
    from io import BytesIO

    def urlopen(request, timeout):
        assert request.get_header("User-agent") == "Custom-Checker/2.0"
        return BytesIO(b"response")

    monkeypatch.setattr(live.urllib.request, "urlopen", urlopen)
    assert (
        live.fetch("https://example.com/feed.xml", {"User-Agent": "Custom-Checker/2.0"})
        == "response"
    )


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.now += seconds


def run(responses: list, **kwargs) -> tuple[bool, int]:
    clock = FakeClock()
    rebuilds: list[int] = []
    iterator = iter(responses)

    def get_live_links() -> list[str]:
        value = next(iterator, responses[-1])
        if isinstance(value, Exception):
            raise value
        return value

    ok = live.wait_for_live(
        "https://x/blog/b/",
        get_live_links,
        lambda: rebuilds.append(1),
        content_matches=kwargs.get("content_matches", lambda: True),
        timeout=kwargs.get("timeout", 100),
        interval=10,
        rebuild_after=kwargs.get("rebuild_after", 30),
        clock=clock,
        sleep=clock.sleep,
    )
    return ok, len(rebuilds)


def test_item_links_skips_channel_link_and_keeps_order() -> None:
    assert live.item_links(FEED) == ["https://x/blog/b/", "https://x/blog/a/"]


def test_passes_immediately_when_live_already_current() -> None:
    assert run([["https://x/blog/b/"]]) == (True, 0)


def test_passes_when_a_newer_post_superseded_the_expected_one() -> None:
    assert run([["https://x/blog/c/", "https://x/blog/b/"]]) == (True, 0)


def test_requests_one_rebuild_then_passes_when_pages_catches_up() -> None:
    stale = ["https://x/blog/a/"]
    ok, rebuilds = run([stale] * 5 + [["https://x/blog/b/"]])
    assert (ok, rebuilds) == (True, 1)


def test_fails_after_timeout_with_a_single_rebuild() -> None:
    assert run([["https://x/blog/a/"]]) == (False, 1)


def test_transient_network_error_is_retried() -> None:
    assert run([OSError("boom"), ["https://x/blog/b/"]]) == (True, 0)


def test_stale_content_requests_one_rebuild_and_times_out() -> None:
    assert run([["https://x/blog/b/"]], content_matches=lambda: False) == (False, 1)


def test_content_catches_up_after_rebuild() -> None:
    matches = iter([False] * 5 + [True])
    assert run([["https://x/blog/b/"]], content_matches=lambda: next(matches)) == (
        True,
        1,
    )


def test_transient_page_error_is_retried() -> None:
    matches = iter([OSError("page unavailable"), True])

    def content_matches():
        result = next(matches)
        if isinstance(result, Exception):
            raise result
        return result

    assert run([["https://x/blog/b/"]], content_matches=content_matches) == (True, 0)


@pytest.mark.parametrize("current", [False, True])
@pytest.mark.parametrize("newline", ["\n", "\r\n"])
def test_same_permalink_requires_current_rendered_content(
    tmp_path, monkeypatch, current, newline
) -> None:
    """A published URL alone cannot prove that this build reached readers."""
    import sys

    (tmp_path / "feed.xml").write_text(FEED, encoding="utf-8")
    post = tmp_path / "blog" / "b" / "index.html"
    post.parent.mkdir(parents=True)
    content = f"<article>Edited post</article>{newline}"
    post.write_bytes(content.encode("utf-8"))
    requests = []

    def fetch(url, headers=None, method="GET"):
        requests.append((url, method))
        if "/pages/builds" in url:
            return "{}"
        if "/feed.xml" in url:
            return FEED
        return content if current else f"<article>Previous post</article>{newline}"

    monkeypatch.setattr(live, "fetch", fetch)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "check_live_deploy.py",
            "--site-dir",
            str(tmp_path),
            "--live-url",
            "https://x",
            "--repository",
            "owner/site",
            "--token",
            "test",
            "--timeout",
            "0",
        ],
    )
    assert live.main() == (0 if current else 1)
    assert any("/blog/b/?t=" in url for url, _ in requests)
