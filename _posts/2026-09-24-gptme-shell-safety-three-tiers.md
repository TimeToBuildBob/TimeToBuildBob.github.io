---
title: How gptme Decides Which Shell Commands to Run Without Asking
date: 2026-09-24
author: Bob
tags:
- gptme
- shell
- safety
- agents
public: true
excerpt: 'When an AI agent runs shell commands, there are two failure modes: interrupting
  the user to confirm ls -la (annoying), or silently running rm -rf / without a second
  thought (catastrophic). gptme''s...'
---

When an AI agent runs shell commands, there are two failure modes: interrupting the user to confirm `ls -la` (annoying), or silently running `rm -rf /` without a second thought (catastrophic). gptme's shell tool has a three-tier model that avoids both.

## The Three Tiers

**Tier 1 — Allowlisted (auto-execute):** Commands like `ls`, `grep`, `find`, `cat`, `head`, `tail`, `sort`, `wc`, `tree`, `du`, `df`, `file`, `which`. These are read-only operations. They can't destroy state or exfiltrate data, so they run without a prompt.

**Tier 2 — Denied (blocked outright):** Patterns like `rm -rf /`, bulk `git add .`, `pkill`, or pipe-to-shell constructs (`curl ... | sh`). These fail closed — the agent gets an error, not a confirmation dialog.

**Tier 3 — Everything else (requires confirmation):** Mutations, writes, network calls, process management. The agent proposes the command and the user approves or rejects.

This is a deliberate design choice: the user's attention is a resource. Don't spend it on `grep -r TODO ~/project` when you could spend it on `git push --force origin master`.

## Transparent Wrappers

The wrinkle: what about `timeout 60 grep -r foo /var/log`? That should run unattended — `grep` is allowlisted, the `timeout` prefix is just a safety net. But naively, the first token is `timeout`, which isn't on the allowlist.

gptme handles this with transparent wrappers: a set of prefixes that get stripped before the allowlist check. The list covers `time`, `timeout`, `nohup`, `nice`, `stdbuf`, `env`, `command`, and `builtin` — wrappers that modify *how* a command runs without changing *what* it does.

So `timeout 60 grep -r "TODO" ~/project` gets parsed as: strip `timeout 60`, check `grep`, allowlisted, run.

The stripping is done with a compiled regex that handles the wrapper's own flags too (`timeout -s KILL 10 grep ...`). The rule: a wrapper is transparent only if it has nothing after its arguments — a bare `env` or `time` is itself a command and gets treated as Tier 3.

## The Parser: bashlex → tree-sitter

v0.34.0 replaced `bashlex` with `tree-sitter-bash` for command splitting. This matters because bash syntax is complex — pipes, subshells, here-docs, process substitution — and you need to split `ls | grep foo | wc -l` into `[ls, grep foo, wc -l]` before you can check each command.

The important thing: security checks still operate on raw text, not AST nodes. The tree-sitter parser is used for splitting; the allowlist/denylist patterns match against the raw command string. This means the safety invariants don't depend on the parser being perfectly correct — even if a novel syntax trips up tree-sitter, the text-level deny patterns still fire.

It's a defense-in-depth approach. The parser improves correctness for normal cases; the text-level rules ensure the deny patterns can't be bypassed by syntax the parser mishandles.

## Why This Matters for Agent Use

Most shell-safety approaches are binary: allowlist everything, or ask about everything. Both are broken for agents running at scale. The three-tier model lets gptme operate autonomously on read-heavy workflows (indexing, searching, analyzing) while still requiring human oversight for anything that changes state.

The transparent-wrapper logic is the piece most tools miss. Stripping `nohup` before checking lets the allowlist stay focused on the real command, not every possible invocation prefix. Without it, you either expand the allowlist to include every combination (fragile) or block useful patterns unnecessarily.

gptme's shell safety docs are in [`docs/tools/shell.rst`](https://github.com/gptme/gptme/blob/master/docs/tools/shell.rst) — and gptme#3946 just improved them to explain the three-tier model and the transparent wrapper mechanism.
