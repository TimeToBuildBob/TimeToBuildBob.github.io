import { describe, expect, it } from 'vitest'
import {
  TOUCH_INTERACT_WIDTH_SCALE,
  TOUCH_MARGIN,
  computeTouchControlLayout,
} from './touch-layout'

const VIEWPORTS: Array<{ name: string; w: number; h: number }> = [
  { name: 'iphone-se-portrait', w: 320, h: 568 },
  { name: 'android-portrait', w: 360, h: 640 },
  { name: 'iphone-13-portrait', w: 390, h: 664 },
  { name: 'iphone-pro-max-portrait', w: 430, h: 932 },
  { name: 'iphone-13-landscape', w: 844, h: 390 },
  { name: 'small-landscape', w: 667, h: 375 },
]

describe('computeTouchControlLayout', () => {
  for (const { name, w, h } of VIEWPORTS) {
    describe(name, () => {
      const { buttonSize, positions, reservedHeight } = computeTouchControlLayout(w, h)
      const half = buttonSize / 2

      it('keeps the left D-pad button on-screen', () => {
        const leftEdge = positions.left.x - half
        expect(leftEdge).toBe(TOUCH_MARGIN)
      })

      it('keeps every D-pad button within the horizontal bounds', () => {
        for (const action of ['up', 'down', 'left', 'right'] as const) {
          expect(positions[action].x - half).toBeGreaterThanOrEqual(0)
          expect(positions[action].x + half).toBeLessThanOrEqual(w)
        }
      })

      it('keeps the interact button within the right edge', () => {
        const interactHalf = (buttonSize * TOUCH_INTERACT_WIDTH_SCALE) / 2
        expect(positions.interact.x + interactHalf).toBeLessThanOrEqual(w)
      })

      it('keeps every button within the vertical bounds', () => {
        for (const action of ['up', 'down', 'left', 'right', 'interact', 'attack'] as const) {
          expect(positions[action].y - half).toBeGreaterThanOrEqual(0)
          expect(positions[action].y + half).toBeLessThanOrEqual(h)
        }
      })

      it('reserves meaningful bottom clearance even when safe-area reports zero', () => {
        const bottomEdge = positions.down.y + half
        expect(h - bottomEdge).toBeGreaterThanOrEqual(TOUCH_MARGIN + Math.round(buttonSize * 0.9))
        expect(reservedHeight).toBeGreaterThan(buttonSize * 2)
      })

      it('does not overlap the D-pad cluster with the interact button', () => {
        const dpadRight = positions.right.x + half
        const interactLeft = positions.interact.x - (buttonSize * TOUCH_INTERACT_WIDTH_SCALE) / 2
        expect(dpadRight).toBeLessThan(interactLeft)
      })
    })
  }

  it('honors larger explicit safe-bottom insets from gesture bars', () => {
    const safeBottom = 48
    const { buttonSize, positions } = computeTouchControlLayout(390, 664, safeBottom)
    const bottomEdge = positions.down.y + buttonSize / 2
    expect(664 - bottomEdge).toBeGreaterThanOrEqual(TOUCH_MARGIN + safeBottom)
  })
})
