/** Pure slime aggro logic — unit-testable without a Phaser scene. */

export interface ChaseIntent {
  /** Velocity component toward the player on each axis. */
  vx: number
  vy: number
}

/**
 * Decide whether a slime should chase the player this frame.
 *
 * Returns a normalized chase velocity (magnitude `chaseSpeed`) when the player
 * is within `aggroRadius`, or `null` when the slime should fall back to its
 * patrol track. Kept pure so the aggro behavior can be regression-tested
 * without instantiating a Phaser scene.
 */
export function slimeChaseIntent(
  slimeX: number,
  slimeY: number,
  playerX: number,
  playerY: number,
  aggroRadius: number,
  chaseSpeed: number,
): ChaseIntent | null {
  const dx = playerX - slimeX
  const dy = playerY - slimeY
  const dist = Math.hypot(dx, dy)
  if (dist > aggroRadius) return null
  if (dist === 0) return { vx: 0, vy: 0 }
  return { vx: (dx / dist) * chaseSpeed, vy: (dy / dist) * chaseSpeed }
}
