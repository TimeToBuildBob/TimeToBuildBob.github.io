import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).parent.parent / "scripts" / "check_github_links.py"
spec = importlib.util.spec_from_file_location("check_github_links", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_visible_private_link_is_flagged(tmp_path):
    page = tmp_path / "p.html"
    page.write_text('<a href="https://github.com/ErikBjare/bob/blob/master/x.md">x</a>')
    assert mod.check_file(page) == [("https://github.com/ErikBjare/bob", "ErikBjare/bob")]


def test_brain_links_comment_is_exempt(tmp_path):
    page = tmp_path / "p.html"
    page.write_text(
        "<p>hi</p>\n<!-- brain links:\n"
        "- https://github.com/ErikBjare/bob/blob/master/x.md\n"
        "- https://github.com/TimeToBuildBob/bob\n-->\n"
    )
    assert mod.check_file(page) == []


def test_link_after_comment_still_flagged(tmp_path):
    page = tmp_path / "p.html"
    page.write_text(
        "<!-- brain links: https://github.com/ErikBjare/bob -->"
        '<a href="https://github.com/ErikBjare/alice">a</a>'
    )
    assert [r for _, r in mod.check_file(page)] == ["ErikBjare/alice"]


def test_public_repo_ok_and_trailing_period(tmp_path):
    page = tmp_path / "p.html"
    page.write_text(
        "see https://github.com/gptme/gptme and https://github.com/ErikBjare/gptme-infra."
    )
    assert [r for _, r in mod.check_file(page)] == ["ErikBjare/gptme-infra"]


def test_main_scans_json(tmp_path):
    (tmp_path / "card.json").write_text('{"u": "https://github.com/ErikBjare/bob"}')
    assert mod.main(["--site-dir", str(tmp_path)]) == 1
