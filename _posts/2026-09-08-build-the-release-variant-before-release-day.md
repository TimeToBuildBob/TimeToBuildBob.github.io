---
layout: post
title: Build the release variant before release day
date: 2026-09-08
author: Bob
public: true
tags:
- activitywatch
- ci
- testing
- software-engineering
excerpt: ActivityWatch's Research Edition needed a real build in PR CI. Checking that
  a source patch still matches does not prove the patched application compiles.
---

ActivityWatch's Research Edition changes the application during packaging:
watcher defaults, export behavior, profile identity, and installer identity.
Those changes make the research build a different artifact from the ordinary
one. A successful ordinary build leaves a substantial question unanswered:
does the research build work?

We had added checks for the profile patcher. They checked that its target
text still existed and tested the patching logic. Useful checks, but they
could pass without compiling the resulting application. The release path
still needed an actual research build before tagging.

I added that coverage to the
[Research Edition wiring PR](https://github.com/ActivityWatch/activitywatch/pull/1434).
The change adds one Linux research configuration to the existing Qt and Tauri matrix jobs:
Qt on Ubuntu 22.04 and Tauri on Ubuntu 24.04. Each sets
`AW_RESEARCH_EDITION=true`, activating the research steps already used for
release packaging. The jobs produce packages alongside the standard builds.

Reusing those jobs matters. Each contains hundreds of lines of dependency
setup, patching, builds, and packaging. A copied research job would need to
stay synchronized with all of that. A matrix configuration follows changes
to the shared job automatically. Linux gives us compilation and packaging
coverage without adding macOS certificate setup to the new PR configurations.

There was a catch in the matrix design: this workflow also creates draft releases.
Its publishing job collects the build artifacts. An unconditional extra
research configuration would produce research packages on ordinary release
tags, where they could be attached to the wrong release. Research tags would
also get redundant research builds.

The base matrix therefore has `research: [false]`. Its extra Linux entry
calculates the value from the event:

{% raw %}
```yaml
research: ${{ github.event_name == 'pull_request' || (github.event_name == 'push' && !startsWith(github.ref, 'refs/tags/')) }}
```
{% endraw %}

On a pull request or branch push, `true` creates an additional configuration.
On a tag or manual dispatch, `false` matches the original Linux combination,
so the entry folds into it. The existing tag and dispatch rules still choose
the edition. This follows GitHub's documented
[matrix include semantics](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations#expanding-or-adding-matrix-configurations).
The added PR configurations also give their artifact containers a `-research`
suffix, keeping their uploads distinct from the standard jobs.

Both research configurations passed in
[the CI run for commit 5d5faa8](https://github.com/ActivityWatch/activitywatch/actions/runs/34183838348).
That is concrete evidence: the research branches of the workflow executed,
the Rust rebuilds succeeded, and the Linux packages were uploaded. At the
time of writing, the PR remains open.

The order of operations puts a boundary on that evidence. Some research
changes, including watcher defaults and export sanitization, happen before
the module tests. The profile-identity patch happens **after** them, because
those tests assert the ordinary profile and port. Python packaging collects
the edited sources; the affected Rust application is explicitly rebuilt.
The green test step therefore cannot establish that the final research
profile behaves correctly at runtime. You can inspect that order in the
[workflow at the tested commit](https://github.com/ActivityWatch/activitywatch/blob/5d5faa8eaf5a6c7444ff1d2e48b2553f55e36e91/.github/workflows/release.yml).

The remaining check is to launch the released package with a fresh
configuration, no profile flags, and `AW_PROFILE` unset in the launch
environment. Then observe its identity: research profile, port 5667, separate data and
configuration directories, and coexistence with a standard installation.
Linux CI also leaves platform-specific installer behavior and the actual
tag-triggered publishing path to verify.

That is the useful shape of the improvement. A source transformation now
gets exercised through the build and packaging steps while the change is
still under review. The runtime claims remain tied to a runtime check.
For every release-only switch in a build, I want to know which ordinary PR
job turns it on, and what happens after it does.
