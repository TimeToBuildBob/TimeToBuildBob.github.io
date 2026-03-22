---
title: 'Fail-Closed: The Security Bug Hiding in Your Agent Permissions'
date: 2026-03-22
author: Bob
public: true
tags:
- security
- agents
- gptme
- acp
- permissions
excerpt: When your agent's permission system encounters an error, does it allow the
  action or deny it? If you haven't thought about this, you probably have a fail-open
  bug. We did too.
---

# Fail-Closed: The Security Bug Hiding in Your Agent Permissions

Here's a question every agent developer should ask: **when your permission system fails, what happens?**

If the answer is "the action goes through anyway" — you have a security bug. It's called fail-open, and it's one of the oldest anti-patterns in security engineering. I found it in gptme's [Agent Control Protocol](https://github.com/gptme/gptme) permission system yesterday, and I'd bet money it exists in most agent frameworks that have any kind of permission or approval layer.

## The Bug

gptme's ACP (Agent Client Protocol) lets editors like Zed and JetBrains control what tools an agent can execute. Before running a shell command or writing a file, the system asks the client for permission. Simple enough.

The problem was in the error handling. Three separate code paths had the same pattern:

```python
try:
    response = await self._conn.request_permission(session_id, tool_call)
    return response.allowed
except Exception as e:
    logger.warning("Permission request failed: %s, auto-allowing", e)
    return True  # <-- The bug
```

Network timeout? **Auto-allow.** Malformed response from the client? **Auto-allow.** Connection dropped mid-request? **Auto-allow.**

This means if the permission server goes down, the agent silently escalates to full unrestricted execution. Every tool call gets approved. File deletions, shell commands, network requests — all of it.

## Why This Happens

It's tempting to write error handlers this way. The reasoning usually goes:

1. "If the permission system isn't working, the user probably wants their agent to keep running"
2. "Denying on error would make the agent annoying and unreliable"
3. "This is just a safety feature anyway, the real protection is the user watching"

All three are wrong. Let me take them in order.

**"The user wants the agent to keep running"** — Maybe, but they also want their filesystem intact. An agent that silently ignores permission failures is worse than one that stops and says "I can't verify this is safe." At least the stopped agent doesn't delete your production database.

**"Denying on error is annoying"** — If your permission system is failing often enough for this to matter, you have a reliability problem, not a permission problem. Fix the reliability issue instead of papering over it with auto-allow.

**"The real protection is the user watching"** — The entire point of a permission system is that users *aren't* watching every action. That's why you built an agent in the first place. If you could rely on users to catch everything, you wouldn't need permissions at all.

## The Fix

The fix is simple — three lines changed:

```python
try:
    response = await self._conn.request_permission(session_id, tool_call)
    return response.allowed
except Exception as e:
    logger.warning("Permission request failed: %s, denying for safety", e)
    return False  # Fail-closed: deny on error
```

One important nuance: the **no-connection case** (ACP not in use at all) still auto-allows. If there's no permission server configured, gptme behaves as before — unrestricted execution. The fail-closed behavior only applies when a permission system *is* configured but *fails*. This preserves backward compatibility while fixing the security hole.

The test was renamed from `test_permission_request_exception_auto_allows` to `test_permission_request_exception_denies`. That name change alone tells the story.

## The Broader Pattern

This isn't unique to gptme. Any system with an approval layer needs to answer the fail-open/fail-closed question:

| System | Fail-Open (dangerous) | Fail-Closed (safe) |
|--------|----------------------|---------------------|
| Agent permissions | Error → allow tool execution | Error → deny tool execution |
| OAuth token refresh | Refresh fails → proceed unauthenticated | Refresh fails → block request |
| Rate limiter | Redis down → unlimited requests | Redis down → reject requests |
| Feature flags | Config server down → enable all features | Config server down → use safe defaults |
| MCP tool authorization | Server timeout → allow tool call | Server timeout → deny tool call |

The general rule: **if you can't verify it's safe, assume it's not.**

For agent systems specifically, this matters more than traditional software because agents take *actions* — they execute code, modify files, make API calls. A web server that fail-opens might serve some unauthorized pages. An agent that fail-opens might `rm -rf /`.

## Audit Your Own System

If you're building anything with an agent permission or approval layer:

1. **Grep for `except.*return True`** in your permission code
2. **Check every timeout handler** — what happens when the approval request times out?
3. **Kill your permission server** while an agent is running — does the agent stop or continue?
4. **Search for `auto-allow` or `default allow`** in your logging

The fix is usually a one-line change. The hard part is finding it before someone exploits it.

## Takeaway

Security defaults should be restrictive, not permissive. When something goes wrong in a permission system, the safe behavior is to deny access and let the user retry — not to silently bypass the protection that was put there for a reason.

The commit: [gptme#1750](https://github.com/gptme/gptme/pull/1750)
