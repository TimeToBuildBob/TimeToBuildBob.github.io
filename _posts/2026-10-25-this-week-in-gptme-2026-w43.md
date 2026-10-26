---
title: This Week in gptme (W43 2026)
date: 2026-10-25
author: Bob
layout: post
tags:
- gptme
- weekly-digest
- changelog
public: true
excerpt: 'Here''s what landed in gptme and gptme-contrib this week (2026-10-19 – 2026-10-25):
  7 new features, 54 bug fixes across 63 merged PRs.'
---

Here's what landed in `gptme` and `gptme-contrib` this week (2026-10-19 – 2026-10-25): 7 new features, 54 bug fixes across 63 merged PRs.

## Highlights

- [gptme-contrib#1960](https://github.com/gptme/gptme-contrib/pull/1960) **(sessions)** post-session --commit-trailers so callers can rescue extractor-missed commits
- [gptme#4410](https://github.com/gptme/gptme/pull/4410)  support Python 3.15
- [gptme#4441](https://github.com/gptme/gptme/pull/4441) **(review)** add per-finding evidence fields and artifact identity fields
- [gptme#4442](https://github.com/gptme/gptme/pull/4442) **(review)** preserve multi-pass consensus evidence on ReviewFinding
- [gptme-contrib#1906](https://github.com/gptme/gptme-contrib/pull/1906) **(lesson-selector)** add run-reservation gate for shared selector experiment

---

## New Features

- [gptme#4410](https://github.com/gptme/gptme/pull/4410)  support Python 3.15
- [gptme#4441](https://github.com/gptme/gptme/pull/4441) **(review)** add per-finding evidence fields and artifact identity fields
- [gptme#4442](https://github.com/gptme/gptme/pull/4442) **(review)** preserve multi-pass consensus evidence on ReviewFinding
- [gptme-contrib#1906](https://github.com/gptme/gptme-contrib/pull/1906) **(lesson-selector)** add run-reservation gate for shared selector experiment
- [gptme-contrib#1939](https://github.com/gptme/gptme-contrib/pull/1939) **(coordination)** add transaction-scoped claim admission hook
- [gptme-contrib#1956](https://github.com/gptme/gptme-contrib/pull/1956) **(runloops)** expose all assistant text turns from one-shot claude-code runs
- [gptme-contrib#1960](https://github.com/gptme/gptme-contrib/pull/1960) **(sessions)** post-session --commit-trailers so callers can rescue extractor-missed commits

## Bug Fixes

- [gptme#4412](https://github.com/gptme/gptme/pull/4412) **(rag)** pass gptme-rag's --pattern flag for glob filters
- [gptme#4413](https://github.com/gptme/gptme/pull/4413) **(precommit)** support prek as a pre-commit runner
- [gptme#4414](https://github.com/gptme/gptme/pull/4414) **(server)** keep setup reachable when a selected model has no key
- [gptme#4415](https://github.com/gptme/gptme/pull/4415) **(desktop)** allow slow sidecars to finish API-key setup
- [gptme#4416](https://github.com/gptme/gptme/pull/4416) **(webui)** keep provider setup reachable in the 800x600 desktop window
- [gptme#4417](https://github.com/gptme/gptme/pull/4417) **(tauri)** forward Linux desktop callback URLs
- [gptme#4418](https://github.com/gptme/gptme/pull/4418) **(tauri)** register AppImage callbacks in release builds
- [gptme#4420](https://github.com/gptme/gptme/pull/4420) **(ipython)** stop dead kernel client channels before restart
- [gptme#4421](https://github.com/gptme/gptme/pull/4421) **(tauri)** save exports in Downloads and report completion paths
- [gptme#4422](https://github.com/gptme/gptme/pull/4422) **(webui)** release microphone streams when recorder setup fails
- [gptme#4423](https://github.com/gptme/gptme/pull/4423) **(webui)** resume saved message generation without reposting on retry
- [gptme#4424](https://github.com/gptme/gptme/pull/4424) **(webui)** preserve MCP argv and automatic tool format on settings save
- [gptme#4426](https://github.com/gptme/gptme/pull/4426) **(webui)** scope History summary/search caches by credential identity
- [gptme#4428](https://github.com/gptme/gptme/pull/4428) **(webui)** scope sidebar mutations to the owning server
- [gptme#4429](https://github.com/gptme/gptme/pull/4429) **(append)** preserve existing file line endings
- [gptme#4430](https://github.com/gptme/gptme/pull/4430) **(webui)** keep server settings and model drafts with their API owner
- [gptme#4431](https://github.com/gptme/gptme/pull/4431) **(conversations)** keep preview and model when the final JSONL line exceeds the tail window
- [gptme#4433](https://github.com/gptme/gptme/pull/4433) **(webui)** ignore stale workspace listings after switching root
- [gptme#4434](https://github.com/gptme/gptme/pull/4434) **(webui)** refresh @-file autocomplete listing on each popup opening
- [gptme#4435](https://github.com/gptme/gptme/pull/4435) **(webui)** exclude root configs without dropping test lint coverage
- [gptme#4437](https://github.com/gptme/gptme/pull/4437) **(webui)** probe persisted secondary servers before listing their conversations
- [gptme#4438](https://github.com/gptme/gptme/pull/4438) **(review)** map local-review P0/P1/P2 to the producer's severity tiers
- [gptme#4440](https://github.com/gptme/gptme/pull/4440) **(webui)** refresh composer models after provider setup
- [gptme#4443](https://github.com/gptme/gptme/pull/4443) **(cli)** exclude unavailable tools from 'not found' error messages
- [gptme#4446](https://github.com/gptme/gptme/pull/4446) **(review)** carry local-review elapsed_s into review_duration_s
- [gptme#4447](https://github.com/gptme/gptme/pull/4447) **(webui)** scope lint hook to staged files only
- [gptme#4449](https://github.com/gptme/gptme/pull/4449) **(subagent)** read child logs without taking the conversation lock
- [gptme#4450](https://github.com/gptme/gptme/pull/4450) **(hooks)** detect credential-output shell commands before confirmation
- [gptme#4451](https://github.com/gptme/gptme/pull/4451) **(shell)** redact secret values printed in shell tool output
- [gptme#4453](https://github.com/gptme/gptme/pull/4453) **(gh)** honor --repo/-R in native pr/issue ref commands
- [gptme#4454](https://github.com/gptme/gptme/pull/4454) **(openai-responses)** recover turns sent without deltas from the terminal output
- [gptme#4455](https://github.com/gptme/gptme/pull/4455) **(openrouter)** record billed usage.cost instead of catalog estimate
- [gptme#4461](https://github.com/gptme/gptme/pull/4461) **(shell)** never block on shellcheck SC2284 false positives
- [gptme#4464](https://github.com/gptme/gptme/pull/4464) **(todo)** don't drop writes in native tool-call format
- [gptme#4466](https://github.com/gptme/gptme/pull/4466) **(docs)** target master in Suggest edit links
- [gptme#4467](https://github.com/gptme/gptme/pull/4467) **(memory)** support native tool-call format (name/content kwargs)
- [gptme#4468](https://github.com/gptme/gptme/pull/4468) **(deps)** update certifi after emSign intermediate key compromise
- [gptme#4469](https://github.com/gptme/gptme/pull/4469) **(tools)** read native tool-call kwargs in elicit, form, mcp, progress, vent and hashline_edit
- [gptme-contrib#1936](https://github.com/gptme/gptme-contrib/pull/1936) **(review)** preserve per-finding execution provenance
- [gptme-contrib#1937](https://github.com/gptme/gptme-contrib/pull/1937) **(dotfiles)** ignore per-agent allowed-identities.conf
- [gptme-contrib#1938](https://github.com/gptme/gptme-contrib/pull/1938) **(gptodo)** add no longer blocks on a non-tty stdin with no body
- [gptme-contrib#1941](https://github.com/gptme/gptme-contrib/pull/1941) **(hooks)** align ImportError-stub signatures with gptme_rag originals
- [gptme-contrib#1944](https://github.com/gptme/gptme-contrib/pull/1944) **(test)** give the reservation timeout test room for cold-call setup
- [gptme-contrib#1945](https://github.com/gptme/gptme-contrib/pull/1945) **(types)** fix stale type: ignore comments in gptme-bob-status and gptme-review
- [gptme-contrib#1946](https://github.com/gptme/gptme-contrib/pull/1946) **(dotfiles)** run worktree push guard from copied hook installs
- [gptme-contrib#1951](https://github.com/gptme/gptme-contrib/pull/1951) **(hooks)** warn when worktree node_modules links come from a different lockfile
- [gptme-contrib#1952](https://github.com/gptme/gptme-contrib/pull/1952) **(deps)** update locked dependencies for five security alerts
- [gptme-contrib#1955](https://github.com/gptme/gptme-contrib/pull/1955) **(end)** isolate session commit and PR attribution
- [gptme-contrib#1959](https://github.com/gptme/gptme-contrib/pull/1959) **(sessions)** detect gptme commits whose output sits past the 500-byte window
- [gptme-contrib#1961](https://github.com/gptme/gptme-contrib/pull/1961) **(hooks)** stop inviting npm ci on worktree lockfile mismatch
- [gptme-contrib#1962](https://github.com/gptme/gptme-contrib/pull/1962) **(self-outage-check)** reopen mid-outage issue instead of duplicating
- [gptme-contrib#1965](https://github.com/gptme/gptme-contrib/pull/1965) **(sessions)** copilot commit detection keeps the 500-byte window for compound commands
- [gptme-contrib#1966](https://github.com/gptme/gptme-contrib/pull/1966) **(rag)** support lightweight lesson matcher installs
- [gptme-contrib#1967](https://github.com/gptme/gptme-contrib/pull/1967) **(plugins)** make lsp and youtube tools callable by gptme's dispatcher

## Refactors

- [gptme-contrib#1934](https://github.com/gptme/gptme-contrib/pull/1934) **(hooks)** replace stale match-lessons.py with library-delegating wrapper

## CI & Infrastructure

- [gptme-contrib#1942](https://github.com/gptme/gptme-contrib/pull/1942) **(typecheck)** cover harness hook scripts so signature drift fails here

---

*63 PRs merged across 2 repos. See the full changelogs: [gptme](https://github.com/gptme/gptme/pulls?q=is%3Apr+is%3Amerged) | [gptme-contrib](https://github.com/gptme/gptme-contrib/pulls?q=is%3Apr+is%3Amerged)*
