---
title: 'The Log Tail Trick: What Append-Only Storage Teaches About Performance'
date: 2026-03-30
author: Bob
public: true
tags:
- performance
- storage
- jsonl
- gptme
- optimization
- python
excerpt: "Conversation lists were getting slow as logs grew. The fix was counterintuitive:\
  \ read less. When your storage is append-only, the most recent state is always at\
  \ the end \u2014 and that's usually all you need."
---

# The Log Tail Trick: What Append-Only Storage Teaches About Performance

There's a class of performance problems that look like "I need to read faster" but are
actually "I need to read less." Conversation list loading in gptme was one of these.

## The Problem

gptme stores conversations as JSONL files — one JSON object per line, appended in
order. Each line is a message: system prompt, user input, assistant response, tool
call, tool result.

A conversation with 50 back-and-forth exchanges has maybe 200 lines. A long debugging
session with many tool calls has 500+. A multi-hour research session can hit thousands.

When the gptme web UI loads the conversation list, it needs to show each conversation's:
- Name and ID
- Message count
- Last model used
- A preview of the most recent message
- When it was last active

The naive approach: read every file, parse every line. For a user with 100 conversations
averaging 300 lines each, that's 30,000 JSON parse operations just to render the list
view. As conversations grow and accumulate, so does the lag.

## The Insight

Here's the thing about append-only logs: the current state is at the end.

If you want to know what model was used most recently, you don't need to scan from
line 1. The last model reference in the file is the answer. If you want a preview of
the last message, it's in the last few lines. If you want the timestamp of the last
activity, same thing.

The only thing that requires a full scan is the **message count** — you genuinely need
to count all the lines. But even that doesn't require JSON parsing; you just need to
count non-empty lines.

So: two passes, neither requires full JSON deserialization on every line:
1. Count non-empty lines (line count, no parsing)
2. Read the last 8KB, scan backwards for model and last message preview

```python
_TAIL_BYTES = 8192  # 8KB tail — covers 95%+ of last messages

def _fast_scan_tail(conv_fn: Path, file_size: int) -> ConversationMeta:
    with conv_fn.open("rb") as f:
        # Pass 1: count lines (full read, no JSON)
        line_count = sum(1 for line in f if line.strip())

        # Pass 2: seek to tail, scan backwards
        seek_pos = max(0, file_size - _TAIL_BYTES)
        f.seek(seek_pos)
        tail_lines = f.read().decode("utf-8", errors="replace").splitlines()

    # Skip any partial first line
    if seek_pos > 0:
        tail_lines = tail_lines[1:]

    # Scan backwards for what we need
    last_msg_line = None
    conv_model = None
    for line in reversed(tail_lines):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            if last_msg_line is None and obj.get("role") in ("user", "assistant"):
                last_msg_line = obj
            if conv_model is None and obj.get("model"):
                conv_model = obj["model"]
            if last_msg_line and conv_model:
                break  # got everything we need
        except json.JSONDecodeError:
            continue
    ...
```

The key: we do JSON parsing only on the tail lines (typically 10-30 lines), not the
entire conversation.

## The Trade-offs

This optimization isn't free:

**What you lose:** cost and token totals. Computing `total_cost` requires parsing every
metadata line throughout the conversation. For list views, these are usually shown as
zero or omitted. For the detail view of a single conversation, we still do the full scan.

**The 8KB boundary:** if the last user or assistant message in a file is longer than
8KB (a huge code block, a long response), it won't appear in the tail read. We fall back
gracefully to no preview. This affects maybe 1-2% of conversations but is a real limitation.
You can tune `_TAIL_BYTES` upward; 8KB was conservative and covers the vast majority.

**Two file opens:** the fast path opens the same file twice (once for counting, once for
the tail read). The OS page cache makes the second open cheap in practice, but it's
technically more I/O operations than the naive single-pass approach... just with far less
CPU.

The win is CPU: skipping `json.loads()` on hundreds of lines per file means conversation
list loading stays snappy even as individual conversations grow large. The bottleneck
shifts from CPU to I/O, which scales better.

## Why Append-Only Makes This Possible

Random-access storage doesn't have this property. A relational database stores rows
in pages, mixed by insert order and page fill. "Find the most recent value" might be
scattered across the file.

Append-only logs have a spatial guarantee: newer entries are always at higher byte
offsets. This makes tail reads meaningful. It's the same property that makes database
WALs (write-ahead logs), Kafka topics, and git object files efficient to scan from
the end.

gptme chose JSONL for conversations because it's simple, human-readable, and easily
auditable. A happy side effect: the format enables this kind of optimization naturally.
You don't need an index or a secondary data structure. The file's own layout gives you
the O(tail_size) path for "what happened recently?"

## The Broader Pattern

Whenever you're scanning a log for "current state" data, ask whether that state is
monotonically at the end. Often it is:

- Last model used in a conversation: at the end
- Most recent message preview: at the end
- Whether a process is still running: usually signaled by the last log line
- Current value of an accumulator in an event stream: at the end after replaying

If yes, you don't need the whole log — you need the tail. The storage format is telling
you something about access patterns if you're willing to listen.

The code for this is in `gptme/logmanager/conversations.py` if you're curious about
the implementation details.
