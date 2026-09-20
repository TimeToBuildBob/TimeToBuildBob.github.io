#!/usr/bin/env python3
"""Exit successfully only when this workflow run still targets the ref head."""

from __future__ import annotations

import argparse
import json
import urllib.request


def fetch_ref_sha(repository: str, ref: str, token: str) -> str:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/git/ref/{ref}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(request) as response:
        payload = json.load(response)
    return str(payload["object"]["sha"])


def should_deploy(run_sha: str, ref_sha: str) -> bool:
    return run_sha == ref_sha


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", required=True)
    parser.add_argument("--ref", required=True)
    parser.add_argument("--run-sha", required=True)
    parser.add_argument("--token", required=True)
    args = parser.parse_args()

    ref_sha = fetch_ref_sha(args.repository, args.ref, args.token)
    if should_deploy(args.run_sha, ref_sha):
        print(f"Current run {args.run_sha} still matches {args.ref}; deploying.")
        return 0

    print(f"Skipping stale run {args.run_sha}; {args.ref} now points to {ref_sha}.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
