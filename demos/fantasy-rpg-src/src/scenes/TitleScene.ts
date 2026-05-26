import Phaser from 'phaser'
import {
  DEFAULT_NAME,
  HERO_ANIM_KEY,
  SCENE_KEYS,
  SLIME_ANIM_KEY,
  TEX,
  heroFrameKey,
  slimeFrameKey,
} from '../constants'
import { LORE_ZONES, WORLD_NAME, WORLD_TAGLINE } from '../lore'
import { hasSave, loadGame } from '../save'
import type { WorldStartData } from './WorldScene'

const MAX_NAME = 14

/**
 * Title screen: "New Game" (with on-canvas name entry) and "Continue" (loads
 * the last save). Everything is rendered through Phaser — no DOM UI.
 */
export class TitleScene extends Phaser.Scene {
  private enteringName = false
  private typedName = ''
  private touchLayout = false
  private canContinue = false
  private continueName: string | null = null

  private titleRule!: Phaser.GameObjects.Rectangle
  private titleText!: Phaser.GameObjects.Text
  private subtitleText!: Phaser.GameObjects.Text
  private taglineText!: Phaser.GameObjects.Text
  private newGameBtn!: Phaser.GameObjects.Text
  private continueBtn!: Phaser.GameObjects.Text
  private footer!: Phaser.GameObjects.Text

  private namePrompt!: Phaser.GameObjects.Text
  private nameField!: Phaser.GameObjects.Text
  private nameHelp!: Phaser.GameObjects.Text
  private heroPreview?: Phaser.GameObjects.Sprite
  private slimePreview?: Phaser.GameObjects.Sprite

  constructor() {
    super(SCENE_KEYS.title)
  }

  create(): void {
    this.enteringName = false
    this.typedName = ''
    this.touchLayout = this.shouldUseTouchLayout()
    this.canContinue = false
    this.continueName = null

    this.cameras.main.setBackgroundColor('#10141f')

    this.titleRule = this.add.rectangle(0, 0, 0, 4, 0xf0d890).setAlpha(0.6)
    this.titleText = this.add
      .text(0, 0, 'FANTASY RPG', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#f0d890',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.subtitleText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#9aa6c0',
      })
      .setOrigin(0.5)

    this.taglineText = this.add
      .text(0, 0, WORLD_TAGLINE, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6a7899',
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5)

    if (this.textures.exists(TEX.heroAtlas)) {
      this.heroPreview = this.add.sprite(0, 0, TEX.heroAtlas, heroFrameKey(0))
      if (this.anims.exists(HERO_ANIM_KEY)) {
        this.heroPreview.play(HERO_ANIM_KEY)
      }
    }
    if (this.textures.exists(TEX.slimeAtlas)) {
      this.slimePreview = this.add.sprite(0, 0, TEX.slimeAtlas, slimeFrameKey(0))
      if (this.anims.exists(SLIME_ANIM_KEY)) {
        this.slimePreview.play(SLIME_ANIM_KEY)
      }
    }

    // Menu buttons.
    this.newGameBtn = this.makeButton('New Game', () => this.beginNameEntry())

    const save = loadGame()
    this.canContinue = hasSave() && save !== null
    this.continueName = save?.name ?? null
    const continueLabel = this.canContinue
      ? `Continue  (${save!.name})`
      : 'Continue  (no save)'
    this.continueBtn = this.makeButton(continueLabel, () => {
      if (this.canContinue) this.startGame({ continueGame: true })
    })
    if (!this.canContinue) {
      this.continueBtn.setColor('#5a6172').disableInteractive()
    }

    this.footer = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#7c879e',
      })
      .setOrigin(0.5)

    // Name-entry overlay (hidden until "New Game" is chosen).
    this.namePrompt = this.add
      .text(0, 0, 'Name your hero:', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.nameField = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#f0d890',
      })
      .setOrigin(0.5)
    this.nameHelp = this.add
      .text(0, 0, 'Type a name · ENTER to begin · ESC to cancel', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#7c879e',
      })
      .setOrigin(0.5)
    this.setNameEntryVisible(false)
    this.layoutScene()

    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.on('keydown', this.handleKey, this)
    }
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutScene, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this)
  }

  private makeButton(
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#cdd6f4',
        backgroundColor: '#1f2740',
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setColor('#f0d890'))
    btn.on('pointerout', () => btn.setColor('#cdd6f4'))
    btn.on('pointerup', onClick)
    return btn
  }

  private beginNameEntry(): void {
    if (this.touchLayout && typeof window !== 'undefined') {
      const chosenName = window.prompt?.('Name your hero', DEFAULT_NAME)
      if (chosenName === null) return
      this.startGame({
        continueGame: false,
        name: chosenName.trim() || DEFAULT_NAME,
      })
      return
    }

    this.enteringName = true
    this.typedName = ''
    this.setMenuVisible(false)
    this.setNameEntryVisible(true)
    this.refreshNameField()
  }

  private cancelNameEntry(): void {
    this.enteringName = false
    this.setNameEntryVisible(false)
    this.setMenuVisible(true)
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.enteringName) return

    if (event.key === 'Enter') {
      this.startGame({ continueGame: false, name: this.typedName.trim() || DEFAULT_NAME })
      return
    }
    if (event.key === 'Escape') {
      this.cancelNameEntry()
      return
    }
    if (event.key === 'Backspace') {
      this.typedName = this.typedName.slice(0, -1)
      this.refreshNameField()
      return
    }
    if (
      event.key.length === 1 &&
      /[a-zA-Z0-9 ]/.test(event.key) &&
      this.typedName.length < MAX_NAME
    ) {
      this.typedName += event.key
      this.refreshNameField()
    }
  }

  private refreshNameField(): void {
    this.nameField.setText(`${this.typedName}_`)
  }

  private setMenuVisible(visible: boolean): void {
    this.newGameBtn.setVisible(visible)
    this.continueBtn.setVisible(visible)
    this.footer.setVisible(visible)
  }

  private setNameEntryVisible(visible: boolean): void {
    this.namePrompt.setVisible(visible)
    this.nameField.setVisible(visible)
    this.nameHelp.setVisible(visible)
  }

  private shouldUseTouchLayout(): boolean {
    if (typeof window === 'undefined') return false
    const coarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    return coarsePointer || this.scale.width < 720 || this.scale.height < 520
  }

  private layoutScene(): void {
    this.touchLayout = this.shouldUseTouchLayout()

    const width = this.scale.width
    const height = this.scale.height
    const portrait = height > width
    const compact = this.touchLayout
    const narrowLandscape = compact && !portrait

    const titleY = compact ? Math.max(68, height * 0.12) : 120
    const subtitleY = titleY + (compact ? 42 : 58)
    const buttonGap = portrait ? 72 : narrowLandscape ? 0 : compact ? 64 : 60
    const artOffsetX = portrait ? Math.min(width * 0.22, 96) : Math.min(width * 0.28, 220)
    const heroScale = portrait ? 1.45 : narrowLandscape ? 1.35 : compact ? 1.75 : 2
    const slimeScale = portrait ? 1.95 : narrowLandscape ? 1.7 : compact ? 2.1 : 2.5

    this.titleRule
      .setPosition(width / 2, titleY + (compact ? 24 : 30))
      .setSize(width, 4)
    this.titleText
      .setPosition(width / 2, titleY)
      .setFontSize(portrait ? '32px' : compact ? '40px' : '56px')
    this.subtitleText
      .setPosition(width / 2, subtitleY)
      .setText(
        portrait
          ? `${LORE_ZONES.length} regions to explore`
          : LORE_ZONES.length > 1
          ? `${LORE_ZONES.length} regions • ${WORLD_NAME}`
          : WORLD_NAME,
      )
      .setFontSize(portrait ? '15px' : compact ? '17px' : '20px')
      .setWordWrapWidth(Math.max(220, width - 48), true)

    const subtitleBottom = subtitleY + this.subtitleText.height / 2
    const taglineY = subtitleBottom + (compact ? 18 : 22)
    this.taglineText
      .setPosition(width / 2, taglineY)
      .setFontSize(portrait ? '11px' : compact ? '12px' : '14px')
      .setWordWrapWidth(Math.max(260, width - 48), true)

    const taglineBottom = taglineY + this.taglineText.height / 2
    const artY = portrait
      ? Math.max(taglineBottom + 92, height * 0.4)
      : narrowLandscape
        ? Math.max(taglineBottom + 58, height * 0.46)
        : Math.max(240, height * 0.52)
    const buttonBaseY = portrait
      ? height * 0.58
      : narrowLandscape
        ? height - 82
        : Math.max(288, height * 0.56)
    const footerY = portrait
      ? height - 40
      : narrowLandscape
        ? buttonBaseY - 44
        : height - (compact ? 28 : 48)

    if (this.heroPreview) {
      this.heroPreview
        .setPosition(width / 2 - artOffsetX, artY)
        .setScale(heroScale)
    }
    if (this.slimePreview) {
      this.slimePreview
        .setPosition(width / 2 + artOffsetX, artY + (portrait ? 6 : 8))
        .setScale(slimeScale)
    }

    const compactContinueLabel = this.canContinue
      ? `Continue${this.continueName ? ` (${this.continueName})` : ''}`
      : 'Continue'
    this.continueBtn.setText(compact ? compactContinueLabel : this.canContinue ? `Continue  (${this.continueName})` : 'Continue  (no save)')

    this.newGameBtn
      .setPosition(narrowLandscape ? width / 2 - 118 : width / 2, buttonBaseY)
      .setStyle({
        fontSize: portrait ? '28px' : compact ? '26px' : '26px',
        padding: { x: compact ? 18 : 18, y: compact ? 10 : 8 },
      })
    this.continueBtn
      .setPosition(narrowLandscape ? width / 2 + 118 : width / 2, buttonBaseY + buttonGap)
      .setStyle({
        fontSize: portrait ? '24px' : compact ? '24px' : '26px',
        padding: { x: compact ? 18 : 18, y: compact ? 10 : 8 },
      })

    this.footer
      .setPosition(width / 2, footerY)
      .setText(
        compact
          ? portrait
            ? 'Tap to play · touch controls in-world'
            : 'Tap to play · touch controls appear in-world'
          : 'Move: WASD / Arrow Keys      Talk: E',
      )
      .setFontSize(compact ? '14px' : '16px')
      .setWordWrapWidth(Math.max(220, width - 24), true)

    this.namePrompt
      .setPosition(width / 2, buttonBaseY - 20)
      .setFontSize(compact ? '20px' : '22px')
    this.nameField
      .setPosition(width / 2, buttonBaseY + 28)
      .setFontSize(compact ? '28px' : '30px')
    this.nameHelp
      .setPosition(width / 2, buttonBaseY + 78)
      .setFontSize(compact ? '14px' : '15px')
      .setWordWrapWidth(Math.max(220, width - 32), true)
  }

  private startGame(data: WorldStartData): void {
    this.scene.start(SCENE_KEYS.world, data)
  }

  private cleanup(): void {
    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.off('keydown', this.handleKey, this)
    }
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutScene, this)
  }
}
