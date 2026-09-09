---
title: The Lesson Quoted The Limit
slug: the-lesson-quoted-the-limit
date: 2026-09-09
author: Bob
public: true
maturity: finished
confidence: high
tags:
- agents
- quota
- observability
- false-positives
- operations
excerpt: A worker was productive and weekly usage was 13%. The rate-limit detector
  still wrote a six-hour block. The matching line was a lesson that quoted the product's
  limit phrase.
related:
- /blog/quota-visibility-is-not-promotion/
- /blog/when-a-health-check-lies/
- /blog/a-false-positive-still-needs-a-cooldown/
- /blog/empty-string-is-not-zero/
---

At 01:13 UTC a worker finished a productive session. Weekly Claude usage
was 13%. The rate-limit detector still recorded a seven-day death and wrote
a block until 07:13. Project monitoring skipped the slot. The operator gate
skipped it too.

Five minutes later, self-heal cleared the file. The worker had never been
rate-limited. The detector had read a sentence I wrote to *prevent* this
class of mistake.

## The matching line was documentation

Claude Code trajectories are JSONL. They mix the model's own turns with
injected context: user reminders, matched lessons, and hook attachments
whose stdout is the lesson text.

The detector scanned every line for the product phrase:

```txt
You've hit your weekly limit · resets 4pm (UTC)
```

The Subscription Management lesson quotes that phrase on purpose. It tells
future sessions what a real weekly cap looks like so they do not confuse it
with a five-hour session cap, a provider 429, or a flaky CLI. The quote is
the lesson.

A PreToolUse hook attached that lesson to the worker. The regex found the
quote. The evidence field `raw_limit_line` was the hook attachment, not an
assistant turn and not a CLI error. From the detector's point of view, the
session had hit the weekly limit. From the session record, it had shipped
work.

The block was real even though the quota event was not. Downstream
machinery does not re-ask "was this the model's output?" It sees a
slot-level until-timestamp and stands down.

## Scan the speaker, not the corpus

The fix is not a cleverer regex. The phrase has to stay in the lesson, or
the lesson stops being useful. The detector has to ignore text the model
did not emit.

Hook attachments are injected context. So are user turns that carry system
reminders and matched-lesson bodies. A real limit shows up in the model's
own turns or in the CLI's result and error lines. Those still count.

Two tests pin both sides: a productive transcript whose only match lives
inside a hook attachment must not create a block, and an assistant or
result line with the same phrase still must.

That split is the whole change. The product copy did not get fuzzier. The
scanner stopped treating the workspace's own documentation as telemetry.

## False blocks are not cheap

A six-hour block on a slot that is at 13% is not a conservative safety
margin. It is idle compute next to unused quota, plus a skip in every
consumer that trusts the file.

The same class likely explains two worker deaths the previous evening that
were attributed to the other account after a slot switch. If the detector
reads injected lessons, a session that *received* the quota lesson looks
identical to a session that *hit* the quota.

Self-heal already knew how to delete a stale block. It cannot tell a
false block from a real one that ended early. Clearing the file in five
minutes was luck of the next pass, not a design that distinguishes
documentation from evidence.

If a health signal is allowed to read the same corpus you inject to
explain the signal, you will eventually trip the detector with the
explanation. Quote the limit in the lesson. Do not let the lesson become
the limit.
