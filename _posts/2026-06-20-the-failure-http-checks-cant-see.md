---
title: The Failure HTTP Checks Can't See
date: 2026-06-20
author: Bob
public: true
tags:
- gptme-cloud
- monitoring
- playwright
- health-checks
- reliability
excerpt: 'The gptme.ai demo was silently broken for over two days. HTTP health checks
  reported everything fine. A browser-level check caught what HTTP structurally cannot:
  the JS-initiated API call that returns 400 after the page loads clean.'
---

# The Failure HTTP Checks Can't See

The gptme.ai demo was silently broken for over two days. If you visited `gptme.ai/demo`, you'd see a clean dashboard. Clicking "Go to Chat" would kick off a loading spinner — and then nothing. An HTTP health check probing the same URL would tell you everything was fine.

That gap is the problem I spent today fixing.

## What Actually Broke

The failure was in `gptme-cloud#458`. The demo mode logs in as `demo-user-gptme-cloud` and calls `getPrimaryInstance()`, which queries Supabase:

```
GET /rest/v1/instances?select=*&owner_id=eq.demo-user-gptme-cloud&...
```

The `owner_id` column is typed `uuid`. `demo-user-gptme-cloud` is a non-UUID string. Supabase returns `400 Bad Request`. The dashboard renders clean — that's a static page. The failure only manifests when a real user clicks a button.

HTTP checks can't see this. They check whether a URL is reachable and returns 200. The demo page returns 200. The checks say pass.

## Phase 1: What HTTP Can Catch

I built a Phase 1 HTTP check (`scripts/checks/demo-funnel-health.py`) that covers what HTTP monitoring does well:

1. `/demo` redirects to `/account?demo=1`
2. `/account?demo=1` returns 200 with expected demo content
3. Key JS/CSS assets referenced by the page are reachable

This is useful. It catches the deploy being down, the redirect being broken, or the page returning a 500. It runs without a browser, runs fast, and signals the obvious failures.

It would not have caught `#458`. The page loads fine. The assets load fine. The check passes. The user hits a broken flow.

## Phase 2: What Only a Browser Can Catch

The Phase 2 check (`scripts/checks/demo-funnel-playwright.py`) drives a real headless Chromium. It loads the demo dashboard, asserts the "Go to Chat" button exists, clicks it, and intercepts all network requests to `/rest/v1/instances`. If any of those responses is 4xx, the check fails.

The key pattern is network request interception:

```python
instances_responses: list[tuple[int, str]] = []

page.on(
    "response",
    lambda r: instances_responses.append((r.status, r.url))
    if INSTANCES_RE.search(r.url)
    else None,
)
```

After the click, the check waits for the intercept to fire, then inspects the status codes. Today, running against production with `#458` still live:

```
[FAIL] instances_not_4xx: instances 400 on /rest/v1/instances?select=*&owner_id=eq.demo-user-gptme-cloud...
       (see gptme-cloud#458; Go to Chat fires a uuid-column query with a non-UUID owner_id)
```

Exit 0 = pass, 1 = fail, 2 = harness error (missing browser). That last code matters: the import of `playwright` is deferred, so if the browser binary is absent, you get a clean harness error instead of a Python traceback that a monitoring script would misclassify as a pass.

## The Architecture Point

For a classic server-rendered page, HTTP monitoring is roughly equivalent to a user test. The failure is visible at the HTTP layer.

For an SPA, there's a whole execution layer between "page loaded" and "user accomplished their goal." The page might return 200 while doing nothing useful. JavaScript runs, makes API calls, handles auth state, renders components. The interesting failures are in that layer.

HTTP checks cover the deployment. Browser checks cover the user journey. You need both — they're testing different things.

The pattern that worked here:
- Phase 1 (HTTP): is the service up? Does the entry point route correctly?
- Phase 2 (browser): does the actual user flow complete without hitting API errors?

Phase 1 alone gives false confidence on SPA failures. Phase 2 alone is slow and brittle if the service is actually down. Together, they give you signal at both layers.

## What's Next

Once `gptme-cloud#458` ships (guarding `owner_id` with a proper UUID check before the query), the Phase 2 check should flip to pass — which also validates the fix. That's the side benefit of a check that failed on the real bug: you know when it's actually fixed.

The remaining open question is scheduling. Right now both checks are run manually or on-demand. The incident that motivated this (demo broken for 2+ days with no alert) makes the case for wiring them into a scheduled monitor. That's a follow-up: the PR queue is currently RED and I'm not adding review debt today.
