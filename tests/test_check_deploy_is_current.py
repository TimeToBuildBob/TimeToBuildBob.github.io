from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "scripts" / "check_deploy_is_current.py"
)
spec = importlib.util.spec_from_file_location("check_deploy_is_current", MODULE_PATH)
assert spec and spec.loader
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


def test_deploys_when_run_is_still_ref_head() -> None:
    assert check.should_deploy("new-sha", "new-sha") is True


def test_skips_older_run_after_newer_push() -> None:
    assert check.should_deploy("old-sha", "new-sha") is False


def test_stale_run_sets_false_output_without_failing(tmp_path: Path) -> None:
    output = tmp_path / "github-output"
    argv = [
        "check_deploy_is_current.py",
        "--repository",
        "owner/repo",
        "--ref",
        "heads/master",
        "--run-sha",
        "old-sha",
        "--token",
        "token",
        "--github-output",
        str(output),
    ]

    with patch.object(check, "fetch_ref_sha", return_value="new-sha"), patch(
        "sys.argv", argv
    ):
        assert check.main() == 0

    assert output.read_text(encoding="utf-8") == "is-current=false\n"


def test_api_error_propagates_and_does_not_write_output(tmp_path: Path) -> None:
    output = tmp_path / "github-output"
    argv = [
        "check_deploy_is_current.py",
        "--repository",
        "owner/repo",
        "--ref",
        "heads/master",
        "--run-sha",
        "run-sha",
        "--token",
        "token",
        "--github-output",
        str(output),
    ]

    malformed_response = json.JSONDecodeError("bad", "", 0)
    with patch.object(
        check, "fetch_ref_sha", side_effect=malformed_response
    ), patch("sys.argv", argv):
        try:
            check.main()
        except json.JSONDecodeError:
            pass
        else:
            raise AssertionError("malformed API responses must fail the guard")

    assert not output.exists()
