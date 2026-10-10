#!/usr/bin/env python3
"""Check _site/ HTML for github.com links to private or nonexistent repos.

Scans built HTML/JSON files for github.com/OWNER/REPO links and rejects any
that appear on the denylist (known private / deleted repos).

Provenance links into the private brain repo are fine as long as readers never
see them: posts keep them inside ``<!-- brain links: ... -->`` HTML comments
(the same convention the brain's validate_blog_urls.py enforces at source), and
this check ignores those comments. A *visible* link to a private repo 404s for
every visitor and fails the check.

Escape hatch: ALLOWLISTED_URLS — specific full URLs to except.

Exit 0 = clean. Exit 1 = bad links found.

Usage:
    python3 scripts/check_github_links.py [--site-dir _site]
"""

import argparse
import re
import sys
from pathlib import Path

# Repos that are private or nonexistent as of 2026-10-02, so a visible link to
# them 404s for readers.
PRIVATE_OR_MISSING_REPOS = {
    "ErikBjare/alice",
    "ErikBjare/bob",
    "TimeToBuildBob/bob",
    "ErikBjare/gptme-infra",
    "ErikBjare/gptme-landing",
}

# Specific github.com URLs that are intentional exceptions. Add a URL here to
# suppress the denylist error for that URL only.
# Keep entries in alphabetical order. Each entry is the URL prefix to match.
ALLOWLISTED_URLS: set[str] = set()

# OWNER and REPO path segments. GitHub names may contain dots but never end in
# one, and sentences often put a "." right after a bare URL — requiring the
# final character to be alnum/_/- stops "…/gptme-infra." from being read as a
# repo named "gptme-infra." and silently skipping the denylist.
_SEGMENT = r"[A-Za-z0-9_.-]*[A-Za-z0-9_-]"
# Hidden provenance comments — invisible to readers, so not a broken link.
_BRAIN_LINKS_COMMENT_RE = re.compile(
    r"<!--\s*brain\s+links\s*:.*?-->", re.DOTALL | re.IGNORECASE
)
_GITHUB_REPO_RE = re.compile(
    rf"https?://github\.com/(?P<owner>{_SEGMENT})/(?P<repo>{_SEGMENT})"
)


def extract_github_links(content: str, *, strip_html_comments: bool = True) -> list[str]:
    """Return github.com/OWNER/REPO URLs found in HTML or JSON content."""
    if strip_html_comments:
        content = _BRAIN_LINKS_COMMENT_RE.sub("", content)
    return [m.group(0) for m in _GITHUB_REPO_RE.finditer(content)]


def repo_from_url(url: str) -> str:
    """Extract OWNER/REPO from a github.com URL."""
    m = _GITHUB_REPO_RE.match(url)
    return f"{m.group('owner')}/{m.group('repo')}" if m else ""


def check_file(path: Path) -> list[tuple[str, str]]:
    """Return list of (url, repo) pairs that violate the denylist."""
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"Warning: could not read {path}: {e}", file=sys.stderr)
        return []

    bad: list[tuple[str, str]] = []
    for url in extract_github_links(content, strip_html_comments=path.suffix.lower() == ".html"):
        repo = repo_from_url(url)
        if repo not in PRIVATE_OR_MISSING_REPOS:
            continue
        # Check if this specific URL is allowlisted
        if any(url.startswith(allowed) for allowed in ALLOWLISTED_URLS):
            continue
        bad.append((url, repo))
    return bad


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-dir", default="_site", help="Built site directory (default: _site)")
    args = parser.parse_args(argv)

    site_dir = Path(args.site_dir)
    if not site_dir.exists():
        print(f"Error: site directory '{site_dir}' does not exist. Run 'make build' first.", file=sys.stderr)
        return 1

    html_files = sorted([*site_dir.rglob("*.html"), *site_dir.rglob("*.json")])
    if not html_files:
        print(f"Warning: no HTML/JSON files found in '{site_dir}'", file=sys.stderr)
        return 0

    total_bad = 0
    seen: set[tuple[str, str]] = set()  # (file_rel, url) deduplication

    for path in html_files:
        bad = check_file(path)
        for url, repo in bad:
            key = (str(path.relative_to(site_dir)), url)
            if key in seen:
                continue
            seen.add(key)
            rel = path.relative_to(site_dir)
            print(f"❌ {rel}: links to private/nonexistent repo {repo!r}")
            print(f"   URL: {url}")
            total_bad += 1

    if total_bad:
        print(f"\n{total_bad} private/nonexistent github.com link(s) found.")
        print("Fix: replace the link with a public equivalent or plain text,")
        print("     move provenance links into a <!-- brain links: ... --> comment,")
        print("     or add the URL to ALLOWLISTED_URLS for a single-URL exception.")
        return 1

    print(f"✓ No private/nonexistent github.com links found ({len(html_files)} files checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
