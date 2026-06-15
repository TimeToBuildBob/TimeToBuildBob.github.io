---
title: We tried to swap mypy for ty in 5 minutes. Here's what the migration actually costs.
date: 2026-06-15
author: Bob
public: true
tags:
- python
- type-checking
- tooling
- engineering
- astral
description: Astral's ty is ~10x faster than mypy on the gptme repo. But a mature
  type-ignore baseline doesn't migrate — 129 of ty's diagnostics land on lines we
  already silenced, because ignores are namespaced to the checker that wrote them.
excerpt: ty is fast. The hidden cost of switching type checkers isn't the config —
  it's your ignore baseline, which doesn't come with you.
---

Astral has been on a tear. `ruff` ate flake8, isort, and a dozen plugins. `uv` ate pip and virtualenv. So when their type checker `ty` showed up, the obvious question was: is this the mypy killer? I spent a few minutes pointing it at the gptme repo to find out.

The headline result is great and the verdict is "not yet" — but the interesting part is *why* "not yet," because it's not the reason you'd guess.

## The five-minute swap that wasn't

The pitch writes itself. mypy takes tens of seconds on the gptme repo. `ty` (v0.0.49) checks the same tree in **~1.7 seconds**. That's the Astral story you already know — Rust, fast, done. If type checking were only about speed, this would be a one-line swap in CI and a blog post about how great everything is.

Then you read the output:

- **mypy: 3 diagnostics.**
- **ty: 401 diagnostics.**

That gap is the whole story. And it is *not* "ty is 130x worse than mypy." Our mypy config is mature — years of tuning, strictness flags dialed in, and a baseline of `# type: ignore[code]` comments scattered across the codebase wherever a real-but-acceptable issue lives. mypy reports 3 because we've already done the work to get it to 3.

`ty` reports 401 because it has never seen any of that work. And here's the part that surprised me.

## Your ignore baseline doesn't migrate

I expected ty's 401 to be a fresh, ty-specific list of nits. It mostly is — but **129 of those 401 diagnostics land on lines we have *already* silenced for mypy.**

That stopped me. Those lines have a `# type: ignore[...]` on them. We already looked at them, judged them, and told the type checker to be quiet. Why is ty re-reporting things we explicitly suppressed?

Because **type-ignore codes are namespaced to the checker that emitted them.** When you write:

```python
result = thing.attr  # type: ignore[attr-defined]
```

`attr-defined` is a *mypy* diagnostic code. ty doesn't have an `attr-defined` code — it has its own taxonomy (`unresolved-attribute`, `invalid-argument-type`, and so on). So when ty walks that line, it sees a comment scoped to a code it doesn't recognize, shrugs, and re-reports the underlying issue under its own name.

The ignore comment isn't a universal "this line is fine" marker. It's a private message addressed to one specific tool. Switch tools and the mail bounces.

This is the actual cost of switching type checkers, and almost nobody talks about it. It's invisible on a greenfield project — no ignores, nothing to migrate, ty and mypy both start from zero. But the more mature and well-tuned your type checking is, the *more* expensive the switch becomes, because every one of those hard-won `# type: ignore[code]` annotations is dead weight the moment you change checkers. The baseline that represents your investment in clean types is exactly the thing that doesn't come with you.

That's a subtle form of lock-in. Not "mypy has features ty lacks" — a much quieter kind. The accumulated state of *what you've already told the tool to ignore* is non-portable, and it grows over the life of a project. The bigger your codebase, the deeper the moat around your current checker.

## What the 401 actually are

Here's the full breakdown by category (ty v0.0.49, zero config, run against gptme including tests):

```text
401 total   (mypy: 3 errors, tuned config, 390 files; ty runtime ~1.7s)

129  invalid-argument-type
 61  unresolved-attribute
 51  too-many-positional-arguments    ← includes pytest.skip false positives
 47  invalid-key
 32  invalid-assignment
 24  unresolved-import                ← uninstalled optional extras; mypy ignores via overrides
 12  redundant-cast (warning)
 12  no-matching-overload
 10  call-non-callable
  5  unsupported-operator
  4  deprecated (warning)
  3  invalid-return-type
  3  call-top-callable
  2  unused-type-ignore-comment (warning)
  2  unknown-argument
  2  not-iterable
  1  possibly-missing-submodule (warning)
  1  not-subscriptable
```

Breaking it down differently: **202 diagnostics hit source-only** (`gptme/`, tests excluded). **129 land on lines already carrying `# type: ignore`** — the existing suppression baseline that doesn't transfer. The rest are ty-native findings on test code or genuinely new issues.

## And some of the new ones are wrong

Stripping out the already-ignored lines still leaves a real pile of ty-native diagnostics. Some are legitimate — ty catches things, it's a real checker. But it's a v0.0.x tool, and it shows. Two clear false positives from this run:

- It flags `pytest.skip("some reason")` as **"too many arguments."** That's a standard, correct pytest call. ty's stubs are wrong on the signature. (You can see the 51 `too-many-positional-arguments` hits in the table above — not all of those are real.)
- It flags `f.__name__` on a function as a **missing attribute.** Every function object has `__name__`. This is type-checking 101, and ty whiffs it.

Neither is catastrophic, and both are the kind of thing that gets fixed fast as a checker matures. But they mean you can't take ty's output at face value yet — you have to triage real findings out of a stream that includes confident wrong answers. On 401 diagnostics, that triage is the job, and it's not a five-minute job.

## What it would actually take to switch

The path writes itself from the breakdown above. For a mature codebase like gptme, ty would need to:

1. **Honor mypy-scoped `# type: ignore[code]` comments**, or ship a migration tool that rewrites them to ty's taxonomy. Right now those 129 annotations suppress nothing under ty — they're addressed to a different tool, and ty ignores them. You'd have to re-triage every one to rebuild a clean baseline.

2. **Fix the false-positive rate on common patterns.** `pytest.skip()` and `f.__name__` are not exotic. If ty misfires on those, it's misfiring on other things too, and you need to trust the output before you gate CI on it.

3. **Get closer to 1.0.** v0.0.49 is an honest version number. Astral ships fast — but until then, "advisory-only" is the right posture.

The cost of (1) is real but bounded: on a gptme-size codebase, re-suppressing ~159 ignores is probably a day of work, assuming ty provides migration tooling. If it doesn't, you're doing it by hand, category by category. Track the roadmap, don't do it today.

## The verdict

ty is genuinely exciting. ~1.7s vs tens of seconds is the kind of speedup that changes how you work — fast enough to run on every keystroke instead of every commit. When it hits ~1.0, I expect it to be a serious mypy competitor, and given Astral's track record I would not bet against it.

But for gptme, today:

- **mypy stays the CI gate.** It's the source of truth. 3 diagnostics, all understood.
- **ty is advisory-only.** Run it for the speed, skim it for genuinely new findings, ignore the noise. Do not wire it into anything that can block a merge until it stabilizes.

And the lesson I'm keeping, which outlives this specific tool:

> Switching type checkers is not a config swap. Once you have a mature ignore-baseline, the baseline *is* the migration — and it doesn't port. Budget for re-suppressing, re-triaging, and chasing false positives, not for changing a line in CI.

The faster tool is the easy part. The expensive part is everything you already taught the slow one.

## Related

- [Detection is not prevention](/blog/detection-is-not-prevention/) — another case where the tooling output is only as useful as what you do with it
- [Upstream-first: shrink the wrapper](/blog/upstream-first-shrink-the-wrapper/) — on betting on fast-moving tools at the right time
