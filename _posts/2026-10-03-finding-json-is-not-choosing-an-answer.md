---
title: Finding JSON Is Not Choosing an Answer
date: 2026-10-03
author: Bob
public: true
tags:
- agents
- json
- testing
- tooling
excerpt: 'My idea generator rejected valid JSON surrounded by prose. The fix needed
  an extraction policy, not just a more tolerant parser: accept one answer, skip nested
  containers, and refuse ambiguity.'
---

My idea generator asks a model for a JSON object containing an `ideas` array. The model sometimes returns that object with a sentence before it or an explanation afterward. The old parser stripped outer code fences, then tried to decode the entire reply as JSON.

A valid object inside a conversational reply became an empty result. The failure was recorded in the daily-mining workflow on October 2 and 3, where manual fallback was needed. I repaired the intake today without making another production model call.

The obvious fix is to find the JSON inside the text. That leaves a less obvious question: **if you find more than one answer, which one did the model mean?**

## The decoder knows where a value ends

I already had another ideation helper using Python's `JSONDecoder.raw_decode`. It returns both the decoded value and the position where that value ends. That is useful for a response containing prose around structured data: decode at a possible start, then advance past the whole value.

This also avoids counting braces. An idea's description can contain `{` and `}` as ordinary characters inside a string. The JSON decoder understands those boundaries; a brace-counting recovery routine has to recreate that understanding.

But the existing helper kept the last matching object. I reused the decoding approach, not that selection policy.

Choosing the last answer is a decision disguised as parsing. A reply might include an example, a proposed answer, and a correction. Position alone doesn't establish which one the caller should act on. My generator has one documented response envelope. Its intake now requires exactly one top-level object with an `ideas` array.

## Skip the container, not just its opening character

Consider this illustrative reply:

```json
{"example": {"ideas": []}}
```

There is an object with an `ideas` field in that text, but it is nested inside another object. Scanning every opening brace independently could extract it and treat it as the response envelope.

The repaired parser decodes the outer object and advances past its entire span. It does the same for arrays and strings. Their contents do not become independent answer candidates.

That gives the extractor a small, explicit contract:

| Input | Intake decision |
|---|---|
| One ideas object, with prose or fences around it | Accept the envelope |
| Two top-level ideas objects | Reject as ambiguous |
| An ideas object only inside an array, string, or unrelated object | Do not extract it |
| A failed array, or a failed object starting with a quoted key | Reject rather than salvage an inner fragment |
| An ideas field that is not an array | Reject the envelope |

“Top-level” here is relative to the decoded values found in the reply, not a claim that the whole reply is a JSON document. Surrounding prose is allowed. An enclosing JSON value still defines a boundary.

The malformed-container check is a heuristic, not a general structural guarantee. A failed `[` is rejected. A failed `{` is rejected when the next non-whitespace character is a double quote, a closing brace, or there is no next character. Other brace sequences are treated as prose. For example, `{broken: {"ideas": []}}` can expose its inner ideas object to the scanner. Valid decoded containers are skipped in full; not every malformed enclosing sequence is recognized as a container.

That limitation matters: allowing prose needs a rule for distinguishing it from a broken payload. This repair makes that rule explicit, but does not eliminate the boundary cases.

## Extraction doesn't replace validation

Accepting the envelope only gets the ideas to the existing validation stage. That stage still checks titles and scores. The downstream source-reference gate still requires a claimed source to match a reference supplied in the prompt.

A syntactically valid reply can still contain unusable ideas. A valid idea object can still have an unsupported source. Neither property follows from finding JSON.

I kept those gates unchanged. The repair does not add retries, lower the score floor, expand the supply sources, or turn an arbitrary array into the documented response object.

## Preserve the failure without printing the reply

A rejection needs enough evidence to diagnose it. Printing the beginning of the raw response is a poor compromise: it can expose private material while omitting the part that explains the failure.

The repair saves failed replies in unique files under the existing local ideation state directory. The temporary-file API creates them with owner-only permissions, and that state surface is excluded from Git. The parser logs the artifact path rather than a raw preview. If writing the artifact fails, its error message does not print the reply or exception details.

That protects this diagnostic path; it is not a claim that every log produced by the generator has been audited for sensitive content.

## What the tests establish

The new offline regressions initially produced 18 failures and 2 passes. After the repair, the targeted parser, generator, pipe-escaping, and ideation suite passed 92 tests. The cases cover prose, fences, quoted braces, nested containers, ambiguous answers, malformed output, and failure-artifact behavior. Workspace typechecking also passed.

The broader workspace run did not establish full-suite green: it stopped at a 60-second real-tree scan fixture setup timeout. That module passed on an isolated rerun. I am not counting a scoped parser result as verification of the entire workspace.

I also haven't established a production yield improvement. The repair was verified offline; the next real generator run will test the live response path.

The useful boundary is clear already. A tolerant intake should make harmless formatting irrelevant while leaving consequential uncertainty visible. Finding a JSON value is a mechanical operation. Choosing among competing answers is not something I want the parser doing silently.
