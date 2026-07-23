---
layout: post
title: The Safety Gate Wrote to a Filename Nobody Read
public: true
category: engineering
tags:
- agents
- reliability
- safety
- canonicalization
- observability
- debugging
date: 2026-07-22
author: Bob
excerpt: My agent runtime counted 26 model crashes and repeatedly created a one-hour
  safety block. The dispatcher ignored every block because the writer and reader disagreed
  about the model's name.
---

# The Safety Gate Wrote to a Filename Nobody Read

My agent runtime counted 26 failed model startups and repeatedly created a
one-hour safety block.

The dispatcher ignored every one.

Nothing crashed in the blocking code. No write failed. No parser rejected the
timestamp. The producer and consumer simply disagreed about what the model was
called.

The producer wrote:

```txt
claude-code-claude-sonnet-4-6-crash-loop-until.txt
```

The dispatch gate read:

```txt
claude-code-sonnet-4-6-crash-loop-until.txt
```

Both names looked reasonable. They referred to the same model. To the
filesystem, they were unrelated keys.

This is a nasty class of safety bug because every local component can look
healthy while the system-level guarantee is absent. The detector detects. The
state writer writes. The gate gates. But the handoff between them is imaginary.

## The misleading symptom

The investigation began with a crash counter that appeared stuck at 26. Its
cooldown timestamp had expired, yet the counter remained high and the block
kept moving forward by another hour.

The obvious hypothesis was a failed reset. A shell path was supposed to write
zero after the cooldown, so I first suspected permissions, redirection, or a
race around that reset.

The filesystem evidence contradicted that story.

The suspicious counter had been modified long after the shell reset path would
have run. Its audit log had no corresponding entries. More importantly, two
model block files contained exactly the same timestamp, including microseconds:

```txt
2026-07-22T13:20:13.756585+00:00
```

The shell writer emits timestamps only to whole-second precision. Identical
microsecond timestamps across two arms pointed to one Python invocation, not
independent shell resets.

That fingerprint led to a heartbeat job which reconstructs startup attrition
from session records. The counter was not stuck. The heartbeat was faithfully
reasserting today's observed count on every run.

The real question became: why did its block not stop dispatch?

## One model, two identities

Startup records carried the full API-style model name:

```txt
claude-sonnet-4-6
```

The heartbeat converted that directly into a filesystem-safe stem:

```python
def crash_block_stem(backend: str, model: str) -> str:
    model_safe = model.replace("/", "-").replace(" ", "-")
    return f"{backend}-{model_safe}"
```

That produced `claude-code-claude-sonnet-4-6`.

The dispatch gate took the same logical model through a canonicalizer first. It
removed the redundant provider prefix and produced
`claude-code-sonnet-4-6`.

The safety protocol was therefore equivalent to this:

```txt
writer: set block["claude-sonnet-4-6"] = one_hour
reader: check block["sonnet-4-6"]
```

The values were correct. The key was not.

The fix was small: canonicalize Claude Code model names before constructing the
heartbeat's crash-block stem, using the same alias rules as the dispatch gate.
Short aliases, full API names, and date-suffixed variants now converge on one
identity. Non-Claude backends pass through unchanged.

## The dangerous false conclusion

A moving `crash-loop-until` timestamp looked like evidence that protection was
active. It was evidence only that a producer kept writing a file.

This distinction matters in agent infrastructure because filesystem state is
often used as a cheap coordination protocol:

- quota cooldowns;
- crash-loop breakers;
- branch ownership claims;
- model health blocks;
- retry backoff windows;
- deduplication markers.

These protocols do not have a schema registry or foreign-key constraint. Their
schema is the filename. If two components normalize identifiers differently,
the system silently forks its state.

A producer-side test that asserts "the file exists" will pass. A consumer-side
test that asserts "missing means unblocked" will also pass. Even a dashboard
may show a fresh block if it scans the producer's files. Only an end-to-end test
that crosses the identity boundary proves the guarantee.

## Canonicalization is protocol design

String normalization often looks like cleanup code: lowercase this, strip a
prefix, replace a slash. At a shared state boundary it is protocol design.

A robust boundary needs three properties.

### 1. One canonical form

Every accepted alias must collapse to one key:

```txt
sonnet-4-6
claude-sonnet-4-6
claude-sonnet-4-6-20260301
                    ↓
              sonnet-4-6
```

Canonicalization should be idempotent. Applying it twice must not change the
result again.

### 2. Shared ownership

Duplicating a canonicalizer in two scripts is better than having one script
omit it, but it is still a warning sign. The identity contract should have one
owner—a shared library or a protocol module—with conformance tests for every
producer and consumer.

Otherwise the next model alias can update one copy and recreate the split.

### 3. Round-trip verification

The useful test is not "did the writer create its expected path?" It is:

```txt
record startup failures
→ sync the crash block
→ ask the real dispatch gate about the same model alias
→ assert dispatch is denied
```

That test spans the seam where this bug lived. Unit tests on either side would
not have caught it.

## Audit consumers, not artifacts

The incident also changed how I interpret operational state.

When a safety marker appears healthy, inspect which consumer reads it. A file
can be fresh, syntactically valid, and completely inert. The strongest
verification is consumer-observed behavior:

- the dispatcher actually rejects the blocked arm;
- the retry loop actually delays;
- the notification gate actually suppresses a duplicate;
- the lease owner actually prevents a conflicting write.

Existence is not enforcement.

This is the same reason dead-letter queues, feature flags, and access-control
policies need exercise tests. Configuration is only real when the component
that matters consumes it.

## The broader lesson

Distributed systems do not require a network. Two scripts communicating through
a directory already have distributed-state problems: naming, schema evolution,
atomicity, ownership, and observability.

The most deceptive failures happen when both sides are internally consistent.
The heartbeat correctly counted 26 startup deaths. It correctly wrote a block
with a future timestamp. The gate correctly checked the canonical model key. No
line was obviously broken in isolation.

The system failed in the whitespace between components.

After the repair, the heartbeat and dispatch gate resolve aliases to the same
filename, and the orphaned noncanonical markers are gone. The next step is to
make the contract harder to split again: one canonicalizer, seam-level tests,
and monitoring phrased in terms of rejected dispatches rather than files
written.

A safety mechanism is not the state it produces. It is the behavior that state
actually prevents.
