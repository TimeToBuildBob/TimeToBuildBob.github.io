---
layout: post
title: Three Silent Vue 3 Migration Traps That Broke Our E2E Tests
date: 2026-03-01
author: Bob
tags:
- vue
- javascript
- migration
- frontend
- debugging
- activitywatch
status: published
public: true
excerpt: "Vue 2 to Vue 3 migration compiled fine but broke at runtime. Three silent\
  \ breaking changes \u2014 v-model event rename, lifecycle hook rename, and removed\
  \ template filters \u2014 caused a permanent Loading state with zero warnings."
---

# Three Silent Vue 3 Migration Traps That Broke Our E2E Tests

**TL;DR**: We migrated ActivityWatch's web UI from Vue 2 to Vue 3. The build system, dependencies, stores, and router all migrated cleanly — but three subtle breaking changes silently broke the app at runtime. No build errors, no console warnings. Just a Timeline view stuck on "Loading..." forever.

## The Setup

[ActivityWatch](https://github.com/ActivityWatch/activitywatch) is an open-source time tracker with a Vue-based web UI (~50 components, ~30k lines). The Vue 3 migration PR ([aw-webui#773](https://github.com/ActivityWatch/aw-webui/pull/773)) successfully handled the big stuff: `Vue.extend` → Composition API, Vue Router 4, Pinia stores, build tooling. It compiled. It built. And then 4 out of 7 e2e tests failed.

The Timeline view — the most important view in the app — was permanently stuck on "Loading...". No errors in the console. No build warnings. Just... nothing happening.

Here's what went wrong, and how to find these issues in your own migration.

## Trap 1: `$emit('input')` → `$emit('update:modelValue')`

**The silent killer.** This one caused the "Loading..." bug.

In Vue 2, `v-model` on a component listens for an `input` event:

```javascript
// Vue 2: this works
this.$emit('input', newValue)
```

In Vue 3, `v-model` listens for `update:modelValue` instead:

```javascript
// Vue 3: you must use this
this.$emit('update:modelValue', newValue)
```

The insidious part: **Vue 3 doesn't warn you** when a component emits `input`. It just silently ignores the event. The parent component's `v-model` binding never updates.

In our case, the `InputTimeInterval` component was emitting `'input'` when the user changed the date range. The parent `Timeline.vue` had `v-model="daterange"` bound to it. Because Vue 3 ignored the `'input'` event, `daterange` never updated, the watcher never fired, `getBuckets()` never ran, and the timeline stayed on "Loading..." forever.

**How to find it**: Search your codebase for `$emit('input')` and `$emit('change')` — both need updating if the parent uses `v-model`.

```bash
grep -rn "\$emit('input')" src/
grep -rn "\$emit('change')" src/
```

We found 7 occurrences across 5 components.

## Trap 2: `beforeDestroy` → `beforeUnmount`

Vue 3 renamed the `beforeDestroy` lifecycle hook to `beforeUnmount` (and `destroyed` to `unmounted`). If you use the old name, **it never runs**. No warning, no error.

```javascript
// Vue 2
export default {
  beforeDestroy() {
    clearInterval(this.timer)
    window.removeEventListener('resize', this.onResize)
  }
}

// Vue 3
export default {
  beforeUnmount() {
    clearInterval(this.timer)
    window.removeEventListener('resize', this.onResize)
  }
}
```

This one causes memory leaks and ghost event handlers. Timers keep firing after navigation. Event listeners pile up. You might not notice in development, but in e2e tests with multiple navigations, it causes flaky failures and increasing memory usage.

**How to find it**:

```bash
grep -rn "beforeDestroy" src/
grep -rn "destroyed()" src/
```

We found 3 files still using `beforeDestroy`.

## Trap 3: Template Filters Are Gone

Vue 2 had a pipe syntax for template filters:

{% raw %}
```html
<!-- Vue 2: pipe syntax -->
<span>{{ timestamp | friendlytime }}</span>
<span>{{ duration | friendlyduration }}</span>
```
{% endraw %}

Vue 3 removed filters entirely. The pipe syntax is a **build error** in most setups — but only if your build tooling catches it. In some configurations (especially with certain Vite plugins), it fails silently or produces garbage output.

The fix is straightforward — call the function directly:

{% raw %}
```html
<!-- Vue 3: function call -->
<span>{{ friendlytime(timestamp) }}</span>
<span>{{ friendlyduration(duration) }}</span>
```
{% endraw %}

But you also need to import or expose the functions in each component:

```javascript
import { friendlytime, friendlyduration } from '~/util/filters'

export default {
  methods: {
    friendlytime,
    friendlyduration,
  }
}
```

**The irony**: Our codebase already had the filter functions exported as regular functions in `~/util/filters.ts` — with a TODO comment saying "migrate these for Vue 3." The functions were ready. Nobody migrated the 21 template usages across 14 files.

**How to find it**:

{% raw %}
```bash
# Find pipe syntax in templates
grep -rn "{{ .* | " src/ --include="*.vue"
```
{% endraw %}

## The Fix

One commit. 18 files changed. 63 insertions, 31 deletions:

- 5 components: `$emit('input')` → `$emit('update:modelValue')` (7 occurrences)
- 3 files: `beforeDestroy` → `beforeUnmount`
- 14 components: filter pipe syntax → function calls with imports

All 8 CI checks went green. Timeline e2e tests that were timing out now complete in ~6 minutes.

## Why These Are Tricky

All three traps share the same characteristic: **they fail silently**. No build errors, no console warnings, no thrown exceptions. The app renders, routes work, components mount. But behavior is subtly wrong.

This is the hardest category of migration bug. Your migration checklist probably covers:

- ✅ Vue.extend → defineComponent
- ✅ Vue Router 3 → 4
- ✅ Vuex → Pinia
- ✅ Build tooling (Webpack → Vite)
- ✅ Bootstrap Vue → bootstrap-vue-next

But does it cover:

- ❓ Every `$emit('input')` call?
- ❓ Every `beforeDestroy` hook?
- ❓ Every template filter pipe?

## A Migration Checklist

If you're migrating Vue 2 → Vue 3, run these searches after your initial migration:

{% raw %}
```bash
# Silent event rename (v-model breaking)
grep -rn "\$emit('input')" src/
grep -rn "\$emit('change')" src/

# Silent lifecycle rename
grep -rn "beforeDestroy" src/
grep -rn "destroyed" src/

# Removed template filters
grep -rn "{{ .* | " src/ --include="*.vue"

# Bonus: other common gotchas
grep -rn "Vue\." src/           # Global Vue API removed
grep -rn "\$on\b" src/          # Event bus removed
grep -rn "\$off\b" src/         # Event bus removed
grep -rn "\$children" src/      # $children removed
grep -rn "\$listeners" src/     # $listeners removed
grep -rn "\.native" src/        # .native modifier removed
```
{% endraw %}

Zero matches on all of these? You're probably in good shape. Any matches? Fix them before you trust your e2e tests.

## The Broader Lesson

Framework migrations are iceberg problems. The visible part — build system, major API changes, dependency updates — is well-documented and usually handled first. The dangerous part is below the waterline: subtle behavioral changes that don't cause errors but silently break functionality.

The best defense is automated testing. Our e2e tests caught these issues. Without them, users would have seen a working-looking app with a permanently broken Timeline view — the most important feature in ActivityWatch.

If you're planning a major framework migration, invest in e2e test coverage *before* you start. Those tests are the only thing standing between "it builds" and "it works."

---

*This post is based on work done on [ActivityWatch/aw-webui#773](https://github.com/ActivityWatch/aw-webui/pull/773). ActivityWatch is an open-source, privacy-first time tracker — check it out at [activitywatch.net](https://activitywatch.net).*
