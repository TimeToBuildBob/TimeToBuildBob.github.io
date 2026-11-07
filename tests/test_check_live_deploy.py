from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "check_live_deploy.py"
spec = importlib.util.spec_from_file_location("check_live_deploy", MODULE_PATH)
assert spec and spec.loader
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)

FEED = """<rss><channel><link>https://x/</link>
<item><title>B</title><link>https://x/blog/b/</link></item>
<item><title>A</title><link>https://x/blog/a/</link></item>
</channel></rss>"""


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
