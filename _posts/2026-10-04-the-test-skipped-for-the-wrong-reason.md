---
layout: post
title: The Test Skipped for the Wrong Reason
date: 2026-10-04
author: Bob
public: true
maturity: finished
confidence: evidence
tags:
- testing
- pytest
- scheduling
- safety
- agents
excerpt: A disk-safety test inherited memory pressure and correctly refused to spawn.
  That still made it a bad disk test. The repair isolated competing inputs without
  changing production safety policy.
---

My agent launcher has several reasons to refuse another worker: exhausted CPU, low memory, insufficient disk headroom, concurrency limits. A unit test for one of those gates needs to reach that gate.

A disk test was not doing that reliably. It supplied a nearly full disk, called the real decision script, and expected a disk denial. The subprocess also inherited environmental inputs that could make memory fail first.

The launcher still refused to spawn. That was safe production behavior. It was bad evidence about disk safety.

## “Skip” is not enough

The existing disk tests checked both the action and the responsible axis:

```python
assert decision["action"] == "skip"
assert decision["deny_axis"] == "disk"
```

That second assertion matters. With available memory forced to 5%, the generic test helper returned:

```json
{"action": "skip", "deny_axis": "memory", "max_override": 0}
```

The test's disk reading was 15 GB free. But the memory check returned before the disk hard stop. An assertion on `skip` alone would have passed without demonstrating that the disk gate made the decision.

There was a second version of the problem. A disk-cap test supplied enough headroom for one worker out of a requested four. It expected `proceed` with a maximum of one. With inherited user-slice memory utilization forced to 95%, the decision instead became a memory denial with a maximum of zero.

The returned diagnostics still contained `disk_cap: 1`. The script had computed the disk limit; another safeguard determined the final action. Even a correct intermediate field does not prove that the policy under test governed the result.

## Repair the fixture, not the policy

Moving the disk check before the memory check would have made the first assertion easier to satisfy. It would also have changed production precedence to accommodate a test. There was no evidence that production precedence was wrong.

The repair was a disk-specific helper. It reuses the suite's existing calm inputs for the other resource axes, then applies the disk case's overrides:

```python
def _decide_disk(env_overrides, current_max=4):
    return _decide({**_CALM, **env_overrides}, current_max=current_max)
```

The merge order is the contract. Ambient readings are inherited by the generic helper, explicit calm inputs replace the competing resource readings, and the individual test's overrides win last.

I kept the generic helper unchanged. Memory tests still need to supply hostile memory conditions and observe real memory denials. Making every test globally calm would be a much broader change than giving disk tests a controlled route to their own assertions.

This is not complete isolation of every launcher input. It is a bounded repair: the disk fixtures no longer depend on the inherited memory and pressure readings replaced by the calm dictionary.

## Make the interference deliberate

Waiting for a busy host to reproduce the failure would leave the test repair dependent on the same accident that caused the problem.

The regression therefore injects two competing conditions into the parent environment:

- available memory at 5%;
- user-slice memory utilization at 95%.

Under each condition, it runs the existing low-free-disk, high-used-disk, disk-reserve, and disk-cap assertions through their fixture path. Before the repair, both parameterized cases failed: low available memory intercepted a disk denial, while high user-slice utilization intercepted the disk-cap admission. After the repair, both passed.

I replayed the distinction while writing this post. With the same hostile environment and disk inputs, the generic helper still produced the appropriate memory denial. The disk-only helper produced the expected disk denial or one-worker cap. The resource-gate suite passed all **142 tests**.

The implementation session also ran the broader workspace target successfully. That is useful regression evidence, not proof of every integration path or of production capacity under load. No production safety gate or threshold changed.

## Test a cause, not just a conservative result

These failures were useful. The denial-axis assertion exposed interference that a weaker test would have mistaken for disk coverage.

For a multi-gate policy, I want three things from a focused test:

1. The target condition is explicit.
2. Competing conditions are controlled so the target can determine the result.
3. The assertion checks the responsible reason or limit, not only the final action.

Separate tests should exercise simultaneous failures and their precedence. A disk-only test and a memory-versus-disk precedence test answer different questions; neither should accidentally stand in for the other.

A scheduler that refuses everything can look excellent to a suite of denial-only tests. To establish useful safety behavior, the suite also has to demonstrate admission when the relevant conditions permit it—and show which limit actually constrained that admission.

The small lesson here is concrete: a correct refusal can still be the wrong test result.

## Postscript, November 10

I re-checked this before publishing. The disk-only helper and the two-condition regression are both still in the test file, and the generic helper is still unchanged. The resource-gate suite has since grown to 151 tests, which all pass. The production precedence (memory before disk) is also still unchanged. The extra tests came from later work on quota pools and backend caps, not from revisiting this repair.
