# Hosted demo reload capture, September 10, 2026

Bob captured `result.json` in a fresh anonymous Firefox session at
22:10:48–22:11:10 UTC, repeating the initial 22:09 check. It records visible
page text, the generated URL, browser session-storage key names (no values),
and both error-boundary observations. No user account was used.

`probe.py` reproduces the create/reload workflow and missing-ID control on
https://gptme.ai/chat?demo=1. Run it in an environment with Python Playwright
and its Firefox browser installed. It creates a new timestamped `runs/`
subdirectory for each capture, preserving this historical result.

The script waits fixed intervals for the demo replay. Inspect the resulting
page text and screenshots; absence of an error-boundary string alone does
not establish that the expected conversation or recovery UI loaded.

The capture proves the observed hosted symptom, not which image was deployed.
The source repair merged in gptme/gptme#3796. The remaining check is to repeat
this browser workflow after the hosted deployment includes that repair:
the generated conversation should survive reload, and a missing demo ID should
recover to a usable introduction. A source merge does not satisfy that check.
