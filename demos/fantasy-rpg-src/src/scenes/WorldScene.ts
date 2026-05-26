import Phaser from 'phaser'
import { slimeChaseIntent } from '../world/slime-ai'
import {
  DEFAULT_NAME,
  DEPTH,
  INTERACT_DISTANCE,
  ATTACK_COOLDOWN_MS,
  ATTACK_RANGE,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_MAX_HP,
  PLAYER_SPEED,
  PROP_VARIANT_COUNT,
  SCENE_KEYS,
  SLIME_AGGRO_RADIUS,
  SLIME_ANIM_KEY,
  SLIME_CHASE_SPEED,
  SLIME_DAMAGE,
  SLIME_DAMAGE_COOLDOWN_MS,
  SLIME_MAX_HP,
  SLIME_PATROLS,
  SPAWN_X,
  SPAWN_Y,
  TEX,
  TILE,
  TILE_VARIANT_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  castleBannerFrame,
  flagstoneTileFrame,
  forestTileFrame,
  heroFrameKey,
  meadowTileFrame,
  playerFrameKey,
  ruinPillarFrame,
  slimeFrameKey,
  thornTreeFrame,
  walkAnimKey,
  type Direction,
} from '../constants'
import { ALL_QUEST_IDS, KNIGHT_REVELATION_LINES, LORE_NPCS, LORE_QUESTS, WORLD_NAME, WORLD_TAGLINE, loraNpcsByZone } from '../lore'
import { loadGame, saveGame } from '../save'
import {
  TOUCH_INTERACT_WIDTH_SCALE,
  computeTouchControlLayout,
} from '../touch-layout'
import {
  TILE_GRASS_ALT,
  TILE_WALL,
  generateMap,
  type TileGrid,
} from '../world/map'
import {
  nextWaystoneZoneId,
  zoneAtTile,
  zoneAtWorld,
  zoneLoreById,
  zoneRegions,
  waystoneArrivalWorld,
} from '../world/zones'

/**
 * Returns the physical safe area below the viewport (system nav bar, gesture strip).
 * Requires `viewport-fit=cover` in the HTML meta viewport tag.
 * Returns 0 in non-browser or unsupported environments.
 */
function getBottomSafeArea(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  try {
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;bottom:0;left:0;width:0;height:0;' +
      'padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;'
    document.body.appendChild(el)
    const val = parseFloat(getComputedStyle(el).paddingBottom) || 0
    document.body.removeChild(el)
    return val
  } catch {
    return 0
  }
}

/** Data passed from the title screen into this scene. */
export interface WorldStartData {
  continueGame: boolean
  name?: string
}

interface Npc {
  sprite: Phaser.Physics.Arcade.Image
  name: string
  lines: string[]
  questId?: string | null
}

interface LoreStone {
  sprite: Phaser.Physics.Arcade.Image
  text: string
}

interface Slime {
  sprite: Phaser.Physics.Arcade.Sprite
  minX: number
  maxX: number
  speed: number
  dir: -1 | 1
  hp: number
  aggro: boolean
}

interface TileArt {
  texture: string
  frame?: string
}

interface PropArtStyle {
  texture: string
  frameFor(index: number): string
  scale: number
  originY: number
}

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
}

interface TouchState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

type TouchAction = keyof TouchState | 'interact' | 'attack'

interface TouchButton {
  action: TouchAction
  bg: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

const SAVE_INTERVAL_MS = 1500
const ACTION_LABEL = 'Use'
// Quest-specific waystone targets removed: each quest now uses a distinct
// mid-stage mechanic instead of all sharing the same "reach waystone" pattern.
// Quest 1: talk to Tova Frost | Quest 2: pick up journal item | Quest 3: reach plaza
const QUEST_TRAVEL_TARGETS: Record<string, string> = {}
const JOURNAL_QUEST_ID = 'whispering_thicket_quest_0'
const PLAZA_QUEST_ID = 'ember_ruins_quest_0'
const DELIVERY_QUEST_ID = 'greenfields_quest_0'
const JOURNAL_COL = 52
const JOURNAL_ROW = 36
const PLAZA_COL = 54
const PLAZA_ROW = 44

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup
  private slimeGroup!: Phaser.Physics.Arcade.Group
  private npcs: Npc[] = []
  private loreStones: LoreStone[] = []
  private slimes: Slime[] = []
  private acceptedQuests: Set<string> = new Set()
  private questOfferMode = false
  private questStageMap: Map<string, number> = new Map()
  private completedQuests: Set<string> = new Set()
  private allSealsDone = false
  private journalPickupSprite: Phaser.GameObjects.Rectangle | null = null
  private journalCollected = false
  private plazaDiscovered = false
  private plazaMarkerGfx: Phaser.GameObjects.Graphics | null = null

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: MovementKeys
  private interactKey!: Phaser.Input.Keyboard.Key
  private attackKey!: Phaser.Input.Keyboard.Key

  private playerName = DEFAULT_NAME
  private hp = PLAYER_MAX_HP
  private facing: Direction = 'down'
  private spawnAt: { x: number; y: number } = { x: SPAWN_X, y: SPAWN_Y }

  private dialogueOpen = false
  private activeNpc: Npc | null = null
  private dialogueLine = 0
  private dialogueNoticeMode = false
  private waystoneTravelMode = false
  private dialogueObjects: Phaser.GameObjects.GameObject[] = []
  private dialogueBody: Phaser.GameObjects.Text | null = null

  private hudName!: Phaser.GameObjects.Text
  private hudZone!: Phaser.GameObjects.Text
  private hudHp!: Phaser.GameObjects.Graphics
  private hudQuest!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text

  private saveTimer?: Phaser.Time.TimerEvent
  private startData: WorldStartData = { continueGame: false }
  private nextSlimeDamageAt = 0
  private nextAttackAt = 0
  private touchLayout = false
  private touchState: TouchState = { up: false, down: false, left: false, right: false }
  private touchButtons: TouchButton[] = []
  private touchInteractQueued = false
  private touchAttackQueued = false

  constructor() {
    super(SCENE_KEYS.world)
  }

  init(data: WorldStartData): void {
    this.startData = data ?? { continueGame: false }
    // Reset per-restart state (scenes are reused across start() calls).
    this.npcs = []
    this.loreStones = []
    this.slimes = []
    this.acceptedQuests = new Set()
    this.questOfferMode = false
    this.questStageMap = new Map()
    this.completedQuests = new Set()
    this.dialogueOpen = false
    this.activeNpc = null
    this.dialogueLine = 0
    this.dialogueNoticeMode = false
    this.waystoneTravelMode = false
    this.dialogueObjects = []
    this.dialogueBody = null
    this.facing = 'down'
    this.hp = PLAYER_MAX_HP
    this.nextSlimeDamageAt = 0
    this.touchState = { up: false, down: false, left: false, right: false }
    this.touchInteractQueued = false
    this.journalPickupSprite = null
    this.journalCollected = false
    this.plazaDiscovered = false
    this.plazaMarkerGfx = null
  }

  create(): void {
    const map = generateMap()
    this.buildTiles(map)
    this.resolveStartState()
    this.createPlayer()
    this.createNpcs()
    // If all seals were already done on a loaded save, apply Knight revelation silently.
    if (this.allSealsDone) {
      const knight = this.npcs.find(n => n.name === 'Wandering Knight')
      if (knight) knight.lines = [...KNIGHT_REVELATION_LINES]
    }
    this.createLoreStones()
    this.createPickups()
    this.createScenery()
    this.createSlimes()
    this.setupCamera()
    this.setupInput()
    this.createHud()
    this.layoutResponsiveUi()
    this.updateHud()

    this.saveTimer = this.time.addEvent({
      delay: SAVE_INTERVAL_MS,
      loop: true,
      callback: this.persist,
      callbackScope: this,
    })

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutResponsiveUi, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this)
  }

  // --- world construction -------------------------------------------------

  private buildTiles(map: TileGrid): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    this.walls = this.physics.add.staticGroup()

    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        const tile = map[row][col]
        const zone = zoneAtTile(col, row)
        const x = col * TILE + TILE / 2
        const y = row * TILE + TILE / 2

        if (tile === TILE_WALL) {
          const wall = this.walls.create(x, y, TEX.wall).setDepth(DEPTH.walls)
          const tint = this.wallTintFor(zone.theme)
          if (tint !== null) wall.setTint(tint)
        } else {
          const art = this.floorArtFor(zone.theme, tile === TILE_GRASS_ALT, col, row)
          this.add
            .image(x, y, art.texture, art.frame)
            .setDepth(DEPTH.tiles)
        }
      }
    }
  }

  private floorArtFor(
    theme: string,
    alt: boolean,
    col: number,
    row: number,
  ): TileArt {
    const variant = (col + row + (alt ? 1 : 0)) % TILE_VARIANT_COUNT
    if (theme === 'forest' && this.textures.exists(TEX.forestAtlas)) {
      return { texture: TEX.forestAtlas, frame: forestTileFrame(variant) }
    }
    if (theme === 'ruins' && this.textures.exists(TEX.flagstoneAtlas)) {
      return { texture: TEX.flagstoneAtlas, frame: flagstoneTileFrame(variant) }
    }
    if (this.textures.exists(TEX.meadowAtlas)) {
      return { texture: TEX.meadowAtlas, frame: meadowTileFrame(variant) }
    }
    return { texture: this.fallbackFloorTextureFor(theme, alt) }
  }

  private fallbackFloorTextureFor(theme: string, alt: boolean): string {
    if (theme === 'forest') return alt ? TEX.forestAlt : TEX.forest
    if (theme === 'ruins') return alt ? TEX.ruinsAlt : TEX.ruins
    return alt ? TEX.grassAlt : TEX.grass
  }

  private wallTintFor(theme: string): number | null {
    if (theme === 'forest') return 0x90b77d
    if (theme === 'ruins') return 0xc7b090
    return null
  }

  private loreStoneTintFor(theme: string): number {
    if (theme === 'forest') return 0x88d59a
    if (theme === 'ruins') return 0xe0b36d
    return 0xb0c0ff
  }

  private resolveStartState(): void {
    if (this.startData.continueGame) {
      const save = loadGame()
      if (save) {
        this.playerName = save.name
        this.hp = save.hp
        this.spawnAt = { x: save.x, y: save.y }
        if (save.questStages) {
          for (const [id, stage] of Object.entries(save.questStages)) {
            this.acceptedQuests.add(id)
            this.questStageMap.set(id, stage)
          }
        }
        if (save.completedQuests) {
          for (const id of save.completedQuests) {
            this.completedQuests.add(id)
          }
        }
        // Restore narrative-arc flag silently on load (no notice, no Knight lookup yet).
        if (ALL_QUEST_IDS.every(id => this.completedQuests.has(id))) {
          this.allSealsDone = true
        }
        return
      }
    }
    this.playerName = this.startData.name?.trim() || DEFAULT_NAME
    this.hp = PLAYER_MAX_HP
    this.spawnAt = { x: SPAWN_X, y: SPAWN_Y }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      this.spawnAt.x,
      this.spawnAt.y,
      playerFrameKey('down', 0),
    )
    this.player.setDepth(DEPTH.player)
    this.player.setCollideWorldBounds(true)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(18, 18)
    body.setOffset(3, 12)

    this.physics.add.collider(this.player, this.walls)
  }

  private createNpcs(): void {
    this.npcGroup = this.physics.add.staticGroup()

    const definitions: Array<{
      col: number
      row: number
      tex: string
      frame?: string
      name: string
      lines: string[]
      questId?: string | null
    }> = [
      {
        col: 6,
        row: 9,
        tex: TEX.npcMarin,
        name: 'Old Marin',
        lines: [
          'Welcome to Greenfields, traveler.',
          'West of here is home. Walk east to Whispering Thicket or south to Ember Ruins if you want the world to open up.',
        ],
      },
      {
        col: 13,
        row: 10,
        tex: TEX.npcGuard,
        name: 'Gate Guard',
        lines: [
          'The road is already open: east and then north drops you into Whispering Thicket. Keep south for Ember Ruins.',
          'Waystones mark each region. Reach one and you have actually been there.',
        ],
      },
    ]

    definitions.push({
      col: 11,
      row: 8,
      tex: this.textures.exists(TEX.heroAtlas)
        ? TEX.heroAtlas
        : playerFrameKey('down', 0),
      frame: this.textures.exists(TEX.heroAtlas) ? heroFrameKey(0) : undefined,
      name: 'Wandering Knight',
      lines: [
        'The slimes have teeth. Good. A world without danger is just a painting.',
        'Keep moving. Ember Ruins lies east — you will know it by the cracked stone and old fire.',
      ],
    })

    const texCycle = [TEX.npcMarin, TEX.npcGuard]
    for (const region of zoneRegions()) {
      const loreNpcs = loraNpcsByZone(region.zoneId)
      loreNpcs.forEach((lnpc, index) => {
        const spot = region.npcSpots[index]
        if (!spot) return
        const questDone = lnpc.questId ? this.completedQuests.has(lnpc.questId) : false
        const lines = (questDone && lnpc.completedLines) ? lnpc.completedLines : lnpc.lines
        definitions.push({
          col: spot.col,
          row: spot.row,
          tex: texCycle[index % texCycle.length],
          name: `${lnpc.name}`,
          lines,
          questId: lnpc.questId,
        })
      })
    }

    for (const def of definitions) {
      const x = def.col * TILE + TILE / 2
      const y = def.row * TILE + TILE / 2
      const sprite = this.physics.add.staticImage(x, y, def.tex, def.frame)
      sprite.setDepth(DEPTH.npc)
      this.npcGroup.add(sprite)
      this.npcs.push({ sprite, name: def.name, lines: def.lines, questId: def.questId })
    }

    this.physics.add.collider(this.player, this.npcGroup)
  }

  private createLoreStones(): void {
    for (const region of zoneRegions()) {
      const loreZone = zoneLoreById(region.zoneId)
      const x = region.loreStone.col * TILE + TILE / 2
      const y = region.loreStone.row * TILE + TILE / 2
      const sprite = this.physics.add.staticImage(x, y, TEX.wall)
      sprite
        .setTint(this.loreStoneTintFor(loreZone.theme))
        .setDepth(DEPTH.npc)
        .setScale(0.85)
      this.npcGroup.add(sprite)
      this.loreStones.push({
        sprite,
        text: `${loreZone.flavor}`,
      })
      this.npcs.push({
        sprite,
        name: `${loreZone.name} Waystone`,
        lines: [
          loreZone.flavor,
          `${WORLD_NAME} is no longer one square on the board.`,
          WORLD_TAGLINE,
        ],
      })
    }
  }

  private createPickups(): void {
    // Journal item for quest 2 — placed in Ember Ruins near the old thorn path.
    // Only create the sprite if it hasn't been collected yet (save restore).
    const journalStage = this.questStageMap.get(JOURNAL_QUEST_ID) ?? 0
    if (!this.completedQuests.has(JOURNAL_QUEST_ID) && journalStage <= 1) {
      const jx = JOURNAL_COL * TILE + TILE / 2
      const jy = JOURNAL_ROW * TILE + TILE / 2
      this.journalPickupSprite = this.add
        .rectangle(jx, jy, 14, 18, 0xd4a96a)
        .setDepth(DEPTH.npc - 1)
    } else {
      this.journalCollected = true
    }

    // Shattered plaza visual marker for quest 3 — glowing rune circle in Ember Ruins center.
    const plazaStage = this.questStageMap.get(PLAZA_QUEST_ID) ?? 0
    if (!this.completedQuests.has(PLAZA_QUEST_ID) && plazaStage <= 1) {
      const px = PLAZA_COL * TILE + TILE / 2
      const py = PLAZA_ROW * TILE + TILE / 2
      this.plazaMarkerGfx = this.add.graphics().setDepth(DEPTH.tiles + 1)
      this.plazaMarkerGfx.lineStyle(2, 0xe07030, 0.5).strokeCircle(px, py, TILE * 2.5)
      this.plazaMarkerGfx.fillStyle(0xe07030, 0.07).fillCircle(px, py, TILE * 2.5)
    } else {
      this.plazaDiscovered = true
    }
  }

  private createScenery(): void {
    for (const region of zoneRegions()) {
      const art = this.propArtFor(region.theme)
      if (!art) continue
      region.propSpots.forEach((spot, index) => {
        const x = spot.col * TILE + TILE / 2
        const y = spot.row * TILE + TILE / 2
        this.add
          .image(x, y, art.texture, art.frameFor(index))
          .setDepth(DEPTH.scenery)
          .setOrigin(0.5, art.originY)
          .setScale(art.scale)
      })
    }
  }

  private propArtFor(theme: string): PropArtStyle | null {
    if (theme === 'forest' && this.textures.exists(TEX.thornTreeAtlas)) {
      return {
        texture: TEX.thornTreeAtlas,
        frameFor: (index) => thornTreeFrame(index % PROP_VARIANT_COUNT),
        scale: 1.2,
        originY: 0.86,
      }
    }
    if (theme === 'ruins' && this.textures.exists(TEX.ruinPillarAtlas)) {
      return {
        texture: TEX.ruinPillarAtlas,
        frameFor: (index) => ruinPillarFrame(index % PROP_VARIANT_COUNT),
        scale: 1.08,
        originY: 0.84,
      }
    }
    if (theme === 'town' && this.textures.exists(TEX.bannerAtlas)) {
      return {
        texture: TEX.bannerAtlas,
        frameFor: (index) => castleBannerFrame(index % PROP_VARIANT_COUNT),
        scale: 1.05,
        originY: 0.82,
      }
    }
    return null
  }

  private createSlimes(): void {
    this.slimeGroup = this.physics.add.group({
      allowGravity: false,
      immovable: false,
    })

    const useAtlas = this.textures.exists(TEX.slimeAtlas)
    const texture = useAtlas ? TEX.slimeAtlas : TEX.slimeFallback

    for (const patrol of SLIME_PATROLS) {
      const x = patrol.col * TILE + TILE / 2
      const y = patrol.row * TILE + TILE / 2
      const sprite = this.physics.add.sprite(
        x,
        y,
        texture,
        useAtlas ? slimeFrameKey(0) : undefined,
      )
      sprite.setDepth(DEPTH.enemy)
      sprite.setCollideWorldBounds(true)

      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.setSize(14, 12)
      body.setOffset(5, 10)

      if (useAtlas) {
        sprite.anims.play(SLIME_ANIM_KEY)
      }

      this.slimeGroup.add(sprite)
      this.slimes.push({
        sprite,
        minX: (patrol.col - patrol.patrolTiles) * TILE + TILE / 2,
        maxX: (patrol.col + patrol.patrolTiles) * TILE + TILE / 2,
        speed: patrol.speed,
        dir: patrol.startLeft ? -1 : 1,
        hp: SLIME_MAX_HP,
        aggro: false,
      })
    }

    this.physics.add.collider(this.slimeGroup, this.walls)
    this.physics.add.collider(
      this.player,
      this.slimeGroup,
      this.onSlimeTouch,
      undefined,
      this,
    )
  }

  private setupCamera(): void {
    const cam = this.cameras.main
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    cam.startFollow(this.player, true, 0.12, 0.12)
    cam.setRoundPixels(true)
    // Touch (mobile) viewports are too small for 2× — sprites are legible at 1×.
    // Desktop gets 2× so 32px tiles read clearly on large screens.
    cam.setZoom(this.shouldUseTouchLayout() ? 1 : 2)
  }

  /** Effective HUD coordinate width after accounting for camera zoom. */
  private get hudW(): number {
    return this.scale.width / this.cameras.main.zoom
  }

  /** Effective HUD coordinate height after accounting for camera zoom. */
  private get hudH(): number {
    return this.scale.height / this.cameras.main.zoom
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is required but unavailable.')
    }
    this.cursors = keyboard.createCursorKeys()
    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.touchLayout = this.shouldUseTouchLayout()
    if (this.touchLayout) {
      this.input.addPointer(4)
      this.ensureTouchControls()
    }
  }

  private shouldUseTouchLayout(): boolean {
    if (typeof window === 'undefined') return false
    const coarsePointer =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : 'ontouchstart' in window
    return coarsePointer || this.scale.width < 720 || this.scale.height < 520
  }

  private layoutResponsiveUi(): void {
    this.touchLayout = this.shouldUseTouchLayout()
    this.ensureTouchControls()
    this.layoutHud()
    this.layoutTouchControls()
  }

  private layoutHud(): void {
    const width = this.hudW
    const compact = this.touchLayout

    this.hudName
      .setPosition(16, 14)
      .setFontSize(compact ? '16px' : '18px')
    this.hudZone
      .setPosition(width - 16, 14)
      .setFontSize(compact ? '16px' : '18px')
    this.hudQuest
      .setPosition(16, compact ? 66 : 70)
      .setFontSize(compact ? '13px' : '12px')
      .setWordWrapWidth(Math.max(220, Math.min(width - 32, compact ? width - 32 : 320)), true)
    this.hintText
      .setFontSize(compact ? '12px' : '13px')
      .setText(this.interactPromptText())
  }

  private ensureTouchControls(): void {
    if (this.touchLayout && this.touchButtons.length === 0) {
      this.createTouchControls()
      return
    }
    if (!this.touchLayout && this.touchButtons.length > 0) {
      this.destroyTouchControls()
    }
  }

  private createTouchControls(): void {
    this.touchButtons = [
      this.createTouchButton('up', '▲'),
      this.createTouchButton('left', '◀'),
      this.createTouchButton('down', '▼'),
      this.createTouchButton('right', '▶'),
      this.createTouchButton('interact', ACTION_LABEL),
      this.createTouchButton('attack', '⚔'),
    ]
    this.layoutTouchControls()
  }

  private createTouchButton(action: TouchAction, label: string): TouchButton {
    const bg = this.add
      .rectangle(0, 0, 56, 56, 0x131b2f, 0.78)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 10)
      .setStrokeStyle(2, 0x6a7899, 0.9)
      .setInteractive({ useHandCursor: true })
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f0d890',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 11)

    const setPressed = (pressed: boolean): void => {
      if (action === 'interact' || action === 'attack') {
        bg.setFillStyle(pressed ? 0x31426c : 0x131b2f, pressed ? 0.95 : 0.78)
        return
      }
      this.touchState[action] = pressed
      bg.setFillStyle(pressed ? 0x31426c : 0x131b2f, pressed ? 0.95 : 0.78)
    }

    bg.on('pointerdown', () => {
      if (action === 'interact') {
        this.touchInteractQueued = true
        setPressed(true)
        this.time.delayedCall(120, () => setPressed(false))
        return
      }
      if (action === 'attack') {
        this.touchAttackQueued = true
        setPressed(true)
        this.time.delayedCall(120, () => setPressed(false))
        return
      }
      setPressed(true)
    })
    bg.on('pointerup', () => setPressed(false))
    bg.on('pointerout', () => setPressed(false))
    bg.on('pointerupoutside', () => setPressed(false))

    return { action, bg, label: text }
  }

  private layoutTouchControls(): void {
    if (!this.touchLayout || this.touchButtons.length === 0) return

    const { buttonSize, positions } = computeTouchControlLayout(
      this.hudW,
      this.hudH,
      getBottomSafeArea(),
    )

    for (const button of this.touchButtons) {
      const pos = positions[button.action]
      button.bg
        .setPosition(pos.x, pos.y)
        .setSize(
          button.action === 'interact'
            ? buttonSize * TOUCH_INTERACT_WIDTH_SCALE
            : buttonSize,
          buttonSize,
        )
      button.label
        .setPosition(pos.x, pos.y)
        .setFontSize(button.action === 'interact' ? '16px' : '22px')
    }
  }

  private destroyTouchControls(): void {
    for (const button of this.touchButtons) {
      button.bg.destroy()
      button.label.destroy()
    }
    this.touchButtons = []
    this.touchState = { up: false, down: false, left: false, right: false }
    this.touchInteractQueued = false
    this.touchAttackQueued = false
  }

  private touchControlsInset(): number {
    if (!this.touchLayout) return 0
    return computeTouchControlLayout(
      this.hudW,
      this.hudH,
      getBottomSafeArea(),
    ).reservedHeight
  }

  private consumeTouchInteract(): boolean {
    if (!this.touchInteractQueued) return false
    this.touchInteractQueued = false
    return true
  }

  private consumeTouchAttack(): boolean {
    if (!this.touchAttackQueued) return false
    this.touchAttackQueued = false
    return true
  }

  private interactPromptText(nearby: Npc | null = null): string {
    if (nearby) {
      if (this.zoneIdForWaystoneNpc(nearby)) {
        return this.touchLayout ? `Tap ${ACTION_LABEL} to attune` : 'Press E to attune'
      }
      return this.touchLayout ? `Tap ${ACTION_LABEL} to talk` : 'Press E to talk'
    }
    return this.touchLayout ? `Tap ${ACTION_LABEL} • ⚔ to attack` : 'E to interact • Space to attack'
  }

  // --- main loop ----------------------------------------------------------

  update(): void {
    if (!this.player || !this.player.body) return

    const interact =
      Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      this.consumeTouchInteract()
    const attack =
      Phaser.Input.Keyboard.JustDown(this.attackKey) ||
      this.consumeTouchAttack()

    if (this.dialogueOpen) {
      this.player.setVelocity(0, 0)
      this.player.anims.stop()
      this.updateSlimes()
      if (interact) this.advanceDialogue()
      return
    }

    this.handleMovement()
    if (attack) this.tryAttack()
    this.updateSlimes()
    if (this.handlePlayerDefeat()) {
      this.updateHud()
      return
    }
    this.checkJournalPickup()
    this.checkPlazaDiscovery()

    const nearby = this.nearestNpcInRange()
    if (interact && nearby) {
      this.openDialogue(nearby)
    } else {
      this.updateHint(nearby)
    }

    this.updateHud()
  }

  private handleMovement(): void {
    let vx = 0
    let vy = 0

    if (this.wasd.left.isDown || this.cursors.left.isDown || this.touchState.left) {
      vx -= 1
    }
    if (this.wasd.right.isDown || this.cursors.right.isDown || this.touchState.right) {
      vx += 1
    }
    if (this.wasd.up.isDown || this.cursors.up.isDown || this.touchState.up) {
      vy -= 1
    }
    if (this.wasd.down.isDown || this.cursors.down.isDown || this.touchState.down) {
      vy += 1
    }

    const move = new Phaser.Math.Vector2(vx, vy)
    if (move.lengthSq() > 0) move.normalize().scale(PLAYER_SPEED)
    this.player.setVelocity(move.x, move.y)

    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.facing = vx < 0 ? 'left' : 'right'
      } else {
        this.facing = vy < 0 ? 'up' : 'down'
      }
      this.player.anims.play(walkAnimKey(this.facing), true)
    } else {
      this.player.anims.stop()
      this.player.setTexture(playerFrameKey(this.facing, 0))
    }
  }

  private updateSlimes(): void {
    const alive: Slime[] = []
    const px = this.player.x
    const py = this.player.y
    for (const slime of this.slimes) {
      if (slime.hp <= 0) {
        // Death flash then destroy
        this.playSfx('kill')
        this.tweens.add({
          targets: slime.sprite,
          alpha: 0,
          duration: 180,
          onComplete: () => slime.sprite.destroy(),
        })
        continue
      }
      alive.push(slime)

      const chase = slimeChaseIntent(
        slime.sprite.x,
        slime.sprite.y,
        px,
        py,
        SLIME_AGGRO_RADIUS,
        SLIME_CHASE_SPEED,
      )
      if (chase) {
        // Aggro: notice the player and give chase.
        if (!slime.aggro) {
          slime.aggro = true
          this.playSfx('aggro')
          // Brief lunge pulse so the player sees it "wake up".
          this.tweens.add({
            targets: slime.sprite,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 90,
            yoyo: true,
          })
        }
        slime.sprite.setVelocity(chase.vx, chase.vy)
      } else {
        // Calm: resume the horizontal patrol track (self-corrects if the
        // chase carried the slime past its patrol bounds).
        slime.aggro = false
        slime.sprite.setVelocityY(0)
        if (slime.sprite.x <= slime.minX) slime.dir = 1
        else if (slime.sprite.x >= slime.maxX) slime.dir = -1
        slime.sprite.setVelocityX(slime.speed * slime.dir)
      }
    }
    this.slimes = alive
  }

  private onSlimeTouch(): void {
    if (this.time.now < this.nextSlimeDamageAt) return
    this.nextSlimeDamageAt = this.time.now + SLIME_DAMAGE_COOLDOWN_MS
    this.hp = Math.max(0, this.hp - SLIME_DAMAGE)
    this.cameras.main.shake(120, 0.0025)
  }

  private handlePlayerDefeat(): boolean {
    if (this.hp > 0) return false
    this.hp = PLAYER_MAX_HP
    this.player.setVelocity(0, 0)
    this.player.setPosition(this.spawnAt.x, this.spawnAt.y)
    this.facing = 'down'
    this.player.setTexture(playerFrameKey('down', 0))
    this.nextSlimeDamageAt = this.time.now + 900
    this.openSystemNotice(
      'You collapse.',
      `A slime drops you flat. You wake back up in ${this.currentZone().name} with full health.`,
    )
    return true
  }

  private tryAttack(): void {
    if (this.time.now < this.nextAttackAt) return
    this.nextAttackAt = this.time.now + ATTACK_COOLDOWN_MS

    // Visual slash: small white rectangle that flashes briefly in facing direction
    const offsets: Record<Direction, { dx: number; dy: number }> = {
      down: { dx: 0, dy: 20 },
      up: { dx: 0, dy: -20 },
      left: { dx: -20, dy: 0 },
      right: { dx: 20, dy: 0 },
    }
    const off = offsets[this.facing]
    const slash = this.add
      .rectangle(
        this.player.x + off.dx,
        this.player.y + off.dy,
        28,
        28,
        0xffffff,
        0.75,
      )
      .setDepth(DEPTH.player + 1)
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 160,
      onComplete: () => slash.destroy(),
    })

    // Damage any slime within ATTACK_RANGE
    let hit = false
    for (const slime of this.slimes) {
      if (slime.hp <= 0) continue
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        slime.sprite.x,
        slime.sprite.y,
      )
      if (dist <= ATTACK_RANGE) {
        slime.hp -= PLAYER_ATTACK_DAMAGE
        slime.sprite.setTint(0xff4444)
        this.time.delayedCall(120, () => {
          if (slime.sprite.active) slime.sprite.clearTint()
        })
        hit = true
      }
    }

    if (hit) {
      this.playSfx('hit')
    } else {
      // Tiny camera wobble for swing feedback even on a miss
      this.cameras.main.shake(60, 0.001)
    }
  }

  // --- NPC interaction ----------------------------------------------------

  private nearestNpcInRange(): Npc | null {
    let best: Npc | null = null
    let bestDist = INTERACT_DISTANCE
    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y,
      )
      if (dist <= bestDist) {
        best = npc
        bestDist = dist
      }
    }
    return best
  }

  private updateHint(nearby: Npc | null): void {
    if (nearby) {
      this.hintText
        .setText(this.interactPromptText(nearby))
        .setPosition(nearby.sprite.x, nearby.sprite.y - 30)
        .setVisible(true)
    } else {
      this.hintText.setVisible(false)
    }
  }

  private createDialogueShell(title: string, advanceHintText?: string): void {
    const compact = this.touchLayout
    const zoom = this.cameras.main.zoom

    // Design dialog in screen-pixel space so it looks the same at any camera zoom.
    // All values here are screen pixels; divide by zoom to get world units.
    const screenMaxW = Math.min(this.scale.width - 24, 720)
    const screenH = compact ? 144 : 120
    const boxW = screenMaxW / zoom
    const boxH = screenH / zoom
    const boxX = Math.round((this.hudW - boxW) / 2)
    const boxY = this.hudH - this.touchControlsInset() - boxH - 18 / zoom
    const m = Math.round(18 / zoom)   // margin
    const r = Math.round(10 / zoom)   // corner radius

    const panel = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.dialogue)
    panel.fillStyle(0x0b0d12, 0.92).fillRoundedRect(boxX, boxY, boxW, boxH, r)
    panel.lineStyle(2 / zoom, 0xf0d890, 1).strokeRoundedRect(boxX, boxY, boxW, boxH, r)

    const nameText = this.add
      .text(boxX + m, boxY + Math.round(12 / zoom), title, {
        fontFamily: 'monospace',
        fontSize: `${Math.round((compact ? 16 : 18) / zoom)}px`,
        color: '#f0d890',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.dialogue)

    this.dialogueBody = this.add
      .text(boxX + m, boxY + Math.round(46 / zoom), '', {
        fontFamily: 'monospace',
        fontSize: `${Math.round((compact ? 15 : 16) / zoom)}px`,
        color: '#ffffff',
        wordWrap: { width: boxW - m * 2 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.dialogue)

    const advanceHint = this.add
      .text(
        boxX + boxW - Math.round(16 / zoom),
        boxY + boxH - Math.round(24 / zoom),
        advanceHintText ??
          (this.touchLayout ? `Tap ${ACTION_LABEL} again ▸` : 'Press E again ▸'),
        {
          fontFamily: 'monospace',
          fontSize: `${Math.round((compact ? 13 : 14) / zoom)}px`,
          color: '#9aa6c0',
        },
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.dialogue)

    this.dialogueObjects = [panel, nameText, this.dialogueBody, advanceHint]
  }

  private openDialogue(npc: Npc): void {
    this.dialogueOpen = true
    this.activeNpc = npc
    this.dialogueLine = 0
    this.player.setVelocity(0, 0)
    this.hintText.setVisible(false)
    this.createDialogueShell(npc.name)
    this.showDialogueLine()
  }

  private openSystemNotice(title: string, body: string): void {
    this.dialogueOpen = true
    this.activeNpc = null
    this.dialogueLine = 0
    this.dialogueNoticeMode = true
    this.waystoneTravelMode = false
    this.player.setVelocity(0, 0)
    this.hintText.setVisible(false)
    this.createDialogueShell(title, this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.')
    this.dialogueBody?.setText(body)
  }

  private showDialogueLine(): void {
    if (!this.activeNpc || !this.dialogueBody) return
    this.dialogueBody.setText(this.activeNpc.lines[this.dialogueLine] ?? '')
  }

  private advanceDialogue(): void {
    if (this.dialogueNoticeMode) {
      this.closeDialogue()
      return
    }

    if (!this.activeNpc) return

    if (this.waystoneTravelMode) {
      this.travelViaWaystone(this.activeNpc)
      return
    }

    // Quest offer mode: pressing E accepts the quest OR advances an active stage.
    if (this.questOfferMode) {
      const npc = this.activeNpc
      if (npc.questId && !this.acceptedQuests.has(npc.questId)) {
        // Initial acceptance — stage 0 ("speak with NPC") just completed.
        this.acceptedQuests.add(npc.questId)
        this.questStageMap.set(npc.questId, 1)
      } else if (npc.questId && this.acceptedQuests.has(npc.questId) && !this.completedQuests.has(npc.questId)) {
        // Advance to the next stage.
        const quest = LORE_QUESTS.find(q => q.id === npc.questId)
        if (quest) {
          const nextStage = (this.questStageMap.get(npc.questId) ?? 1) + 1
          if (nextStage >= quest.stages.length) {
            this.completedQuests.add(npc.questId)
            this.acceptedQuests.delete(npc.questId)
            this.questStageMap.delete(npc.questId)
            // Swap in post-completion dialogue so the world remembers immediately.
            const loraNpc = LORE_NPCS.find(n => n.questId === npc.questId)
            if (loraNpc?.completedLines) {
              npc.lines = loraNpc.completedLines
            }
            // Check if all three seals are now aligned.
            if (!this.allSealsDone && ALL_QUEST_IDS.every(id => this.completedQuests.has(id))) {
              this.triggerAllSealsDone()
            }
          } else {
            this.questStageMap.set(npc.questId, nextStage)
          }
        }
      }
      this.questOfferMode = false
      this.closeDialogue()
      return
    }

    this.dialogueLine += 1
    if (this.dialogueLine >= this.activeNpc.lines.length) {
      // Check if this NPC offers a new quest after dialogue ends.
      const npc = this.activeNpc
      if (this.advanceQuestFromNpcDelivery(npc)) {
        return
      }
      if (this.advanceQuestFromWaystone(npc)) {
        return
      }
      const travelDestination = this.travelDestinationForWaystone(npc)
      if (travelDestination && this.dialogueBody) {
        this.waystoneTravelMode = true
        this.dialogueBody.setText(
          `Waystone route aligned.\n\nTravel to ${travelDestination.name}.\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to travel.` : 'Press E to travel.'}`,
        )
        return
      }
      if (
        npc.questId &&
        !this.acceptedQuests.has(npc.questId) &&
        !this.completedQuests.has(npc.questId)
      ) {
        const quest = LORE_QUESTS.find(q => q.id === npc.questId)
        if (quest && this.dialogueBody) {
          this.questOfferMode = true
          this.dialogueBody.setText(
            `Quest available: "${quest.title}"\n\n${quest.description}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to accept.` : 'Press E to accept.'}`,
          )
          return
        }
      }
      // Quest-giver NPC: show current stage and allow advancement.
      if (npc.questId && this.acceptedQuests.has(npc.questId) && !this.completedQuests.has(npc.questId)) {
        const quest = LORE_QUESTS.find(q => q.id === npc.questId)
        if (quest && this.dialogueBody) {
          const stageIdx = this.questStageMap.get(npc.questId) ?? 1
          const stage = quest.stages[stageIdx]
          if (stage && stageIdx >= quest.stages.length - 1) {
            this.questOfferMode = true
            const prompt = this.touchLayout
              ? `Tap ${ACTION_LABEL} to complete quest.`
              : 'Press E to complete quest.'
            this.dialogueBody.setText(`[${quest.title}]\n\n${stage.description}\n\n${prompt}`)
            return
          }
          if (stage && this.dialogueBody) {
            this.dialogueNoticeMode = true
            this.dialogueBody.setText(
              `[${quest.title}]\n\n${stage.description}\n\n${stage.objective}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`,
            )
            return
          }
        }
      }
      this.closeDialogue()
    } else {
      this.showDialogueLine()
    }
  }

  private closeDialogue(): void {
    for (const obj of this.dialogueObjects) obj.destroy()
    this.dialogueObjects = []
    this.dialogueBody = null
    this.activeNpc = null
    this.dialogueOpen = false
    this.dialogueNoticeMode = false
    this.questOfferMode = false
    this.waystoneTravelMode = false
  }

  // --- HUD ----------------------------------------------------------------

  private createHud(): void {
    this.hudName = this.add
      .text(16, 14, this.playerName, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)

    this.hudZone = this.add
      .text(0, 14, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f0d890',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)

    this.hudHp = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud)

    this.hudQuest = this.add
      .text(16, 70, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f0d890',
        wordWrap: { width: 320, useAdvancedWrap: true },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)

    this.hintText = this.add
      .text(0, 0, this.interactPromptText(), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.hint)
      .setVisible(false)
  }

  private updateHud(): void {
    this.hudName.setText(this.playerName)
    this.hudZone.setText(this.currentZone().name)

    const x = 16
    const y = 42
    const w = Math.max(132, Math.min(180, Math.round(this.hudW * (this.touchLayout ? 0.28 : 0.22))))
    const h = 16
    const ratio = Phaser.Math.Clamp(this.hp / PLAYER_MAX_HP, 0, 1)

    let fill = 0x4caf50
    if (ratio <= 0.25) fill = 0xd23b3b
    else if (ratio <= 0.5) fill = 0xe0a030

    this.hudHp.clear()
    this.hudHp.fillStyle(0x000000, 0.5).fillRect(x - 2, y - 2, w + 4, h + 4)
    this.hudHp.fillStyle(0x2a2f3b, 1).fillRect(x, y, w, h)
    this.hudHp.fillStyle(fill, 1).fillRect(x, y, w * ratio, h)
    this.hudHp.lineStyle(1, 0x101319, 1).strokeRect(x, y, w, h)

    this.hudQuest.setText(this.activeQuestTrackerText())
  }

  private triggerAllSealsDone(): void {
    this.allSealsDone = true
    // Update the Wandering Knight's dialogue to the revelation.
    const knight = this.npcs.find(n => n.name === 'Wandering Knight')
    if (knight) {
      knight.lines = [...KNIGHT_REVELATION_LINES]
    }
    // Show a brief HUD notice. Position and size in HUD coordinate space (÷ zoom).
    const zoom = this.cameras.main.zoom
    const notice = this.add.text(
      this.hudW / 2,
      this.hudH * 0.35,
      '☆ The Seals Awaken ☆\nSeek the Wandering Knight.',
      { fontSize: `${Math.round(18 / zoom)}px`, color: '#f0d080', backgroundColor: '#000000cc', padding: { x: Math.round(14 / zoom), y: Math.round(8 / zoom) }, align: 'center' },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(200)
    this.time.delayedCall(4000, () => notice.destroy())
    this.updateHud()
  }

  private activeQuestTrackerText(): string {
    const lines: string[] = []

    for (const questId of this.acceptedQuests) {
      const quest = LORE_QUESTS.find(q => q.id === questId)
      if (!quest) continue

      const rawStageIdx = this.questStageMap.get(questId) ?? 1
      const stageIdx = Phaser.Math.Clamp(rawStageIdx, 0, quest.stages.length - 1)
      const stage = quest.stages[stageIdx]
      const stageLabel = `[${stageIdx + 1}/${quest.stages.length}]`

      if (lines.length > 0) lines.push('')
      lines.push(`▶ ${stageLabel} ${quest.title}`)
      if (stage) lines.push(`  ↳ ${stage.objective}`)
    }

    if (lines.length === 0 && this.completedQuests.size > 0) {
      lines.push(`✓ Quests: ${this.completedQuests.size} complete`)
    }

    return lines.join('\n')
  }

  private travelDestinationForWaystone(npc: Npc): { zoneId: string; name: string } | null {
    const zoneId = this.zoneIdForWaystoneNpc(npc)
    if (!zoneId) return null
    const destinationZoneId = nextWaystoneZoneId(zoneId)
    return {
      zoneId: destinationZoneId,
      name: zoneLoreById(destinationZoneId).name,
    }
  }

  private travelViaWaystone(npc: Npc | null): void {
    if (!npc || !this.dialogueBody) {
      this.closeDialogue()
      return
    }

    const destination = this.travelDestinationForWaystone(npc)
    if (!destination) {
      this.closeDialogue()
      return
    }

    const arrival = waystoneArrivalWorld(destination.zoneId)
    this.player.setVelocity(0, 0)
    this.player.setPosition(arrival.x, arrival.y)
    this.spawnAt = { ...arrival }
    this.cameras.main.flash(180, 230, 236, 255)
    this.playSfx('teleport')

    const loreZone = zoneLoreById(destination.zoneId)
    this.dialogueNoticeMode = true
    this.waystoneTravelMode = false
    this.dialogueBody.setText(
      `The ${npc.name} catches and throws you into ${loreZone.name}.\n\n${loreZone.flavor}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`,
    )
    this.updateHud()
  }

  private advanceQuestFromWaystone(npc: Npc): boolean {
    const zoneId = this.zoneIdForWaystoneNpc(npc)
    if (!zoneId || !this.dialogueBody) return false

    for (const questId of this.acceptedQuests) {
      const targetZoneId = QUEST_TRAVEL_TARGETS[questId]
      const stageIdx = this.questStageMap.get(questId) ?? 1
      if (stageIdx !== 1 || targetZoneId !== zoneId) continue

      const quest = LORE_QUESTS.find((candidate) => candidate.id === questId)
      if (!quest) continue

      this.questStageMap.set(questId, 2)
      this.dialogueNoticeMode = true
      this.waystoneTravelMode = false
      this.dialogueBody.setText(
        `[${quest.title}]\n\nRoute confirmed at ${npc.name}.\n\n${quest.stages[2]?.objective ?? 'Return to the quest giver.'}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`,
      )
      return true
    }

    return false
  }

  private zoneIdForWaystoneNpc(npc: Npc): string | null {
    const region = zoneRegions().find((candidate) => `${candidate.name} Waystone` === npc.name)
    return region?.zoneId ?? null
  }

  // Quest 1: talking to Tova Frost directly advances the delivery quest.
  private advanceQuestFromNpcDelivery(npc: Npc): boolean {
    if (npc.name !== 'Tova Frost') return false
    if (!this.acceptedQuests.has(DELIVERY_QUEST_ID)) return false
    if ((this.questStageMap.get(DELIVERY_QUEST_ID) ?? 0) !== 1) return false
    const quest = LORE_QUESTS.find(q => q.id === DELIVERY_QUEST_ID)
    if (!quest || !this.dialogueBody) return false
    this.questStageMap.set(DELIVERY_QUEST_ID, 2)
    this.dialogueNoticeMode = true
    this.dialogueBody.setText(
      `[${quest.title}]\n\nHessa's message delivered. Tova Frost nods — the herbs will reach Greenfields.\n\n${quest.stages[2]?.objective ?? 'Return to Hessa Salt.'}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`
    )
    return true
  }

  // Quest 2: player walks over journal pickup in Ember Ruins.
  private checkJournalPickup(): void {
    if (this.journalCollected || !this.journalPickupSprite || this.dialogueOpen) return
    if (!this.acceptedQuests.has(JOURNAL_QUEST_ID)) return
    if ((this.questStageMap.get(JOURNAL_QUEST_ID) ?? 0) !== 1) return
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.journalPickupSprite.x, this.journalPickupSprite.y
    )
    if (dist > TILE * 1.5) return
    this.journalCollected = true
    this.journalPickupSprite.destroy()
    this.journalPickupSprite = null
    this.questStageMap.set(JOURNAL_QUEST_ID, 2)
    const quest = LORE_QUESTS.find(q => q.id === JOURNAL_QUEST_ID)
    this.openSystemNotice(
      'Journal found',
      `[${quest?.title ?? 'Quest'}]\n\nBrennan's journal — the pages are damp but the notes are legible.\n\n${quest?.stages[2]?.objective ?? 'Return to Brennan Ash.'}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`
    )
    this.updateHud()
  }

  // Quest 3: player reaches the shattered plaza in Ember Ruins center.
  private checkPlazaDiscovery(): void {
    if (this.plazaDiscovered || this.dialogueOpen) return
    if (!this.acceptedQuests.has(PLAZA_QUEST_ID)) return
    if ((this.questStageMap.get(PLAZA_QUEST_ID) ?? 0) !== 1) return
    const plazaX = PLAZA_COL * TILE + TILE / 2
    const plazaY = PLAZA_ROW * TILE + TILE / 2
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, plazaX, plazaY) > TILE * 3) return
    this.plazaDiscovered = true
    if (this.plazaMarkerGfx) {
      this.plazaMarkerGfx.destroy()
      this.plazaMarkerGfx = null
    }
    this.questStageMap.set(PLAZA_QUEST_ID, 2)
    const quest = LORE_QUESTS.find(q => q.id === PLAZA_QUEST_ID)
    this.openSystemNotice(
      'Shattered Plaza',
      `[${quest?.title ?? 'Quest'}]\n\nRunes still glow in the cracked stone. Something woke here — and has not stopped.\n\n${quest?.stages[2]?.objective ?? 'Return to Brennan Vane.'}\n\n${this.touchLayout ? `Tap ${ACTION_LABEL} to close.` : 'Press E to close.'}`
    )
    this.updateHud()
  }

  // --- persistence + lifecycle -------------------------------------------

  private persist(): void {
    if (!this.player) return
    saveGame({
      name: this.playerName,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      hp: this.hp,
      zone: this.currentZone().name,
      questStages: Object.fromEntries(this.questStageMap),
      completedQuests: [...this.completedQuests],
    })
  }

  private currentZone(): { name: string } {
    return zoneAtWorld(this.player.x, this.player.y)
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutResponsiveUi, this)
    if (this.saveTimer) {
      this.saveTimer.remove(false)
      this.saveTimer = undefined
    }
    this.persist()
    this.closeDialogue()
    this.destroyTouchControls()
  }

  // --- Audio synthesis (Web Audio API, no external files) -----------------

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gain = 0.12,
  ): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx: AudioContext | undefined = (this.sound as any).context
      if (!ctx || ctx.state === 'suspended') return
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gainNode.gain.setValueAtTime(gain, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {
      // degrade silently if Web Audio is unavailable or blocked
    }
  }

  private playSfx(event: 'hit' | 'kill' | 'teleport' | 'aggro'): void {
    switch (event) {
      case 'hit':
        this.playTone(180, 0.06, 'square', 0.1)
        break
      case 'aggro':
        // Low growl when a slime locks on.
        this.playTone(90, 0.12, 'sawtooth', 0.08)
        break
      case 'kill':
        this.playTone(440, 0.07, 'square', 0.14)
        this.time.delayedCall(80, () => this.playTone(220, 0.09, 'square', 0.1))
        this.time.delayedCall(165, () => this.playTone(110, 0.14, 'square', 0.07))
        break
      case 'teleport':
        this.playTone(523, 0.09, 'sine', 0.09)
        this.time.delayedCall(110, () => this.playTone(659, 0.12, 'sine', 0.09))
        break
    }
  }
}
