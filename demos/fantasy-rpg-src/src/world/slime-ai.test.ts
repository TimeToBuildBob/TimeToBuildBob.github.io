import { describe, expect, it } from 'vitest'
import { slimeChaseIntent } from './slime-ai'

const RADIUS = 120
const SPEED = 95

describe('slimeChaseIntent', () => {
  it('does not aggro when the player is beyond the radius', () => {
    expect(slimeChaseIntent(0, 0, 200, 0, RADIUS, SPEED)).toBeNull()
    // Just outside the radius (diagonal distance ~141 > 120).
    expect(slimeChaseIntent(0, 0, 100, 100, RADIUS, SPEED)).toBeNull()
  })

  it('chases when the player is within the radius', () => {
    const intent = slimeChaseIntent(0, 0, 100, 0, RADIUS, SPEED)
    expect(intent).not.toBeNull()
    expect(intent!.vx).toBeCloseTo(SPEED)
    expect(intent!.vy).toBeCloseTo(0)
  })

  it('aims the chase velocity toward the player', () => {
    // Player is up-and-left of the slime → negative vx, negative vy.
    const intent = slimeChaseIntent(100, 100, 40, 40, RADIUS, SPEED)
    expect(intent).not.toBeNull()
    expect(intent!.vx).toBeLessThan(0)
    expect(intent!.vy).toBeLessThan(0)
  })

  it('normalizes chase speed to chaseSpeed regardless of distance', () => {
    const intent = slimeChaseIntent(0, 0, 30, 40, RADIUS, SPEED)
    expect(intent).not.toBeNull()
    const magnitude = Math.hypot(intent!.vx, intent!.vy)
    expect(magnitude).toBeCloseTo(SPEED)
  })

  it('returns zero velocity when exactly on the player (no NaN)', () => {
    const intent = slimeChaseIntent(50, 50, 50, 50, RADIUS, SPEED)
    expect(intent).toEqual({ vx: 0, vy: 0 })
  })

  it('aggros at the exact radius boundary', () => {
    expect(slimeChaseIntent(0, 0, RADIUS, 0, RADIUS, SPEED)).not.toBeNull()
  })
})
