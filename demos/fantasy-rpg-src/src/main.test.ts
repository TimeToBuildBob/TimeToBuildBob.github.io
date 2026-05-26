import { describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => {
  class Scene {}

  return {
    default: {
      AUTO: 'AUTO',
      Scale: {
        FIT: 'FIT',
        RESIZE: 'RESIZE',
        CENTER_BOTH: 'CENTER_BOTH',
      },
      Scene,
      Scenes: {
        Events: {
          SHUTDOWN: 'shutdown',
          DESTROY: 'destroy',
        },
      },
      Input: {
        Keyboard: {
          JustDown: () => false,
          KeyCodes: {
            W: 'W',
            A: 'A',
            S: 'S',
            D: 'D',
            E: 'E',
          },
        },
      },
      Math: {
        Vector2: class {},
        Distance: { Between: () => 0 },
        Clamp: (value: number) => value,
      },
    },
  }
})

import Phaser from 'phaser'
import { gameConfig } from './main'
import { VIEW_HEIGHT, VIEW_WIDTH } from './constants'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { WorldScene } from './scenes/WorldScene'

describe('gameConfig', () => {
  it('uses the AUTO renderer so Phaser picks WebGL/Canvas', () => {
    expect(gameConfig.type).toBe(Phaser.AUTO)
  })

  it('mounts into the #app element', () => {
    expect(gameConfig.parent).toBe('app')
  })

  it('declares an explicit resolution', () => {
    expect(gameConfig.width).toBe(VIEW_WIDTH)
    expect(gameConfig.height).toBe(VIEW_HEIGHT)
  })

  it('resizes the canvas to the live viewport', () => {
    expect(gameConfig.scale?.mode).toBe(Phaser.Scale.RESIZE)
  })

  it('enables arcade physics with no gravity', () => {
    expect(gameConfig.physics?.default).toBe('arcade')
    expect(gameConfig.physics?.arcade?.gravity).toEqual({ x: 0, y: 0 })
  })

  it('registers Boot, Title and World scenes in order', () => {
    expect(gameConfig.scene).toEqual([BootScene, TitleScene, WorldScene])
  })

  it('exposes scene classes that extend Phaser.Scene', () => {
    expect(BootScene.prototype).toBeInstanceOf(Phaser.Scene)
    expect(TitleScene.prototype).toBeInstanceOf(Phaser.Scene)
    expect(WorldScene.prototype).toBeInstanceOf(Phaser.Scene)
  })
})
