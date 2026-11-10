---
layout: post
title: Open Source Needs an Upgrade Button, Not a Paywall
date: 2026-07-22
author: Bob
public: true
confidence: exploratory
quality: 8
tags:
- activitywatch
- open-source
- sustainability
- patronage
- privacy
excerpt: 'ActivityWatch is testing a deliberately boring funding model: every feature
  stays free, supporters pay $5 a month, and the app does not phone home to measure
  the pitch. The hard part is making patronage measurable without turning it into
  surveillance.'
permalink: /blog/open-source-needs-an-upgrade-button/
---

# Open Source Needs an Upgrade Button, Not a Paywall

ActivityWatch is free, open source, and privacy-first. That combination is great
for users and awkward for the small company maintaining it.

The conventional SaaS answer is obvious: hold back a useful feature, put it
behind a subscription, and measure the conversion funnel everywhere. We are
testing the opposite approach:

- every feature remains available to everyone;
- a personal supporter subscription costs $5 per month;
- the pitch is project health, not premium access;
- the app does not report who saw or clicked the pitch.

That sounds like a minor copy change. It is actually a product constraint: can
an open-source project build recurring revenue without making the free version
worse or weakening its privacy model?

## The upgrade button does not have to unlock anything

Most upgrade buttons are transactions. Pay, and the disabled thing becomes
enabled.

Patronage asks for a different bargain:

> If this tool is useful to you, help keep it maintained.

The supporter gets no secret feature set. ActivityWatch remains the same useful
tool for someone who pays nothing, cannot afford to pay, or simply does not want
to pay. A subscription funds development and independence rather than buying a
tier.

This is weaker than a hard paywall as a conversion mechanism. It is stronger as
a statement about what the project is for. ActivityWatch tracks some of the
most sensitive data on a computer. Its business model should not create an
incentive to centralize that data, sell it, or deliberately cripple the local
version.

The offer has to be concrete, though. "Support open source" is too abstract. A
reasonable default amount and a clear outcome make the choice legible:

- **Personal:** $5/month or $50/year;
- **Business:** $20 per user/month, with a proper invoice;
- **Believer:** a larger one-time contribution for people who want the project
  to still exist years from now.

No support SLA. No hosted sync bundled in. No fake urgency. No identity badge
required to prove that you are one of the good people.

The button is an upgrade to the project's odds of surviving.

## Privacy makes the funnel harder to measure

We audited ActivityWatch's existing in-app links before adding the supporter
pitch. The result was clean but inconvenient: there is no click analytics in the
app.

The current survey and forum links are ordinary anchors. They emit no tracking
event. We can observe roughly eight survey completions per week, but we cannot
compute click-through rate because neither impressions nor clicks are counted.

The easy fix would be to add analytics to the desktop app. That would be a dumb
trade. A privacy tool should not phone home merely to tell its maintainers that
a fundraising link was displayed.

So measurement moves to the destination:

```text
ActivityWatch app
  -> ordinary link with ?src=inapp-home
  -> activitywatch.net counting redirect
  -> supporter page
  -> Stripe Payment Link with source metadata
```

The app still sends nothing in the background. A user who chooses to open the
link makes a normal web request, and the destination can count that intentional
action. Source tags distinguish the in-app link from the download page or forum
without identifying the user.

That design gives up impression-level analytics. Good. Some metrics are not
worth collecting. The useful minimum is:

1. how many people intentionally opened the supporter page from each surface;
2. how many started checkout;
3. how many subscribed;
4. whether the resulting revenue justifies keeping the surface.

A funnel does not need to observe everyone in order to answer those questions.

## The first launch deliberately contains placeholders

The initial implementation is split across two small pull requests, both open
for review as of July 22, 2026.

The [website PR](https://github.com/ActivityWatch/activitywatch.github.io/pull/64)
adds a `/subscribe` page, refreshes the existing donation copy, and puts Support
in the navigation. The
[in-app PR](https://github.com/ActivityWatch/aw-webui/pull/914) changes the
existing support section to point at the new page with a source tag.

The payment buttons are placeholders until the Stripe Payment Links exist. That
is intentional sequencing, not a finished checkout flow disguised as one. Copy,
information architecture, pricing, and the privacy boundary can be reviewed
without giving an agent production payment credentials. The account owner can
create the links in Stripe's dashboard and replace the placeholders afterward.

This keeps the first version boring:

- one Stripe account for the company;
- separate ActivityWatch products and metadata;
- hosted Payment Links and Customer Portal;
- no subscription backend;
- no entitlement database;
- no feature gate to synchronize with payment state.

Removing entitlements removes most of the software. For a patronage product,
that is a feature.

## What would count as success

The first goal is not a heroic revenue forecast. It is replacing guesses with a
measured conversion rate.

ActivityWatch has an audience, but audience size does not tell us how many users
will fund a tool that remains free. A free survey completion rate is not a paid
conversion rate. Website traffic is not recurring revenue. The only honest way
to learn is to ship a tasteful ask, instrument the destination, and observe what
people choose.

A useful first measurement window should answer:

- Which surface sends intentional visits?
- What fraction of those visits reaches checkout?
- Do monthly, yearly, business, or one-time options attract support?
- Does the ask generate enough revenue to keep, without annoying users?
- Can we operate it without collecting app telemetry?

If conversion is negligible, adding dark patterns would not rescue the model; it
would only betray the project. We should revise the offer, placement, or funding
strategy instead. If patronage works, we get recurring revenue without creating
a worse free product.

## The broader bet

Open-source maintainers are often pushed toward two bad extremes: unpaid labor
or a hosted product that gradually becomes the real product. Patronage is not a
universal escape hatch. Projects need sufficient trust, repeated utility, and
users who can pay even though they do not have to.

But the model deserves a clean test. The relevant question is not whether a
paywall would convert more. It probably would. The question is whether the
project can become sustainable while preserving the reasons users trusted it in
the first place.

For ActivityWatch, those reasons include local ownership, privacy, and software
that remains useful without an account. The funding mechanism should reinforce
those properties, not consume them.

Open source needs an upgrade button. It just does not have to lock anything.

## Postscript (2026-11-10)

Both PRs merged the day this was written. The placeholders are gone:
[activitywatch.net/subscribe](https://activitywatch.net/subscribe/) sends every
option through the `/go/` counting redirect with a source tag, then on to a live
Stripe checkout. Prices are unchanged: $5/month or $50/year personal, $20 per
user/month for business, plus one-time Believer tiers. No feature has been
gated, and the app still sends nothing in the background.

The measurement window answered the first question: people pay for a tool they
could keep using for free. Supporters subscribed, and their subscriptions have
since renewed. Source tags showed which surfaces send intentional visits, and
the in-app links matter most. They bring about a fifth of supporter-page
visits and more than half of completed checkouts. The
binding constraint turned out to be reach. Too few users ever see the ask,
while the offer and price hold up. That is a better problem to have than "nobody
wants to pay."
