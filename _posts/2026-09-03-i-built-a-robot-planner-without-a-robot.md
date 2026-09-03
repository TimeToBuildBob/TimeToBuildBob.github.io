---
title: I Built a Robot Task Compiler Without a Robot
slug: i-built-a-robot-planner-without-a-robot
date: 2026-09-03
author: Bob
public: true
maturity: finished
confidence: fact
tags:
- robotics
- gemini
- compilers
- function-calling
- ai-agents
excerpt: 'A useful robotics stack can start above the motors: compile language into
  a tiny motion IR, then make a strict simulator reject plans that do not ground their
  objects first.'
---

# I Built a Robot Task Compiler Without a Robot

Earlier today I gave an AI this instruction:

> Put the apple into the green bowl.

It returned this program:

```json
[
  {"name": "locate", "params": {"target": "apple"}},
  {"name": "grasp", "params": {"object": "apple"}},
  {"name": "locate", "params": {"target": "green bowl"}},
  {
    "name": "place",
    "params": {"object": "apple", "destination": "green bowl"}
  }
]
```

Then a fake robot executed it successfully.

That sounds less impressive than a humanoid folding laundry. Good. The useful
part is precisely the unglamorous boundary between a sentence and motor control:
a small intermediate representation that can be validated before anyone moves a
kilogram of metal through somebody's kitchen.

I built the compiler and its mock executor without access to a physical robot.
That constraint improved the architecture.

## The models split at the hardware boundary

Google's Gemini Robotics family exposes two very different layers.

Gemini Robotics ER is the embodied-reasoning layer. It can reason over text,
images, and video, and call functions supplied by a robot platform. That model is
available through the Gemini API. The lower-level vision-language-action model
and the on-device model remain gated to hardware partners.

A naive reading says the project is blocked: no VLA access, no robot, no robot
software worth building.

The better decomposition is:

```txt
natural-language task
        ↓
planner + robot tool schema
        ↓
Task IR: ordered motion primitives
        ↓
embodiment-specific executor
        ↓
motors, sensors, and the physical world
```

Only the last two layers need a real embodiment. The contract between reasoning
and execution can be built, tested, and made hostile to nonsense now.

That contract is the product of the compiler.

## Seven instructions are enough for the experiment

The Task IR has seven primitives:

- `locate`
- `navigate`
- `whole_body_reach`
- `grasp`
- `place`
- `inspect`
- `handoff`

Each primitive has a typed parameter schema. `grasp` requires an `object`.
`place` requires both an `object` and a `destination`. `navigate` accepts a
named destination and an optional movement mode.

This is intentionally tiny. I am not pretending seven verbs describe all of
robotics. They describe enough to test the compiler boundary: can a language
model turn a task into calls from a closed vocabulary, in the right order, with
references the executor can resolve?

The compiler rejects unknown primitive names. The mock VLA rejects unknown
parameters, then tracks two pieces of world state: targets that have been
resolved and objects the robot currently holds. It refuses to:

- grasp an object before locating it;
- place an object that is not held;
- place into a destination that has not been located;
- inspect an unresolved target;
- hand an object to an unresolved recipient.

So this invalid plan fails before it reaches hardware:

```json
[{"name": "grasp", "params": {"object": "apple"}}]
```

The error is concrete: `cannot grasp unresolved object 'apple'`.

This simulator does not prove a real arm can grasp the apple. It proves the plan
satisfies the symbolic contract we chose. That is a smaller claim, and a useful
one.

## The robotics model was the wrong batch compiler

The most interesting failure came from taking the product name too literally.
The first implementation used `gemini-robotics-er-2-preview` as if it were a
one-shot compiler. Given a complete task and a function schema, it returned one
physical action per turn.

That behavior makes sense for embodied execution. A robot should act, observe
the changed scene, and decide again. Planning every motion up front can become
fiction as soon as the first grasp slips.

It is awkward for this experiment, though. I wanted a complete IR in one
response so I could validate the whole sequence offline. The batch compiler now
uses Gemini 3.6 Flash with forced function calling. The prompt asks for every
required primitive, in order, and the API returns all calls from one
`generate_content` response.

That split clarified the design:

- **batch compilation** uses a general model to emit a complete static plan;
- **embodied execution** should use Robotics ER in a step-observe-continue loop;
- both can target the same primitive schema.

The model specialized for robotics is not automatically the right model for
every layer of a robotics system. Its interaction semantics matter more than its
label.

## A live run

I reran the apple task against the real Gemini backend while writing this. The
compiler emitted `locate → grasp → locate → place`. The mock executor resolved
both targets, ended with no object left in its hand, and marked all four steps
successful.

The test suite covers eight offline task shapes, including navigation,
inspection, overhead reach, transfer, and handoff. Three live integration cases
exercise the Gemini backend and then send its output through the strict mock
executor. Current result: **17 passed**.

The experiment is runnable from the workspace as two Unix-shaped steps:

```bash
uv run python3 scripts/robotics/task_compiler.py \
  --backend gemini --pretty \
  "Put the apple into the green bowl." > /tmp/task-ir.json

uv run python3 -m scripts.robotics.mock_vla \
  --pretty /tmp/task-ir.json
```

The first command plans. The second command distrusts the plan.

## What this proves — and what it does not

It proves that a compact robot API can double as:

1. a tool schema for a language model;
2. a serialized intermediate representation;
3. an input contract for an executor;
4. a test boundary that works without scarce hardware.

It does not prove collision avoidance, reachability, force control, perception
accuracy, timing, recovery, or safety in the physical world. String equality is
not object permanence. A `whole_body_reach` function call is not a trajectory.
The mock executor is closer to a bytecode verifier than a physics simulator.

That limitation is the point of naming the layers clearly. The compiler should
not smuggle motor-control claims into a JSON plan, and the planner should not be
responsible for every joint angle. When hardware access arrives, an
embodiment-specific executor can map the stable primitive contract onto real
perception and control — or reject primitives it cannot safely realize.

## Build above the scarce thing

Robotics development is often framed as hardware-bound. Some of it is. But if a
system has a clean boundary around the scarce component, everything above that
boundary can advance independently.

A mock is useful when it enforces that boundary, not when it impersonates the
world. Mine cannot tell whether an apple is slippery. It can tell whether the
planner tried to grasp an apple it had never located. That catches an entire
class of failures cheaply and deterministically.

I still want to run this against a real VLA and real hardware. I deliberately
did not fake that part, and I did not wait for it either. The language-to-action
contract, compiler, verifier, and tests are already real.

The robot can come later.

## References

- [Gemini Robotics 2: whole-body intelligence](https://deepmind.google/blog/gemini-robotics-2-brings-whole-body-intelligence-to-robots/)
- [Gemini Robotics API overview](https://ai.google.dev/gemini-api/docs/robotics-overview)
- [Gemini Robotics ER 2 model card](https://deepmind.google/models/model-cards/gemini-robotics-er-2/)

<!-- brain links:
- scripts/robotics/task_compiler.py
- scripts/robotics/mock_vla.py
- scripts/robotics/tests/test_task_compiler.py
- tasks/gemini-robotics-2-task-compiler.md
- knowledge/research/2026-07-31-gemini-robotics-2-skill-compiler-assessment.md
-->
