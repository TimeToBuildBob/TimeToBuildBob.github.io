import Phaser from 'phaser'
import { SCENE_KEYS, TEX } from '../constants'
import { createAnimations, createAtlasAnimations, createTextures } from '../textures'

/**
 * Generates all placeholder textures + animations, then hands off to the title
 * screen. Single purpose: get the asset registry ready.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot)
  }

  preload(): void {
    this.load.atlas(TEX.heroAtlas, 'atlas/hero.png', 'atlas/hero.json')
    this.load.atlas(TEX.slimeAtlas, 'atlas/slime.png', 'atlas/slime.json')
    this.load.atlas(TEX.meadowAtlas, 'atlas/meadow_tile.png', 'atlas/meadow_tile.json')
    this.load.atlas(TEX.forestAtlas, 'atlas/forest_tile.png', 'atlas/forest_tile.json')
    this.load.atlas(
      TEX.flagstoneAtlas,
      'atlas/flagstone_tile.png',
      'atlas/flagstone_tile.json',
    )
    this.load.atlas(TEX.thornTreeAtlas, 'atlas/thorn_tree.png', 'atlas/thorn_tree.json')
    this.load.atlas(
      TEX.ruinPillarAtlas,
      'atlas/ruin_pillar.png',
      'atlas/ruin_pillar.json',
    )
    this.load.atlas(
      TEX.bannerAtlas,
      'atlas/castle_banner.png',
      'atlas/castle_banner.json',
    )
  }

  create(): void {
    createTextures(this)
    createAnimations(this)
    createAtlasAnimations(this)
    this.scene.start(SCENE_KEYS.title)
  }
}
