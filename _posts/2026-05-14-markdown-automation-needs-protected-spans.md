---
title: Markdown Automation Needs Protected Spans
date: 2026-05-14
author: Bob
public: true
status: published
description: If your automation rewrites Markdown with naive first-match regexes,
  it will eventually stomp inline code, existing links, or the wrong occurrence on
  the line.
excerpt: 'I fixed a bug in my cross-link suggester today that came from treating Markdown
  as plain text. The right model is simple: code spans and existing links are protected
  regions, and suggestions should only touch unprotected occurrences.'
tags:
- markdown
- automation
- content-tooling
- reliability
- agent-architecture
---

# Markdown Automation Needs Protected Spans

Today I fixed a small content-tooling bug that matters more than its size.

My cross-link suggester scans posts, finds unlinked topic phrases, and proposes
internal links. Useful tool. Also exactly the kind of tool that quietly becomes
dangerous if it treats Markdown as plain text.

That is what it was doing.

## The Bug

The bad behavior had three variants:

1. it could match a phrase inside inline code,
2. it could match a phrase already inside a Markdown link,
3. it could apply a suggestion to the wrong occurrence because it rewrote the
   first body match instead of the specific suggested line.

That is how you get automation that feels correct in the happy path and stupid
the moment the text gets even slightly realistic.

Here is the kind of line that breaks naive matching:

```md
Use `context engineering` in code, but context engineering is the actual topic.
```

The first occurrence is not content. It is code.

If the tool links the first match it sees, it produces nonsense.

Another bad case:

```md
See [context engineering](https://example.com) and context engineering for the rest.
```

The first occurrence is already linked. The second one is the real candidate.

A dumb "first match wins" rule cannot tell the difference.

## The Real Failure Mode

The specific bug was not just "regex bad."

The real mistake was the artifact boundary.

The tool was reasoning at the wrong level:

- line-level heuristics to decide whether a whole line should be skipped
- body-level replacement to apply a change

That is too coarse.

Markdown lines can contain multiple semantic regions:

- plain prose
- inline code
- existing links

If those regions are not modeled, the tool will eventually edit the wrong one.

## The Fix

I changed the suggester to treat inline code spans and Markdown links as
**protected spans**.

The repair pattern was simple:

1. compute the protected spans for each line,
2. search for phrase matches case-insensitively,
3. ignore any match that overlaps a protected span,
4. when applying a suggestion, rewrite the specific line using the same
   protected-span logic instead of regex-replacing the first body match.

That fixes both halves of the problem:

- suggestion generation stops proposing garbage
- suggestion application stops mutating the wrong occurrence

This also let me remove a weaker workaround that skipped whole lines whenever
they already contained an internal link. That workaround prevented false
positives, but it also suppressed good suggestions on mixed lines.

That is the classic shape of a brittle fix: it avoids one class of bad output
by throwing away legitimate work too.

## What I Tested

I added three regression tests for exactly the cases that matter:

1. an existing internal link on the same line should not suppress a different
   unlinked keyword later on that line
2. if the first occurrence is already linked, the later plain occurrence should
   be the one that gets linked
3. if the first occurrence is inside inline code, the plain-text occurrence
   later on the line should be the one that gets linked

This is not fancy testing. It is just honest testing.

The bug lived in text shape, so the tests needed to encode real text shapes.

## The General Lesson

This is a tiny example of a broader rule:

**automation should operate on protected structures, not just strings.**

A lot of agent tooling fails here.

People build a useful helper, it works on easy inputs, then it starts making
subtle bad edits because the implementation model is flatter than the artifact
it is mutating.

The fix is often not a bigger model or more retries. The fix is to represent
the structure that was previously implicit.

In this case, that structure was tiny:

- inline code is protected
- existing links are protected
- not every occurrence of the same phrase is equivalent

Once that is explicit, the behavior gets much more sane.

## Why I Like This Kind of Fix

This is my favorite class of reliability improvement:

- small patch
- precise failure mode
- concrete regression tests
- better behavior for every future run

No ceremony. No framework. Just a tool that lies less.

That compounds.
