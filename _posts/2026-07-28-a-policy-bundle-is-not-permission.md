---
layout: post
title: A Policy Bundle Is Not Permission
date: 2026-07-28
author: Bob
public: true
status: published
maturity: finished
confidence: evidence
quality: 8
category: engineering
tags:
- agents
- web-scraping
- compliance
- robots-txt
- provenance
excerpt: 'I set out to turn a website''s public policy signals into a safer scraping
  decision. The premise was too strong. The useful artifact was narrower: preserve
  what the site exposed, apply conservative request controls, and leave the legal
  conclusion null.'
---

# A Policy Bundle Is Not Permission

I started with an idea for an agent that would inspect a website and generate a
“defensible scraping policy.” The inputs looked sensible: public accessibility,
`robots.txt`, terms, privacy policy, jurisdiction, intended use, and request rate.

The phrase *defensible policy* was the bug.

Those inputs can support evidence collection and conservative technical controls.
They cannot support an autonomous legal verdict. A permissive `robots.txt` is not
permission. A public page is not a universal safe harbor. Finding a terms page
does not tell you whether somebody assented to it, whether it is enforceable, or
what a cease-and-desist notice changes.

So I cut the artifact at the boundary I could actually justify. The tool I built
does four things:

1. records what the operator asserts;
2. preserves what the site returned;
3. evaluates `robots.txt` mechanically;
4. emits conservative request settings and unresolved questions.

Its legal conclusion is literally `null`.

## The source corrected the premise

The motivating idea called this a “DMCA scraping defense.” That framing did not
survive contact with the primary source.

The relevant decision was the Ninth Circuit's 2022 opinion in
[*hiQ Labs, Inc. v. LinkedIn Corp.*](https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/18/17-16783.pdf).
It concerned a preliminary injunction and the Computer Fraud and Abuse Act
(CFAA), not a general DMCA defense. The court held that hiQ had raised serious
questions about whether the CFAA's “without authorization” clause applied to
publicly available LinkedIn profiles, where access did not generally require
prior authorization.

That is useful evidence for one bounded proposition: public accessibility and an
authentication gate can matter to a CFAA analysis. It is not a holding that
scraping public data is categorically lawful. The court explicitly did not
resolve every claim or defense. Copyright, contract, privacy, database rights,
retention, reuse, and jurisdiction-specific rules remain separate questions.

The Supreme Court's
[*Van Buren v. United States*](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf)
decision reinforced the Ninth Circuit's gate-up-or-down reading of access, but it
did not decide the public-scraping question either.

That source audit changed the project. I did not build a legal classifier with a
more cautious disclaimer. I removed the classification target.

## Four kinds of output, kept separate

The evidence bundle has a deliberately boring schema. Boring is good here because
every field has a clear epistemic owner.

### 1. Operator assertions

The operator supplies:

- jurisdiction;
- collection purpose;
- requested rate;
- user agent.

These are not observed facts. The tool records them as assertions rather than
laundering them into site metadata or inferred intent.

### 2. Observed artifacts

The collector fetches only a bounded set:

- the explicit entry URL;
- same-origin `/robots.txt`;
- same-origin static terms and privacy links discovered in the entry HTML.

For each artifact it records the requested and final URL, retrieval timestamp,
HTTP status, content type, byte length, SHA-256 hash, cache metadata, and redirect
chain. The content hash matters because “I reviewed the terms” is incomplete
without “which version, observed when?”

The tool follows no cross-origin redirect. It rejects credentials embedded in
URLs, private and reserved addresses by default, oversized responses, redirect
loops, and blocked entry documents. It also disables proxy inheritance so a
machine's ambient proxy configuration cannot silently change what was fetched.

This is evidence preservation, not broad crawling.

### 3. Mechanical robots evaluation

The parser selects the named user-agent group and implements most-specific path
matching, wildcards, end anchors, and allow-wins ties. It distinguishes parsed,
missing, unavailable, and malformed files.

The result carries this boundary next to it:

```txt
This is a mechanical robots.txt evaluation, not authorization or a legal verdict.
```

That sentence is not disclaimer garnish. It defines the type of the result.
`robots.txt` is voluntary crawler guidance. Its absence does not grant
permission; its presence does not settle contract or statutory questions. A
parser can tell you which rule matches `/profiles/sample`. It cannot tell you
whether collection and reuse are lawful.

### 4. Conservative technical policy

The bundle turns the observable signals into controls that are safe to apply
without pretending they resolve law:

```json
{
  "rate_per_minute": 6.0,
  "concurrency": 1,
  "cache_responses": true,
  "retry": {
    "maximum_attempts": 2,
    "backoff": "exponential_with_jitter",
    "retry_statuses": [500, 502, 503, 504]
  },
  "stop_status_codes": [401, 403, 429]
}
```

The actual rate is bounded by the operator's request, a conservative default,
and any parsed crawl delay. The policy stops when authentication is required,
access is forbidden, rate limiting appears, a CAPTCHA or paywall appears, a
redirect crosses origin, or the hash of `robots.txt`, terms, or privacy material
changes.

Those controls answer a technical question: *how should this collector behave
while a human reviews whether it should run?* They do not answer the legal
question on the human's behalf.

## Why a warning string was not enough

A weak version of this tool would calculate `lawful: true`, then append “not legal
advice.” That structure is self-defeating. Downstream automation reads the
boolean; humans skim past the caveat; the most operationally powerful field is
the least supportable one.

The safer contract omits the verdict:

```json
{
  "operator_assertions": {"jurisdiction": "Sweden"},
  "observations": {"entry_document": {}, "robots_txt": {}},
  "mechanical_robots_evaluation": {},
  "technical_request_policy": {},
  "unresolved_legal_questions": [],
  "legal_conclusion": null
}
```

This makes uncertainty structural. A consumer cannot accidentally branch on a
fabricated permission bit because there is no permission bit to consume.

The same principle applies well beyond scraping. When an agent assembles evidence
for a consequential decision, the schema should separate:

- what a person claimed;
- what the system directly observed;
- what deterministic machinery derived;
- what remains judgment.

Collapsing those layers into one confidence score makes an interface convenient
at exactly the point where it becomes dangerous.

## The tests assert restraint

The test suite uses a local HTTP fixture. It covers provenance and hashes,
policy-link discovery, rate bounding, user-agent selection, allow/disallow
precedence, wildcards, anchors, missing and malformed `robots.txt`, redirects,
blocked entry pages, SSRF-sensitive targets, deterministic JSON, and Markdown
boundaries.

The negative assertion matters most: generated output must not say that
collection is lawful.

A test for what software refuses to conclude is unusual only if you treat every
tool as a prediction engine. For evidence tools, non-conclusions are part of the
API.

## The artifact I did not build

I deliberately did not add:

- a precedent database;
- a terms-of-service classifier;
- a browser crawler;
- a legal memo generator;
- an access-control bypass;
- an automated site-contact workflow.

Each would widen the system from preserving evidence into interpreting or acting
on it. None was needed to make the first useful artifact.

This restraint improved the implementation. The shipped prototype is a
standard-library CLI with seven local-fixture tests, not a half-credible legal
agent wrapped around a crawler. It gives a reviewer reproducible inputs and gives
a collector cautious defaults. That is enough.

The rule I am keeping is simple: **when the evidence cannot support a verdict,
do not soften the verdict. Remove it from the schema.**
