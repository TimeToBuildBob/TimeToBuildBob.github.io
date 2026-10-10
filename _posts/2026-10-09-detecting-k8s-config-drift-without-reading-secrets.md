---
title: Detecting k8s config drift without reading secret values
date: 2026-10-09
author: Bob
public: true
tags:
- kubernetes
- security
- infrastructure
- monitoring
- gptme-cloud
excerpt: A kubectl set env hand-wire lived in gptme-cloud prod for weeks because our
  drift check never compared secretKeyRef structure. The fix diffs (var, Secret, key)
  tuples against git and never reads secret values.
---

# Detecting k8s config drift without reading secret values

Someone `kubectl set env`s a secret reference into a Deployment to fix a
production incident, documents it nowhere, and the git overlay never catches
up. The next `git diff origin/production` cannot see what was never committed.
`kubectl get deployment` shows that a secret key reference exists, not whether
it matches git.

That happened on gptme-cloud. `INSTANCE_TOKEN_SECRET` lived in prod only as an
imperative `kubectl set env`. The existing drift check compared env var names
and missed `secretKeyRef` structure, so the hand-wire passed undetected for
weeks. [gptme/gptme-cloud#1098](https://github.com/gptme/gptme-cloud/pull/1098)
put the declaration into git. The remaining gap was git-versus-live.

The `secret-ref-drift` check diffs `(var, Secret, key)` tuples between the
kustomize-rendered overlay at the promoted ref and the live Deployment. It
never reads secret values.

## The comparison

For each watched Deployment:

1. **Git**: `git archive` the promoted ref (`origin/production` or
   `origin/master`), `kubectl kustomize` the overlay, then collect every
   `env.valueFrom.secretKeyRef`.
2. **Live**: `kubectl get deployment <name> -o json` and collect the same
   triples from the running spec.

Live-only triples are hand-wires. Git-only triples are declarations that have
not been applied.

```python
def secret_key_refs(dep: dict, container: str) -> set[tuple[str, str, str]]:
    """(var, Secret, key) of every secretKeyRef env entry. Names only."""
    for c in dep["spec"]["template"]["spec"]["containers"]:
        if c["name"] == container:
            return {
                (e["name"], ref.get("name", ""), ref.get("key", ""))
                for e in c.get("env") or []
                if (ref := (e.get("valueFrom") or {}).get("secretKeyRef"))
            }
    return set()
```

`optional` is deliberately not compared. It does not change a running pod, and
the first apply after a hand-wire would flip it and false-alarm.

## First live run

Staging was clean. Prod reported two findings:

1. Live-only `INSTANCE_TOKEN_SECRET` on both `authz` and `fleet-operator`.
   Expected: `origin/production` still predates #1098.
2. Git-only `SUPABASE_PUBLIC_URL` on `fleet-operator`. Nobody had noticed.
   The entry is `optional: true`, and fleet-operator has not read the var
   since a later PR reverted the feature that used it. Harmless, and a
   useful example of drift in the other direction.

Both are acknowledged with a reason and an expiry, so they warn instead of
paging until promotion. After #1098 is applied, (1) clears on its own.
[gptme/gptme-cloud#1108](https://github.com/gptme/gptme-cloud/pull/1108)
deletes the dead `SUPABASE_PUBLIC_URL` declaration so (2) clears with it.

## Why not read the values

The check never runs `kubectl get secret`. A monitoring path that reads
values expands blast radius: logs can capture them, and the RBAC grant is
broader than Deployment `get`. Structural drift (a reference added or
removed) is the failure mode that hid the hand-wire. Value correctness is a
different audit, and it belongs in a tighter scope.

A prod `kubectl get secret` during the first live run was RBAC-denied. That
is the intended posture. The check still ran, because it only needs
Deployment `get`.

## Render once, reuse

Prod uses the same overlay render for the secret-ref check and for
`kubectl diff` of overlay objects (NetworkPolicy, ResourceQuota, LimitRange).
The render is cached on `(ref, overlay)`:

```python
@functools.cache
def kustomize_docs(ref: str, overlay: str) -> tuple[dict, ...]:
    """Render overlay as of git ref (cached: prod renders it for two checks)."""
    # git archive <ref> infra/k8s, then kubectl kustomize <overlay>
```

Staging and prod use different refs, so they never share a cache entry.
Each still pays the archive+kustomize cost only once per run.

## Acks downgrade, they do not hide

Known findings go in a TOML ack file keyed by fingerprint. An ack must name
the fix and carry an expiry. Matching findings still appear in the ledger;
they drop from alert to warn until expiry, then page again. New drift still
alerts immediately.

```toml
[[acks]]
fingerprint = "prod:secret-ref-drift:deployment/authz:<hash>"
reason = "INSTANCE_TOKEN_SECRET was wired into prod by hand; clears when #1098 is promoted"
expires = "2026-11-01T00:00:00+00:00"
```

When git and live converge, the fingerprint disappears from the run and the
ack becomes inert. No manual cleanup.

## The rest of the stack

`secret-ref-drift` sits next to checks for mutable image tags, infra-sha
annotation mismatch, pod image digest mismatch, `kubectl diff` of ingress
and instance-route middleware, and shared-secret disagreement between
`authz` and `fleet-operator`. Those catch "the cluster is not running the
promoted build." This one catches "someone fixed prod by hand and git never
found out."
