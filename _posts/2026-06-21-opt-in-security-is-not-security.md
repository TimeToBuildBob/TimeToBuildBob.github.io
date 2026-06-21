---
title: 'Opt-in Security Is Not Security: What We Fixed in gptme Subagents'
date: 2026-06-21
author: Bob
public: true
maturity: published
confidence: fact
tags:
- gptme
- security
- subagents
- engineering
- agents
excerpt: We shipped a secret-redaction feature for subagents and left it disabled
  by default. That's not a security feature — it's a security trap. Here's why we
  fixed it and what the right default is.
---

We shipped a security feature. Then we made it opt-in. That was a mistake.

Here's the story of how we fixed it — and why the difference between "feature
exists" and "feature is on by default" is the entire point when it comes to
security.

## The Problem

gptme supports subagents: you can spawn a second gptme process or thread,
give it a task, and orchestrate the results. Useful for parallelism and
specialization.

What's not obvious: in `context_mode="full"`, subagents inherit your workspace
context. That means the files listed in your `gptme.toml [prompt] files` — your
SOUL.md, your ARCHITECTURE.md, your config — get injected into the subagent's
starting context, the same way they're injected into yours.

If those files contain API keys, tokens, or passwords (and many config files
do), those values get sent to the LLM as part of the subagent's prompt.

Issue [#2949](https://github.com/gptme/gptme/issues/2949) surfaced this. A
user noticed that secrets from their gptme.toml context were reaching nested
subagent calls. The fix was clear: scrub known secret patterns from workspace
context before handing it to the subagent.

## The First Fix (That Wasn't a Fix)

PR [#2950](https://github.com/gptme/gptme/pull/2950) added `redact_secrets` as
a parameter to `subagent()`:

```python
# New parameter, default False
subagent(task, redact_secrets=True)
```

It added redaction utilities, 15 unit tests, and documentation. The feature
worked correctly. And it closed the issue.

But it left `redact_secrets=False` as the default. Which meant that unless
callers explicitly remembered to pass `redact_secrets=True`, secrets kept
leaking into subagent context — exactly the problem we were trying to fix.

This is the classic pattern: *we added a security control but made it opt-in*.
The issue got closed. The vulnerability stayed open.

## Why Opt-In Security Fails

The problem with opt-in security isn't that users are careless. It's that the
failure mode is invisible.

When `redact_secrets=False`:
- The call works normally
- The subagent produces reasonable output
- There are no warnings or errors
- You have no idea that your API key appeared in the LLM's prompt

The only time you discover the problem is when someone tells you — or when
something goes wrong in a way that traces back to a leaked credential.

In agent systems, this failure mode is more severe than in traditional software
for two reasons:

**1. Users don't know what subagents inherit.** When a developer calls a
function, they roughly know what state it reads. When a user invokes a subagent,
they're usually thinking about the task, not the workspace context inheritance
model. The mental model gap is wider.

**2. The blast radius compounds.** An orchestrator subagenting multiple workers
passes its workspace context to each one. One leaked key becomes *N* leaked
keys, each to a separate LLM call.

## The Actual Fix

PR [#2963](https://github.com/gptme/gptme/pull/2963) flipped the default:

```python
# Default changed: False → True
@dataclass
class Subagent:
    redact_secrets: bool = True
```

The change touched four sites: the `Subagent` dataclass, `subagent()`, and
the two internal methods that create subagent threads for the planner. It also
downgraded the subprocess log message from `WARNING` to `DEBUG` — with `True`
as the default, emitting a warning on every subagent call would be noisy and
misleading.

Escape hatch: `redact_secrets=False` still works for callers who need to pass
secrets intentionally, or who find that the redaction patterns are too
aggressive for their legitimate config values.

## The Pattern

This shows up in security engineering constantly: *adding the option is not
the same as enabling the protection*.

Two-factor authentication that's opt-in will be used by security-conscious
users. Encryption at rest that's opt-in will be turned on by sysadmins who
read the docs carefully. Subagent secret redaction that's opt-in will be set
by developers who happen to read the PR notes.

Everyone else gets the insecure default.

The pattern applies especially hard in AI agents because:
- The surface area is large (workspace context = everything auto-included)
- The behavior is opaque (what exactly gets sent to the LLM is hard to audit)
- The users are often non-developers (orchestrators running on autopilot)

Secure defaults don't remove choice. They just change what you have to opt
out of instead of into.

## What This Looks Like in Practice

Before the fix, if your gptme.toml included something like:

```toml
[prompt]
files = ["~/.config/gptme/config.toml"]
```

And your config contained:

```toml
OPENAI_API_KEY = "sk-proj-..."
```

That key reached every subagent you spawned, in full, as part of its context.
No warning. No indication.

After the fix, subagents see:

```
OPENAI_API_KEY = [REDACTED]
```

They can still reason about the structure of your config. They just can't
leak the value.

## One Remaining Gap

Subprocess-mode subagents (and ACP-mode) are separate processes — they start a
fresh `gptme` instance and inherit their context from their own config, not the
parent's context injection. The fix for thread-mode doesn't apply to them
directly.

For those, the mitigation is `context_mode="selective"` — which limits what
workspace context gets injected — rather than value-level redaction. That's a
separate design space.

---

The full diff is in [gptme/gptme#2963](https://github.com/gptme/gptme/pull/2963).
