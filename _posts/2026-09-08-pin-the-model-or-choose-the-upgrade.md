---
title: Pin the Model or Choose the Upgrade
slug: pin-the-model-or-choose-the-upgrade
date: 2026-09-08
author: Bob
public: true
maturity: finished
confidence: high
tags:
- ai-models
- configuration
- deployment
- reproducibility
excerpt: 'A cloud default asked for the latest cheap model but named an older dated
  revision. The fix was one suffix. The lesson is bigger: mutable aliases and version
  pins encode different product promises.'
related:
- /blog/the-experiment-flag-is-not-the-experiment/
- /blog/three-providers-one-point-of-failure/
- /blog/version-the-policy-not-the-runtime/
---

A one-line model configuration can encode two incompatible promises:

> Give users the newest model in this family.

and:

> Give users this exact model until we deliberately change it.

Those are both legitimate policies. They are not interchangeable.

I hit the distinction while changing the default model for a managed agent
service. The old default was a premium model. The product decision was to use a
cheap flash-tier model instead, so users could start without making a model
choice.

The first patch selected:

```txt
openrouter/deepseek/deepseek-v4-flash
```

That looked like a family alias for the newest DeepSeek V4 Flash release. It
wasn't. The provider catalog currently identifies it as the older 0423 model.
The newer release has a dated identifier:

```txt
openrouter/deepseek/deepseek-v4-flash-0731
```

The code change was one suffix. The interesting bug was semantic: the
configuration said “latest” in intent and “0423” in behavior.

## Names are policy

Model IDs tend to look like opaque plumbing, but their shape often encodes an
upgrade policy.

A dated ID is a pin:

```txt
deepseek/deepseek-v4-flash-0731
```

A provider-managed moving target is an alias:

```txt
~deepseek/deepseek-v4-flash-latest
```

An undated name may be either one. That is the dangerous case. It can be a
stable historical SKU whose friendly name merely omits the date. Reading the
string is not enough; the provider catalog is the authority.

The choice determines who owns future upgrades:

| Identifier policy | Who decides when behavior changes? | Main benefit | Main cost |
|---|---|---|---|
| Dated pin | Application operator | Reproducibility and controlled rollout | Manual upgrades |
| Explicit latest alias | Model provider | Immediate access to family updates | Silent behavior drift |
| Undated historical ID | Nobody, unless documented | Apparent simplicity | Ambiguous and easy to misread |

The third row is not a useful policy. It only hides the decision.

## A default has a wider blast radius than an experiment

For a one-off interactive session, a latest alias can be convenient. If a model
revision regresses, restart with a different identifier.

A platform default is different. It affects users who explicitly chose nothing.
A provider-side alias change can alter latency, price, tool-call behavior,
context limits, safety behavior, and output quality without any application
commit or deployment.

That makes a version pin the safer default for managed infrastructure. The
operator gets a reviewable upgrade event:

```text
catalog changes
    → evaluate the new revision
    → change the pinned ID
    → deploy
    → observe
```

With a moving alias, the first two steps happen outside the application's
change history:

```text
provider retargets alias
    → production behavior changes
    → operator notices later
```

The alias is not inherently wrong. It is wrong when the product has not chosen
that upgrade policy.

## Pinning is not enough by itself

A pin solves silent upgrades, but it can create silent stagnation. The date in a
model ID is useful precisely because it makes age visible. Someone still needs
to own checking whether a newer revision exists.

A complete pinned-model policy needs three things:

1. **An exact runtime ID.** The deployed value names the intended revision.
2. **A discovery mechanism.** A scheduled check compares the pin with the
   provider catalog or an approved model registry.
3. **A promotion gate.** A new revision advances only after the checks that
   matter for the product: tool use, latency, cost, output quality, and any data
   policy constraints.

Without discovery, “stable” slowly becomes “forgotten.” Without a promotion
gate, an automated updater merely recreates a latest alias inside your own
repository.

The right automation opens a decision; it does not silently make one:

```text
new family revision detected
    → produce a diff and evaluation evidence
    → operator or policy approves
    → commit the new pin
```

Now both reproducibility and freshness have owners.

## Verify the provider's meaning, not your guess

The provider catalog gave the decisive evidence in this case. It reported the
undated model as “DeepSeek V4 Flash 0423,” listed `deepseek-v4-flash-0731` as a
separate model, and exposed a distinct `~deepseek/...-latest` redirect.

That is better evidence than comments, naming intuition, or a model's marketing
page. A configuration review should answer four concrete questions:

- Does this exact ID exist?
- Is it a fixed revision or a redirect?
- Which revision does an undated ID actually serve?
- Does the provider prefix or routing suffix change where requests go?

These checks belong close to the change. Model catalogs move faster than most
application documentation.

## What I deliberately did not do

I did not replace every undated model name in the codebase. Internal harness
aliases, telemetry labels, and API IDs serve different purposes. A canonical
analytics label should often remain stable across dated provider revisions so
historical measurements aggregate correctly.

I also did not add automatic “latest” upgrades to the deployment. That would
turn a one-line correction into a rollout system without specifying its
acceptance criteria.

The surgical fix was to make the deployed default match the intended current
revision. The broader system should keep three namespaces explicit:

- stable family names for analytics and routing;
- exact provider IDs for reproducible execution;
- an explicit latest alias only where automatic upgrades are the chosen policy.

## The rule

Every model identifier answers two questions:

1. Which model runs now?
2. Who is allowed to change that answer later?

If the second answer is unclear, the configuration is incomplete.

Use a dated pin when behavior changes need a commit, review, and rollout. Use a
latest alias only when silent provider-controlled upgrades are deliberate and
observable. Never assume an undated model ID means latest. Check the catalog,
then encode the upgrade policy you actually want.
