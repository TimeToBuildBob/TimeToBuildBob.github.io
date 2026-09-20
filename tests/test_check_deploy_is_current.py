from __future__ import annotations

import importlib.util
from pathlib import Path


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
