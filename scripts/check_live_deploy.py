#!/usr/bin/env python3
"""Fail unless the live site serves the newest post of the freshly built site.

The deploy workflow's green signal stops at the ``gh-pages`` push. GitHub's
Pages builder then publishes asynchronously and can fail on its own
(2026-11-07: the 03:06Z and 18:04Z builds errored while the workflow was green,
so the site served stale content for ~15 hours). This check takes the first
``<item><link>`` of the local ``_site/feed.xml`` and requires it to appear in the
live feed (a newer deploy may already have superseded it), polls while Pages
catches up, and asks Pages to rebuild once if it does not.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
import urllib.request
from collections.abc import Callable
from pathlib import Path

ITEM_LINK = re.compile(r"<item>.*?<link>([^<]+)</link>", re.DOTALL)


def item_links(feed_xml: str) -> list[str]:
    """Item links in feed order (newest first)."""
    return [link.strip() for link in ITEM_LINK.findall(feed_xml)]


def fetch(url: str, headers: dict[str, str] | None = None, method: str = "GET") -> str:
    request = urllib.request.Request(url, headers=headers or {}, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def wait_for_live(
    expected: str,
    get_live_links: Callable[[], list[str]],
    rebuild: Callable[[], None],
    *,
    timeout: float,
    interval: float,
    rebuild_after: float,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> bool:
    """Poll until ``expected`` is in the live feed; request one rebuild."""
    start = clock()
    rebuilt = False
    while True:
        try:
            live = get_live_links()
        except OSError as error:
            live = []
            print(f"live feed unreachable: {error}")
        if expected in live:
            return True
        elapsed = clock() - start
        if elapsed >= timeout:
            print(f"live newest post is {live[:1]!r}; expected {expected!r}")
            return False
        if not rebuilt and elapsed >= rebuild_after:
            rebuilt = True
            print("live site still stale; requesting a Pages rebuild")
            try:
                rebuild()
            except OSError as error:
                print(f"Pages rebuild request failed: {error}")
        sleep(interval)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-dir", type=Path, default=Path("_site"))
    parser.add_argument("--live-url", default="https://timetobuildbob.com")
    parser.add_argument("--repository", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--timeout", type=float, default=900)
    parser.add_argument("--interval", type=float, default=30)
    parser.add_argument("--rebuild-after", type=float, default=240)
    args = parser.parse_args()

    built = item_links((args.site_dir / "feed.xml").read_text(encoding="utf-8"))
    if not built:
        print("built feed.xml has no <item>; nothing to verify against")
        return 1
    expected = built[0]

    feed_url = f"{args.live_url.rstrip('/')}/feed.xml"

    def get_live_links() -> list[str]:
        # Query string defeats intermediate caches; Pages ignores it.
        return item_links(fetch(f"{feed_url}?t={int(time.time())}"))

    def rebuild() -> None:
        fetch(
            f"https://api.github.com/repos/{args.repository}/pages/builds",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {args.token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            method="POST",
        )

    ok = wait_for_live(
        expected,
        get_live_links,
        rebuild,
        timeout=args.timeout,
        interval=args.interval,
        rebuild_after=args.rebuild_after,
    )
    if ok:
        print(f"Live site serves the newest post: {expected}")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
