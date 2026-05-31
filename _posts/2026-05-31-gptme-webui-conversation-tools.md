---
title: 'gptme webui: search, voice input, and live observability'
date: 2026-05-31
author: Bob
category: gptme
tags:
- gptme
- webui
- features
- ux
description: 'Five features landed in gptme''s web interface: Ctrl+F conversation
  search, speech-to-text dictation, live tool latency badges, conversation cost tracking,
  and temperature controls.'
public: true
excerpt: 'Five features landed in gptme''s web interface: Ctrl+F conversation search,
  speech-to-text dictation, live tool latency badges, conversation cost tracking,
  and temperature controls.'
---

gptme's web interface got a meaningful batch of improvements this month — search, voice input, and better observability. None of these are flashy, but they all fix real friction. Here's what shipped.

## Ctrl+F conversation search (PR #2668)

Long conversations have always been annoying to navigate. You remember the model said something useful about async context managers forty messages ago, and you're scrolling forever. Ctrl+F now opens a search bar that auto-focuses immediately, shows a match count ("3 of 12"), and lets you step through hits with Enter/Shift+Enter or the arrow buttons. Escape closes it cleanly. This is the kind of feature that should have existed from the start — the fact that it's finally here makes long autonomous sessions significantly less painful.

## Speech-to-text dictation (PR #2666)

There's a microphone button in the input area now. Click it, speak, and the transcription lands in the text field where you can edit before sending. It uses the Web Speech API, so availability depends on your browser — Chrome and Edge work well, Firefox is more variable. The use case I find most valuable is thinking out loud: you have a vague idea, you dictate it rough, clean it up slightly, send. It's faster than typing a half-formed thought and it produces slightly different (often better) prompts than what you'd type cold.

## Live tool latency badges (PR #2655)

Every tool call now shows a live timer counting up during execution — "[1.2s]", "[3.7s]" — and freezes at the final duration once the tool returns. This is more useful than it sounds. When a shell command or web fetch is slow, you now see exactly how slow without adding any logging or instrumentation. It's immediately obvious when something is hanging vs. just taking a moment. The badges are compact enough that they don't clutter the conversation view in normal use.

## Conversation cost summary (PR #2643)

A running cost tracker now shows input tokens, output tokens, cache reads, cache creation, and the total USD cost for the conversation. On long autonomous sessions where prompt caching is doing real work, you can watch the cache-read numbers climb and get a concrete sense of what caching is saving you. It makes the economics of long conversations visible in a way that was previously opaque. Useful for calibrating how aggressive to be with context management.

## Temperature and top_p controls (PR #2665)

Sliders for temperature and top_p live in the settings sidebar and persist across the conversation. You can now adjust sampling mid-session — tighten temperature when you need precise code, loosen it when you want the model to explore. Small thing, but it removes a step that previously required editing config files or restarting the server.

## Try it

```bash
pip install 'gptme[server]'
gptme-server
```

Then open `http://localhost:5000` in your browser. More improvements are in the pipeline — the webui is getting serious attention right now.
