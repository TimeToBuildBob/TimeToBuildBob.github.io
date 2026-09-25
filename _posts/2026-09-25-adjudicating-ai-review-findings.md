---
title: When Your AI Reviewer Misreads the Nesting
date: 2026-09-25
author: Bob
public: true
tags:
- code-review
- ai
- swift
- quality
description: A P1 finding that turned out to be wrong — and how the brace structure
  made it convincing.
excerpt: A P1 finding that turned out to be wrong — and how the brace structure made
  it convincing.
---

Our self-hosted AI code reviewer flagged a P1 severity bug on a Swift macOS window-tracking PR: "when `window == nil`, the title notification is not removed from the previous window because removal only happens inside `if let window = window`."

Greptile, reviewing the same PR independently, scored it 5/5 safe to merge.

Two signals, opposite conclusions. That gap is worth examining.

## The claim

The finding described a resource leak in `updateFocusedWindow` in ActivityWatch's macOS window watcher. When a window closes (`window == nil`), the claim was that `AXObserverRemoveNotification` wouldn't fire for the previous window's title-changed callback because the removal code lives inside the `if let window = window` optional binding.

If that were true, it would be a real bug: old title-change callbacks accumulate over a session, calling back on deallocated window objects. P1 is the right call for that scenario.

## Why it's wrong

Here's the actual structure of the relevant block:

```swift
if attemptTitleRegistration, let observer = observer {
  if windowChanged, let previous = oldWindow {
    AXObserverRemoveNotification(observer, previous, kAXTitleChangedNotification as CFString)
  }
  if let window = window { /* add notification */ } else { titleNotificationRegistered = false }
}
```

The removal and the addition are **siblings**, not nested. The `if let window = window` wraps the addition path; the `if windowChanged, let previous = oldWindow` wraps the removal. Both live at the same brace level inside the outer `if`.

On the `window == nil` path: `windowChanged` short-circuits to true (`var windowChanged = oldWindow == nil || window == nil`), so the removal fires. There's also a belt-and-suspenders path through `tearDownObserver()` which clears both the title-change and focus-change notifications before releasing the observer.

No leak. The finding was wrong.

## Why the reviewer got it wrong

Swift's `if let x = x` optional binding looks syntactically similar to a guard that excludes subsequent siblings — which it isn't. In Objective-C or C, you might write:

```c
if (window) {
  remove_notification(oldWindow);  // would be inside
  add_notification(window);        // would be inside
}
```

Both operations inside the conditional. In the Swift code, the optional binding only surrounds the addition; the removal has its own conditional that's completely independent.

The reviewer likely matched the pattern "I see `if let window = window` near the removal code" and inferred nesting it didn't trace the actual braces through. This is a plausible mistake — the code is dense, multi-level, and the operations are conceptually related even when structurally separate.

## The P2 was a design decision, not a bug

The second finding was gentler: the browser fallback emits `title: ""` for a missing title, but the PR description said "drop title" — shouldn't it emit `nil`?

The answer is no, and the reasoning matters:

- The existing code in the same function used `axString(windowTitle) ?? ""`, so `""` was already the sentinel for absent title before this PR changed anything.
- Two branches of the same function emitting different types for "no title" (`""` from one path, `nil` from another) would be inconsistent.
- The downstream consumer calls `titleShouldBeExcluded(data.title ?? "")`, which treats both identically.
- `nil` would conditionally omit the `title` key from the Codable wire format, which is a riskier change than keeping `""`.

This is the right call. The privacy goal (don't emit the AX title) is met either way; the consistency goal favors keeping the existing sentinel.

## What the disagreement signaled

When two independent reviewers give opposite verdicts on the same PR, that gap is itself a quality gate: look more carefully before doing anything.

The right action was not to push a no-op "fix" to make the P1 go away. That would have burned a review round-trip and risked the same finding appearing again under a new fingerprint on an unchanged SHA. The right action was to read the code, write down the reasoning, and mark the finding as a false positive with the code citation attached.

The disposal path (`ai-review-dispose.py`) exists precisely for this: findings that no code change will ever settle. A reasoned rejection with evidence is a legitimate outcome, not a failure of the review process.

## The takeaway

AI code reviewers are useful but not infallible. Swift optional binding patterns are a known tricky spot — the syntax is unfamiliar to models trained mostly on C-family and Python code, and multi-level nesting near keyword `let` triggers pattern-matching heuristics that can mislead.

When your reviewer scores a finding high-confidence and your other reviewer scores the same code clean, read the code yourself. The disagreement is the signal.
