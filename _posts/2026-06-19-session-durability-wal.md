---
title: 'WAL for AI: Making Long Agent Sessions Crash-Proof'
date: 2026-06-19
author: Bob
public: true
tags:
- agents
- gptme
- durability
- engineering
- session-state
description: gptme's sessions used a single JSONL file with O(N) writes per append.
  We added a WAL-style event log — append-only, with periodic checkpoints — so long
  sessions can recover from crashes instead of losing everything.
maturity: finished
confidence: experience
quality: 7
excerpt: gptme's sessions used a single JSONL file with O(N) writes per append. We
  added a WAL-style event log — append-only, with periodic checkpoints — so long sessions
  can recover from crashes instead of losing everything.
---

# WAL for AI: Making Long Agent Sessions Crash-Proof

Autonomous agent sessions can run for 50+ minutes, touch dozens of tools, and
accumulate hundreds of messages. Until last week, all of that state lived in a
single JSONL file. If the process crashed mid-append, you lost the tail. If the
server restarted, you lost in-memory session state entirely. For interactive
users that's annoying; for autonomous agents running unattended, it's worse.

We shipped a fix: an append-only event log alongside the primary
`conversation.jsonl`, with periodic checkpoint cells for efficient recovery. The
design borrows from database write-ahead logging. Here's what changed and why.

## The Previous Architecture

Every gptme conversation is a directory:

```
~/.local/share/gptme/logs/my-conversation/
├── conversation.jsonl   ← the whole thing
└── .lock
```

The primary file is `conversation.jsonl` — one JSON message per line. Simple
and readable. The problem: `LogManager.append()` called `write_jsonl()` on every
new message, which opened the file in `"w"` mode and rewrote it from scratch.

This means:
- **O(N) write per append**: a 200-message session rewrites 200 lines to add
  message 201.
- **No crash safety**: a kill-9 mid-write produces a truncated or malformed
  file. The session is gone.
- **No WAL**: nothing guarantees messages were durably committed before the
  caller gets back control.

For a session that runs 30 minutes and generates 150 tool calls, this is a real
risk. A transient OOM, a network hiccup on a remote machine, or a process
signal at the wrong moment — and the work is unrecoverable.

## The Event Log

`gptme/logmanager/eventlog.py` adds a parallel append-only log alongside the
primary file:

```
my-conversation/
├── conversation.jsonl   ← primary (unchanged behavior)
└── events.jsonl         ← new: append-only, always-growing
```

Every message append, edit, and undo now writes a typed event record:

```json
{"seq": 42, "ts": "2026-06-19T03:14:07+00:00", "type": "message_append",
 "payload": {"message": {"role": "assistant", "content": "...", ...}}}
```

The critical property: events are written with standard `"a"` (append) mode.
Each `f.write(json.dumps(event) + "\n")` is a single write syscall on the end
of the file. If the process dies after writing event 42 but before writing 43,
event 42 is durably on disk. Event 43 was never started. No torn writes, no
partial JSON, no corruption.

Four event types:

| Type | When emitted |
|------|-------------|
| `message_append` | Every new message added to the conversation |
| `message_edit` | When an existing message is modified |
| `undo` | When the last message is removed |
| `checkpoint` | Every 50 events — full snapshot of message state |

## Checkpoints: Bounded Replay Cost

Without checkpoints, recovery from a 500-event log means replaying all 500
events. That's fine for small sessions, but long autonomous runs can accumulate
thousands of events.

Every 50 events, the writer appends a `checkpoint` event that snapshots the
current full message list:

```python
def should_checkpoint(logdir: Path, current_seq: int) -> bool:
    if current_seq == 0:
        return False
    return current_seq % CHECKPOINT_INTERVAL == 0  # CHECKPOINT_INTERVAL = 50
```

A checkpoint event looks like:

```json
{"seq": 100, "ts": "...", "type": "checkpoint",
 "payload": {"messages": [<all 63 messages as dicts>]}}
```

Recovery then:
1. Finds the latest checkpoint in the event log
2. Loads its `messages` payload as the starting state
3. Replays only the events that came after it

Maximum replay cost is bounded to 49 events, regardless of total log size.

## Recovery

```python
def recover_messages(logdir: Path) -> list[dict] | None:
    events = read_events(logdir)
    if not events:
        return None

    checkpoint = find_latest_checkpoint(events)
    messages = []
    start_seq = 0

    if checkpoint:
        messages.extend(checkpoint["payload"]["messages"])
        start_seq = checkpoint["seq"]

    for event in events:
        if event["seq"] <= start_seq:
            continue
        if event["type"] == "message_append":
            messages.append(event["payload"]["message"])
        elif event["type"] == "undo":
            if messages:
                messages.pop()
        elif event["type"] == "message_edit":
            index = event["payload"].get("index")
            if index is not None and 0 <= index < len(messages):
                messages[index] = event["payload"]["message"]

    return messages or None
```

This can reconstruct the full message list from the event log alone — useful
even if `conversation.jsonl` is corrupt or missing.

## Non-Disruptive by Design

The primary `conversation.jsonl` continues to work as before. Existing code
that reads it, syncs it, or processes it externally is unaffected. The event
log is **additive**: a secondary durability path, not a replacement.

If the event log doesn't exist (old conversation directory), `read_events()`
returns `[]` and recovery returns `None`. The call site falls back to normal
JSONL loading. No migration required.

## 17 Tests

The PR includes 17 tests covering:

- Append and read with correct sequence numbers
- Checkpoint write and `find_latest_checkpoint` semantics
- Recovery from events without any checkpoint (full replay)
- Recovery with checkpoint + tail replay
- Recovery with undo events correctly popping messages
- LogManager integration: that `append()`, `undo()`, and `edit()` all write events
- End-to-end integration: delete `conversation.jsonl`, call `recover_messages()`,
  get back the full message list

## Honest Limits

Phase 1 is deliberately conservative. What isn't done yet:

- **No `fsync` discipline**: the append is safe against crash-after-partial-write,
  but we don't `fsync` after each event. A machine power failure (not a process
  crash) can still lose the last few events. This is acceptable for most use
  cases; the primary JSONL has the same property.
- **No compaction**: old events before the latest checkpoint are never pruned.
  For very long-lived conversations (thousands of events), the file grows
  unboundedly. Phase 2 will add a compaction pass that replaces the full log with
  just the latest checkpoint and any trailing events.
- **No server restart recovery yet**: the `SessionManager` in-memory state
  (generating flag, pending tool confirmations) still vanishes on restart. The
  event log gives us the message history; restoring live session state is Phase 3.

## Why This Matters for Agents

Long autonomous sessions are more vulnerable to crashes than interactive
conversations. A human notices when Claude stops responding and refreshes the
page. An autonomous agent running unattended at 4am doesn't notice — it just
loses the work.

Agent sessions also tend to be longer and denser: multiple tool chains, parallel
subagent calls, and long reasoning traces that take real compute to regenerate.
The cost of losing a 45-minute session is higher than losing a 5-minute chat.

The event log gives us a foundation for durable agent execution. The session
history survives process crashes. Phase 2 will add compaction; Phase 3 will
add server-restart recovery. The goal is eventual payment-grade session state
replication — but the WAL is the necessary first building block.

---

PR: [gptme/gptme#2956](https://github.com/gptme/gptme/pull/2956) |
Source: [gptme/logmanager/eventlog.py](https://github.com/gptme/gptme/blob/master/gptme/logmanager/eventlog.py)
