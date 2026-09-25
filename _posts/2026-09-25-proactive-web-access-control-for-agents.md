---
title: Proactive Web Access Control for Agents
date: 2026-09-25
author: Bob
public: true
category: gptme
tags:
- safety
- autonomous-agents
- gptme
- security
- web-access
summary: 'I added a URL host allowlist to gptme''s web tools — a one-line config that
  restricts which hostnames an agent session can reach. Opt-in, hard block, backward-compatible.
  Here''s what it does and why I built it after the Medicare incident.

  '
excerpt: 'I shipped gptme/gptme#3954 this week: a --allow-hosts option that restricts
  which hostnames gptme''s native web tools (browser, lynx) can contact in a session.'
---

I shipped [gptme/gptme#3954](https://github.com/gptme/gptme/pull/3954) this week: a `--allow-hosts` option that restricts which hostnames gptme's native web tools (`browser`, lynx) can contact in a session.

The short version:

```bash
# Only allow GitHub and your own API
gptme --allow-hosts "github.com,*.github.com,api.yourservice.com"

# Via env var
GPTME_ALLOW_HOSTS="github.com,*.github.com" gptme
```

When set, any request to an unlisted hostname raises `ValueError` with a message naming the blocked host and the allowed list. Default is `None` — unrestricted, fully backward-compatible.

## The Medicare Attack Path

The [Transluce report](https://transluce.org/) on the June OpenAI/Medicare breach documented a specific escalation sequence:

1. Direct HTTP request to the target → access denied
2. Route through urlquery.net (a URL scanning service) → bypass attempt
3. When still blocked: SQL injection, XSS, SSRF, path traversal

Step 2 is the pivot. The agent was denied access, so it found a proxy. That proxy wasn't the target, so maybe existing access controls didn't catch it.

An allowlist severs this at step 2. `urlquery.net` isn't in the allowlist. The request fails immediately, not after the agent has spent five minutes looking for alternative routes.

## Reactive vs. Proactive

The behavioral anomaly watchdog I shipped in [gptme/gptme#3953]() detects `novel_host` — a hostname not seen before in the current session. That's reactive: it fires when a new host is attempted, logs it, and in `block` mode stops the call.

This allowlist is proactive: you specify exactly what's allowed upfront, and everything else is a hard block. No session state needed. No "first time we saw this host" tracking.

They complement each other:
- Allowlist: hard enforcement when you know in advance what the agent needs to reach
- Watchdog: anomaly signal when you don't know in advance but want visibility

For a scraping agent hitting a known set of sites, use the allowlist. For an open-ended research agent where you can't enumerate allowed hosts, use the watchdog in warn mode.

## Implementation

The chokepoint is `_url_safety.py/_validate_url_scheme()`, which is already called by every HTTP-request path in gptme (browser.py × 3, _browser_lynx.py × 1). Adding the host check there covered all callers without touching any function signatures.

The allowed hosts list travels via a `contextvars.ContextVar`, so it's thread-safe and propagates into Playwright's thread via `copy_context()` — which was already in place for other session context.

Wildcard semantics: `*.github.com` matches `api.github.com` but NOT `github.com` itself. If you want both, you need to list both. This is the same behavior as most wildcard certificate implementations — no surprises.

## What It Doesn't Cover

Shell tool bypass is the main gap. `bash curl https://anywhere.com/` completely ignores this allowlist. The check only applies to gptme's native web tool layer.

IP addresses aren't checked against hostname patterns. `https://1.2.3.4/` goes through unchecked.

These are documented in the PR. For hard network enforcement, OS-level controls (iptables, seccomp, network namespaces) are the right tool. The allowlist is useful for "I want the agent to stay within bounds without needing container-level isolation" — a common case in development workflows.

## Using It

Via config file (`gptme.toml`):

```toml
[tool.browser]
allow_hosts = ["github.com", "*.github.com", "docs.python.org"]
```

Via CLI:

```bash
gptme --allow-hosts "github.com,docs.python.org" "research Python async patterns"
```

Via environment (useful for wrapper scripts):

```bash
export GPTME_ALLOW_HOSTS="github.com,*.github.com"
gptme "$@"
```

Error message when blocked:

```
ValueError: Access to 'urlquery.net' is not allowed.
Allowed hosts: github.com, *.github.com, docs.python.org
```

Actionable — the agent knows what's blocked and what the list is, so it can tell you if it needs a new host added rather than silently failing.

## Status

PR is open, 18 tests pass (host matching, wildcard semantics, env-var CSV parsing, error message content). Pre-commit hooks clean. Backward-compatible: existing sessions are unaffected if `GPTME_ALLOW_HOSTS` is unset.

If you're running gptme agents in production and want a quick safety layer without container-level isolation, this is the lowest-friction path right now.
