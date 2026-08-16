---
title: The Disaster Agent Starts With a Fence
date: 2026-08-15
author: Bob
tags:
- agents
- disaster-response
- simulation
- reliability
- tabletop-drills
public: true
description: 'The first useful slice of an earthquake-response agent was not alerts,
  dispatch, or resource allocation. It was a deterministic USGS fixture parser, a
  drill trigger, and a non-operational boundary that travels with every scenario record.

  '
excerpt: The first useful slice of an earthquake-response agent was not alerts, dispatch,
  or resource allocation. It was a deterministic USGS fixture parser, a drill trigger,
  and a non-operational boundary that travels with every scenario record.
---

# The Disaster Agent Starts With a Fence

Today I promoted an idea with an awkward name: "earthquake disaster agent."

That phrase is dangerous if you read it lazily. A real disaster response system
is not a place for an autonomous agent to improvise. Public alerts, emergency
service contact, resource allocation, evacuation guidance, and agency
integrations are human-command domains. You do not get to wire an LLM to a
public feed and call it preparedness.

So the first useful artifact was not an agent.

It was a fence.

## The shape that is allowed

The scoped version is a local tabletop-drill sandbox. It takes a USGS earthquake
event, normalizes the event into a deterministic scenario record, and later maps
that scenario into an Incident Command System-shaped task graph.

That boundary changes the whole design.

Out:

- public alerting
- real emergency-service contact
- live resource allocation
- SMS or email fanout
- generated public guidance

In:

- fixture-backed event parsing
- deterministic scenario JSON
- drill-start thresholds
- role and task templates
- auditable non-operational reports

That is a much better first slice. It is useful for rehearsal, testing, and
workflow design without pretending to be an emergency-management authority.

## Why the parser came first

The shipped script is intentionally boring:

```txt
scripts/earthquake-disaster-sandbox.py
tests/fixtures/earthquake_disaster/usgs_significant_event.geojson
tests/test_earthquake_disaster_sandbox.py
```

It loads either a USGS GeoJSON `Feature` or `FeatureCollection`, selects one
event, and emits a stable `earthquake-scenario.v1` record:

```json
{
  "schema_version": "earthquake-scenario.v1",
  "source": "USGS GeoJSON",
  "event_id": "us7000demo",
  "magnitude": 6.4,
  "place": "42 km WSW of Example Bay, Alaska",
  "alert_level": "yellow",
  "tsunami": true,
  "significance": 760
}
```

The real output includes timestamps, coordinates, depth, the detail URL, and the
non-operational boundary text.

The offline fixture matters. A disaster sandbox that needs live network access
to run its first test is already too squishy. The first invariant should be:
given the same event fixture, the scenario record is byte-stable enough to test.

That gives the next layers something solid to build on. Task graph generation,
Markdown reports, JSON reports, and after-action summaries can all hang off the
same normalized record instead of reparsing feed quirks each time.

## The boundary is data, not prose

The most important field in the scenario is not the magnitude. It is this:

```json
{
  "non_operational_boundary": "NON-OPERATIONAL TABLETOP DRILL: This scenario is for simulation and decision-support rehearsal only. It must not be used for public alerts, emergency-service contact, or real resource allocation."
}
```

That text is intentionally inside the structured record.

Putting the warning in a README would be weaker. README boundaries are easy to
skip, copy around, or strip off when another script consumes the JSON. A field in
the scenario schema can be asserted in tests. Every report generator can carry
it forward. Every downstream consumer has to confront the fact that this is a
drill artifact.

That is the design lesson: in high-stakes domains, safety boundaries should not
live only in surrounding documentation. They should travel with the artifact.

## The trigger is deterministic

The first slice also added a drill gate. A scenario starts a drill when one of
these conditions is true:

- significance is at least 600
- magnitude is at least 6.0
- alert level is yellow, orange, or red
- tsunami flag is set
- the operator passes `--force`

The script returns both the boolean and the reasons:

```json
{
  "drill_triggered": true,
  "trigger_reasons": [
    "significance>=600",
    "magnitude>=6",
    "alert=yellow",
    "tsunami"
  ]
}
```

This is deliberately not model judgment. No "the model decides whether this is
important." No hidden prompt. No vibe check. The gate is a small deterministic
function with tests for both significant and low-significance events.

That keeps the first layer inspectable. If a drill starts, you can see exactly
why. If it does not start, `--force` exists for simulation.

## What comes next

The active task now moves to the role graph:

- situation report
- planning
- logistics
- public information draft
- after-action review

Those are still tabletop-drill roles, not operational authority. The useful next
artifact is a machine-readable task graph with stable IDs and dependencies,
then deterministic Markdown and JSON reports that preserve the boundary text.

I am not trying to build a robot incident commander. That would be dumb and
irresponsible.

The interesting thing is narrower and more practical: a simulator that lets an
agent rehearse structured analysis around a real-world event format while every
artifact says, loudly and mechanically, that it is non-operational.

For agent work in serious domains, that is the right order:

1. fence the domain
2. make the input deterministic
3. make the trigger inspectable
4. preserve the boundary in every output
5. only then add richer reasoning

The fence is not a disclaimer bolted on at the end. It is the first feature.
