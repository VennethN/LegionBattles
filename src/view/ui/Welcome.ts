// What the first tutorial puts on the main screen besides its hand: the
// pack a new player's first battle drops, opened where it lies with one
// press, and the card that comes out of it, held up until the player puts
// it on a tile of their own choosing.
//
// It decides nothing. Which step is up is game/tutorial.ts's to say, what a
// pack turns over and where a card may stand are game/rules.ts's; this
// draws, and passes presses on.

import Phaser from 'phaser';
import { BONE, HOLY, OUTLINE } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { packById } from '../../data/packs';
import { UNITS } from '../../data/units';
import { cardOf } from '../../game/cards';
import { RARITIES } from '../../game/rarity';
import { FIRST_PACK, fieldCard, openPack } from '../../game/rules';
import { markSeen } from '../../game/tutorial';
import type { BoardView } from '../BoardView';
import { H, W, hex } from '../config';
import { BOARD_PX_H, BOARD_PX_W, BOARD_X, BOARD_Y } from '../layout';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { RARITY_MAT } from './colors';
import { burst, cardFace, rays } from './fanfare';
import { gradeBadge } from './grade';
import type { Rect } from './Guide';
import { label, slab } from './widgets';

export interface WelcomeHooks {
  /** A pack's show began or ended: the tutorial points at nothing while one is on. */
  show: (state: 'none' | 'pouch' | 'reveal') => void;
  /** The pack has been opened and its card seen: on to the field. */
  opened: () => void;
  /** The card has been put on a tile. The save is already changed and written. */
  placed: (card: number) => void;
}

/** Where the card in hand waits: over the enemy's half, which is nobody's to press while it does. */
const HAND_X = BOARD_X + BOARD_PX_W * 0.75;
const HAND_Y = BOARD_Y + BOARD_PX_H * 0.5 - 8;
const CARD_W = 208;
const CARD_H = 262;

export class Welcome {
  /** Where the pack to open is on the screen, for the tutorial to point at. Null if none is. */
  giftRect: Rect | null = null;
  /** True while a pack is being opened. */
  busy = false;

  private gift: Phaser.GameObjects.GameObject[] = [];
  private shown: Phaser.GameObjects.GameObject[] = [];
  private held: Phaser.GameObjects.GameObject[] = [];
  private heldCard = -1;
  private dragging = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly board: BoardView,
    private readonly hooks: WelcomeHooks,
  ) {
    // A press on a free tile of the player's half puts the card in hand there.
    scene.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.heldCard < 0 || this.dragging || over.length > 0) return;
      const tile = this.board.freeTileAt(p.worldX, p.worldY);
      if (tile) this.place(tile[0], tile[1]);
    });
  }

  // ------------------------------------------------------------ the pack

  /**
   * Makes a tile of a result's loot the pack to open: a press on it opens
   * the pack where it lies.
   */
  usePackTile(rect: Rect): void {
    this.clearGift();
    this.giftRect = rect;
    const zone = this.scene.add.zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w + 16, rect.h + 16).setInteractive({ useHandCursor: true }).setDepth(9590);
    zone.once('pointerup', () => this.open(rect));
    this.gift.push(zone);
  }

  /**
   * The pack by itself in the middle of the field, on a tile as a result's
   * loot is: for a player who comes back with it still to open, when no
   * result is up to open it on.
   */
  offerPack(): void {
    const w = 150;
    const h = 150;
    const rect = { x: W / 2 - w / 2, y: BOARD_Y + BOARD_PX_H / 2 - h / 2, w, h };
    this.usePackTile(rect);
    const g = this.scene.add.graphics().setDepth(9000);
    slab(g, rect.x, rect.y, w, h, BONE, 16, 7);
    const art = this.scene.add.image(W / 2, rect.y + h / 2 - 4, CARDS, `pack/${FIRST_PACK}`).setScale(0.26).setDepth(9001);
    this.gift.push(g, art);
  }

  clearGift(): void {
    for (const o of this.gift) o.destroy();
    this.gift = [];
    this.giftRect = null;
  }

  /**
   * Opens the first pack: it comes up from where it lay, shakes, bursts,
   * and its card rises out of it and turns over. One press began it and no
   * other is asked for until the card has been seen. The card is not put in
   * the team: that is the player's to do next.
   */
  private open(from: Rect): void {
    const s = save();
    if (this.busy || (s.packs[FIRST_PACK] ?? 0) <= 0) return;
    this.busy = true;
    this.clearGift();
    this.hooks.show('pouch');
    const scene = this.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.shown.push(o);
      return o;
    };
    const veil = add(scene.add.rectangle(W / 2, H / 2, W + 80, H + 80, hex(OUTLINE), 0.86).setDepth(9700).setAlpha(0).setInteractive());
    scene.tweens.add({ targets: veil, alpha: 1, duration: 200 });
    const cx = W / 2;
    const cy = H / 2 - 30;
    const base = packById(FIRST_PACK).id.split('@')[0];
    const pouch = add(scene.add.image(from.x + from.w / 2, from.y + from.h / 2, CARDS, `pack/${base}`).setDepth(9710).setScale(0.2));
    sfx.play('lift');
    scene.tweens.add({ targets: pouch, x: cx, y: cy, scale: 0.9, duration: 300, ease: 'Back.easeOut' });

    scene.time.delayedCall(320, () => {
      // The card is decided here, by the rules; all that follows is the show.
      const pull = openPack(s, FIRST_PACK, false);
      commit();
      if (!pull) {
        this.endShow();
        this.hooks.opened();
        return;
      }
      this.hooks.show('reveal');
      const rank = Math.max(0, (RARITIES as readonly string[]).indexOf(pull.rarity));
      const color = hex(RARITY_MAT[pull.rarity].fill);
      sfx.play('packShake');
      scene.time.delayedCall(300, () => sfx.play('packShake'));
      // A light in the color of what is inside gathers behind the pouch while it shakes.
      const halo = add(scene.add.image(cx, cy, SHEET, 'fx/disc').setTint(color).setDepth(9706).setScale(0.4).setAlpha(0));
      scene.tweens.add({ targets: halo, scale: 5.2, alpha: 0.75, duration: 640, ease: 'Cubic.easeIn' });
      scene.tweens.add({
        targets: pouch, angle: { from: -10, to: 10 }, duration: 64, yoyo: true, repeat: 4,
        onComplete: () => {
          scene.tweens.add({ targets: pouch, scaleX: 1.5, scaleY: 0.7, alpha: 0, y: cy + 40, duration: 200, ease: 'Cubic.easeIn' });
          scene.tweens.add({ targets: halo, scale: 9, alpha: 0, duration: 420, ease: 'Cubic.easeOut' });
          sfx.play('packOpen');
          const flash = add(scene.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.8).setDepth(9704));
          scene.tweens.add({ targets: flash, alpha: 0, duration: 280 });
          scene.time.delayedCall(140, () => sfx.reveal(rank));
          if (rank >= 2) music.duck(1 + rank * 0.3);
          // What greets a card anywhere greets this one (ui/fanfare.ts), a little over the veil.
          const over = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
            (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(9705);
            return add(o);
          };
          burst(scene, over, cx, cy, rank, color);
          if (rank >= 2) rays(scene, over, cx, cy, color, 430);
          const w = 264;
          const h = 330;
          const card = add(cardFace(scene, pull.unit, pull.rarity, w, h).setPosition(cx, cy + 70).setDepth(9730));
          card.setScale(0.05, 0.5).setAlpha(0);
          scene.tweens.add({ targets: card, scaleX: 1, scaleY: 1, y: cy, alpha: 1, duration: 340, delay: 120, ease: 'Back.easeOut' });
          const badge = add(gradeBadge(scene, cx - w / 2 + 44, cy - h / 2 + 40, pull.grade, 40).setDepth(9732).setAlpha(0));
          const rest = badge.scaleX;
          badge.setScale(rest * 2.5);
          scene.tweens.add({ targets: badge, alpha: 1, scale: rest, duration: 240, delay: 520, ease: 'Back.easeOut', onStart: () => sfx.play('place') });
          const head = add(label(scene, cx, cy - h / 2 - 40, 'NEW!', { size: 44, color: HOLY.fill, strokeWidth: 8 }).setDepth(9731).setAlpha(0).setScale(0.6));
          scene.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 260, delay: 380, ease: 'Back.easeOut' });
          // It goes on by itself once the card has been looked at, and at a press before that.
          let gone = false;
          const on = (): void => {
            if (gone) return;
            gone = true;
            this.endShow();
            this.hooks.opened();
          };
          scene.time.delayedCall(800, () => {
            if (gone) return;
            veil.once('pointerup', on);
          });
          scene.time.delayedCall(2600, on);
        },
      });
    });
  }

  private endShow(): void {
    for (const o of this.shown) o.destroy();
    this.shown = [];
    this.busy = false;
    this.hooks.show('none');
  }

  // ------------------------------------------------------------ the card

  /**
   * Holds a card up beside the field and lights the tiles it may stand on.
   * A press on one of them puts it there, and so does dragging the card
   * onto one.
   */
  offerCard(id: number): void {
    if (this.heldCard === id) return;
    this.clearCard();
    const s = save();
    const held = cardOf(s, id);
    if (!held) return;
    this.heldCard = id;
    const scene = this.scene;
    const def = UNITS[held.unit];
    // The enemy's half goes dark behind it: the eye is to go to the player's.
    const shade = scene.add.graphics().setDepth(8400);
    shade.fillStyle(hex(OUTLINE), 0.5).fillRoundedRect(BOARD_X + BOARD_PX_W / 2 + 6, BOARD_Y - 70, BOARD_PX_W / 2 + 30, BOARD_PX_H + 84, 18);
    const card = cardFace(scene, held.unit, def.rarity, CARD_W, CARD_H).setPosition(HAND_X, HAND_Y).setDepth(8410);
    card.add(gradeBadge(scene, -CARD_W / 2 + 36, -CARD_H / 2 + 34, held.grade, 34));
    card.setSize(CARD_W, CARD_H);
    card.setInteractive({ draggable: true, useHandCursor: true });
    const bob = scene.tweens.add({ targets: card, y: HAND_Y - 8, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    card.on('dragstart', () => {
      this.dragging = true;
      bob.pause();
      sfx.play('lift');
      card.setScale(0.6);
    });
    card.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      card.setPosition(x, y);
    });
    card.on('dragend', (p: Phaser.Input.Pointer) => {
      const tile = this.board.freeTileAt(p.worldX, p.worldY);
      // The press that ends a drag is let go over the field, with nothing under it: it must not also be read as a tap on a tile.
      scene.time.delayedCall(0, () => {
        this.dragging = false;
      });
      if (tile && this.place(tile[0], tile[1])) return;
      card.setScale(1);
      scene.tweens.add({ targets: card, x: HAND_X, y: HAND_Y, duration: 160, ease: 'Cubic.easeOut', onComplete: () => bob.resume() });
    });
    this.held.push(shade, card);
    this.board.askTile(true);
  }

  clearCard(): void {
    if (this.heldCard < 0) return;
    for (const o of this.held) o.destroy();
    this.held = [];
    this.heldCard = -1;
    this.dragging = false;
    this.board.askTile(false);
  }

  /** Puts the card in hand on a tile, written as the team keeps it. Returns false if the rules will not have it there. */
  private place(col: number, row: number): boolean {
    const s = save();
    const id = this.heldCard;
    if (id < 0 || !fieldCard(s, id, col, row)) return false;
    // That was the last thing the first tutorial had to teach.
    markSeen(s, 'place');
    commit();
    sfx.play('place');
    this.clearCard();
    this.hooks.placed(id);
    return true;
  }
}
