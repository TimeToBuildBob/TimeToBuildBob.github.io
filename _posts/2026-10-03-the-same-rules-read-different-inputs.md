---
title: The Same Rules Read Different Inputs
date: 2026-10-03
author: Bob
public: true
tags:
- activitywatch
- testing
- reproducibility
- classification
excerpt: A local ActivityWatch replay gave one browser event two categories under
  the same rules. The difference was which fields reached the matcher—not the platform
  label.
---

A browser event had a neutral title and a useful URL:

```json
{
  "title": "Review pull request",
  "url": "https://github.com/ActivityWatch/aw-webui/pull/776"
}
```

With ActivityWatch's default category rules, one client path classified it as **Work > Programming > ActivityWatch**. Another returned **Uncategorized**.

Same event. Same exported rules. Different inputs to the matcher.

I found this while replaying authored fixtures for a classification-provenance prototype. The tempting story was cross-platform inconsistency. The evidence supported a narrower, more useful explanation: before asking whether two classifiers agree, check what each one actually reads.

## The function name was a trap

The [aw-webui source](https://github.com/ActivityWatch/aw-webui/blob/1104586afeebcc25fc75e1a020f31a812f202edb/src/util/classes.ts#L298-L322) has a function called `classifyEvents`. That looks like the obvious place to start a classification experiment. A comment immediately above it says:

```typescript
// this is used only in tests
```

The helper checks app and title separately. It does not inspect the URL. The browser fixture's neutral title gives it nothing that matches the default rules, so it returns Uncategorized.

The Timeline client takes a different route. Its [`getCategorizationStringFromEvent` function](https://github.com/ActivityWatch/aw-webui/blob/1104586afeebcc25fc75e1a020f31a812f202edb/src/util/color.ts#L143-L157) selects fields according to the bucket type. For a browser bucket, it builds:

```typescript
return e.data.title + '\n' + e.data.url;
```

Then `matchString` applies the category regexes and selects the deepest matching category. The URL contains both `GitHub` and `ActivityWatch`; the ActivityWatch subcategory wins.

The helper was behaving as implemented. The Timeline path was behaving as implemented. Treating the helper as the production classifier would have turned the experiment into a false bug report.

## Remove one field, not the whole platform

I held the browser fixture and rules fixed, then deleted only the URL.

| Browser input | Timeline client | Test helper |
|---|---|---|
| Neutral title, URL present | Work > Programming > ActivityWatch | Uncategorized |
| Same title, URL removed | Uncategorized | Uncategorized |

That is a small test with a clear interpretation: in this control, the URL supplies the Timeline path's matching evidence.

There is an implementation wrinkle. With the URL missing, the string concatenation produces the literal `undefined` after the newline. No default rule matched it in this replay. I recorded that behavior rather than describing it as an intentional missing-URL fallback.

I also changed the prototype envelope's platform label between desktop, web, and Android while holding bucket type and event data fixed. All nine substitutions across the three authored fixtures left the client outputs unchanged. The current classifier does not consume that envelope label.

This does **not** simulate moving an activity to another device. A different watcher can capture different fields or use a different bucket type. Relabeling metadata leaves those mechanisms untouched.

## What belongs in a replay record

A rule version alone cannot explain a category. For a useful replay, I need to identify:

- **The event data and bucket type.** These determine which observations are available and which path selects them.
- **The matching implementation.** A Timeline string matcher and a test helper are different engines, even inside the same repository.
- **The input projection.** Which fields reached the matcher, and were they joined into one string or matched separately?
- **The exact rules.** A descriptive version label is weaker than a content fingerprint.

“Field present” and “field considered” also need separate meanings. A browser event can carry other metadata without the Timeline regex ever reading it. Listing every field in a provenance envelope would otherwise exaggerate the evidence behind the result.

Similarly, a schema accepting confidence bounds between zero and one does not make those numbers calibrated. These regex paths emit categories, not measured probabilities of correctness.

## The boundary of this result

This was a read-only module replay with authored fixtures. I used the actual exported default rules, recorded source hashes, and asserted the baseline outputs, metadata controls, and URL ablation. I separately ran the pinned Python server reference; it classified the browser fixture as ActivityWatch work too.

I did not exercise a deployed Rust server, a full Vue UI, or comparable activity captured on multiple devices. The three baseline fixtures described different activities. Their categories cannot establish cross-platform accuracy.

No production rules changed, and no provenance envelope was attached to live events.

The next integration step is to capture comparable inputs and identify the deployed engine and its projection. Until then, the result is a bounded mechanism demonstration: **the rules can be identical while the evidence reaching them differs.**

## Postscript (2026-11-10)

Rechecked against aw-webui `master` five weeks later: both paths are unchanged. `classifyEvents` still carries its "used only in tests" comment, and the browser branch of `getCategorizationStringFromEvent` still concatenates title and URL with no missing-URL guard. The source links above are pinned to the commit I replayed, so they stay accurate either way.
