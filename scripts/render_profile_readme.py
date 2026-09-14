#!/usr/bin/env python3
"""Render the timeline data into Bob's GitHub profile README.

The single source of truth is ``_data/timeline.yml``, which also renders the
/timeline/ page on the website. This script replaces the block between the
``<!-- timeline:start -->`` and ``<!-- timeline:end -->`` markers in the profile
README (github.com/TimeToBuildBob/TimeToBuildBob), which syncs it daily via a
GitHub Action.

    python3 scripts/render_profile_readme.py ../TimeToBuildBob/README.md
    python3 scripts/render_profile_readme.py README.md --check  # exit 1 if stale
"""

from __future__ import annotations

import argparse
import calendar
import sys
from pathlib import Path
from typing import Any

import yaml

START = "<!-- timeline:start -->"
END = "<!-- timeline:end -->"
DEFAULT_DATA = Path(__file__).resolve().parents[1] / "_data" / "timeline.yml"
TIMELINE_URL = "https://timetobuildbob.github.io/timeline/"
DEFAULT_RECENT = 3


def _month(month: str, short: bool) -> str:
    names = calendar.month_abbr if short else calendar.month_name
    return names[int(month.split("-")[1])]


def label(entry: dict[str, Any], short: bool = False, with_year: bool = True) -> str:
    start = str(entry["month"])
    if end := entry.get("end"):
        end = str(end)
        text = f"{_month(start, short)} {start[:4]} – {_month(end, short)} {end[:4]}"
    else:
        text = _month(start, short) + (f" {start[:4]}" if with_year else "")
    if entry.get("partial"):
        text += " (so far)"
    return text


def render_highlight(highlight: dict[str, Any]) -> str:
    line = f"- **{highlight['title']}** — {highlight['text']}"
    links = highlight.get("links") or []
    if links:
        line += " (" + ", ".join(f"[{link['label']}]({link['url']})" for link in links) + ")"
    return line


def render_month(entry: dict[str, Any], heading: str) -> list[str]:
    lines = [f"{heading} {label(entry)}", ""]
    if entry.get("prs"):
        lines += [f"<sub>{entry['prs']} PRs merged</sub>", ""]
    if entry.get("highlights"):
        lines += [render_highlight(h) for h in entry["highlights"]]
    else:
        lines.append(f"- {entry['summary']}")
    return lines


def render(data: dict[str, Any], recent: int = DEFAULT_RECENT) -> str:
    months = sorted(data["months"], key=lambda m: str(m["month"]), reverse=True)
    recent_months, older = months[:recent], months[recent:]
    years = {str(k): v for k, v in (data.get("years") or {}).items()}

    out = [START, "", "## 🚀 Recent Contributions", ""]
    for entry in recent_months:
        out += render_month(entry, "###") + [""]

    out += [
        "## 📜 Contribution History",
        "",
        f"One line per month since I was born. Full timeline: [timetobuildbob.github.io/timeline]({TIMELINE_URL})",
        "",
    ]
    by_year: dict[str, list[dict[str, Any]]] = {}
    for entry in older:
        by_year.setdefault(str(entry["month"])[:4], []).append(entry)
    for year, entries in by_year.items():
        out += [f"### {year}", ""]
        if summary := years.get(year):
            out += [f"_{summary}_", ""]
        for entry in entries:
            suffix = f" · {entry['prs']} PRs" if entry.get("prs") else ""
            out.append(f"- **{label(entry, short=True, with_year=False)}** — {entry['summary']}{suffix}")
        detailed = [e for e in entries if e.get("highlights")]
        if detailed:
            out += ["", "<details>", f"<summary>{year} in detail</summary>", ""]
            for entry in detailed:
                out += render_month(entry, "####") + [""]
            out.append("</details>")
        out.append("")
    out.append(END)
    return "\n".join(out)


def splice(readme: str, block: str) -> str:
    start, end = readme.find(START), readme.find(END)
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"README must contain {START} ... {END} markers")
    return readme[:start] + block + readme[end + len(END) :]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("readme", type=Path, help="profile README to update in place")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA, help="timeline YAML (default: %(default)s)")
    parser.add_argument("--recent", type=int, help="months shown in full under Recent Contributions")
    parser.add_argument("--check", action="store_true", help="don't write; exit 1 if the README is stale")
    args = parser.parse_args(argv)

    data = yaml.safe_load(args.data.read_text())
    recent = args.recent or data.get("readme_recent_months") or DEFAULT_RECENT
    current = args.readme.read_text()
    updated = splice(current, render(data, recent))

    if updated == current:
        print(f"{args.readme}: up to date")
        return 0
    if args.check:
        print(f"{args.readme}: stale — run scripts/render_profile_readme.py {args.readme}", file=sys.stderr)
        return 1
    args.readme.write_text(updated)
    print(f"{args.readme}: updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
