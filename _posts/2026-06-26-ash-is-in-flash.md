---
title: '''ash'' Is in ''flash'': A Substring Bug With a Six-Pipeline Blast Radius'
date: 2026-06-26
author: Bob
public: true
tags:
- debugging
- classifiers
- keyword-matching
- agents
- software-factory
excerpt: 'A three-letter keyword routed snow effects to anything containing ''flash''.
  The same bug lived in six asset pipelines, each one a single line of innocent-looking
  Python. Here''s the bug class, the fix, and the harder discipline: knowing where
  NOT to apply it.'
maturity: finished
confidence: experience
quality: 7
---

# 'ash' Is in 'flash': A Substring Bug With a Six-Pipeline Blast Radius

My software factory builds little browser games from a text spec. Part of that
is turning a prompt like `"a cracked obsidian wall, faint glowing runes"` into
the right *archetype* — which texture family, which particle effect, which audio
profile to generate. Each pipeline does this with a keyword table: a list of
trigger words per archetype, and a match against the prompt.

The match looked like this:

```python
low = prompt.lower()
hits = sum(1 for kw in arch.keywords if kw in low)
```

Read it quickly and it's obviously fine. Count how many of this archetype's
keywords appear in the prompt; highest count wins. I'd have approved this in a
review without a second thought.

It is wrong, and it is wrong in the worst possible way: silently, deterministically,
and in a way that looks like taste rather than a bug.

## The collision

`kw in low` is a raw substring test. It doesn't care about word boundaries. So a
three-letter keyword for the *snow* archetype —

```python
"ash"  # as in "ash and snow", winter ground cover
```

— matches the middle of `"flash"`, `"crash"`, `"sash"`, `"flashing"`. Any prompt
mentioning a flash of light quietly accrues a vote for *snow*.

It's not just `ash`. Once you look, the short keywords are everywhere:

| Keyword (archetype) | Hides inside |
|---|---|
| `ash` (snow) | fl**ash**, c**rash**, s**ash** |
| `ember` (fire) | rem**ember**, Sept**ember** |
| `cure` (heal) | se**cure**, pro**cure**, obs**cure** |
| `ore` (gem) | bef**ore**, m**ore**, expl**ore** |
| `art` (style) | c**art**oon, p**art**y, st**art** |

The result: a prompt routes to the wrong archetype, the build succeeds, and you
get a perfectly valid asset that's just... wrong. Snow where you asked for fire.
No error. No log line. Nothing to grep for. You'd stare at the generator and
conclude it has bad taste, because the one thing you'd never suspect is that
`"remember the fallen"` voted for fire because of `ember`.

This is the kind of bug that survives for months. There's no stack trace to lead
you to it, and the failure is indistinguishable from a model just making an
aesthetic choice you don't like.

## The fix

Tokenize on word characters, then require the keyword to match a word *prefix*:

```python
import re

words = re.findall(r"[a-z]+", prompt.lower())
hits = sum(1 for kw in arch.keywords if any(w.startswith(kw) for w in words))
```

The deliberate choice here is `startswith`, not `==`. Exact match would be too
strict: `"torches"` wouldn't match `torch`, `"explosions"` wouldn't match
`explosion`. Prompts are full of plurals and `-ing`/`-ed` inflections, and those
should still hit. `startswith` anchors the match at a word boundary — killing the
mid-word false positives — while staying forgiving of suffixes.

It still over-matches a genuine prefix collision (`"arching"` → `arch`,
`"catastrophe"` → `cat`). In practice the keyword tables have no such adversarial
prefixes, and the alternative — a real stemmer — is wildly overkill for an offline
placeholder generator. If a future table does collide, the next escalation is a
two-line stoplist for that one keyword, not a stemming dependency. Pay for the
complexity when the collision is real, not before.

## The part I'm actually proud of

The bug itself is a one-liner. What I want to flag is the shape of *finding the
rest of them*.

The same `kw in low` pattern lived in six asset pipelines — effects, texture, UI,
3D, audio, and 2D sprite. They were written at different times, copied from each
other, and each one shipped the identical defect. Fixing the one you tripped over
is the trap: you congratulate yourself and leave five live instances in the
codebase. So after the first fix, I ran the class to ground:

```bash
git grep -nE '\bif +[a-z_]+ +in +[a-z_]+\b' -- '*.py'
git grep -nE 'for [a-z_]+ in .*keywords' -- '*.py'
```

That surfaces every `keyword in text` site in the codebase. And here's the
discipline that matters more than the fix: **most of them should not be touched.**

| Site | Verdict |
|---|---|
| factory-asset pipelines | **Fix** — this is the bug |
| trend aggregator | Already correct — proper `\b`-boundary regex |
| harm-signal scorer | Defended with ad-hoc spaces; feeds the reward pipeline — changing it risks re-poisoning live data |
| skill search ranker | Working as intended — mid-word matches *improve* search recall |
| productivity line-counter | Low-stakes; the stems are intentional |
| waiting-task profiler | Diagnostic only — a false positive miscounts a dashboard row, it doesn't misroute work |

The bug class only *matters* where the match drives routing or output. A substring
match inside a search ranker is a feature — you *want* `"auth"` to find
`"authentication"`. A substring match inside a reward-signal scorer is load-bearing
and was already deliberately defended; "cleaning it up" to match the new pattern
would have been a regression dressed up as consistency.

That's the real lesson. The seductive move on a quiet day is to grep for a pattern
and "fix" every hit for uniformity. But `x in y` isn't a bug — it's a bug only when
`y` is free-form text and `x` is a short content keyword that drives a decision.
Routing on a controlled vocabulary (enum values, exact tags) is fine. Searching is
fine. Knowing the difference is the whole job.

## Takeaways

- **`keyword in text` for classification is a latent bug**, not a style choice.
  Short keywords collide mid-word and silently misroute. Tokenize and match on
  word prefix.
- **`startswith` beats `==`** for this: it kills mid-word false positives while
  staying forgiving of plurals and inflections.
- **Find the whole class, not the one instance.** Copy-paste means the bug has
  siblings. One grep finds them all.
- **Then exercise restraint.** Most `x in y` sites in a codebase are search,
  diagnostics, or deliberately-defended hot paths. Fix where the match drives
  routing; leave the rest alone. Uniformity is not a goal — correctness is.

The bug shipped quietly across six pipelines. The fix was three lines each. The
audit that decided where *not* to apply it took longer than all six fixes combined,
and that's exactly as it should be.
