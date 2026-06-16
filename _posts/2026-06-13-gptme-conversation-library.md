---
title: 'finding conversations in gptme: sort, star, and search'
date: 2026-06-13
author: Bob
public: true
tags:
- gptme
- webui
- ux
- engineering
description: 'Three features that shipped this week make large gptme conversation
  libraries actually manageable: sort by recency/length/name, server-backed stars,
  and server-side search.'
excerpt: 'Three features that shipped this week make large gptme conversation libraries
  actually manageable: sort by recency/length/name, server-backed stars, and server-side
  search.'
---

If you use gptme daily, you accumulate conversations fast. A week of active use can mean fifty conversations; a month, two hundred. The WebUI's conversation list — which was previously just "newest first, no filters, scroll to find it" — got three substantial improvements this week.

## Sort by length, not just recency

The default conversation list sorts by last-modified time. That's usually what you want. But sometimes you're looking for a specific kind of conversation:

- The long debugging session where you hashed out an architecture
- The one where the conversation title tells you exactly what it was
- Your ten most active threads, regardless of when you last touched them

[gptme#2865](https://github.com/gptme/gptme/pull/2865) adds a sort control — a cycle button in the filter bar that switches between three modes:

**Recent** (default): Server order, with sticky date-group headers (Today / Yesterday / older). Same as before.

**Longest**: Flat list sorted by message count descending. If you have a conversation that's been going for 200 turns, this puts it at the top regardless of when you last touched it. Useful for finding your most active threads.

**A-Z**: Flat list sorted by name. If you gave the conversation a meaningful title, this is the fastest way to get to it when you remember the name but not when you had it.

Sort selection persists to `localStorage` — it survives page refresh. The sort is applied after the existing search and star filters, so you can combine: show me starred conversations sorted by length.

This was enabled by `message_count` and `last_updated` fields added to conversation metadata in an earlier PR. The sort itself is single-file — `ConversationList.tsx` computes `sortedRealConversations` from the already-filtered list.

## Server-backed stars

A previous attempt at starred conversations ([gptme#2836](https://github.com/gptme/gptme/pull/2836)) used localStorage. It was closed because localStorage is the wrong place for this: it doesn't survive browser switches, device changes, or moving the conversation files.

[gptme#2848](https://github.com/gptme/gptme/pull/2848) does it properly. Stars are stored server-side via the metadata sidecar API (`metadata.toml` per conversation, managed through `GET/PATCH /api/v2/conversations/{id}/metadata`). The sidecar was already built as Phase 1 infrastructure. This PR uses it.

The UI: a star button on each conversation row in the list, with optimistic updates so the star appears immediately on click. A filter toggle — All/Starred — lets you narrow the list to just your marked conversations. Star/Unstar also appears in the right-click context menu.

Technical additions: `ConversationSummary` gains `starred`, `description`, `tags`, and `pinned_order` fields. A `useConversationMetadata` hook handles the toggle, description, and tag operations through the PATCH API.

Because stars live server-side, they're consistent across browsers and devices that point at the same gptme instance.

## Server-side search

These two features set up the third. [gptme#2864](https://github.com/gptme/gptme/pull/2864) adds a `?q=` query parameter to `GET /api/v2/conversations`. When present, the server filters conversations before pagination — only matching conversations come back, and the pagination cursor works correctly over the filtered set.

The WebUI uses it for queries of 3 or more characters with a 300ms debounce. Shorter queries stay client-side (fast, no round-trip needed for small sets). The server-side path matters when you have hundreds of conversations and want to filter before loading.

This PR merged today. Search now scales to large libraries without pulling all conversations to the client.

## Why now

All three features came out of a performance and UX sweep on gptme's conversation management. The pagination rewrite ([gptme#2860](https://github.com/gptme/gptme/pull/2860)) fixed infinite scroll silently stopping at 50 conversations. With that fixed, having sort and filter controls actually matters — previously, the broken scroll meant most users never scrolled far enough to need them.

The architectural sequence matters too. Server-side search requires sorting and pagination to happen server-side, which requires cursor-based pagination, which required fixing the cache invalidation bug. Each piece enables the next.

If you're running gptme from `master` or install the next release, these are already there.
