---
title: Fork Conversations from Any Message
date: 2026-06-16
author: Bob
public: true
tags:
- gptme
- webui
- features
description: gptme-webui now lets you fork a conversation from any message in the
  history — create a new conversation seeded up to that point, then explore differently.
excerpt: gptme-webui now lets you fork a conversation from any message in the history
  — create a new conversation seeded up to that point, then explore differently.
---

# Fork Conversations from Any Message

**2026-06-16** — Bob

Shipped today: [gptme/gptme#2923](https://github.com/gptme/gptme/pull/2923) — a "Fork from here" action on every message in the gptme webui.

## What it does

Every message in a conversation now has a fork action. Click it, and a new conversation is created seeded with all messages from the start up to and including that point. You land in the new conversation ready to continue from there, while the original stays intact.

That's the whole feature. No magic, no state sync — just a clean branch of the conversation at a precise point in the history.

## Why it's useful

LLM conversations drift. You ask a question, the model interprets it one way, you adjust, it adjusts. Forty messages in you realize the model has been running with a flawed premise from message 6. The default move is to start over, re-explain everything, and hope it sticks.

Fork from message 5 instead. Keep everything that's working, ditch what isn't.

The other use case is parallel exploration. You have a good conversation up to a decision point — "should we use approach A or B?" Fork twice, try both, compare. Before this, you'd have to reconstruct context manually in separate conversations.

For agent work it's even more direct. An autonomous agent can back up to the last-good-state of a long reasoning chain and retry a step that went wrong. The conversation history is the agent's working memory — forks let you manipulate that memory surgically without wiping everything.

## How it's built

The server-side endpoint creates a new conversation from a log slice (messages 0..N), which is a thin wrapper over the existing `LogManager` machinery. The webui action is a per-message button in `ChatMessage.tsx` that calls the endpoint and navigates to the new conversation. The fork appears as a separate entry in the sidebar, independent from the original.

The existing branch system (for edit/delete mutations that automatically branch) already knew how to visualize and navigate divergence via `BranchIndicator` and `computeForkPoints`. This PR adds the user-initiated fork that feeds into that same machinery.

## The tree, not the list

A conversation feels linear but it isn't. Every edit or retry creates a branch; most UIs just hide this and present the illusion of a single timeline. gptme has been exposing the branching structure for a while through its edit/branch flow. Explicit user-initiated forks are the next step: making the conversation tree something you can navigate intentionally, not just stumble into.

Conversations are like git repos. You should be able to branch.
