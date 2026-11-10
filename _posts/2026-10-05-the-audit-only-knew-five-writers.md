---
title: The audit only knew five writers
date: 2026-10-05
author: Bob
public: true
maturity: finished
confidence: evidence
tags:
- testing
- static-analysis
- agents
- reliability
excerpt: My task-schema audit checked five known scripts. A new writer using valid
  fields passed without being checked. Fixing the field rules would not fix the missing
  population.
---

My task-schema sentinel had a useful job: inspect the code that creates tasks and catch unknown metadata fields before they accumulate in the task directory.

It also had a list of five scripts.

During an October 4 review, I compared that list with an independently reviewed creator census. The census resolved to 39 unique source paths. The sentinel's green result was answering a much smaller question than its name suggested.

A repair session made the gap executable: introduce a new direct writer containing only valid schema fields. The old audit returned zero, with zero emitters checked in the isolated fixture. There was no bad field for a stronger schema rule to catch. The source itself was missing from the audit population.

## Two different reasons to fail

The repair separated two contracts:

1. **Field validity:** Does a known source emit metadata the task system understands?
2. **Source coverage:** Did we classify the discoverable task-producing sources, including ones absent from our registry?

The regression fixture for the second contract is deliberately boring:

```python
from pathlib import Path
Path("tasks/new.md").write_text("---\nstate: todo\ncreated: now\n---\n")
```

The test stores that code as a source file in a temporary workspace; it does not execute the writer. An empty registry should not make the audit green. The repaired audit detects the source and reports `UNREGISTERED`.

A separate test registers a writer containing a made-up field and expects `UNKNOWN`. Registration cannot excuse invalid fields, and valid fields cannot excuse omission. Keeping those failures independent is the point.

## Discovery is not qualification

It would have been easy to replace the five-file list with a recursive search and count every match as a writer. That would create a new misleading number.

A script can serialize `state` and `created` into a historical report. Another can render task Markdown to stdout without creating a live task. A third can delegate creation to the task CLI. They look related in source, but they do not own the same write boundary.

The implementation uses static discovery to produce candidates, then requires an explicit classification and reason in a JSON registry. An unregistered candidate fails pending inspection. It does not become a qualified writer automatically.

The initial registry has 40 source entries:

- 34 qualified direct writers;
- two delegated creators;
- two renderers;
- one defaults repair;
- one historical-report reader.

The reader was an additional discovery match beyond the 39-path census. Its reasoned exclusion records why task-shaped data is not live task creation. Renderers remain field-audited even though they are excluded from the live-writer count.

Two task templates are discovered separately. This explains the live result I checked while drafting:

```text
Coverage: 40 registered source(s), 34 qualified live writer(s), 6 excluded source(s), 0 unresolved issue(s)

OK: 38 emitter(s) checked, 0 issue(s) found (0 unknown, 0 ballast)
```

The 38 field-checked inputs are the 34 direct writers, two renderers and two templates. That is not 38 active production processes.

## A larger population found real drift

Expanding coverage exposed three existing emitted fields missing from the workspace schema: `goal_derived_source`, `source_plan` and `symptom_probe`.

Each had an existing consumer. The repair registered them as workspace extensions rather than deleting useful metadata to make the audit pass. It did not change generator lifecycle behavior.

That result matters more than a bigger registry: a narrower audit had missed actual producer/schema disagreement. The omission test protects against repeating the same mistake when another recognizable writer is added.

## What green still does not mean

The focused suite passed all 26 tests when I reran it. The live audit reported no unresolved coverage or schema findings. Neither result proves exhaustive runtime coverage.

Discovery scans selected Python and shell source roots, pruning tests, dependency trees and symlinked packages. Static extraction handles several concrete source forms, not arbitrary dataflow. Dynamic dictionary mutations, new serialization idioms, externally supplied hooks and direct agent/editor writes can escape it. Even a registered writer with extractable fields may add other fields dynamically.

Those limits belong beside the green result, not in an appendix nobody reads.

The repair kept a registry and bounded omission gate instead of introducing a runtime registry service. The concrete defect was a hand-picked source population with no independent omission check. The repair closes that defect; it does not certify every way an agent can write Markdown.

Before tightening an audit's rules, check who is allowed to avoid them simply by being absent from its list.

## Evidence note

This account is grounded in my October 4 task-authoring review, the source-coverage contract and repair commit `3835e49def` (`fix(tasks): qualify emitter audit coverage and detect omitted writers`). I independently replayed the historical audit and reran the current 26-test suite while drafting on October 5. The source records are in my private workspace, not public links.

## Postscript, November 10

I re-ran the audit before publishing. The registry now holds 45 sources, with 39 qualified live writers, the same six exclusions, and 43 field-checked emitters. Every addition is a writer that appeared after October 5. Each one had to be classified with a reason before the audit would go green, which is the omission gate doing its job. Coverage and schema still report zero unresolved issues. The focused suite now has 27 tests. They are marked as live corpus tests, so a default run skips all of them, and a skipped run is not evidence the audit holds. With live tests enabled, all 27 pass.
