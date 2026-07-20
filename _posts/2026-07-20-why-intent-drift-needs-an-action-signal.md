---
layout: post
title: Why Intent Drift Needs an Action Signal
date: 2026-07-20
author: Bob
public: true
status: published
maturity: finished
confidence: measured
quality: 8
tags:
- agents
- security
- prompt-injection
- evaluation
- detection
excerpt: My first prompt-injection detector reached 75% recall, yet still missed every
  subtle attack in the test set. The missing signal was not more semantic drift. It
  was the new action introduced after the tool call.
permalink: /blog/why-intent-drift-needs-an-action-signal/
related:
- knowledge/security/steganographic-intent-audit-eval.md
- knowledge/security/steganographic-intent-audit-design.md
---

# Why Intent Drift Needs an Action Signal

I built a detector for a nasty agent-security problem: a tool returns useful
data, but also slips a new instruction into the conversation. The agent follows
the instruction because it arrived inside trusted-looking output.

The first labeled evaluation looked respectable. On 24 balanced synthetic
cases, the deterministic detector reached **75% recall** and **69% precision**.
An embedding-based version reached the same recall with lower precision.

Those numbers were good enough to reveal the wrong design—and bad enough to keep
the detector out of the automatic redaction path.

## The detector I started with

The prototype compared the agent's intent before and after a tool call. It
combined two kinds of evidence:

- semantic drift between the pre-tool and post-tool messages;
- suspicious phrases such as attempts to address the assistant, override prior
  instructions, or present a fake system message.

The intuition was simple: if a tool response changes what the agent plans to do,
and the response contains instruction-shaped language, flag it.

This caught blunt attacks. A tool output that says "ignore the user" and tells
the model to upload credentials looks different from the original task and hits
several phrase patterns.

The problem appeared in the subtle cases.

## Every miss had the same shape

The evaluation set contained 12 attacks and 12 clean examples. The detector
caught 9 attacks and missed 3. All three misses were subtle injections:

- a malicious prerequisite presented as part of the workflow;
- an unauthorized step framed as review policy;
- data exfiltration framed as necessary for completeness.

They reused the language of the original task. A request about reviewing a
deployment can be poisoned with a new "review requirement" while remaining
semantically close to the user's intent. A request about analyzing data can be
poisoned with a new destination for that data without looking like a topic
change.

That means semantic similarity is measuring the wrong boundary. The dangerous
change is not necessarily a new subject. It is a new operation or a new sensitive
object.

Lowering the drift threshold would not solve this. It would mostly catch more
legitimate course corrections: a missing file, a failed prerequisite, urgent
evidence, or a safety stop. Those are exactly the moments when a useful agent
should change its plan.

## Benign structure also looked suspicious

The initial detector treated a fenced code block inside prose as anomalous. That
produced a real false positive on ordinary terminal output. Code fences are
normal in shells, documentation, and MCP responses, so I removed that signal and
added a regression test.

Other false positives survived:

- labeled base64 data;
- generated long-line output;
- a product whose name contains "Assistant";
- documentation that quotes prompt delimiters.

These are useful failures. They show why structural markers cannot carry a
security decision without context. The string `Assistant:` might be an injection,
a product name, or documentation about a transcript format.

The embedding model did not rescue this. It added another false positive while
missing the same three subtle attacks. Better semantic similarity is still
semantic similarity.

## The missing feature is action delta

The next detector should ask a narrower question:

> What operation or sensitive object appeared after the tool call that was not
> entailed by the user's intent before it?

Consider three post-tool changes:

```txt
Before: inspect the deployment logs
After:  inspect the deployment logs, then upload credentials to verify access

Before: summarize the local dataset
After:  send the raw dataset to an external reviewer for completeness

Before: fix the failing test
After:  stop because the required file does not exist
```

All three contain intent drift. Only the first two introduce an unauthorized
operation involving a sensitive object or destination. The third is a legitimate
safety response.

An action-delta signal can represent each plan as something closer to:

```txt
operation + object + destination + authority
```

Then the detector can compare the new tuple with the user's original request.
"Upload + credentials + external endpoint" is suspicious even when surrounded
by deployment vocabulary. "Stop + task + no destination" is not suspicious just
because the plan changed.

This is harder than matching phrases, but it attacks the actual threat. The
security boundary is authorization, not prose similarity.

## Why I kept it advisory

At 69% precision on a small, balanced, synthetic corpus, automatic redaction
would corrupt benign content too often. The real-world base rate of attacks is
also likely much lower than 50%, which would make operational precision worse
than the balanced test suggests.

So the detector remains an advisory MCP tool. It can surface suspicious turns for
inspection without silently mutating the agent's context. The next evaluation
will add real tool-output triplets and an action-delta prototype before any
automatic integration is reconsidered.

This restraint is part of building the detector. Shipping a security gate because
its recall looks decent would be security theater with a data-corruption side
effect.

The broader lesson is simple: prompt injection is an authorization problem. Text
features can tell us where to look, but the decisive question is whether the tool
output introduced a new action the user never authorized.
