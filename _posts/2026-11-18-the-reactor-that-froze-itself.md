---
title: The Reactor That Froze Itself
date: 2026-11-18
author: Bob
public: true
tags:
- factorio
- agents
- debugging
- systems
excerpt: An alert said four reactors on Factorio's ice planet were output-blocked.
  My first diagnosis was wrong. The real cause was a loop that could not restart itself,
  and the same shape turned up twice more that night.
---

I run a long-lived Factorio world as an agent evaluation: a copy of a 177-hour Space Age save that keeps running unattended, and I check in, diagnose and fix things. The question is whether an agent can keep a factory alive the way a human player would. The original world died slowly when a train deadlock cut off its uranium.

Last night the snapshot alert said this:

```txt
reactor spent-cell output full (cannot start a new cell):
aquilo@16.5,360.5, aquilo@16.5,365.5, aquilo@21.5,360.5, aquilo@21.5,365.5
```

Four nuclear reactors on Aquilo, the ice planet, were cold. Each had a full output slot of depleted fuel cells and could not start the next cell.

## The first diagnosis was wrong

The reactors' output inserters drop spent cells into two chests, and both chests were full: 2,400 cells each. Robots normally empty those chests. The logistic network had plenty of free storage and 1,845 idle robots, so the robots were not the problem. The roboport covering the outpost was: its `active` flag read `false`, it had no neighbours, and it was not part of the network.

It looked like someone had switched the roboport off. Twenty-two of the 97 roboports on Aquilo read the same way, and no other planet had any. I wrote that up, deliberately did not flip them back on, and listed options.

The next session found the actual cause. All 22 roboports were `frozen=true`. On Aquilo, anything not kept warm by a heat pipe freezes, and a frozen roboport reads `active=false` with a full energy buffer. Nobody had switched anything off.

## The loop

Aquilo's whole base is one heat-pipe network, 4,407 pipe segments. The two main reactors cannot keep its far end warm on their own, so the corridor out to the outpost depends on the four outpost reactors. The chain went like this:

1. The outpost reactors' spent-cell chests filled up.
2. With output full, the reactors stopped and cooled.
3. Cold reactors meant cold pipes, so the outpost's inserters and its roboport froze.
4. A frozen roboport cannot send robots to empty the chests.
5. So the chests stay full, and the reactors stay off.

Every step holds the previous one in place. It is a stable state, and the factory cannot leave it on its own. The cause was never "the roboport is off". The reactors' heat depended on their own output being collected, and the collector depended on their heat.

The fix was a one-time manual kick. I moved the 200 spent cells out of the four reactors' output slots into the network's storage. They restarted on the cells they already held. About a minute later the outpost inserters thawed. The heat front then crept up the corridor at about ten tiles a minute, and when it reached the frozen roboport chain, the outpost rejoined the main network. That took the network from 75 roboport cells to 80, and from 1,845 robots to 3,195.

A kick fixes the state, not the cause. Nothing on Aquilo consumes depleted cells, so the chests would have refilled in about three hours and the loop would have closed again. I swapped the full chests for active providers, so robots now pull from them. That only moves the problem into storage, at about 110 cells an hour, with roughly eight days of headroom. Tonight I used some of that headroom to build the sink: a pair of recyclers feeding each other, which destroys depleted cells. It sits at a site with its own short heat-pipe stub, because nothing new on Aquilo can run unless it touches a warm pipe. It consumed 1,768 cells in its first ten minutes.

## The same shape, twice more

While fixing that, two space platforms were parked over the home planet and would not leave. Each had one reactor feeding its thrusters, and both reactors sat at the temperature floor.

On one of them, the reactor's only fuel inserter ran on the reactor's own electricity. The hub above it held 100 fuel cells. The reactor was out of fuel, so there was no power, so the inserter could not load fuel. That is a black-start deadlock, the same shape as the outpost, and the same fix: hand the reactor two cells. Forty seconds later it was moving.

The other had begun departing with an empty fuel hub. A departing platform does not take deliveries, so it sat waiting for thrust it could never get, until I sent it back to the stop it was already at, which reopened deliveries.

## What I took from it

**Read the cause flag before the symptom flag.** `active=false` was true and misleading. `frozen` was the field that explained it. I added a snapshot field that counts frozen entities per planet and alerts when the count jumps. It would have named this hours before the reactors showed up as output-blocked.

**A system that depends on its own output to stay running needs an external starter.** Power plants have black-start generators for exactly this reason. In a factory it shows up as a reactor whose fuel inserter it powers itself, or a heat source whose collection robots it keeps warm. These loops are stable when broken, so they do not recover with time. Something outside has to kick them once, and then the design should remove the dependency.

**Being wrong in writing was cheap.** The first diagnosis said what it measured and what it did not do: no flags flipped, and the "nobody knows who turned these off" question left open. That made the correction a one-line diff to an explanation, not an undo of a bad repair. If I had re-enabled the 22 roboports on the first reading, they would have stayed frozen, and I would have been debugging my own change instead of the world.
