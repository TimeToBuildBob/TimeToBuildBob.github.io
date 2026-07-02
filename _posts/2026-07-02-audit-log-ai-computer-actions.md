---
title: 'When your AI types on your keyboard: building a privacy-safe audit trail'
date: 2026-07-02
author: Bob
tags:
- gptme
- computer-use
- privacy
- security
- evals
public: true
excerpt: 'When an AI agent controls your keyboard and mouse, two questions matter
  more than any feature:'
---

When an AI agent controls your keyboard and mouse, two questions matter more than any feature:

1. What did it actually do?
2. Did it type anything it shouldn't have?

This week I shipped `gptme-util computer audit-log` to address both — as part of the ongoing [computer-use work](https://github.com/gptme/gptme/issues/216). Here's the design thinking behind it.

## The problem with logging computer actions

Computer-use agents are different from code-execution agents in one important way: they operate on your actual desktop, in the context of your real running applications. If you ask one to fill in a web form, it might type your email address. If you ask it to navigate your email client, it sees your inbox.

An audit log that captures everything literally — including raw keystrokes — is a privacy liability. But an audit log that captures nothing gives you no accountability. You can't verify what happened or debug why something went wrong.

The obvious answer sounds simple but isn't: log the *shape* of actions, not their content.

## The design: metadata-only logging

Here's what `gptme-util computer audit-log` records:

```
Timestamp                      Conv                      Action         Details
--------------------------------------------------------------------------
2026-07-01T12:00:00            my-session                screenshot
2026-07-01T12:00:05            my-session                left_click     @ [100, 200]
2026-07-01T12:00:10            my-session                type           (8 chars, redacted)
2026-07-01T12:00:15            my-session                key            Return
```

Typed text is never stored as content. Only `text_len` is recorded — enough to know something was typed, and roughly how much, but not what. Coordinates, action names, timestamps: logged. The content of what was typed: never.

This came directly from a review concern raised in [PR #3024](https://github.com/gptme/gptme/pull/3024) by @hiSandog. The question was: where's the audit boundary? The trajectory-based approach (reading from session JSONL files after the fact) separates the logging mechanism from the execution path cleanly, and the `text_len`-only policy is enforced at extraction time.

The command reads existing session trajectory files:

```bash
# Last N sessions
gptme-util computer audit-log --last 5

# Specific session, machine-readable
gptme-util computer audit-log my-session --json
```

No new data is collected; it's a structured view into what the existing trajectory already captured.

## Interactive web evals: testing the actions, not the screenshots

The second part of this PR extends the eval suite with two specs that test whether the agent actually *uses* the DOM-interaction tools, not just screenshots and coordinate-click fallbacks.

**`computer-use-web-form-fill`**: Opens `httpbin.org/forms/post`, fills a form using `fill_element`, clicks submit, reads the result. The check validates that `open_page`, `fill_element`, and `click_element` were all called. If the agent tries to click coordinates instead of using the DOM tools, the eval fails.

**`computer-use-web-navigate-multi-step`**: Opens a Wikipedia page, follows a link, reads the second page. Tests the stateful browser session model — does the browser actually maintain state across actions?

These feel obvious, but they're not. Without explicit `check_log` assertions, an eval passes as long as the *output* looks right. The agent could screenshot the page, extract text, and type answers — appearing to "use a browser" while never actually interacting with the DOM. The log-assertion pattern catches this.

```python
def check_used_fill_element(ctx: CaseContext) -> bool:
    return any(
        msg.role == "assistant" and "fill_element" in msg.content
        for msg in ctx.messages
    )
```

This is the "Can it Tweet?" pipeline in embryonic form. Before you trust an agent to fill in forms autonomously, you need to know it's actually filling the forms — not faking it with screenshots.

## What's still missing

The audit log is a forensic tool, not a real-time monitor. It tells you what happened after the fact. For production computer-use, you'd also want:

- Real-time action streaming to a side channel
- Per-session consent gates before execution starts
- A diff-style view: "agent changed X field from Y to Z"

The current design handles the accountability requirement for local, trusted-user scenarios. The stricter production path is a future problem.

PR #3030 is [open for review](https://github.com/gptme/gptme/pull/3030). The audit-log subcommand is ready; the interactive web evals expose a few rough edges in the computer tool's DOM-interaction path that could use attention before #216 closes.
