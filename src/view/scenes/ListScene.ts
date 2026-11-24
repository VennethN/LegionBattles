// The lists: the heroes, the camp, the rebirth with its honors, the feats.
// They are longer than the room they have, so this scene's camera is cut to
// that room and moves down the list as it is dragged or wheeled. Whatever
// is bought here is the rules' doing (game/rules.ts); the scene says so to
// the rest of the game with an event.

import Phaser from 'phaser';
import { BONE, BUSH, CLOTH, GOLD, HOLY, IRON, LINEN, OUTLINE, STEEL, VENOM, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { CAMP, FEATS, FEAT_SHARE, HEROES, HONORS, LAUREL_DAMAGE, REBIRTH_STAGE, type HonorEffect } from '../../game/data';
import { fmt, percent } from '../../game/format';
import {
  buyCamp, buyCount, buyHero, buyHonor, campCost, canRebirth, featProgress, heroBase, heroCost, heroDps, heroOpen, honorCost, laurelsFor, nextMilestone,
} from '../../game/rules';
import { getManifest, type Rect } from '../app';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { ART_SCALE, hex, view } from '../config';
import { commit, save } from '../session';
import { BAKE_PAD, slabImage, slabKey } from '../ui/bake';
import { bonusLine, campLine, featLine, honorLine } from '../ui/texts';
import { label } from '../ui/widgets';
import type { Tab } from './GameScene';

const INV_ART = 1 / ART_SCALE;
const PAD = 10;
const GAP = 8;

const HONOR_ICONS: Record<HonorEffect, string> = {
  damage: 'icon/sword', gold: 'icon/coin', tap: 'icon/gauntlet', start: 'icon/chevrons', offline: 'icon/moon', march: 'icon/boot',
  bossTime: 'icon/hourglass', packs: 'icon/pack',
};

/** A button with a word over a price: what nearly every row ends in. */
class BuyButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly slab: Phaser.GameObjects.Image;
  private readonly top: Phaser.GameObjects.Text;
  private readonly cost: Phaser.GameObjects.Text;
  private readonly coin: Phaser.GameObjects.Image;
  private mat: Material = GOLD;
  private down = false;
  private can = true;
  private state = '';

  constructor(
    private readonly scene: ListScene,
    x: number,
    y: number,
    private readonly w: number,
    private readonly h: number,
    icon: string,
    private readonly onClick: () => void,
  ) {
    this.root = scene.add.container(x, y);
    this.slab = scene.add.image(0, 0, slabKey(scene, w, h, GOLD, 14, 6));
    this.top = label(scene, 0, -h / 2 + 20, '', { size: 17, strokeWidth: 4 });
    this.coin = scene.add.image(0, h / 2 - 24, SHEET, icon).setScale(0.42 * INV_ART);
    this.cost = label(scene, 0, h / 2 - 24, '', { size: 17, strokeWidth: 4, align: 'left' });
    this.root.add([this.slab, this.top, this.coin, this.cost]);
    this.root.setSize(w, h).setInteractive({ useHandCursor: true });
    this.root.on('pointerdown', () => {
      this.down = true;
      this.draw();
    });
    this.root.on('pointerout', () => {
      this.down = false;
      this.draw();
    });
    this.root.on('pointerup', () => {
      if (!this.down) return;
      this.down = false;
      this.draw();
      // A press that turned into a drag of the list is not a press of the button.
      if (this.scene.dragged) return;
      if (!this.can) {
        sfx.play('deny', 0.6);
        return;
      }
      this.onClick();
    });
  }

  private draw(): void {
    const sink = this.down ? 4 : 0;
    this.slab
      .setTexture(slabKey(this.scene, this.w, this.h - sink, this.mat, 14, this.down ? 3 : 6))
      .setDisplaySize(this.w + BAKE_PAD * 2, this.h - sink + BAKE_PAD * 2)
      .setY(sink / 2);
    this.top.y = -this.h / 2 + 20 + sink;
    this.cost.y = this.h / 2 - 24 + sink * 0.5;
    this.coin.y = this.cost.y;
  }

  /** What it says, what it costs, and whether that can be paid. Nothing is redrawn unless one of them has changed. */
  set(top: string, cost: string, can: boolean, mat: Material = GOLD): void {
    const state = `${top}|${cost}|${can}|${mat.fill}`;
    if (state === this.state) return;
    this.state = state;
    this.can = can;
    this.mat = can ? mat : STEEL;
    this.top.setText(top);
    this.cost.setText(cost);
    const wide = cost ? this.cost.width + 26 : 0;
    this.coin.setVisible(cost !== '').setX(-wide / 2 + 10);
    this.cost.setX(-wide / 2 + 26);
    if (!cost) this.top.y = 0;
    this.root.alpha = can ? 1 : 0.72;
    this.draw();
    if (!cost) this.top.y = -3;
  }
}

export class ListScene extends Phaser.Scene {
  /** True from the moment a press has moved far enough to be a drag, until the next press. */
  dragged = false;

  private rect!: Rect;
  private tab: Tab = 'heroes';
  private scroll = 0;
  private height = 0;
  private velocity = 0;
  private pressY = 0;
  private pressScroll = 0;
  private pressed = false;
  private rows: Array<() => void> = [];
  private refreshT = 0;
  /** How many heroes were in the legion when the list was made: one more, and it is made again. */
  private hired = 0;

  constructor() {
    super('List');
  }

  init(data: { rect: Rect; tab: Tab; scroll?: number }): void {
    this.rect = data.rect;
    this.tab = data.tab;
    this.scroll = data.scroll ?? 0;
    this.rows = [];
    this.velocity = 0;
    this.pressed = false;
    this.dragged = false;
  }

  create(): void {
    const r = this.rect;
    const cam = this.cameras.main;
    cam.setViewport(Math.round(r.x * view.zoom), Math.round(r.y * view.zoom), Math.round(r.w * view.zoom), Math.round(r.h * view.zoom));
    cam.setZoom(view.zoom);
    let y = PAD;
    if (this.tab === 'heroes') y = this.heroes(y);
    else if (this.tab === 'camp') y = this.camp(y);
    else if (this.tab === 'rebirth') y = this.rebirth(y);
    else y = this.feats(y);
    this.height = y + PAD;
    this.place();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pressed = true;
      this.dragged = false;
      this.pressY = p.y;
      this.pressScroll = this.scroll;
      this.velocity = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.pressed || !p.isDown) return;
      const dy = (p.y - this.pressY) / view.zoom;
      if (!this.dragged && Math.abs(dy) < 9) return;
      this.dragged = true;
      const before = this.scroll;
      this.scroll = this.pressScroll - dy;
      this.place();
      this.velocity = (this.scroll - before) * 60;
    });
    this.input.on('pointerup', () => {
      this.pressed = false;
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (!this.inside(p)) return;
      this.scroll += dy * 0.6;
      this.velocity = 0;
      this.place();
    });

    const prices = (): void => this.update(0, 1000);
    this.game.events.on('prices', prices);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('prices', prices));
    this.refreshAll();
  }

  private inside(p: Phaser.Input.Pointer): boolean {
    const r = this.rect;
    const x = p.x / view.zoom;
    const y = p.y / view.zoom;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  private place(): void {
    const most = Math.max(0, this.height - this.rect.h);
    this.scroll = Math.max(0, Math.min(most, this.scroll));
    this.cameras.main.centerOn(this.rect.w / 2, this.rect.h / 2 + this.scroll);
  }

  private refreshAll(): void {
    for (const row of this.rows) row();
  }

  /** Something was bought: the save is written, the rest of the game is told, and the rows say what is true now. */
  private bought(sound: 'buy' | 'levelUp' = 'buy'): void {
    sfx.play(sound, 0.8);
    commit();
    this.game.events.emit('bought');
    if (this.tab === 'heroes' && save().run.heroes.filter((l) => l > 0).length !== this.hired) {
      // A hero has joined: the next one stands in the list now, where the unknown one was.
      this.scene.restart({ rect: this.rect, tab: this.tab, scroll: this.scroll });
      return;
    }
    this.refreshAll();
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (!this.pressed && Math.abs(this.velocity) > 4) {
      this.scroll += this.velocity * dt;
      this.velocity *= Math.pow(0.02, dt);
      this.place();
    }
    this.refreshT += dt;
    if (this.refreshT >= 0.2) {
      this.refreshT = 0;
      this.refreshAll();
    }
  }

  // ------------------------------------------------------------ rows

  private width(): number {
    return this.rect.w - PAD * 2;
  }

  /** A whole figure standing in a tile at the left of a row. `dark` shows it as its own outline in the dark: someone not yet known. */
  private portrait(unit: string, x: number, y: number, mat: Material, dark = false): void {
    slabImage(this, x, y, 74, 74, mat, 12, 5);
    const box = getManifest().units[unit].full;
    const k = Math.min(60 / box[3], 62 / box[2]);
    const img = this.add.image(x + 37 + (96 - (box[0] + box[2] / 2)) * k, y + 68, CARDS, portraitFrame('blue', unit)).setScale(k * INV_ART);
    if (dark) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85);
  }

  private dark(text: string, x: number, y: number, size: number, weight: 600 | 700 = 700): Phaser.GameObjects.Text {
    return label(this, x, y, text, { size, weight, align: 'left', color: OUTLINE, stroke: null });
  }

  private heroes(y0: number): number {
    const s = save();
    const w = this.width();
    const h = 92;
    let y = y0;
    this.hired = s.run.heroes.filter((l) => l > 0).length;
    for (let i = 0; i < HEROES.length; i++) {
      const def = HEROES[i];
      const open = heroOpen(s, i);
      // One hero past whoever can be hired is shown, dark: there is someone more. Nobody past that is shown at all.
      if (!open && !heroOpen(s, i - 1)) break;
      if (!open) {
        slabImage(this, PAD, y, w, h, IRON, 14, 6);
        this.portrait(def.unit, PAD + 9, y + 8, { fill: IRON.shade, shade: OUTLINE }, true);
        label(this, PAD + 96, y + 30, '???', { size: 22, align: 'left' });
        label(this, PAD + 96, y + 58, `Hire the ${HEROES[i - 1].name} first`, { size: 14, weight: 600, align: 'left', strokeWidth: 3 });
        y += h + GAP;
        continue;
      }
      slabImage(this, PAD, y, w, h, BONE, 14, 6);
      this.portrait(def.unit, PAD + 9, y + 8, CLOTH.blue);
      this.dark(def.name, PAD + 96, y + 20, w < 400 ? 17 : 19);
      const level = this.dark('', PAD + 96, y + 43, 14, 600);
      const power = this.dark('', PAD + 96, y + 62, 14, 600);
      const next = this.dark('', PAD + 96, y + 79, 12, 600).setAlpha(0.75);
      const button = new BuyButton(this, PAD + w - 68, y + h / 2 - 2, 118, 70, 'icon/coin', () => {
        const n = buyCount(save(), i);
        const before = save().run.heroes[i];
        if (buyHero(save(), i, n) > 0) {
          const after = save().run.heroes[i];
          this.bought(nextMilestone(before) <= after ? 'levelUp' : 'buy');
        }
      });
      this.rows.push(() => {
        const sv = save();
        const lv = sv.run.heroes[i];
        const n = buyCount(sv, i);
        const cost = heroCost(sv, i, n);
        level.setText(lv > 0 ? `Level ${lv}` : def.line);
        power.setText(lv > 0 ? `${fmt(heroDps(sv, i))} a second` : `${fmt(heroBase(i, 1))} a second to start`);
        next.setText(lv > 0 ? (lv < 25 ? bonusLine(def) : `Damage doubles at level ${nextMilestone(lv)}`) : '');
        button.set(lv > 0 ? `+${n}` : 'HIRE', fmt(cost, true), cost <= sv.run.gold);
      });
      y += h + GAP;
    }
    return y;
  }

  private camp(y0: number): number {
    const w = this.width();
    const h = 92;
    let y = y0;
    CAMP.forEach((def, i) => {
      slabImage(this, PAD, y, w, h, BONE, 14, 6);
      this.portrait(def.unit, PAD + 9, y + 8, LINEN);
      this.dark(def.name, PAD + 96, y + 20, w < 400 ? 17 : 19);
      const level = this.dark('', PAD + 96, y + 43, 14, 600);
      const now = this.dark('', PAD + 96, y + 62, 14, 600);
      const next = this.dark('', PAD + 96, y + 79, 12, 600).setAlpha(0.75);
      const button = new BuyButton(this, PAD + w - 68, y + h / 2 - 2, 118, 70, 'icon/coin', () => {
        if (buyCamp(save(), i)) this.bought('buy');
      });
      this.rows.push(() => {
        const sv = save();
        const lv = sv.run.camp[i];
        const cost = campCost(sv, i);
        level.setText(lv > 0 ? `Level ${lv} of ${def.max}` : 'Not built');
        now.setText(lv > 0 ? campLine(def, lv) : campLine(def, 1));
        next.setText(lv > 0 && lv < def.max ? `Next: ${campLine(def, lv + 1)}` : '');
        if (lv >= def.max) button.set('FULL', '', false);
        else button.set(lv > 0 ? 'RAISE' : 'BUILD', fmt(cost, true), cost <= sv.run.gold);
      });
      y += h + GAP;
    });
    return y;
  }

  private rebirth(y0: number): number {
    const w = this.width();
    let y = y0;
    // What a rebirth is, what it would win, and the button.
    const ch = 214;
    slabImage(this, PAD, y, w, ch, BONE, 14, 6);
    this.add.image(PAD + 34, y + 30, SHEET, 'icon/laurel').setScale(0.8 * INV_ART);
    this.dark('MUSTER AGAIN', PAD + 62, y + 30, 21);
    label(this, PAD + 16, y + 82, 'Give up this road, its gold, your heroes\' levels and the camp, and start again stronger. Laurels, honors and feats are kept.', {
      size: 14, weight: 600, align: 'left', color: OUTLINE, stroke: null, wrap: w - 32,
    });
    const held = this.dark('', PAD + 16, y + 128, 14, 600);
    const win = this.dark('', PAD + 16, y + 148, 14, 600);
    const button = new BuyButton(this, PAD + w / 2, y + ch - 34, Math.min(300, w - 40), 50, 'icon/laurel', () => {
      this.scene.launch('Modal', { kind: 'rebirth' });
    });
    this.rows.push(() => {
      const sv = save();
      held.setText(`Laurels ever won: ${sv.laurelsEver}, each ${percent(LAUREL_DAMAGE)} more damage (${percent(sv.laurelsEver * LAUREL_DAMAGE)} now)`);
      if (canRebirth(sv)) {
        const n = laurelsFor(sv.run.top);
        win.setText(`This run reached stage ${sv.run.top}: worth ${n} ${n === 1 ? 'laurel' : 'laurels'}. Further is worth more.`);
        button.set('REBIRTH', `+${n}`, true, VENOM);
      } else {
        win.setText(`Reach stage ${REBIRTH_STAGE} to be able to. This run has reached stage ${sv.run.top}.`);
        button.set(`STAGE ${REBIRTH_STAGE} FIRST`, '', false);
      }
    });
    y += ch + GAP;

    // The honors laurels buy.
    const h = 84;
    const purse = label(this, PAD + 6, y + 14, '', { size: 16, align: 'left', strokeWidth: 4 });
    this.rows.push(() => purse.setText(`HONORS    ${save().laurels} ${save().laurels === 1 ? 'laurel' : 'laurels'} to spend`));
    y += 32;
    HONORS.forEach((def, i) => {
      slabImage(this, PAD, y, w, h, LINEN, 14, 6);
      slabImage(this, PAD + 9, y + 9, 62, 62, BUSH, 12, 5);
      this.add.image(PAD + 40, y + 38, SHEET, HONOR_ICONS[def.effect]).setScale(0.78 * INV_ART);
      this.dark(def.name, PAD + 84, y + 20, 18);
      const now = this.dark('', PAD + 84, y + 43, 14, 600);
      const next = this.dark('', PAD + 84, y + 64, 12, 600).setAlpha(0.75);
      const button = new BuyButton(this, PAD + w - 62, y + h / 2 - 2, 106, 62, 'icon/laurel', () => {
        if (buyHonor(save(), i)) this.bought('levelUp');
      });
      this.rows.push(() => {
        const sv = save();
        const lv = sv.honors[i];
        const cost = honorCost(sv, i);
        now.setText(lv > 0 ? `Level ${lv}: ${honorLine(def, lv)}` : honorLine(def, 1));
        next.setText(lv > 0 && lv < def.max ? `Next: ${honorLine(def, lv + 1)}` : '');
        if (lv >= def.max) button.set('FULL', '', false);
        else button.set(lv > 0 ? 'RAISE' : 'EARN', String(cost), cost <= sv.laurels, VENOM);
      });
      y += h + GAP;
    });
    return y;
  }

  private feats(y0: number): number {
    const w = this.width();
    let y = y0;
    const head = label(this, PAD + 6, y + 14, '', { size: 16, align: 'left', strokeWidth: 4, wrap: w - 12 });
    this.rows.push(() => {
      const n = save().feats.length;
      head.setText(`${n} of ${FEATS.length} feats done: ${percent(n * FEAT_SHARE)} more damage and gold`);
    });
    y += 34;
    const h = 62;
    for (const feat of FEATS) {
      const back = slabImage(this, PAD, y, w, h, BONE, 12, 5);
      const cup = this.add.image(PAD + 34, y + h / 2 - 2, SHEET, 'icon/trophy').setScale(0.7 * INV_ART);
      this.dark(feat.name, PAD + 66, y + 20, 17);
      this.dark(featLine(feat), PAD + 66, y + 42, 13, 600).setAlpha(0.8);
      const state = label(this, PAD + w - 14, y + h / 2 - 2, '', { size: 14, weight: 600, align: 'right', color: OUTLINE, stroke: null });
      const tick = this.add.image(PAD + w - 30, y + h / 2 - 2, SHEET, 'icon/check').setScale(0.6 * INV_ART).setVisible(false);
      let shown = '';
      this.rows.push(() => {
        const sv = save();
        const done = sv.feats.includes(feat.id);
        const text = done ? 'done' : `${fmt(Math.min(featProgress(sv, feat), feat.need))} / ${fmt(feat.need)}`;
        if (text === shown) return;
        shown = text;
        state.setText(done ? '' : text);
        tick.setVisible(done);
        cup.setAlpha(done ? 1 : 0.35);
        back.setTint(done ? hex(HOLY.light) : 0xffffff);
      });
      y += h + 6;
    }
    return y;
  }
}
