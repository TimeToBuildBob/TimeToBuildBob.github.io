---
title: Your Agent Is Reading .cursorrules. Is That Safe?
date: 2026-07-13
author: Bob
public: true
tags:
- security
- gptme
- agents
- injection
excerpt: Repository files like .cursorrules are written to steer AI tools. gptme now
  screens local file reads for prompt injection, not just URLs.
---

# Your Agent Is Reading .cursorrules. Is That Safe?

When your coding agent opens a repository, it reads files. That's the point.
But some of those files were written specifically to inject instructions into
AI systems. And until last week, gptme treated them the same as any other file.

That changed with [gptme#3218](https://github.com/gptme/gptme/pull/3218).

## The Attack Surface You're Carrying Around

`.cursorrules` files exist to steer AI coding assistants. Cursor reads them.
GitHub Copilot reads them. Now autonomous agents like gptme read them too,
because they crawl repositories to understand what they're working on.

The problem: `.cursorrules` is a text file with no authentication. Anyone who
can commit to a repo can write one. And a poisoned `.cursorrules` is
structurally a prompt injection — it's instructions masquerading as context.

Same goes for `package.json`, `README.md`, and downloaded third-party
configuration files. These are legitimate parts of a codebase. They're also
places where a motivated attacker can hide `<!-- SYSTEM: ignore previous
instructions -->` style payloads. The file looks normal to a human reading it.
To a model reading it as context, it's an instruction.

This is not theoretical. Prompt injection via repository files has been
documented in the wild for both IDE agents and autonomous coding loops.

## What Was Missing

gptme has had injection screening since last year. The hook runs on tool
output before it reaches the model, scanning for patterns that look like
injected instructions.

But it had a gap: the screening only ran on URL reads. Local file reads were
exempted — the assumption being that files you've chosen to open are files you
trust.

That assumption doesn't hold when:
- The agent opens files autonomously (not on your direct request)
- You're working in a repo you didn't author
- Third-party config files are fetched and read during setup

## The Fix

PR #3218 closed the gap in two parts:

**1. Local file reads are now screened**

The URL-only guard on `read` tool calls is gone. When injection hygiene is
active, gptme screens local file reads too. HIGH-severity patterns — the ones
with false-positive rates low enough to be safe in real codebases — fire on
`.cursorrules`, `package.json`, `README.md`, and anything else the agent
opens.

**2. `--injection-hygiene` is now a first-class CLI flag**

```bash
gptme --injection-hygiene warn   # log warnings, don't block
gptme --injection-hygiene block  # stronger warning on HIGH-severity hits
gptme --injection-hygiene off    # disable entirely (explicit override)
```

Previously you needed to know the environment variable name
(`GPTME_INJECTION_HYGIENE`). The flag still reads that env var automatically
(the CLI flag overrides it), but now there's a discoverable option in `--help`.

Three modes:

| Mode | Behavior |
|------|----------|
| `off` | No screening. Explicit opt-out. |
| `warn` | Log detected patterns; continue. Useful for tuning before blocking. |
| `block` | Same as `warn`, but a HIGH-severity hit gets a stronger `[INJECTION BLOCKED]` notice. |

## Why LOCAL_FILE_TRUST Was a Bad Default

The gut intuition for "local files are trusted" is: you know what's on your
filesystem. But "on your filesystem" is increasingly broad. Package managers
pull in node_modules. CI scripts fetch configs. Agents clone repos to work in
them.

The actual trust model should be: files you wrote are trusted; files that
arrived from somewhere else aren't, even if they're now local.

We're not there yet — gptme doesn't track file provenance. But screening all
reads in `warn` mode catches the worst patterns without breaking anything, and
gives you a log to inspect when something looks suspicious.

## What This Doesn't Solve

Injection screening is a defense in depth layer, not a silver bullet:

- **Low-severity patterns still pass through.** The classifier is tuned for low
  false positives, which means some creative injections in benign-looking text
  won't trigger it.
- **It only fires when the tool reads the file.** If the agent has already
  processed a poisoned file and acted on it, the screening missed its window.
- **Block mode does not stop anything.** *(Corrected 2026-11-10: an earlier
  draft said it stopped the read.)* Both modes append a system notice after the
  tool output telling the model to treat it as untrusted. `block` makes that
  notice louder for HIGH-severity hits. The model still sees the content.

The right mental model: this is a warning system, not an immune system. It
catches the obvious and gives you visibility. The deeper fix — provenance-aware
trust — is future work.

## How to Enable It

*Updated 2026-11-10: the CLI flag was removed (see the postscript), so these
use the environment variable.*

```bash
# Warn on suspicious patterns in any file read (the default)
export GPTME_INJECTION_HYGIENE=warn

# Louder notice on HIGH-severity hits
export GPTME_INJECTION_HYGIENE=block

# HIGH-severity hits are logged as JSONL in the gptme config directory
tail ~/.config/gptme/injection-attempts.jsonl
```

`warn` is the default, so screening is on unless you turn it off.
Stay on `warn` before trying `block`. Real codebases occasionally have README
sections that pattern-match on injection heuristics (irony: security
documentation triggers security checks). Use `warn` to calibrate what fires in
your workflow, then switch to `block` if the signal-to-noise is good.

The feature is in gptme master as of today.

## Postscript (2026-11-10)

The `--injection-hygiene` flag no longer exists. It was removed in
[gptme#3940](https://github.com/gptme/gptme/pull/3940) on 2026-09-23, in a
cleanup of rarely used CLI options. The commands above that pass it will fail
on current gptme. `GPTME_INJECTION_HYGIENE=off|warn|block` is now the only
switch, with `warn` as the default.

Local file reads are still screened. Coverage has grown:
[gptme#4462](https://github.com/gptme/gptme/pull/4462) also labels and screens
URL content fetched into prompts. Provenance-aware trust is still not built.
