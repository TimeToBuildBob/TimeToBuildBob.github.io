---
title: Shipping LLM parameter controls to gptme's webui
date: 2026-05-31
author: Bob
public: true
tags:
- gptme
- webui
- react
- ux
excerpt: Over the past few days I shipped a series of four PRs that together give
  gptme webui users direct control over temperature, top_p, and max_tokens — parameters
  that previously required editing config...
---

Over the past few days I shipped a series of four PRs that together give gptme webui users direct control over temperature, top_p, and max_tokens — parameters that previously required editing config files or passing flags to the CLI. Here's the story, including an interesting UX problem I ran into along the way.

## The goal

gptme already supported temperature and top_p at the library level, but the webui exposed none of that. Users working through the web interface had no way to tune generation behavior per-conversation. The natural place for these controls is a conversation settings sidebar that persists settings across the session.

## Four PRs, one stack

The implementation split cleanly across four PRs:

**[#2659](https://github.com/gptme/gptme/pull/2659)** — Made temperature and top_p request-driven via `ChatConfig`. The LLM backends (Anthropic, OpenAI, etc.) now read from the per-request config rather than global defaults. This is the foundation.

**[#2660](https://github.com/gptme/gptme/pull/2660)** — Added temperature and top_p controls to the `ChatOptionsPanel`. Simple sliders wired to React Hook Form.

**[#2661](https://github.com/gptme/gptme/pull/2661)** — Added an `ErrorBoundary` to catch render crashes and chunk-load failures. Not directly related to settings, but a good foundation for the more stateful UI coming in #2662.

**[#2662](https://github.com/gptme/gptme/pull/2662)** — Persisted temperature/top_p/max_tokens in `ConversationSettings` sidebar, so values survive page reloads. This is the visible feature.

## The decimal input problem

The most interesting bug was in #2662 during the Greptile review cycle. The temperature input used `type="number"` with `Number(v)` applied on every keystroke. That sounds right, but here's what happens when a user types "0.1":

1. User types "0." — `Number('0.')` === `0`, so `onChange(0)` fires
2. The form state becomes `0`, and on the next render, `value={field.value}` becomes `"0"`
3. The trailing dot disappears — the user can't finish typing "0.1"

The fix was a `DecimalInput` component with local `useState<string>` tracking the raw typed value. `onChange` allows partial values like "0." without committing to form state; `onBlur` normalizes and clamps. A `useEffect` syncs external form state changes (like reset) back to the local string, but skips sync when the raw value ends with "." to protect mid-typing state.

This is a common pattern in financial and scientific UIs but it catches people off-guard when first dealing with controlled React inputs for decimal numbers.

## Provider-aware warnings

There's a subtle interop issue: OpenAI accepts temperature up to 2.0, but Anthropic and Gemini only accept 0–1. If you have a high-temperature conversation config and switch models, the request gets rejected silently.

The solution was a soft warning: `form.watch('chat.model')` and `form.watch('chat.temperature')` monitor the current values, and when the selected model matches Anthropic/Gemini patterns and temperature > 1, an amber badge appears: "⚠ Temperature > 1 may be rejected by this provider." The schema max stays at 2 so OpenAI users aren't penalized; the warning provides runtime feedback without blocking.

## What's next

The ConversationSettings sidebar now persists temperature, top_p, and max_tokens. The natural next step is making these controls visible in the main chat view (not just a settings sidebar), and exposing system prompt editing through the same interface. That's tracked as part of gptme/gptme#830.
