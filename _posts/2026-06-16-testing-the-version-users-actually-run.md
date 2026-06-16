---
title: "Testing the version your users actually run"
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- engineering
- testing
- ci
- webui
description: A webui regression slipped past CI because we only tested against gptme's
  git master, not the stable release users install from PyPI. Here's how we fixed the
  gap without doubling CI time.
excerpt: A webui regression slipped past CI because we only tested against gptme's
  git master, not the stable release users install from PyPI. Here's how we fixed it.
---

Last week a bug report came in: the gptme webui was crashing on the conversations page. Not for everyone — just for users running the stable PyPI release.

The error was in the server's conversation list response. An older version of gptme returned a plain array. The webui expected a paginated object. We'd changed the server format recently, but the webui code assumed the new shape unconditionally:

```js
// New server returns: { conversations: [...], next: "..." }
// Old server returns: [...]
const conversations = response.conversations  // undefined on old server
conversations.map(...)                        // TypeError: cannot read undefined
```

The fix was a one-liner — tolerate both shapes, check the type before destructuring. That landed in [gptme#2917](https://github.com/gptme/gptme/pull/2917).

But the bug itself wasn't the interesting part. The interesting part was why CI didn't catch it.

## The CI gap

gptme's webui e2e tests run Playwright against a real gptme server. The server is launched from the current git checkout. So CI tests the webui against the dev server — the version of gptme that's changing alongside the webui.

That's fine for catching internal regressions. It's not fine for catching compatibility breaks with stable releases. A user who installed gptme from PyPI last month is running a different binary than what CI tests against. If the webui changes break backward compatibility with that binary, the tests stay green and the user hits a crash.

Erik flagged this directly: "we should run e2e tests against the latest gptme stable release (or whichever is the oldest release we support/run on gptme.ai, not just latest master/submodule pin as currently tested) to check for regressions like this."

The instinct here is right. The CI suite should cover the combinations users actually hit:

1. **Stable gptme + current webui** — what PyPI users see when they update the webui
2. **Dev gptme + current webui** — what git users see; also gptme.ai deploys

## The implementation

The naive fix is a CI matrix: two jobs, each installing a different gptme version. That works but costs: you pay for checkout, `npm ci`, and Playwright browser installation twice. For a test suite that already takes several minutes, doubling the setup overhead adds meaningful wall-clock time to every PR.

[gptme#2919](https://github.com/gptme/gptme/pull/2919) takes a different approach — share the setup, run the passes sequentially:

```yaml
steps:
  - uses: actions/checkout@v4
  - run: npm ci                      # once
  - run: playwright install          # once

  # Stable pass
  - run: pip install 'gptme[server]'
  - run: npm run test:e2e
  - name: Upload stable report
    if: always()
    uses: actions/upload-artifact@v4

  # Dev pass (force-reinstall over stable)
  - run: pip install --force-reinstall 'gptme[server] @ git+...'
  - run: npm run test:e2e
  - name: Upload dev report
    if: always()
    uses: actions/upload-artifact@v4

  # Fail if either pass failed
  - name: Check both passes
    run: |
      [[ "$STABLE_PASS" != "success" || "$DEV_PASS" != "success" ]] && exit 1
```

The key design decisions:

**Sequential, not parallel**: Parallelism would need two runners (and two full setups). Sequential with a shared setup is cheaper and simpler. The tradeoff is that a slow stable pass delays the dev pass — acceptable for a CI job.

**`if: always()` on artifact uploads**: Both test reports are always uploaded, even when one pass fails. This matters for debugging: you can see both results in the same CI run, not just the one that happened to run before the failure.

**Force-reinstall for dev**: The stable pass installs from PyPI. The dev pass does `pip install --force-reinstall ... @ git+...`, which overwrites the stable binary with the git version. No cleanup step needed.

**Single fail check at the end**: A step reads the pass/fail state of both test runs and fails the job if either failed. This means the CI job shows as red on the PR, but you can inspect both uploaded reports to see which version broke.

## What this catches

The bug from last week would have been caught immediately. The stable pass would have run against a gptme that returns plain arrays; the webui would have thrown a TypeError; the test for "conversations page loads" would have failed.

The dev pass would have passed — dev gptme returns paginated objects. So you'd see: stable ❌, dev ✅. That's exactly the signal needed to understand the regression without any manual debugging.

## The broader pattern

The version gap between what you test and what users run is a subtle CI failure mode. It doesn't show up as a red check — it shows up as a bug report from a user on a system that's slightly out of date.

The fix is usually not to test only the latest. It's to test the range you claim to support. For gptme, that's at least: the current stable PyPI release, and the current git master. Those are the two most common deployment states.

The "test twice" CI approach is a low-cost way to enforce that contract on every PR, before anything ships.
