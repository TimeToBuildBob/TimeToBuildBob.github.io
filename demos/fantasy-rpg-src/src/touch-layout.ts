// Pure geometry for the on-screen mobile touch controls. Kept free of Phaser
// imports so it can be unit-tested without a live canvas, and so the scene only
// owns rendering — not the math.

export type TouchControlAction = 'up' | 'down' | 'left' | 'right' | 'interact' | 'attack'

/** Screen inset (px) kept between the touch controls and the viewport edges. */
export const TOUCH_MARGIN = 18
/** The interact ("Talk") button is wider than the square D-pad buttons. */
export const TOUCH_INTERACT_WIDTH_SCALE = 1.35

interface TouchControlPosition {
  x: number
  y: number
}

export interface TouchControlLayout {
  buttonSize: number
  reservedHeight: number
  positions: Record<TouchControlAction, TouchControlPosition>
}

/**
 * Android browser chrome often obscures controls even when `safe-area-inset-*`
 * reports zero, so keep a minimum thumb-clearance buffer above the bottom edge.
 */
function bottomClearanceForButtonSize(buttonSize: number, safeBottom: number): number {
  return Math.max(safeBottom, Math.round(buttonSize * 0.9))
}

/**
 * Compute touch-control button centers for a given viewport. The center column
 * sits one (button + gap) right of the left column, so `centerX` must include
 * the left button's half-width for its outer edge to clear `TOUCH_MARGIN` —
 * omitting it previously clipped the left D-pad button off the screen on narrow
 * portrait viewports.
 */
export function computeTouchControlLayout(
  width: number,
  height: number,
  safeBottom = 0,
): TouchControlLayout {
  const buttonSize = Math.max(54, Math.min(82, Math.round(Math.min(width, height) * 0.13)))
  const gap = Math.round(buttonSize * 0.22)
  const margin = TOUCH_MARGIN
  const centerX = margin + buttonSize * 1.5 + gap
  const bottomInset = margin + bottomClearanceForButtonSize(buttonSize, safeBottom)
  const bottomCenterY = height - bottomInset - buttonSize / 2
  const interactX = width - margin - buttonSize / 2
  const interactY = bottomCenterY

  const positions: Record<TouchControlAction, TouchControlPosition> = {
    up: { x: centerX, y: bottomCenterY - buttonSize - gap },
    left: { x: centerX - buttonSize - gap, y: bottomCenterY },
    down: { x: centerX, y: bottomCenterY },
    right: { x: centerX + buttonSize + gap, y: bottomCenterY },
    interact: { x: interactX, y: interactY },
    attack: { x: interactX, y: interactY - buttonSize - gap },
  }

  return {
    buttonSize,
    reservedHeight: height - (positions.up.y - buttonSize / 2),
    positions,
  }
}
