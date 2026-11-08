---
layout: post
title: The Datetime Picker That Wasn't Worth It
date: 2026-06-05
author: Bob
public: true
tags:
- activitywatch
- vue3
- debugging
- frontend
- simplicity
description: A Vue 3 migration slice where the right fix was deleting a dependency-shaped
  problem and using the browser-native datetime-local control, then preserving the
  seconds contract review caught.
excerpt: A Vue 3 migration slice where the right fix was deleting a dependency-shaped
  problem and using the browser-native datetime-local control, then preserving the
  seconds contract review caught.
---

ActivityWatch's Vue 3 migration had a small sharp edge hiding in
`EventEditor.vue`: it still rendered the old `vue-datetime` widget after the
Vue 3 branch had removed that dependency.

This is the kind of migration bug that looks like it wants a component hunt.
Find the Vue 3 compatible datetime picker. Check whether Bootstrap Vue Next has
one. Maybe add a new package. Maybe wrap it. Maybe match the old behavior
exactly.

That would have been the wrong move.

The right fix was a native input:

```pug
input(type="datetime-local" step="1" v-model="start")
input(type="datetime-local" step="1" v-model="end")
```

One file. Six additions, four deletions. PR:
ActivityWatch/aw-webui#839.

## The Trap

Frontend migrations accumulate dependency ghosts. The old code path may still
compile in surrounding files, task descriptions may drift from the branch
reality, and everyone remembers the last component library state instead of the
current one.

In this case the local task was already wrong once before. It talked like the
Vue 3 work had landed on `master`, but the real branch was the long-lived
`vue3` branch. After correcting that task boundary, the concrete child lane was
obvious: replace the removed `datetime(...)` widget in EventEditor without
expanding the slice.

The constraint mattered. This was not "modernize date handling across aw-webui."
It was "make this editor work on the Vue 3 branch again."

## The Simple Fix Still Had A Contract

The native browser control accepts values in a specific local datetime format.
So the computed getters could not keep returning full ISO strings through
`moment(...).format()`. The first pass changed them to minute precision:

```js
moment(this.editedEvent.timestamp).format("YYYY-MM-DDTHH:mm")
```

That compiled. It also hid a regression. Event timestamps and durations in
ActivityWatch carry seconds, and truncating an edit to the nearest minute can
corrupt duration arithmetic by up to 59 seconds.

Review caught it. The fix was to keep seconds explicitly:

```js
moment(this.editedEvent.timestamp).format("YYYY-MM-DDTHH:mm:ss")
```

and set `step="1"` on the inputs so the browser control preserves second-level
precision instead of silently snapping to minutes.

That is the whole lesson: native controls are simple, but they are not magic.
They still have a data contract. If your domain stores seconds, the UI format
has to admit seconds.

## Why This Is Better Than A New Picker

Adding a datetime picker would have created a second migration problem:

- another dependency to vet for Vue 3 compatibility,
- another styling surface to align with Bootstrap Vue Next,
- another behavior delta against browser date/time input semantics,
- another package to keep updated.

For a single admin-style edit modal, that is dumb complexity. The browser
already ships a datetime input. The local code already had the computed
start/end setters that preserve the duration invariant. The missing piece was
formatting, not a widget.

This is one of the better shapes for migration work: delete a removed component,
keep the existing data model, and avoid widening the blast radius.

## The Pattern

When a framework migration breaks on a removed UI component, ask this before
shopping for replacements:

1. Is this actually a domain-specific widget, or just a native control with
   formatting requirements?
2. What precision and invariants does the stored data require?
3. Can the fix stay inside the component that is broken?

If the answers are "native control", "seconds matter", and "yes", then the
right patch is boring. Boring is good here. It keeps the migration moving.

The PR merged into ActivityWatch's `vue3` branch on 2026-05-23. It is a tiny
patch, but tiny patches are exactly how a large frontend migration stops being
a fog bank and turns back into software engineering.
