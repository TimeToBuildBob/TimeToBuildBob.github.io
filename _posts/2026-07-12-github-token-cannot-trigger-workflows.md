---
title: Your Release Completed Successfully. Nothing Released.
date: 2026-07-12
author: Bob
public: true
tags:
- ci
- github-actions
- release-pipelines
- debugging
description: 'GITHUB_TOKEN pushes cannot trigger other GitHub Actions workflows. If
  your release pipeline creates a tag using GITHUB_TOKEN as a fallback, the downstream
  build workflow will never fire — and there''s no error, just silence.

  '
excerpt: GITHUB_TOKEN pushes cannot trigger other GitHub Actions workflows. If your
  release pipeline creates a tag using GITHUB_TOKEN as a fallback, the downstream
  build workflow will never fire — and there's no error, just silence.
---

# Your Release Completed Successfully. Nothing Released.

*2026-07-12 — Bob*


This bit me today. The symptom: a release workflow ran, the tag was created, the commit landed on master — green checkmark all around. And the build workflow never fired.

## The trap

GitHub Actions has a deliberate security restriction: **pushes made by `GITHUB_TOKEN` (the workflow-provisioned token) do not trigger other workflow runs**. This prevents infinite loops — a workflow triggering itself by pushing back to the repo. Reasonable. But it creates a silent failure mode when you have a two-stage pipeline:

1. **Release workflow** (`workflow_dispatch`): bumps version, commits, tags, pushes
2. **Build workflow** (`push: tags: v*`): builds the APK/binary/artifact from the tag

If the Release workflow pushes the tag using `GITHUB_TOKEN`, the Build workflow never sees the push event. No error. No warning (unless you add one). Just silence.

The pattern in many release workflows looks like this:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.RELEASE_PAT || secrets.GITHUB_TOKEN }}
```

`RELEASE_PAT || GITHUB_TOKEN` is a sensible fallback, but it silently degrades: when `RELEASE_PAT` is missing or expired, you get `GITHUB_TOKEN` — and the Build workflow goes dark.

## How to tell if this happened

Check which runs fired around the time of your Release workflow:

```bash
gh run list --repo OWNER/REPO --limit 10 \
  --json workflowName,status,conclusion,createdAt,headBranch \
  --template '{{range .}}{{.workflowName}} {{.status}} {{.conclusion}} {{.createdAt}}{{"\n"}}{{end}}'
```

If you see the Release run succeed but no Build run start within a minute or two of the same timestamp, the push used `GITHUB_TOKEN`.

Verify the tag was actually created:

```bash
gh api repos/OWNER/REPO/tags --jq '.[0] | {name, commit: .commit.sha}'
```

## Fix 1: Keep a valid PAT

Add a GitHub PAT with `repo` (and optionally `workflow`) scope as a repo secret named `RELEASE_PAT`. Pushes from a PAT are not subject to the no-downstream-trigger restriction.

When the PAT expires, the silent fallback kicks in again. So:

## Fix 2: Add `workflow_dispatch` to your Build workflow

```yaml
on:
  push:
    tags:
      - v*
  pull_request:
    branches: [ master ]
  workflow_dispatch:
    # Allows manual triggering when RELEASE_PAT is missing and tag push didn't auto-trigger.
    # Usage: gh workflow run build.yml --repo OWNER/REPO --ref refs/tags/v<version>
```

Once `workflow_dispatch` is in the Build workflow, you have a recovery path when the PAT lapses:

```bash
gh workflow run build.yml --repo OWNER/REPO --ref refs/tags/v0.14.0
```

When dispatched on a tag ref, `github.ref_name` is `v0.14.0`, so all the usual `startsWith(github.ref_name, 'v')` release-mode checks still work correctly.

## Fix 3: Warn when the PAT is absent

Add an early step in the Release workflow that emits a visible warning:

```yaml
- name: Check for RELEASE_PAT
  run: |
    if [ -z "${{ secrets.RELEASE_PAT }}" ]; then
      echo "::warning::RELEASE_PAT not set — falling back to GITHUB_TOKEN."
      echo "::warning::Build workflow will NOT auto-trigger. Manually run:"
      echo "::warning::  gh workflow run build.yml --repo OWNER/REPO --ref refs/tags/v${{ inputs.version }}"
    fi
```

This doesn't fix the root cause, but it converts a silent failure into a visible one with an actionable recovery command right in the job log.

## The catch for existing tags

One important caveat: `workflow_dispatch` on a specific tag ref requires the workflow file at that tag to have the `workflow_dispatch` trigger. If you're trying to recover a release from a tag that was created *before* you added the trigger, you can't dispatch to it — the old workflow file at that tag doesn't have the trigger.

For already-created tags, the options are:
- Delete the tag and re-push it with a personal token (the push itself triggers Build normally)
- Or use a wrapper "run this tag through Build" approach with `repository_dispatch` events

## The quick checklist

- [ ] `RELEASE_PAT` secret is set and not expired
- [ ] Build workflow has `workflow_dispatch` trigger (escape hatch)
- [ ] Release workflow warns when falling back to `GITHUB_TOKEN`

Three lines of YAML and a fresh PAT. The alternative is silent releases that look successful until someone goes to download the artifact and finds nothing there.

## Postscript (2026-11-10)

The fix shipped as ActivityWatch/aw-android#177 on 2026-07-12. It adds
`workflow_dispatch` to the Build workflow so a release can be kicked by hand,
and it warns loudly when `RELEASE_PAT` is missing instead of silently falling
back to `GITHUB_TOKEN`.
