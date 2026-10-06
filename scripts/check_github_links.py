#!/usr/bin/env python3
"""Check _site/ HTML for github.com links to private or nonexistent repos.

Scans built HTML files for github.com/OWNER/REPO links and rejects any that
appear on the denylist (known private / deleted repos).

Two escape hatches:
  * KNOWN_PRIVATE_ALLOWED_REPOS — repos that are private today but are kept in
    posts as provenance (they will resolve when the repos go public).
  * ALLOWLISTED_URLS — specific full URLs to except, for one-off historical refs.

Exit 0 = clean. Exit 1 = bad links found.

Usage:
    python3 scripts/check_github_links.py [--site-dir _site]
"""

import argparse
import re
import sys
from pathlib import Path

# Repos that are private or nonexistent as of 2026-10-02, so a link to them
# 404s for readers. KNOWN_PRIVATE_ALLOWED_REPOS is subtracted from this set to
# form the enforced denylist.
PRIVATE_OR_MISSING_REPOS = {
    "ErikBjare/alice",
    "ErikBjare/bob",
    "TimeToBuildBob/bob",
    "ErikBjare/gptme-infra",
    "ErikBjare/gptme-landing",
}

# Subset of PRIVATE_OR_MISSING_REPOS deliberately kept in historical posts as
# provenance (research notes, design docs, issue/commit links). Exempt from the
# check until the ~248 posts that reference them are stripped; the removal is
# tracked in tasks/bob-website-private-repo-links.md. Delete an entry here once
# its links are gone to re-enable enforcement for that repo.
KNOWN_PRIVATE_ALLOWED_REPOS: set[str] = {
    "ErikBjare/alice",      # Alice's brain repo — referenced in multi-agent posts
    "ErikBjare/bob",        # Bob's brain repo — primary source for blog provenance
    "TimeToBuildBob/bob",   # same repo under the social handle
}

# The enforced denylist: private/missing repos minus the temporary exemptions.
DENIED_REPOS = PRIVATE_OR_MISSING_REPOS - KNOWN_PRIVATE_ALLOWED_REPOS

# Specific github.com URLs that are intentional exceptions (provenance in
# old posts). Add a URL here to suppress the denylist error for that URL only.
# Keep entries in alphabetical order. Each entry is the URL prefix to match.
ALLOWLISTED_URLS: set[str] = set()

# OWNER and REPO path segments. GitHub names may contain dots but never end in
# one, and sentences often put a "." right after a bare URL — requiring the
# final character to be alnum/_/- stops "…/gptme-infra." from being read as a
# repo named "gptme-infra." and silently skipping the denylist.
_SEGMENT = r"[A-Za-z0-9_.-]*[A-Za-z0-9_-]"
_GITHUB_REPO_RE = re.compile(
    rf"https?://github\.com/(?P<owner>{_SEGMENT})/(?P<repo>{_SEGMENT})"
)


def extract_github_links(html: str) -> list[str]:
    """Return all github.com/OWNER/REPO URLs found in an HTML string."""
    return [m.group(0) for m in _GITHUB_REPO_RE.finditer(html)]


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
    for url in extract_github_links(content):
        repo = repo_from_url(url)
        if repo not in DENIED_REPOS:
            continue
        # Check if this specific URL is allowlisted
        if any(url.startswith(allowed) for allowed in ALLOWLISTED_URLS):
            continue
        bad.append((url, repo))
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
