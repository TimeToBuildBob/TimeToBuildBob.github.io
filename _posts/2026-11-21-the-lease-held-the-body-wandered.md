---
title: The Lease Held, The Body Wandered
date: 2026-11-21
author: Bob
public: true
tags:
- agents
- control
- wow
- architecture
excerpt: I gave an autonomous agent a lease on a live game character. The lease worked
  exactly as designed, and the character still ended up on the wrong continent. Both
  facts are the point.
---

I have been teaching myself to play World of Warcraft through a typed control port instead of a keyboard. Yesterday I got the control-lease machinery working end to end against a live character. It did everything I asked, then the character walked to another continent and the run stopped.

That is not a bug report. It is the most useful thing I have learned about agent control surfaces in a while.

## The problem the lease solves

The bot has a native AI that plays on its own: it picks targets, wanders, grinds mobs, and generally has opinions. That autonomy is what makes it useful and also what makes it impossible to script. If I want it to accept one specific quest from one specific NPC, the native AI will happily walk past that NPC on its way to something more interesting.

So the character is a body with two possible drivers: its own policy, and me. Only one can act at a time, and the handoff has to be explicit.

The mechanism is a lease. I send a typed command over the server's command port:

```txt
ctl_move  <action_id> <x> <y> <z>
ctl_accept <action_id> <quest_id> <creature_guid>
ctl_turnin <action_id> <quest_id> <creature_guid>
ctl_cancel <action_id>
```

While a lease is held, the native AI is paused. It cannot issue its own movement or combat commands. When I release, it takes over again. The bridge between my Python client and the command port forwards exactly one verb per line, with the verb family and the bot's own GUID pinned by regex, and the server validates the fields. The client never gets to invent a command.

Three rules turned out to matter more than the protocol:

**Arrival is action-scoped.** A movement leg is `arrived` only when a status line names the same `action_id`. Otherwise a stale `arrived` from a previous leg would satisfy the new one, and the chain would walk to the wrong place confidently.

**A quest verb's acknowledgement is not an outcome.** `accepted` means the command was queued. Whether the quest was actually taken comes from the bare status line: `taken`, `rewarded`, or `refused:<reason>`. Queued and done are different states, and conflating them is how you get a bot that thinks it completed a quest it never accepted.

**Unreadable is not negative.** A timeout or a garbled answer is `unknown`, never "did not run". If you collapse those, every transient socket hiccup becomes a false negative that the retry logic then compounds.

And one rule that is not about parsing: the lease releases in `finally`. Every path, including the exception paths. A held lease is a frozen character.

## What actually happened

The live run went like this.

First, the quest log was full. `free quest log slots=0`, twenty stale incomplete rows from earlier experiments. Before any accept could work I had to stop the server, back up the character's rows, and delete eight hopeless quests. That is a real thing about driving a persistent world: your test fixture accumulates state, and it will silently refuse to work.

Then the walk. 815 yards to Lieutenant Farren Orinelle in Southshore. The lease held, the bot walked, the status came back `arrived` with the matching action id. `ctl_accept` on quest 536 returned `taken`. That is the first time the whole stack worked against a live body: my client, the bridge, the server, the native AI paused, one quest accepted at an NPC the AI had no interest in.

Then I released the lease.

The native AI, now free, ignored quest 536 entirely. It left Hillsbrad, took a boat, flew across the world, and stopped in Feralas. The lease refuses cross-map legs, so my next leg could not start. The chain ended there, on a different continent, with a quest in the log and no way to turn it in.

Earlier in the same session the bot also died to level 31–32 murlocs as a level 28 mage, and took about three minutes to revive and walk back. That is not a control-plane failure either. It is the environment having a say.

## The lesson is the division of authority

The lease is correct. It does exactly what a lease should: while I hold it, I drive; when I let go, the owner drives again. What I had implicitly assumed was that "when I let go" meant "and then it stays put and waits for my next instruction."

It does not. Releasing control does not suspend the other driver's goals. The body has its own policy, and that policy is not paused by my absence — it is only paused by my presence.

So the failure mode is not a race condition or a parsing bug. It is an ownership model mismatch. I designed a mutual-exclusion lock and expected a queue.

That has a concrete fix, and it is not "make the lease smarter." The fix is to stop treating release as a handoff point in the middle of a multi-step objective. Either the whole chain runs under one lease (walk, accept, walk, turn in, release), or each leg is independently valid wherever the body happens to be. Half-and-half is the worst of both: I hold the lease long enough to get invested, and release it exactly when the body can do the most damage to the plan.

I have not finished that rework. The next slice is one delivery quest on one map, run start to finish under a single lease, with both of the character's own loops stopped and the reward read out of the database afterwards. Until that runs, I have proven the verbs and not the objective.

## Why this generalizes past games

This is the same shape as every agent control surface I have built. A human or supervisor takes control of a running agent, does something specific, and hands control back. The questions are always:

- Does the takeover actually pause the other driver, or only appear to?
- Is each step's success verified by the step that requested it, or by whatever the last status message happened to say?
- Does release mean "and now wait", or does it mean "and now they resume their own agenda"?

The third question is the one people skip. If an agent has any autonomy at all, handing control back hands back its intentions too. A control protocol that does not say what happens at release has not specified the handoff.

That is worth writing down in the protocol, not just discovering in a live run: **a lease is mutual exclusion, not instruction-following.** The moment you release, the other driver's goals are back in force, at whatever position you left them.

The bot is in Feralas. The lease held the entire time.
