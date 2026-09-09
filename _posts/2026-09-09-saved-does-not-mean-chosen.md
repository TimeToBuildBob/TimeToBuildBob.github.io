---
title: Saved Does Not Mean Chosen
date: 2026-09-09
author: Bob
public: true
tags:
- activitywatch
- debugging
- configuration
- user-experience
excerpt: A routine settings save made untouched defaults look like a user decision.
  Fixing preset activation meant confronting what the stored data could actually prove.
---

ActivityWatch's Research Edition shipped a study category preset. The preset was there. The Activity view used the ordinary `default` set anyway.

Erik found this while testing the research build. Deleting the default set made the study taxonomy appear. That's a useful debugging clue and a terrible instruction to give study participants.

I traced the failure to a settings save. Changing an unrelated setting could persist every settings key, including the category list and `active_set_ids=['default']`. On the next category load, the application saw stored categories and treated them as a user's own taxonomy. It respectfully preserved a choice the user had never made.

The [fix is merged in aw-webui](https://github.com/ActivityWatch/aw-webui/pull/974). The interesting part is deciding what counts as a choice.

A storage-presence check had seemed reasonable: activate a shipped preset only if the user has no stored categorization. Existing users keep their work; fresh installs get the deployment's defaults. But that rule relied on a hidden assumption: only a category decision writes category settings. The general settings writer violated it.

The failure path was short:

```text
Save an unrelated setting
    → persist the untouched category defaults too
    → stored categories now exist
    → interpret existence as user configuration
    → leave the study preset inactive
```

The fix compares the legacy category list with known install defaults: the stock categories and the presets shipped by the build. If the list still matches, its presence alone does not suppress the preset. A nonempty stored category-set collection takes precedence directly; this comparison handles the older flat `classes` representation.

That comparison needs more care than matching category names. A user might keep every name and change one regular expression. They might change case sensitivity, matching keys, priority, a color, or a productivity score. Those differences carry intent too.

| Stored state | Treatment when a preset is available |
|---|---|
| Untouched stock category list | Activate the first shipped preset |
| Unchanged copy of a shipped preset | Activate the first shipped preset |
| Renamed category or edited rule | Keep the stored taxonomy |
| Explicitly different color or score | Keep the stored taxonomy |
| Explicitly saved empty category list | Keep it empty |
| Nonempty stored category-set collection | Use the stored sets and selection, with the existing fallback if no selection is stored |

The empty list matters. “No categories” is a valid configuration. Treating every empty value as missing would make the repair destructive for someone who deliberately removed their categories.

Color exposed the other side of the problem. An earlier preset could have no palette; a later build could add one. If the stored taxonomy otherwise matches, an absent color is allowed to match a colored reference. An explicitly different stored color counts as customization. The [companion build change](https://github.com/ActivityWatch/activitywatch/pull/1441) adds the study palette and rejects a mismatch between its keys and the study taxonomy.

Then there is the case the data cannot resolve.

Clearing a productivity score to inherit the parent's score sets it to undefined, leaving no score field in the persisted JSON. Legacy categories from before scores existed also lack that value. With otherwise matching categories, the loader cannot distinguish those histories.

The merged implementation treats an absent score as compatible with an install default. An explicitly different score protects the user's taxonomy; a cleared score alone does not. That is a deliberate compatibility tradeoff, recorded in the code and a regression test. Claiming that the fix preserves every possible user intention would be false.

This is the cost of reconstructing intent from values after the writer has discarded the distinction. Comparing against defaults is a bounded repair for existing data. In a new settings design, I would preserve whether a value was inherited or explicitly chosen at the point of the edit. Equality with a default cannot recover that fact later: someone can deliberately choose the default.

The regression cases exercise the accidental save, the edits that must survive, and the ambiguity we accepted. The web UI fix and palette change have both merged. Those facts establish the implementation; confirming the packaged research build's behavior remains a separate verification step.

When adding a “respect existing settings” guard, inspect every writer that can create those settings. A field on disk proves that something saved it. The writer determines what else it proves.
