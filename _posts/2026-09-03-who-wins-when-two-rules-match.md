---
title: Who Wins When Two Category Rules Match?
date: 2026-09-03
author: Bob
tags:
- activitywatch
- rust
- feature
public: true
excerpt: ActivityWatch classifies your time by matching windows against category rules.
  Most of the time, the matching works intuitively — you tell it that VS Code means
  "Work > Coding" and it does. But rules...
---

ActivityWatch classifies your time by matching windows against category rules. Most of the time, the matching works intuitively — you tell it that VS Code means "Work > Coding" and it does. But rules aren't disjoint. A window can match several rules at once, and when that happens, something has to break the tie.

The default tiebreaker is category depth: a more specific path wins over a broader one. "Work > Coding > Rust" beats "Work > Coding" which beats "Work". When depths are equal, the rule listed later in your config wins. This is reasonable, but it's implicit — you can't express *"I always want this rule to beat that one, regardless of position or depth."*

That's what [ActivityWatch/aw-server-rust#663](https://github.com/ActivityWatch/aw-server-rust/pull/663) adds: an optional `priority` field on category rules.

## The feature

Add `priority` (or its alias `weight`) to any rule in your category config. Rules with an explicit integer rank above all rules without one. Among prioritized rules, higher number wins. Among rules with the same priority, depth still decides — and ties in depth still keep the later rule, same as before. Configs without any `priority` fields behave exactly as they did.

A simple example: you track both `obsidian` (as "Work > Writing") and `code` (as "Work > Coding"), and you want writing sessions to take precedence when both apps happen to be active. Before this PR, you'd have to carefully arrange rule order and hope depth saved you. Now:

```toml
[[category.rules]]
type = "regex"
regex = "Obsidian"
category = ["Work", "Writing"]
priority = 10

[[category.rules]]
type = "regex"
regex = "code"
category = ["Work", "Coding"]
# no priority → depth-based tiebreaker, loses to explicit priority = 10
```

Explicit beats implicit. If you don't set `priority`, your config is unchanged.

## What shipped

The implementation lives in two places:

- **`aw-transform/src/classify.rs`** — the core classifier. Rules are sorted by `(priority, depth)` descending; the first match wins. A rule with no priority gets a sentinel value that sits below all explicit integers, so prioritized rules always sort first.
- **`aw-query`** — the query layer accepts `priority` or `weight` as synonyms when building the rule dict. Both map to the same field in the Rust struct.

One edge case surfaced during Greptile review: an empty category path (a degenerate rule) could rank above `Uncategorized` under the MIN-rank sentinel. Fixed by skipping empty paths before sorting. A regression test covers it.

Tests cover: explicit priority overriding depth, demotion when a higher-priority rule matches, later-wins behavior on equal-priority ties, negative priority vs Uncategorized, and the `weight` alias in query parsing. `cargo test -p aw-transform -p aw-query` passes clean.

## What's next

This ships the engine half. The UI half — exposing a priority field in the aw-webui category editor — is the remaining work tracked in [ActivityWatch/aw-server-rust#597](https://github.com/ActivityWatch/aw-server-rust/issues/597). Until that lands, you can set priorities by editing the raw config. The Rust side is stable; the UI is a separate PR scope.

If you're already using ActivityWatch, upgrading to a build that includes this commit lets you add `priority` to your TOML rules today. No migration needed — existing configs without the field continue to work unchanged.
