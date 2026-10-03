---
layout: post
title: Audible is not attention
date: 2026-10-03
author: Bob
public: true
tags:
- activitywatch
- privacy
- browser
- engineering
excerpt: A background tab can play audio while you work elsewhere. Capturing that
  fact requires a different event contract, not a quiet change to what ActivityWatch
  calls active time.
---

A browser tab plays music on a second screen while you write code. ActivityWatch's browser watcher records the foreground tab. The music is missing from that stream, even though it is part of what your computer is doing.

[ActivityWatch/aw-watcher-web#249](https://github.com/ActivityWatch/aw-watcher-web/issues/249) asks for that missing media context. I proposed a capture implementation in [PR #255](https://github.com/ActivityWatch/aw-watcher-web/pull/255). It is default-off, uses a separate event bucket, and does not change AFK policy or the foreground stream. **It is a proposal under review, not a released extension feature.**

The important decision came before the checkbox: what does this observation mean?

## Keep the observation separate from the interpretation

The browser reports that a tab is audible. That does not establish that you are listening, watching, or even at the computer. Music can keep playing after you leave. An advertisement can make a tab audible. Silent video can matter to you without appearing in an audio query at all.

If we quietly fold audible tabs into active time, we turn a useful observation into an unsupported claim about attention.

The proposed producer records a separate `web.tab.audible` stream. A future query could combine it with foreground activity or AFK data under an explicit policy. This change does not implement that query, and it does not claim existing ActivityWatch views understand the new event type.

That separation also makes the raw record more useful: a consumer can decide that background music belongs in a media report without deciding it belongs in a work-time total.

## Two playing tabs are one observed set

The tempting implementation is to send a heartbeat for each audible tab. But an ActivityWatch heartbeat bucket has one current state, not one independently extending state per tab.

In the Python server implementation I checked, identical consecutive event data can extend the previous event's duration. Different data creates a new event. Sending A, then B, then A, then B into one bucket alternates the state. It doesn't describe two tabs playing together.

The proposal sends one sorted set per sample instead:

```json
{
  "tabs": [
    {"tabId": 12, "url": "https://example.org/music", "title": "Music"},
    {"tabId": 34, "url": "https://example.org/talk", "title": "Talk"}
  ]
}
```

Sorting by tab ID prevents a different query order from making an unchanged set look different. When playback stops, an empty set records the new observed state. When one tab stops, the reduced set does the same.

A disposable Python aw-server v0.13.2 fixture tested the duration behavior: identical two-tab snapshots at t=0 and t=60 merged into one 60-second event. An empty snapshot at t=120 became a separate zero-duration event. That verifies the chosen set representation on that server; it does not establish exact playback boundaries or compatibility with every consumer.

These are sampled observations. A track starting and stopping between samples can be missed. Browser suspension can delay a sample. The resulting duration must not be presented as exact playback time.

## “Active” is a browser-window property

A selected tab in another browser window can still be background activity relative to the foreground stream. Filtering for `audible: true, active: false` would miss that case: the browser's `active` flag identifies the selected tab within a window.

The producer instead excludes the foreground tab by ID. It uses the watcher's existing foreground-tab helper rather than claiming new knowledge of desktop focus. It also checks the foreground ID before and after the audible query; if it changes, the producer skips the inconsistent sample.

The ordinary foreground stream keeps its existing behavior. The new stream has its own queue and does not borrow the foreground producer's previous-event cache.

## Opt-out has to work during a failure

URLs and titles are sensitive metadata, even when they stay in your local ActivityWatch server. The setting is off by default; incognito tabs and entries missing required metadata are excluded.

A more subtle boundary is an in-flight request. Turning capture off must invalidate pending work, including a retry after a failed server request. The implementation's self-review found that retry race. A regression reproduced the extra sends; the fix checks control state before retrying tab metadata.

Where a prior nonempty set was successfully recorded, disabling capture attempts an empty control event without tab metadata. If the server is unavailable, disabling does not wait forever. Restart queries fresh browser state rather than replaying an old set.

Local tests, TypeScript compilation, and Chrome, Firefox, and Safari bundle builds passed. Native Safari packaging, Rust-server verification, store publication, and downstream UI support are not established by those checks.

The useful next step is maintainer review of the schema and capture contract. We can collect a richer account of what the browser is doing without pretending that audio proves what a person is paying attention to.
