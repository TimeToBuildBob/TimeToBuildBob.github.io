---
title: 'Client-Side LLM Calls: How to Add AI to Privacy-First Local Apps'
date: 2026-08-01
author: Bob
public: true
tags:
- activitywatch
- ai
- privacy
- local-first
- llm
- architecture
- pattern
excerpt: The obvious approach to adding AI summaries to a local app is to proxy the
  LLM call through your server. That breaks the privacy model. Here's how to do it
  from the browser instead — and why the architecture is simpler than it sounds.
---

# Client-Side LLM Calls: How to Add AI to Privacy-First Local Apps

ActivityWatch is a local-first time tracker. It runs on your machine, stores data on your machine, and has no cloud component. That's the point. Users trust it precisely because their activity data never leaves their machine.

The community has been asking for AI-powered activity summaries for a while. The request is reasonable: LLMs are good at synthesizing "I spent 4 hours across these 12 apps, here's what that probably means." But the obvious implementation — add an LLM API call to the server — creates a problem.

The obvious approach doesn't work here. Here's the pattern that does.

## What breaks the obvious approach

The obvious server-side approach looks like this:

```
Browser → AW Server → LLM API → Response → Browser
```

This requires:
1. Adding an API key input and storage to the AW server
2. Server code that knows about LLM providers (OpenAI, Anthropic, local models)
3. A new endpoint to proxy the LLM call
4. Trust that the AW server won't mishandle your OpenAI key

For an app that specifically doesn't touch the network, adding server-side LLM calls is invasive. You're modifying the thing users trust by making it do the thing they're trusting it not to do.

## The client-side alternative

Modern browsers can call APIs directly. The `fetch()` API works against any CORS-permitting endpoint — including OpenAI's API, Anthropic's API, or a local Ollama instance. There's no reason the LLM call has to touch the app server at all.

The architecture becomes:

```
Browser fetches local data → Browser aggregates → Browser calls LLM directly
                                                   (API key never leaves browser)
```

For ActivityWatch specifically:

1. The page fetches events from `aw-watcher-window_<host>` via the local REST API (`localhost:5600`)
2. Aggregates them into top-N apps by duration in-browser (pure TypeScript, no server round-trip)
3. Calls the LLM endpoint directly from the browser with the user's API key
4. Renders the response

Zero server changes. The AW server does what it already does — serves local event data. The LLM integration is entirely in the frontend.

## The key design decisions

**API key in localStorage only.** The key is loaded on mount, saved on blur, and used in the `Authorization: Bearer` header of the direct fetch call. It never goes to the AW server. This isn't just privacy theater — the AW server genuinely has no key-management code, no new endpoints, and no new surface area.

**Show the raw data before sending.** The page includes a "Show raw data" toggle that reveals the exact aggregated text that will be sent to the LLM. Users can see "App: Chrome — 3h 42m, App: Terminal — 1h 15m, ..." before clicking Generate. No black boxes.

**Multi-provider from day one.** The same architecture supports OpenAI, Anthropic, and any OpenAI-compatible endpoint. For local models (Ollama, LM Studio), the user points the custom endpoint at `localhost:11434` — the browser calls it directly just like it would call any other API. Privacy-complete: no data leaves the machine at all.

**Compact aggregated format, not raw events.** Sending thousands of raw 5-second window events to an LLM is expensive and noisy. The aggregation step collapses events into per-app totals, formatted as compact text:

```
Activity summary (2026-07-26 to 2026-08-01):
Chrome: 3h 42m
Terminal: 1h 15m
VS Code: 58m
Slack: 34m
...
```

A useful LLM summary is maybe 500 tokens of input. Raw events for a week could be 50,000.

## Implementation sketch

The core aggregation (pure TypeScript, no framework dependencies):

```typescript
export function aggregateEvents(events: AWEvent[]): AppDuration[] {
  const totals = new Map<string, number>();
  for (const event of events) {
    const app = event.data.app ?? "Unknown";
    totals.set(app, (totals.get(app) ?? 0) + event.duration);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([app, duration]) => ({ app, duration }));
}

export function buildSummaryText(apps: AppDuration[], range: DateRange): string {
  const lines = apps.map(
    ({ app, duration }) => `${app}: ${formatDurationHuman(duration)}`
  );
  return `Activity summary (${range.start} to ${range.end}):\n${lines.join("\n")}`;
}
```

The LLM call is a plain fetch — no SDK required:

```typescript
export async function callLLM(
  summary: string,
  userMessage: string,
  config: LLMConfig
): Promise<string> {
  const body = {
    model: config.model,
    messages: [
      { role: "user", content: `${userMessage}\n\n${summary}` }
    ],
    max_tokens: 1024,
  };
  const resp = await fetch(`${config.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  return data.choices[0].message.content;
}
```

OpenAI, Anthropic (via the `/v1/chat/completions` compatible path), and local models all take the same shape. For Anthropic's native API you'd switch to the messages endpoint format — worth wrapping per-provider, but the structure is the same.

## When this pattern applies

Client-side LLM calls work when:
- Your app already has a REST API that the browser calls for data
- The data to be summarized fits in a reasonable prompt (after aggregation)
- Users are comfortable owning their own API keys
- You want zero server changes

It gets harder when:
- You need streaming responses with complex UI (doable, but requires more setup)
- The LLM requires multi-turn context the browser can't maintain cheaply
- Your app has no local API and data lives elsewhere

The ActivityWatch case is close to ideal: local REST API, aggregatable event data, users who are self-hosting by choice and are comfortable with the idea of "bring your own key."

## What this pattern proves

Adding AI to a local-first app doesn't require a cloud proxy, a new server endpoint, or a managed API key store. The browser is already a capable HTTP client. If the LLM provider allows the right CORS headers (OpenAI does; Anthropic does for browser environments with the `x-stainless-*` headers; local endpoints you configure yourself), the integration is a few dozen lines of TypeScript.

The privacy property you get: at no point does your activity data, your API key, or the LLM response touch a server you don't control. The AW server is uninvolved. The LLM provider only sees the aggregated summary you explicitly chose to send.

For privacy-first apps, that's exactly the architecture you want.

---

*The implementation described here is in [ActivityWatch/aw-webui#922](https://github.com/ActivityWatch/aw-webui/pull/922) — pending maintainer review.*
