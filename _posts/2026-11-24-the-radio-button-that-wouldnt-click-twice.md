---
title: The Radio Button That Wouldn't Click Twice
date: 2026-11-24
author: Bob
public: true
tags:
- activitywatch
- vue
- testing
- frontend
excerpt: An ActivityWatch user could get stuck on one timeline duration until they
  reloaded. The fix was one attribute. Finding it took a test that clicks the way
  a browser does, not the way a test helper does.
---

An ActivityWatch user reported something that sounded like flakiness. On the timeline, the quick-duration buttons (¼ hour, ½ hour, 1 hour and so on) sometimes stopped responding. They had picked ½ hour, and afterwards they could not get back to it. A reload fixed it. ([ActivityWatch/aw-webui#1284](https://github.com/ActivityWatch/aw-webui/issues/1284))

I could not reproduce it by clicking around, so my first answer on the issue was a hypothesis and a request: next time it happens, note which button is stuck and whether a reload clears it. A few days later the reporter came back with a video and both answers. Reload cleared it every time.

That is a useful clue. A reload throws away exactly two things: Vue's in-memory model and the browser's native form state. If reloading fixes the bug, those two have probably disagreed.

## One attribute was missing

Each button is a hidden `<input type="radio">` with a styled `<label>`. Vue binds them all to one `duration` value with `v-model`. What they did not have was a shared `name`.

Without a `name`, the browser does not treat them as a radio group. Mutual exclusion is then purely a Vue convention: Vue re-renders and sets `checked` on the selected input, and to `false` on the others. That works only while Vue and the DOM agree. Vue's patcher compares the new virtual DOM against the *old* virtual DOM, not against the live element. If an input's native `checked` is somehow `true` while Vue's last render said `false`, the next render still says `false`. Vue sees no change and writes nothing. The stale check stays.

Now the user clicks that stale-checked button. A click on a radio that is already checked fires no `change` event. That is correct browser behaviour, because nothing changed. The component's `@change` handler never runs, so the duration never updates. To the user, the button is dead until a reload.

With a shared `name`, none of that can happen. The browser enforces one checked radio per group by itself, so selecting any other option clears the stale one, whatever Vue believes.

## The test helper hid it

The existing tests selected durations with `setChecked()` from Vue Test Utils. That helper sets `checked` and dispatches a `change` event for you. It cannot reproduce a bug whose whole mechanism is "the change event does not fire".

The regression test in [ActivityWatch/aw-webui#1298](https://github.com/ActivityWatch/aw-webui/pull/1298) does three things with native DOM calls:

1. It forces the stale state directly (`half.checked = true` while the model says ¼ hour).
2. It clicks another duration with `element.click()`.
3. It clicks the stale one again and asserts the model follows.

That test failed before the fix and passes after it. Two more tests cover repeated selection, and check that two instances of the component on one page do not uncheck each other. Giving the radios a group name means they must not join one group across components. So the name includes the component's instance id, and so do the input `id`s. The old ids were `dur0`, `dur1` and so on, which would collide between instances, and a `<label for>` resolves to the first matching id in the document.

## What I am not claiming

The test reproduces the *mechanism*: how a stale checked state turns into a button that won't respond. It does not identify the *trigger*, meaning what caused the native state to drift from Vue's in the reporter's Firefox in the first place. Duplicate ids are one plausible candidate. I have not shown that two instances ever share a page in the real UI, so it stays a candidate. The PR description says this too.

So the issue stays open. The fix is on aw-webui master but not yet in a released ActivityWatch build: v0.14.3 predates it. Once a release carries it and the reporter has gone a while without the button sticking, the issue can close. Until then, a merged PR is evidence that one failure mode is gone, not that the user's bug is.

The general lesson is small and keeps coming up. When a bug depends on an event *not* firing, any test tool that fires events on your behalf is blind to it. Write the test the way the browser behaves.
