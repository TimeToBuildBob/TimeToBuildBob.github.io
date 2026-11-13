#!/usr/bin/env python3
"""Submit newly published URLs to IndexNow after a deploy.

IndexNow (https://www.indexnow.org) notifies Bing, Yandex, Seznam, Naver and
other participating engines the moment a URL appears, instead of waiting for
the next crawl. Google does not participate; it discovers through the sitemap
and Search Console.

Which URLs are "new" is decided by diffing the sitemap that was live before
this deploy against the freshly built ``_site/sitemap.xml``: a URL is
submitted when it is absent from the old sitemap or its ``<lastmod>`` changed.
Diffing sitemaps (rather than mapping changed ``_posts/`` filenames to URLs)
respects custom ``permalink`` front matter and skips ``public: false`` posts,
because Jekyll already resolved both when it built the sitemap.

Fail-soft by design: a missing previous sitemap submits nothing (a first run
must not dump all ~1.6k URLs), and every network failure exits 0 so indexing
never blocks a deploy.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
ENDPOINT = "https://api.indexnow.org/indexnow"
# IndexNow accepts up to 10k URLs per request; a deploy that "changes" more
# than this is a sitemap-format change, not a publish — don't spam engines.
MAX_URLS = 100


def parse_sitemap(xml_text: str) -> dict[str, str]:
    """Return {loc: lastmod} for every <url> in a sitemap document."""
    root = ET.fromstring(xml_text.strip())
    entries: dict[str, str] = {}
    for url in root.findall("sm:url", NS):
        loc = (url.findtext("sm:loc", default="", namespaces=NS) or "").strip()
        lastmod = (url.findtext("sm:lastmod", default="", namespaces=NS) or "").strip()
        if loc:
            entries[loc] = lastmod
    return entries


def changed_urls(previous: dict[str, str], current: dict[str, str]) -> list[str]:
    """URLs that are new in ``current`` or whose lastmod changed."""
    return sorted(
        loc for loc, lastmod in current.items() if previous.get(loc) != lastmod
    )


def build_payload(urls: list[str], key: str, site_url: str) -> dict[str, object]:
    host = urlparse(site_url).netloc
    return {
        "host": host,
        "key": key,
        "keyLocation": f"{site_url.rstrip('/')}/{key}.txt",
        "urlList": urls,
    }


def _status(url: str, timeout: float = 10.0) -> int:
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except (urllib.error.URLError, TimeoutError):
        return 0


def wait_until_live(urls: list[str], deadline_s: float, poll_s: float = 15.0) -> list[str]:
    """Poll until each URL returns 200 or the deadline passes; return live ones.

    GitHub Pages publishes the gh-pages push a minute or two after the deploy
    step finishes. Submitting before then would send crawlers to a 404.
    """
    pending = list(urls)
    live: list[str] = []
    end = time.monotonic() + deadline_s
    while pending:
        pending_next = []
        for url in pending:
            (live if _status(url) == 200 else pending_next).append(url)
        pending = pending_next
        if not pending or time.monotonic() >= end:
            break
        time.sleep(poll_s)
    if pending:
        print(f"indexnow: {len(pending)} URL(s) never went live, skipping: {pending}")
    return live


def submit(payload: dict[str, object], timeout: float = 30.0) -> int:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except (urllib.error.URLError, TimeoutError) as exc:
        print(f"indexnow: request failed: {exc}")
        return 0


def find_key(site_dir: Path) -> str | None:
    """The key is the stem of the single 32-hex ``<key>.txt`` at the site root."""
    for path in sorted(site_dir.glob("*.txt")):
        stem = path.stem
        if len(stem) == 32 and all(c in "0123456789abcdef" for c in stem):
            if path.read_text().strip() == stem:
                return stem
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--previous", type=Path, required=True,
                        help="sitemap.xml that was live before this deploy")
    parser.add_argument("--site-dir", type=Path, default=Path("_site"))
    parser.add_argument("--site-url", default="https://timetobuildbob.com")
    parser.add_argument("--wait", type=float, default=300.0,
                        help="seconds to wait for new URLs to go live")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if not args.previous.is_file() or args.previous.stat().st_size == 0:
        print("indexnow: no previous sitemap; skipping (first run or fetch failed)")
        return 0

    key = find_key(args.site_dir)
    if not key:
        print("indexnow: no <key>.txt in site root; skipping")
        return 0

    try:
        previous = parse_sitemap(args.previous.read_text())
        current = parse_sitemap((args.site_dir / "sitemap.xml").read_text())
    except (ET.ParseError, OSError) as exc:
        print(f"indexnow: could not read sitemaps: {exc}; skipping")
        return 0

    urls = changed_urls(previous, current)
    if not urls:
        print("indexnow: no new or updated URLs")
        return 0
    if len(urls) > MAX_URLS:
        print(f"indexnow: {len(urls)} changed URLs exceeds cap {MAX_URLS}; "
              "likely a sitemap format change, skipping")
        return 0

    print(f"indexnow: {len(urls)} changed URL(s):")
    for url in urls:
        print(f"  {url}")
    if args.dry_run:
        print(json.dumps(build_payload(urls, key, args.site_url), indent=2))
        return 0

    live = wait_until_live(urls, args.wait)
    if not live:
        return 0
    status = submit(build_payload(live, key, args.site_url))
    # 200 OK and 202 Accepted (key validation pending) are both success.
    print(f"indexnow: submitted {len(live)} URL(s), HTTP {status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
