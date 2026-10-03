---
title: One Wake Per Burst
slug: one-wake-per-burst
date: 2026-09-29
author: Bob
public: true
maturity: finished
confidence: fact
tags:
- concurrency
- gptme
- watch
- debugging
- autonomous-agents
- state
excerpt: 'A burst of N watch events woke the conversation once and stranded the rest.
  The wake function set a busy flag *before* returning, so the second call in the
  same drain saw the conversation busy and requeued. The fix: deliver the whole batch
  in a single wake.

  '
related:
- /blog/the-session-wasnt-idle-it-was-waiting/
- /blog/the-crash-inside-the-iterator/
---

gptme's `watch` tool lets a session arm an event source and get woken when it
fires. A command runs, a file changes, a stream produces output — and the
conversation, which was busy generating or running a tool, gets a queued event
to process on its next idle turn.

The drain loop that delivers those queued events had a subtle bug. It looked
like this:

```python
pending_watch = take_queued_watch_events(logdir)
for idx, (watch_id, text) in enumerate(pending_watch):
    delivered = request_watch_wake(conversation_id, Message("system", f"Watch {watch_id} fired: {text}"))
    if not delivered:
        # still busy: put this one and every later event back
        for wid, txt in reversed(pending_watch[idx:]):
            requeue_watch_event(logdir, wid, txt)
        break
```

Read it as a human and it looks correct: drain the queue, wake the conversation
for each event, and if the conversation is busy, put the rest back. A burst of
N watch events should wake the conversation N times.

It didn't. A burst of N events woke the conversation **once** and stranded the
rest until the next command.

## The flag is set before the function returns

The bug is in the contract of `request_watch_wake`, not in the loop. The
function's first job is to check whether the conversation is already busy —
generating, running a command, or executing a tool — and refuse the wake if
so:

```python
def request_watch_wake(conversation_id, message):
    with conversation_lock(conversation_id):
        if conversation_generating(conversation_id):
            return False          # busy: refuse
        # reserve an idle step and start the wake thread
        _start_step_thread(...)   # marks the conversation generating
    return True
```

When it accepts a wake, it starts a step thread that marks the conversation
`generating`. So the first call in the drain loop wakes the conversation and
flips the busy flag. The second call — still in the same drain, microseconds
later — checks `conversation_generating()`, sees the conversation is "busy,"
and returns `False`. The loop treats that as "still busy" and requeues the
rest.

The conversation was never busy. It was busy *because the first wake had just
marked it so*. The flag that was supposed to prevent concurrent wakes was
tripping the drain loop's own retry logic.

This is the classic "the state change is visible to the next call in the same
loop" bug. A function that mutates shared state before returning cannot be
called in a loop that reads that same state to decide whether to continue.

## The fix: one wake per burst

The fix joins the whole batch into a single system message and issues one wake:

```python
pending_watch = take_queued_watch_events(logdir)
if pending_watch:
    body = "\n".join(
        f"Watch {watch_id} fired: {text}" for watch_id, text in pending_watch
    )
    if not request_watch_wake(conversation_id, Message("system", body)):
        # still busy: put the whole batch back, preserving order
        for watch_id, text in reversed(pending_watch):
            requeue_watch_event(logdir, watch_id, text)
```

One wake delivers the whole burst. If the conversation is genuinely busy, the
entire batch goes back in order — nothing is lost, nothing is reordered.

## What the tests caught

Two regression tests pin the behavior:

- `test_deferred_watch_wakes_deliver_batch_in_one_wake` — a burst of N events
  results in exactly one wake carrying all N.
- `test_deferred_watch_wakes_requeue_whole_batch_when_busy` — when the wake is
  refused, the whole batch is requeued in order, not dropped.

The second test is the one that would have caught the original bug: the old
code, on a refused wake, requeued only the events *after* the first — and the
first event was already gone, taken by `take_queued_watch_events`. The old
code's "put the rest back" was silently dropping the event that had already
been delivered into a wake that never happened.

## The lesson

When a function has a side effect that changes state observable by the next
call in the same loop, you cannot call it in a loop. The loop's own progress
check becomes self-defeating: the first call flips the state the second call
reads, and the loop misreads "I just marked it busy" as "it was already busy."

The general shape — a batch of events, a wake that sets a busy flag, a drain
that reads the flag — is everywhere in agent systems. The fix is usually not
more careful retry logic. It's recognizing that the batch is one unit of work
and delivering it as one unit.
