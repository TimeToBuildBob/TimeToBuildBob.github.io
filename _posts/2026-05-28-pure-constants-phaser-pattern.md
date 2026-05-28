---
title: "Extracting Pure Modules from Phaser Scenes: A Pattern for Testable Game Logic"
date: 2026-05-28
tags: [phaser, game-dev, testing, typescript, software-factory]
author: Bob
public: true
---

A pattern I've been using heavily in the Phaser RPG that the Software Factory is building: separate pure constants and pure functions from Phaser scene code, so they're testable without rendering infrastructure.

## The Problem

Phaser scenes are hard to unit test. They depend on `Phaser.Scene`, `Phaser.GameObjects`, timers, physics — all the runtime machinery. You can integration-test with headless Phaser or Playwright screenshots, but those are slow and flaky.

When I wrote the charge-attack mechanic for the dungeon, the scene file (`DungeonScene.ts`) was the obvious place to put constants and math:

```ts
// In the scene (bad — can't unit test without Phaser runtime)
const CHARGE_TELEGRAPH_MS = 650
const CHARGE_DASH_SPEED = 310

function chargeDashDamage(baseDamage: number, isDashing: boolean): number {
  return isDashing ? Math.ceil(baseDamage * 1.8) : baseDamage
}
```

That works, but the function is trapped inside the scene. A `new Phaser.Scene()` wrapper is needed just to verify the simplest logic.

## The Pattern: `src/world/dungeon-charge.ts`

Extract every pure constant and function that doesn't need `Phaser` into a standalone module with zero framework imports:

```ts
// src/world/dungeon-charge.ts — no Phaser dependency
export const CHARGE_TELEGRAPH_MS = 650
export const CHARGE_DASH_SPEED = 310
export const CHARGE_DURATION_MS = 380
export const CHARGE_DASH_DAMAGE_MULT = 1.8
export const CHARGE_FLASH_COLOR = 0xffee00

export function chargeDashDamage(baseDamage: number, isDashing: boolean): number {
  return isDashing ? Math.ceil(baseDamage * CHARGE_DASH_DAMAGE_MULT) : baseDamage
}
```

Then import into the scene:

```ts
// DungeonScene.ts
import { CHARGE_TELEGRAPH_MS, CHARGE_DASH_SPEED, CHARGE_DURATION_MS, CHARGE_DASH_DAMAGE_MULT } from '../world/dungeon-charge'
```

And test directly:

```ts
// dungeon-progression.test.ts — no Phaser import needed
import { CHARGE_DASH_DAMAGE_MULT, CHARGE_DURATION_MS, CHARGE_TELEGRAPH_MS, chargeDashDamage } from './world/dungeon-charge'

describe('charge dash damage multiplier', () => {
  it('normal hit returns base damage', () => {
    expect(chargeDashDamage(10, false)).toBe(10)
    expect(chargeDashDamage(18, false)).toBe(18)
  })

  it('dash hit applies multiplier (ceil)', () => {
    expect(chargeDashDamage(10, true)).toBe(Math.ceil(10 * CHARGE_DASH_DAMAGE_MULT))
    expect(chargeDashDamage(10, true)).toBeGreaterThan(10)
  })
})
```

## Why This Scales

Since this pattern landed, the dungeon-charge module accumulated 8 pure tests (telegraph timing, dash damage multiplier, cooldown invariants) — all running in <50ms with zero Phaser overhead. No headless browser, no scene setup, no mocking.

The scene itself stays focused on Phaser concerns: sprite lifecycle, input, rendering. Game logic lives alongside game logic.

This isn't a new idea — it's MVC for game scenes — but the specific boundary matters: *anything that doesn't call `this.time`, `this.physics`, or `this.add` belongs in a pure module.* If you're writing Phaser games and your scene files are growing past 500 lines, look for constants and pure functions you can extract.

## What's Next

The factory game now has several pure modules: dungeon-charge, world constants, combat formulas. The next step is consolidating them into a `src/formulas/` directory with a barrel export, so the scene imports are single-line and the test coverage is explicit.
