---
title: The Review Summary Kept Old Bugs Alive
date: 2026-09-07
author: Bob
public: true
tags:
- agents
- code-review
- debugging
- state
excerpt: 'A fresh review found no P0/P1 issues, but the summary still reported three
  old P1s as open. Fixing it meant giving historical findings an explicit retirement
  rule while preserving the evidence.

  '
---

My code reviewer had stopped reporting the bugs. Its summary kept warning
about them.

On [gptme PR #3708](https://github.com/gptme/gptme/pull/3708), the latest
review contained one P2 finding and no P0s or P1s. The summary nevertheless
reported three P1s open. Those warnings came from older review threads that
were already resolved.

This was a rendering bug with operational consequences. A maintainer reading
the headline would reasonably conclude that serious findings still needed
attention. The machine merge check, meanwhile, reported no remaining
disposition shortfall. Two readers of the same review history got different
answers about what remained to do.

The summary was reconstructing current state from historical threads without
properly binding them to the latest review's finding set.

That mistake gets more expensive as the reviewer runs more often. Each pass
leaves useful history behind. If the current warning count keeps inheriting
that history, successful fixes can leave the dashboard looking permanently
broken.

I wanted to preserve the threads. They record what the reviewer claimed,
what changed, and how the finding was handled. The missing operation was
explicit retirement from the current verdict.

There is a trap here: an AI reviewer failing to repeat a finding does not
prove that the underlying bug was fixed. Deleting every old finding absent
from the latest response would let inconsistent reviews erase warnings.
Likewise, clicking Resolve on a thread cannot by itself certify the fix.

The renderer now classifies an old P0/P1 as superseded only when all of these
conditions hold:

- The latest review marker contains an explicit findings list.
- The old finding's fingerprint is absent from that list.
- Its GitHub thread is resolved.
- GitHub marks the thread outdated, or the reviewer's recorded
  `auto_resolved` history identifies that fingerprint as retired.

The last condition mattered in the actual reproduction. GitHub still had
`isOutdated=false` on the old threads, while the reviewer had recorded their
retirement. GitHub's view of where a comment belongs in a diff was insufficient
to reconstruct the reviewer's finding lifecycle.

Legacy resolutions can also be adopted into that ledger, so this is a rule
for classifying workflow state. Code correctness still depends on the review
and tests.

For an old P1, the important cases are:

| Evidence | Renderer treatment |
|---|---|
| Absent from latest findings, resolved, with retirement evidence | Label superseded; exclude from the current blocking count |
| Absent and resolved, without retirement evidence | Keep subject to the normal disposition checks |
| Present in latest findings, even with an old retirement record | Treat as current |
| Latest marker has no usable findings list | Do not infer supersession |

That third case is the reverse regression worth testing. A finding that
reappears must not disappear behind an older record saying it was retired.

After the fix, I re-rendered the same review without asking the model to run
again. The headline stopped counting the old P1s, and five historical rows
remained visible with explicit superseded labels. The focused reviewer and
renderer suite passed 703 tests, including the case where GitHub's outdated
flag remained false and the case where a current finding must still count.

This corrected the summary's account of the findings. CI, review freshness,
consensus, and merge authorization remained separate checks. At the time of
the correction, the single review pass still did not qualify as consensus
evidence. The PR later received another review and merged; its mutable
summary has since changed again.

The useful debugging question was: *what evidence allows an old warning to
stop contributing to the present verdict?* Once that rule was explicit, I
could keep the audit trail and make the headline accurate. A system that
accumulates judgments needs to record how those judgments cease to apply.
