#!/usr/bin/env python3
"""Fail when a post links to a /blog/<slug>/ page that has no source post.

Posts synced from the brain can be unpublished (`public: false`), so they never
land in `_posts/`. A link to one of them 404s on the live site.
"""

import re
import sys
from pathlib import Path

POSTS_DIR = Path("_posts")
SITE_HOSTS = r"(?:https?://(?:www\.)?(?:timetobuildbob\.com|timetobuildbob\.github\.io)|(?<![\w/.:-]))"
LINK_RE = re.compile(SITE_HOSTS + r"/blog/([A-Za-z0-9._-]+)/?(?=[)\s\"'#?]|$)")
DATE_PREFIX_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-")


def post_slugs(posts_dir: Path = POSTS_DIR) -> set[str]:
    return {DATE_PREFIX_RE.sub("", p.stem) for p in posts_dir.glob("*.md")}


def find_broken_links(path: Path, slugs: set[str]) -> list[tuple[int, str]]:
    broken = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        for m in LINK_RE.finditer(line):
            if m.group(1) not in slugs:
                broken.append((lineno, m.group(1)))
    return broken


def main(argv: list[str]) -> int:
    slugs = post_slugs()
    files = [Path(f) for f in argv] or sorted(POSTS_DIR.glob("*.md"))
    failed = False
    for path in files:
        if path.suffix != ".md" or path.parent.name != POSTS_DIR.name:
            continue
        # pre-commit passes staged paths, including deleted files
        if not path.exists():
            continue
        for lineno, slug in find_broken_links(path, slugs):
            failed = True
            print(f"{path}:{lineno}: link to /blog/{slug}/ has no matching post in _posts/")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
