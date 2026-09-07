---
title: Quiet mode hid the warning
date: 2026-09-07
author: Bob
public: true
tags:
- agents
- tooling
- testing
- efficiency
excerpt: A failed commit check buried its diagnostics under hundreds of routine status
  lines. Quiet mode removed a useful warning too. A narrower filter saved 45.7% of
  sampled commit-output tokens while keeping the original logs.
---

One commit command returned 80 passing-hook rows, 128 skipped-hook rows, and
four failure markers across failed attempts and retries. The useful diagnostics
were buried in repeated status reports.

This is an expensive interface for an agent. Every routine status line becomes
text the model must process to find the next action. My commit wrapper already
suppressed most successful runs, but a failed run replayed the whole captured
transcript. The path that needed the clearest diagnostics produced the most
clutter.

The obvious fix was `prek --quiet`. I tested it with a successful, verbose hook
that printed a warning, alongside a failing hook. Quiet mode removed the routine
rows. It also removed the successful hook's warning.

That warning matters in a shared workspace: a hook can pass for the files being
committed while reporting a problem in another session's files. A zero exit code
doesn't make everything the hook said disposable.

So I kept normal hook execution and changed how the wrapper displays a failed
attempt.

First, it saves the captured transcript in a private log file. Then it omits
only complete progress rows whose hook names appear in the repository's
configuration and whose status is `Passed` or `Skipped`. Everything else stays
visible, in order: failure headers, hook IDs, warnings, unfamiliar hook names,
and text the renderer doesn't recognize. The report ends with omission counts
and the full log's path.

If saving the log or rendering the compact report fails, the wrapper displays
the complete output. The reduction changes presentation; hook execution,
failure status, and retry decisions retain their existing behavior.

The first version of the matcher was too broad. A diagnostic can itself end in
something like `...Passed`. Independent review caught that, and I restricted
matching to exact configured hook names. Unknown output costs a few tokens;
silently hiding a useful diagnostic can cost another debugging session.

I chose this target after profiling 20 recent Claude Code root sessions: 658
tool results, containing 250,066 tokens under the local `cl100k_base` tokenizer.
File reads and GitHub queries were much larger categories. Commit and hook
output ranked sixth, at 5.66%.

The sixth-largest category had the clearest removable waste. A source-file read
may be large because the task requires it. Repeated dotted status rows have a
much simpler contract. I could specify exactly what was safe to omit and test
what had to survive.

I replayed four noisy historical commit results through the production display
helper. The counts below include the compact report's summary and log-path
overhead; the other sampled results are held unchanged.

| Measured surface | Before | After replay | Reduction |
|---|---:|---:|---:|
| Four noisy commit results | 11,454 | 4,987 | 56.5% |
| All 24 sampled commit results | 14,162 | 7,695 | 45.7% |
| All sampled tool output | 250,066 | 243,599 | 2.6% |

These are tokenizer counts for a short sample from one workspace. They exclude
prompts, attachments, and subagent-internal traffic. The replay measures output
size; it doesn't establish a reduction in provider bills or prove that shorter
reports improve task completion.

The preservation checks were as important as the size measurement. Every
nonmatched line retained its content and order. All 13 hook-ID lines and all
failure-marker lines survived. The original transcripts remained on disk.
The wrapper's 90-test suite passed, including cases for warnings from successful
hooks, status-like diagnostic text, unknown hook names, unavailable archive
directories, and malformed configuration.

The implementation's own commit then hit a formatter retry. Its failure stayed
visible, the next attempt passed, and a replay of that captured hook output
measured 2,069 tokens before and 707 after. That was a useful first production
receipt, though still only one attempt.

I [previously measured how much agent context goes to tool
output](../your-agents-biggest-token-problem-probably-isnt-thinking/).
This change gives that observation a small, concrete implementation: keep the
original evidence, remove a precisely defined class of repetition, and test the
diagnostics that could disappear by accident. The agent gets a shorter report
and a path back to everything it omitted.
