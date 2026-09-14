from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "render_profile_readme.py"
spec = importlib.util.spec_from_file_location("render_profile_readme", MODULE_PATH)
assert spec and spec.loader
rpr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rpr)

DATA = {
    "years": {"2026": "Year of scale.", 2025: "Year of autonomy."},
    "months": [
        {"month": "2025-11", "summary": "Multi-agent coordination", "prs": 5,
         "highlights": [{"title": "Alice", "text": "Coordination with Alice."}]},
        {"month": "2026-02", "summary": "Voice MVP", "prs": 40,
         "highlights": [{"title": "Voice", "text": "Realtime voice.",
                         "links": [{"label": "contrib#280", "url": "https://example.com/280"}]}]},
        {"month": "2026-01", "summary": "MCP spec", "prs": 30, "highlights": []},
        {"month": "2025-12", "summary": "Cost tracking", "partial": False},
        {"month": "2024-12", "end": "2025-07", "summary": "Quiet growth"},
    ],
}


def test_recent_months_rendered_in_full_newest_first() -> None:
    block = rpr.render(DATA, recent=2)
    recent = block.split("## 📜 Contribution History")[0]
    assert recent.index("### February 2026") < recent.index("### January 2026")
    assert "- **Voice** — Realtime voice. ([contrib#280](https://example.com/280))" in recent
    assert "<sub>40 PRs merged</sub>" in recent
    # month without highlights falls back to its summary
    assert "- MCP spec" in recent


def test_older_months_get_one_line_per_month_grouped_by_year() -> None:
    history = rpr.render(DATA, recent=2).split("## 📜 Contribution History")[1]
    assert history.index("### 2025") < history.index("### 2024")
    assert "_Year of autonomy._" in history  # int year keys are accepted
    assert "- **Dec** — Cost tracking" in history
    assert "- **Nov** — Multi-agent coordination · 5 PRs" in history
    assert "- **Dec 2024 – Jul 2025** — Quiet growth" in history
    # only months with highlights are repeated inside the fold
    details_2025 = history.split("<summary>2025 in detail</summary>")[1].split("</details>")[0]
    assert "#### November 2025" in details_2025
    assert "December 2025" not in details_2025
    assert "<summary>2024 in detail</summary>" not in history


def test_partial_month_label() -> None:
    assert rpr.label({"month": "2026-09", "partial": True}) == "September 2026 (so far)"


def test_splice_is_idempotent_and_requires_markers() -> None:
    readme = f"# Hi\n\n{rpr.START}\nold\n{rpr.END}\n\n## Connect\n"
    block = rpr.render(DATA)
    once = rpr.splice(readme, block)
    assert rpr.splice(once, block) == once
    assert once.startswith("# Hi\n\n") and once.endswith("\n\n## Connect\n")
    with pytest.raises(ValueError):
        rpr.splice("# no markers", block)


def test_check_mode(tmp_path: Path) -> None:
    data = tmp_path / "timeline.yml"
    data.write_text(yaml.safe_dump(DATA, allow_unicode=True))
    readme = tmp_path / "README.md"
    readme.write_text(f"{rpr.START}\n{rpr.END}\n")
    assert rpr.main([str(readme), "--data", str(data), "--check"]) == 1
    assert rpr.main([str(readme), "--data", str(data)]) == 0
    assert rpr.main([str(readme), "--data", str(data), "--check"]) == 0


def test_real_timeline_data_is_valid() -> None:
    data = yaml.safe_load((ROOT / "_data" / "timeline.yml").read_text())
    months = [str(m["month"]) for m in data["months"]]
    assert len(months) == len(set(months)), "duplicate months"
    for entry in data["months"]:
        assert entry.get("summary"), entry["month"]
        for highlight in entry.get("highlights") or []:
            assert highlight.get("title") and highlight.get("text"), entry["month"]
            for link in highlight.get("links") or []:
                assert link["url"].startswith("https://"), link
    assert rpr.render(data)
