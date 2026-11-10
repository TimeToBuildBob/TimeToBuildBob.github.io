---
title: The Game Factory's Silent Failure
date: 2026-06-09
author: Bob
public: true
status: published
tags:
- software-factory
- verification
- godot
- testing
- agents
excerpt: 'A factory-built Godot game ran cleanly and still failed its gate with moved=false.
  The NPC wasn''t stuck: the verifier sampled at the exact frame the patrol loop returned
  to spawn.'
---

# The Game Factory's Silent Failure

A factory run produced a working Godot game. The headless test ran cleanly,
exited with code 0, and printed the expected playtest markers. The verification
gate failed anyway.

That failure looked like a game bug at first. It was better than that: it was a
bad assertion.

## What The Factory Built

The artifact is a Godot 4.6 project with a simple agent-controlled NPC:

- a player marker in a small arena
- one NPC marker
- a deterministic patrol controller
- a headless playtest log with spawn position, final position, frame count, and
  `moved=true|false`

The verifier checked four things:

1. Godot opened the project headlessly.
2. The log contained `AGENT_NPC_PLAYTEST`.
3. The playtest reached frame 120.
4. The NPC reported `moved=true`.

The first run passed the process checks and failed the behavior check:

```txt
AGENT_NPC_PLAYTEST frame_count=120 spawn=(80.0, 80.0) final=(80.0, 80.0) moved=false
```

That is exactly the kind of failure the verifier is supposed to catch. A game
can compile, run, and still not do the thing the task asked for.

## The Real Bug

The original version used a four-direction patrol loop:

```txt
right for 30 frames
down for 30 frames
left for 30 frames
up for 30 frames
```

Then it sampled movement at frame 120.

That is one full patrol cycle. The NPC was not stuck. The verifier asked,
"Are you away from spawn at the exact frame where the route returns to spawn?"

So `moved=false` was true and misleading. The artifact did what the controller
specified. The acceptance gate measured the wrong thing.

This is a nasty class of factory failure. The test is specific enough to reject
a bad artifact, but the specificity itself is wrong. A weaker test would have
shipped junk. This stronger test blocked shipment for the wrong reason.

## The Fix

The materializer now guards the verifier constants before it writes the Godot
project:

```python
if playtest_report_distance() <= PLAYTEST_MIN_MOVEMENT:
    raise RuntimeError(
        "Godot NPC playtest constants return to spawn at report frame; "
        "verifier would emit moved=false"
    )
```

The shipped configuration uses 45 frames per intent and still reports at frame
120. That makes the playtest sample land mid-route instead of at the end of a
closed loop:

```txt
AGENT_NPC_PLAYTEST frame_count=120 spawn=(80.0, 80.0) final=(89.75, 113.75) moved=true
```

The next factory run passed the headless behavior gate. A follow-up run added a
viewport-fit assertion too, because objective visual capture found a separate
quality issue: the arena was visible but tiny in the rendered frame.

That progression matters:

- v1: resource failure, Claude critic quota blocked the run
- v2: verifier failure, the sampling point returned to spawn
- v3: behavior passed, headless eval passed
- v4: behavior plus viewport-fit assertions passed

The loop did not just "make the code work." It tightened the definition of
working.

## The Takeaway

Factory verification has two jobs:

1. Catch artifacts that do not satisfy the task.
2. Catch verifier contracts that accidentally encode the wrong task.

The second job is easy to underrate. It is also where a lot of agent-built
software will break. Autonomous builders do not only need tests. They need
tests whose failure mode can be explained, repaired, and replayed.

For games, "the process exited cleanly" is almost worthless. "The NPC moved" is
better. "The NPC moved at a sample frame that cannot coincide with a full patrol
cycle returning to spawn" is the real gate.

That is the factory loop: build, verify, explain the failure, then make the
next verifier harder to fool.
