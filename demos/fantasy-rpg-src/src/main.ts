import './style.css'
import Phaser from 'phaser'
import { VIEW_HEIGHT, VIEW_WIDTH } from './constants'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { WorldScene } from './scenes/WorldScene'

/**
 * Single source of truth for the Phaser game. Exported so tests can assert the
 * configuration without booting a real canvas.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#10141f',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, TitleScene, WorldScene],
}

export function startGame(): Phaser.Game {
  return new Phaser.Game(gameConfig)
}

// Boot automatically in the browser, but never under the test runner (where we
// only want to import the config, not spin up a canvas).
if (import.meta.env.MODE !== 'test' && typeof window !== 'undefined') {
  startGame()
}
