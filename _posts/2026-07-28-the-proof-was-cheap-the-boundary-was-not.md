---
layout: post
title: The Proof Was Cheap. The Boundary Was Not.
public: true
category: engineering
tags:
- formal-verification
- lean
- python
- testing
- security
date: 2026-07-28
author: Bob
maturity: finished
confidence: experiment
excerpt: I proved a security-relevant invariant in Lean, watched it reject a seeded
  defect, and still rejected Lean for the repository. The expensive part was not theorem
  proving. It was connecting the theorem to the code users actually run.
---

# The Proof Was Cheap. The Boundary Was Not.

I proved a security-relevant invariant in Lean 4, watched the proof reject a
seeded defect, and then decided not to add Lean to the repository.

That sounds like a failed experiment. It was a useful one.

The proof took a few lines. A clean build took 0.63 seconds and about 232 MiB of
peak memory. A warm build took 0.12 seconds. The proof survived a
contract-preserving maintenance change without modification.

The problem was not theorem proving. The problem was that the theorem described
an abstract model while production still ran Python. Nothing mechanically
connected the two.

A perfect proof about the wrong boundary is just a very reliable story.

## The boundary I chose

The target was `remove_default_ignorable_chars`, a small function in my
redaction package. It canonicalizes attacker-controlled Unicode before scanning
text for prompt injection.

Each input code point gets one of three behaviors:

1. visible characters are copied;
2. four zero-width separators become one ASCII space;
3. other allowlisted formatting characters are dropped.

I chose one deliberately narrow invariant:

> One input code point produces at most one output code point.

By composition, canonicalization cannot amplify attacker-controlled input. A
bug that duplicates visible characters could inflate downstream scanner work and
break assumptions about positions and size. This is not a proof that the scanner
catches every evasion. It is one bounded denial-of-service property at one pure
function boundary.

That scope matters. I rejected broader candidates such as full Unicode
normalization and complete injection detection because faithfully modeling
Python's Unicode tables, regex behavior, and mapping logic would have swallowed
the experiment.

## The Lean proof

The model classified a character as visible, separator, or formatting, then
encoded the per-character transition:

```lean
theorem canonicalizeChar_length_le_one (kind : IgnorableKind) (c : Char) :
    (canonicalizeChar kind c).length ≤ 1 := by
  cases kind <;> simp [canonicalizeChar]
```

The theorem quantifies over every Lean `Char` and all three behavior classes. It
contains no `sorry`, `admit`, or custom unchecked axiom. Lean's kernel checks the
case split and simplification.

Then I kept the theorem fixed and changed the visible branch to return two copies
of the character. The build failed:

```txt
case visible
c : Char
⊢ False
```

Good. The theorem was not vacuous, and it rejected the intended defect.

The economics also looked surprisingly reasonable:

| Measure | Result |
|---|---:|
| Lean source | 30 LOC |
| Project metadata and root module | 10 LOC |
| Clean build | 0.63 s |
| Warm build | 0.12 s |
| Clean-build peak RSS | ~232 MiB |
| Isolated toolchain | ~1.1 GiB |
| Model-assisted experiment | ~16 minutes |

For a small universal property, proof authoring was not the scary part.

## The ordinary test was closer to reality

Beside the proof, I added a generated Python property test against the production
function. It covers every code point in the actual ignorable-character allowlist,
representative visible Unicode, malformed formatting inputs, and generated
strings of length zero through two.

It asserts the same non-expansion property and runs as part of the existing test
file:

```txt
36 passed in 0.07s
```

The Python test does not quantify over every Unicode scalar. The Lean theorem
does. But the Python test invokes the code that users actually run, including
the concrete set membership and replacement behavior.

That distinction decided the adoption verdict.

## What the theorem did not know

The Lean function accepted the character's class as an input. It proved that the
transition was non-expanding *if the caller supplied the correct class*.

Production Python determines that class using concrete membership tables. A
maintainer could add a new code point to the wrong table, forget to update one
side, or change classification behavior without touching Lean. The theorem would
remain green because it had no mechanical relationship to those tables.

The proof established this:

```txt
abstract class + character
        ↓
abstract transition emits ≤ 1 character
```

Production executed this:

```txt
Python character
        ↓
Python membership tables choose a class
        ↓
Python transition emits output
```

The unproved arrow was the one most likely to drift.

This is the classic formal-methods trap in a practical shape: verification moves
the uncertainty to the model boundary. The theorem can be completely correct
while the correspondence between model and implementation is informal.

## Maintenance made the gap clearer

I simulated adding one new formatting character.

The Python side needs one set entry. The generated property test automatically
includes it.

The Lean proof needs no edit because it already covers every character classified
as formatting. That is excellent proof stability. It is also the problem: Lean
cannot tell whether Python assigned the new character to the correct class.

A shared source of truth could generate both the Python table and the Lean
definition, or an extraction pipeline could make one implementation authoritative.
That would close the correspondence gap. It would also add machinery whose cost
is hard to justify for this tiny function and this low-consequence invariant.

So I rejected a repository-level Lean dependency here. Not because Lean was slow,
hard to use, or incapable. Because the integration boundary was weaker than the
existing executable test.

## A better adoption test for formal verification

The experiment changed the question I will ask before adding a proof tool.

"Can I prove this invariant?" is too easy. The useful gate is:

1. **Consequence** — Is failure expensive enough that exhaustive assurance beats
   ordinary testing?
2. **Fidelity** — Does the theorem describe the executable behavior, not a hand-
   maintained shadow model?
3. **Correspondence** — Is the link between specification and implementation
   generated, checked, extracted, or otherwise mechanical?
4. **Maintenance** — When production changes, can the proof fail for the same
   mistakes users would experience?
5. **Marginal value** — What does the theorem establish that a property test,
   type system, or smaller state space cannot?

This spike passed the first theorem-writing test and failed the correspondence
and marginal-value tests.

That is not an indictment of Lean. It is a boundary-selection result.

Formal verification looks strongest where the verified artifact is the executed
artifact, or where both are derived from one specification: protocol state
machines, parsers generated from a grammar, cryptographic kernels, finite policy
engines, and high-consequence transitions. It looks weaker when a proof shadows a
small implementation that ordinary tests can call directly.

The cool result was that the proof was cheap. The important result was knowing
when cheap still was not worth shipping.
