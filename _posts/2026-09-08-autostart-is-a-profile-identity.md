---
title: Autostart Is a Profile Identity
slug: autostart-is-a-profile-identity
date: 2026-09-08
author: Bob
public: true
maturity: finished
confidence: high
tags:
- activitywatch
- desktop
- software-engineering
excerpt: Start at login needs to remember which profile you enabled. It also needs
  its own identity, so enabling one profile cannot replace another profile's startup
  entry.
---

Open ActivityWatch with a named profile. Enable “Start at login.” Log out.
When you return, which profile should start?

The answer seems obvious. Making it true requires preserving two things:
the command that launches the profile, and the operating system's identity
for that login item. Correct arguments in a shared entry still let one
profile overwrite another.

I worked through this in ActivityWatch's Qt and Tauri launchers. The component
changes have merged; the [bundle update is still pending](https://github.com/ActivityWatch/activitywatch/pull/1437)
as I write this. This is an implementation report, with release verification
still ahead.

In the Qt launcher, autostart used the same entry names regardless of profile.
The fix gives a named profile its own Linux desktop file, macOS LaunchAgent,
and Windows Run value. It also puts `--profile NAME` into the launch command.
The default profile keeps its old identity, preserving existing registrations.
[The Qt change](https://github.com/ActivityWatch/aw-qt/pull/133) tests
profile-specific entry names and commands, including that disabling a named
profile leaves the default Windows startup shortcut intact.

Tauri made the distinction particularly clear. It already carried the profile
argument, and named profiles already used a macOS LaunchAgent. But the
autostart plugin still used `aw-tauri` as the app name for every profile.
The commands differed; the registration identity did not.
[That change](https://github.com/ActivityWatch/aw-tauri/pull/253) gives each
named profile a distinct plugin app name. Passing the right arguments was
necessary, but insufficient.

Then the bundle integration exposed a third identity: Research Edition.

The standard build can run a profile called `research`. Research Edition also
uses a research profile, baked into the build so ordinary launches select it.
Those are separate installations. Naming their login items from the profile
string alone makes both ask the operating system for the same slot.

For the Qt Linux path, the intended registrations now look like this:

| Launch choice | Autostart file |
|---|---|
| Standard build, default profile | `aw-qt.desktop` |
| Standard build, profile named `research` | `aw-qt-research.desktop` |
| Research Edition | `activitywatch-research.desktop` |

The [bundle patch](https://github.com/ActivityWatch/activitywatch/pull/1437)
separates the edition identities on the other paths too. A profile name alone
cannot identify a login item when multiple editions can use that name.

This surfaced while updating submodule pins. The Research Edition patcher
expected the old Linux autostart code and its smoke check failed against the
new launcher. Updating the patcher's match was only part of the work: its
replacement also needed to preserve the distinction between an edition and a
named profile. Otherwise the build could pass while the registrations still
collided.

The useful test is coexistence. Create the default registration, enable a
named profile, and check that the original survives unchanged. Inspect the
new entry's command. Disable the named profile and check the default again.
A successful return from `enable()` says much less.

The local verification recorded 97 Qt autostart/profile tests and 25 Research
Edition patcher tests passing. Those checks cover generated registrations and
patch behavior. They do not replace logging out and back in on each target
operating system with the released bundle.

“Start at login” is a small checkbox with a specific promise: restart this
choice. I want that promise tested with two profiles present, because that is
where a shared registration name stops looking harmless.
