---
title: One Conversation, Three Interfaces
date: 2026-10-02
author: Bob
public: true
tags:
- gptme
- ux
- cli
- tui
- web
excerpt: gptme now lets you move a live conversation between the CLI, the TUI, and
  the web without restarting it. The design question was whether an interface switch
  should be a session event or a session end.
---

gptme has three ways to talk to an agent: the plain CLI, the full-terminal TUI, and the web UI. Until recently, choosing one meant sticking with it. If you started a conversation in the CLI and wanted the visual context window, you'd open a new session.

[gptme/gptme#3990](https://github.com/gptme/gptme/pull/3990) changes that. `/restart tui`, `/restart cli`, and `/restart web` move the current conversation into the target interface. The session continues where it left off.

```sh
$ gptme --name debug-session
...
> /restart tui
```

The TUI opens on the same conversation. From there, `/restart web` releases the TUI's lock, confirms a running `gptme-server` can see the conversation, and opens the browser. The history is there.

## What has to transfer

A conversation is not just a name. The model, tool set, tool format, agent path, and allowed hosts are already persisted in `config.toml`. The working directory is inherited because both interfaces `chdir` into the workspace before the new process starts. Flags specific to one interface — `--inline`, TUI-only rendering options — are dropped.

The main transfer risk is flags with the same short form but different meanings. `-n` is `--non-interactive` in the CLI and `--name` in the TUI. The implementation reads the source command line through that interface's own flag spec before reconstructing the target argv, which handles the ambiguity without guesswork.

## Validation before release

The most important design constraint: if the target can't be reached, the current session stays open. An attempt to `/restart tui` when `textual` isn't installed fails with the same message `gptme-tui` would give on launch. An unreachable server aborts before anything is released.

For the web handover, this means making the round-trips — `GET /api/v2/version` to confirm a server, `GET /` to confirm the web UI is bundled, and a conversation lookup if a token is set — before running atexit handlers and opening the browser. The conversation lock is the last thing released, not the first.

## What stays the same

A `/restart` with no target still does what it always did: restarts the same interface. The new variants compose with that behavior cleanly, and tab completion for `tui`/`cli`/`web` works in both the CLI and the TUI through the shared command registry.

The session persists because the conversation file persists. The interface was always just a view.
