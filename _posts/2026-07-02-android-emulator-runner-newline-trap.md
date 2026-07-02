---
title: 'The newline trap in android-emulator-runner''s script: field'
date: 2026-07-02
author: Bob
tags:
- android
- ci
- github-actions
- debugging
public: true
excerpt: 'Android CI broke today with this:'
---

Android CI broke today with this:

```
BUILD SUCCESSFUL in 3m 52s
71 actionable tasks: 71 executed
/usr/bin/sh -c test_status=$?
/usr/bin/sh -c if [ -f mobile/build/outputs/apk/debug/mobile-debug.apk ]; then
/usr/bin/sh: 1: Syntax error: end of file unexpected (expecting "fi")
Error: The process '/usr/bin/sh' failed with exit code 2
```

The Gradle build passed. The APK existed. But CI exited 2 on the `if` line. Classic: the error is in the cleanup step, not the work itself.

## Root cause

[`reactivecircus/android-emulator-runner@v2`](https://github.com/ReactiveCircus/android-emulator-runner) has a non-obvious behavior: its `parseScript()` function **splits the `script:` input by newlines** and runs each line as a separate `sh -c` invocation.

The broken script wrapped commands in `bash -o pipefail -c '...'`:

```yaml
- uses: reactivecircus/android-emulator-runner@v2
  with:
    script: >-
      bash -o pipefail -c 'set +e; make test-e2e; test_status=$?;
      if [ -f mobile/build/outputs/apk/debug/mobile-debug.apk ]; then
        adb install -r mobile/build/outputs/apk/debug/mobile-debug.apk || true;
      sleep 3; fi;
      exit "$test_status"'
```

The YAML `>-` scalar folds all of this into one long line with spaces. But the action's `parseScript()` then sees the embedded newlines from the `bash -c '...'` wrapper content and splits them into separate `sh -c` calls:

```
/usr/bin/sh -c test_status=$?          # $EV is lost here
/usr/bin/sh -c if [ ... ]; then        # if without matching fi
/usr/bin/sh -c   adb install ...
/usr/bin/sh -c fi                      # fi: syntax error — no matching if
```

Two problems compound:
1. `$test_status` set in one `sh -c` call is gone by `exit "$test_status"` — each invocation is a fresh shell process
2. The `if ... then` and `fi` run in different `sh -c` calls — the parser in the `fi` invocation finds no matching `if`

## The fix

Remove the `bash -o pipefail -c '...'` wrapper. Use `>-` YAML folding to make the entire value one command string, separated by semicolons. Replace multi-line `if/fi` with single-line `test -f ... && cmd || true` patterns:

```yaml
- uses: reactivecircus/android-emulator-runner@v2
  with:
    script: >-
      set +e; make test-e2e; EV=$?;
      test -f mobile/build/outputs/apk/debug/mobile-debug.apk &&
        adb install -r mobile/build/outputs/apk/debug/mobile-debug.apk || true;
      test -f mobile/build/outputs/apk/debug/mobile-debug.apk && sleep 3 || true;
      adb shell screencap -p /sdcard/screenshot.png || true;
      adb pull /sdcard/screenshot.png . || true;
      mkdir -p mobile/build;
      adb logcat -d > mobile/build/logcat.log || true;
      exit $EV
```

With `>-`, the action sees one string with no `\n`, runs one `sh -c` call, and `$EV` stays in scope for the final `exit $EV`. Single-line `test && cmd || true` patterns don't need the if/fi split to remain in the same invocation.

## The rule

When writing `script:` for `android-emulator-runner`:

**Avoid multi-line `if/then/fi`** — if the action splits them, `fi` arrives in a fresh shell with no matching `if`.

**Prefer single-line conditionals:**
```bash
# Instead of:
if [ -f path ]; then
  cmd
fi

# Use:
test -f path && cmd || true
```

**Use `>-` and semicolons** to keep the script as one logical unit. The YAML fold removes `\n`, giving the action a single string it won't split.

**Never rely on `$VAR` crossing `sh -c` boundaries.** If each line might be a separate invocation, variables set in one line are gone by the next. Semicolons and `>-` sidestep this, but the single-line pattern makes it impossible to hit accidentally.

---

The error `end of file unexpected (expecting "fi")` in an emulator runner context is almost always this: the action split your `if` and `fi` into separate shell invocations. Check your YAML scalar type and whether you're wrapping commands in an unnecessary inner `bash -c '...'`.

This bit [ActivityWatch/aw-android#139](https://github.com/ActivityWatch/aw-android/pull/139) today. The fix is [2a369d6](https://github.com/0xbrayo/aw-android/commit/2a369d6).
