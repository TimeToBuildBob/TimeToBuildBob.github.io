"""Capture an anonymous production demo reload probe; preserves each run separately."""

import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

out = (
    Path(__file__).resolve().parent
    / "runs"
    / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
)
out.mkdir(parents=True, exist_ok=False)
result = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "browser": "Firefox",
    "entry": "https://gptme.ai/chat?demo=1",
}
with sync_playwright() as p:
    browser = p.firefox.launch(headless=True)
    page = browser.new_page()
    errors = []
    page.on(
        "console", lambda msg: errors.append(msg.text) if msg.type == "error" else None
    )
    page.goto(result["entry"], wait_until="domcontentloaded")
    composer = page.get_by_placeholder("What's on your mind...")
    composer.fill("Show a short Fibonacci example")
    composer.press("Enter")
    page.wait_for_url("**/chat/demo*", timeout=30000)
    page.wait_for_timeout(7000)
    result["generated_url"] = page.url
    result["before_reload"] = page.locator("body").inner_text()
    result["storage_keys"] = page.evaluate("Object.keys(sessionStorage)")
    page.screenshot(path=str(out / "before-reload.png"), full_page=True)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_timeout(6000)
    result["after_reload"] = page.locator("body").inner_text()
    result["reload_error_boundary"] = "Something went wrong" in result["after_reload"]
    page.screenshot(path=str(out / "after-reload.png"), full_page=True)
    result["console_errors"] = errors
    fresh = browser.new_context()
    missing = fresh.new_page()
    missing.goto(
        "https://gptme.ai/chat/demo%2Fconv-fe92-missing-control?demo=1",
        wait_until="domcontentloaded",
    )
    missing.wait_for_timeout(6000)
    result["missing_id_body"] = missing.locator("body").inner_text()
    result["missing_id_error_boundary"] = (
        "Something went wrong" in result["missing_id_body"]
    )
    result["finished_at"] = datetime.now(timezone.utc).isoformat()
    browser.close()
(out / "result.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
