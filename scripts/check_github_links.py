#!/usr/bin/env python3
"""Check _site/ HTML for github.com links to private or nonexistent repos.

Scans built HTML files for github.com/OWNER/REPO links and rejects any that
appear on the denylist (known private / deleted repos). An allowlist of
specific URLs can override the denylist for historical posts kept as provenance.

Exit 0 = clean. Exit 1 = bad links found.

Usage:
    python3 scripts/check_github_links.py [--site-dir _site]
"""

import argparse
import re
import sys
from pathlib import Path

# Repos that must never appear on the public site — stale names or repos with
# no legitimate reason to be linked from a public blog post.
DENIED_REPOS = {
    "ErikBjare/alice",        # another agent's private workspace
    "ErikBjare/gptme-infra",  # old repo, merged into gptme-cloud
    "ErikBjare/gptme-landing", # old repo, merged into gptme-cloud
}

# Repos that are private today but intentionally referenced in blog posts as
# provenance (research notes, design docs, issue/commit links). Readers who
# click these get a 404 for now; the links are kept for context and will
# resolve when the repo goes public. Add a repo here to suppress the warning.
KNOWN_PRIVATE_ALLOWED_REPOS: set[str] = {
    "ErikBjare/bob",        # Bob's brain repo — primary source for blog provenance
    "TimeToBuildBob/bob",   # same repo under the social handle
}

# Specific full github.com URLs that are intentional exceptions (provenance in
# old posts). Add a URL here to suppress the denylist error for that URL only.
# Keep entries in alphabetical order. Each entry is the URL prefix to match.
ALLOWLISTED_URLS: set[str] = set()


def extract_github_links(html: str) -> list[str]:
    """Return all github.com/OWNER/REPO[/...] URLs found in an HTML string."""
    # Match href="..." and plain text URLs
    pattern = r'https?://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)(?:/[^"\s<>]*)?'
    return re.findall(r'https?://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:/[^"\s<>]*)?', html)


def repo_from_url(url: str) -> str:
    """Extract OWNER/REPO from a github.com URL."""
    m = re.match(r'https?://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)', url)
    return m.group(1) if m else ""


def check_file(path: Path) -> list[tuple[str, str]]:
    """Return list of (url, repo) pairs that violate the denylist."""
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        print(f"Warning: could not read {path}: {e}", file=sys.stderr)
        return []

    bad: list[tuple[str, str]] = []
    for url in extract_github_links(content):
        repo = repo_from_url(url)
        if repo in DENIED_REPOS:
            # Check if this specific URL is allowlisted
            if any(url.startswith(allowed) for allowed in ALLOWLISTED_URLS):
                continue
            bad.append((url, repo))
        # known-private-allowed repos are silently skipped — no error, no noise
    return bad


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-dir", default="_site", help="Built site directory (default: _site)")
    args = parser.parse_args()

    site_dir = Path(args.site_dir)
    if not site_dir.exists():
        print(f"Error: site directory '{site_dir}' does not exist. Run 'make build' first.", file=sys.stderr)
        return 1

    html_files = sorted(site_dir.rglob("*.html"))
    if not html_files:
        print(f"Warning: no HTML files found in '{site_dir}'", file=sys.stderr)
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
        print("     add the URL to ALLOWLISTED_URLS for a single-URL provenance exception,")
        print("     or add the repo to KNOWN_PRIVATE_ALLOWED_REPOS for intentional private references.")
        return 1

    print(f"✓ No private/nonexistent github.com links found ({len(html_files)} HTML files checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
