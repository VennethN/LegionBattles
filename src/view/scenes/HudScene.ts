// What lies over the lair: the hunter's health, the monster's in its three
// parts with its stagger under it, and the buttons for what the hunter can
// do. In camp it shows what there is to build instead. It reads the hunt and
// shows it; the lair itself is the screen under this one.
//
// It also takes the steering, because it is the screen on top. With a mouse
// and keys it shows a row of the hunter's skills with their keys in the
// corners, and nothing to press with a thumb. On a touch screen it shows a
// stick bottom left and a big ATTACK with the rest round it on the right
// (src/view/input.ts says how each is used). It changes from one to the
// other the moment the other is used.

import Phaser from 'phaser';
import { BONE, GOLD, HOLY, IRON, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { BUILDINGS, REVIVE } from '../../game/content';
import type { Ev, Hunt, TaskState } from '../../game/hunt';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { Controls, DRAG_MIN, KEY_NAMES, STICK_R, type Ask } from '../input';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { uiIcon, uiKey } from '../ui/grim';
import { commit, save, theHunt } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
import { FEEL_NAMES, feelMode, nextFeelMode, setFeelMode } from '../vfx/setting';
import { LairScene } from './LairScene';

const ICON = 0.5;
const PAD = 70;

/** A button of the hunt: what it asks for, and how it reads whether it is ready. */
interface Pad {
  ask: Ask;
  root: Phaser.GameObjects.Container;
  veil: Phaser.GameObjects.Graphics;
  count: Phaser.GameObjects.Text | null;
  /** How much of its wait is left, as a share, and how many it has left where it counts. */
  wait: (h: Hunt) => number;
  left: ((h: Hunt) => number) | null;
  ready: boolean;
  /** How big its slot is, and the seconds still to wait written on it, on a thumb's button. */
  size: number;
  secs: Phaser.GameObjects.Text | null;
  seconds: ((h: Hunt) => number) | null;
}

/** The short word on a pad for each thing: a pad is narrow. */
const SHORT: Record<string, string> = { seton: 'DOGS', heel: 'BACK', pikemen: 'SPEARS', crossbowmen: 'BOWS', sappers: 'BOMBS' };

export class HudScene extends Phaser.Scene {
  /** The partners' plates under the hunter's, and the tasks' strip: what each shows, and the drawing redone each frame. */
  private partyBars: Phaser.GameObjects.Graphics | null = null;
  /** The ATTACK button: it beats while the lesson waits for a blow. */
  private atk: Phaser.GameObjects.Container | null = null;
  private partyMarks: Phaser.GameObjects.Text[] = [];
  private taskLines: Phaser.GameObjects.Text[] = [];
  private taskCounts: Phaser.GameObjects.Text[] = [];
  private partyTop = 0;
  private taskTop = 0;
  controls!: Controls;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private underText!: Phaser.GameObjects.Text;
  private campText!: Phaser.GameObjects.Text;
  /** The plate of a hunt that teaches: what to do now, off the fight. */
  private plate: Phaser.GameObjects.Container | null = null;
  private plateText!: Phaser.GameObjects.Text;
  private plateStep!: Phaser.GameObjects.Text;
  private plateBack!: Phaser.GameObjects.Image;
  private shownStep = '';
  private plateUntil = 0;
  private hint: Phaser.GameObjects.Container | null = null;
  private stick!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Image;
  private paused: Phaser.GameObjects.Container | null = null;
  /** The line being said, as a caption by whoever says it, and which line it is. */
  private said: Phaser.GameObjects.Container | null = null;
  private saidId = 0;
  private saidW = 0;
  private saidH = 0;
  private saidHeard = false;
  private pads: Pad[] = [];
  private campPads: Array<{ root: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; id: string; n: number }> = [];
  private camp: Phaser.GameObjects.Container | null = null;
  private fight: Phaser.GameObjects.Container | null = null;
  /** Health as it is drawn: what is left, and the part a blow took that drains away after it, the hunter's and the boss's. */
  private hpShown = 0;
  private hpLag = 0;
  private bossLag = 0;
  private bossShown = 0;
  /** Seconds a bar flashes white for after a blow, the hunter's and the boss's. */
  private hpFlash = 0;
  private bossFlash = 0;
  private low!: Phaser.GameObjects.Graphics;
  private bannerUntil = 0;
  private clock = 0;
  private get touch(): boolean {
    return this.controls?.scheme === 'touch';
  }
  /** Where the monster's bar is, and how wide. */
  private bx = 0;
  private by = 0;
  private bw = 300;

  constructor() {
    super('Hud');
  }

  create(data: { fresh?: boolean }): void {
    setupCamera(this);
    this.controls = new Controls(this, this.sys.game.device.input.touch && !this.sys.game.device.os.desktop);
    this.controls.onScheme = () => this.rescheme();
    this.paused = null;
    this.hint = null;
    this.pads = [];
    this.campPads = [];
    this.clock = 0;
    const hunt = theHunt();
    if (!hunt) return;
    const w = view.w;

    // Struck: the whole screen goes red for a breath.
    this.flash = this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(RUBY.fill)).setAlpha(0).setDepth(1);

    this.bars = this.add.graphics().setDepth(10);
    // The hunter's plate: an iron plate with their likeness in a round slot, their name, and their health in a trough
    // of their own. The bars are drawn every frame (bars), so that a blow's loss can drain after it.
    this.add.existing(slabImage(this, 6, 6, 244, 56, IRON, 2, 4)).setDepth(9);
    this.add.image(32, 34, uiKey('slot')).setDisplaySize(50, 52).setDepth(11);
    const face = this.add.image(32, 34, CARDS, portraitFrame('grim', hunt.hunter.def.id)).setDepth(11);
    face.setScale(Math.min(36 / face.width, 38 / face.height));
    label(this, 62, 20, hunt.hunter.def.short.toUpperCase(), { size: 15, align: 'left', face: 'display' }).setDepth(12);
    this.hpText = label(this, 238, 20, '', { size: 15, align: 'right', face: 'display' }).setDepth(12);
    this.hpLag = hunt.hunter.hp;
    this.hpShown = hunt.hunter.hp;
    this.bossLag = hunt.monster.hp;
    // Under 30% of health the edges of the screen go red, and pulse.
    this.low = this.add.graphics().setDepth(2).setAlpha(0);
    for (let i = 0; i < 10; i++) {
      this.low.lineStyle(10, 0x8a1010, 0.1 + i * 0.02);
      this.low.strokeRect(i * 6, i * 6, view.w - i * 12, view.h - i * 12);
    }

    // The monster's bar: across the top of a wide window, and under the hunter's in a tall one, where there is no room beside it.
    this.bw = view.tall ? w - 60 : Math.min(360, w - 420);
    this.bx = view.tall ? 30 : w / 2 - this.bw / 2;
    this.by = view.tall ? 88 : 30;
    label(this, this.bx + this.bw / 2, this.by - 15, hunt.monster.def.name.toUpperCase(), { size: 17, color: '#d0503c', face: 'display' }).setDepth(12);
    this.stateText = label(this, this.bx + this.bw / 2, this.by + 40, '', { size: 15, color: HOLY.fill }).setDepth(12);

    // Pause: a button, and the P key. Escape is the browser's, for leaving full screen.
    const pause = this.add.container(w - 34, 26).setDepth(12);
    pause.add([slabImage(this, -22, -22, 44, 44, BONE, 12, 5), this.add.image(0, -2, SHEET, 'icon/hold').setScale(ICON * 0.5).setTint(hex(OUTLINE))]);
    pause.setSize(44, 44).setInteractive({ useHandCursor: true });
    pause.on('pointerup', () => this.pause(true));
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'KeyP') this.pause(!this.paused);
    };
    window.addEventListener('keydown', onKey);
    const onHide = (): void => {
      if (document.hidden) this.pause(true);
    };
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    });

    this.bannerText = label(this, w / 2, view.h * 0.3, '', { size: 32, face: 'display' }).setDepth(20).setAlpha(0);
    this.underText = label(this, w / 2, view.h * 0.3 + 40, '', { size: 16, color: HOLY.fill, wrap: Math.min(520, w - 40) }).setDepth(20).setAlpha(0);
    this.campText = label(this, w / 2, view.tall ? 150 : 96, '', { size: 16, wrap: Math.min(560, w - 40) }).setDepth(12);

    // The contract's tasks and the party, one line each under the hunter's bar: plain for now.
    // Under the hunter's plate: a small plate for each partner, and the contract's tasks on a strip of old paper.
    this.buildParty(hunt);
    this.buildFight(hunt);
    this.buildCamp(hunt);

    this.stick = this.add.graphics().setDepth(5);
    this.plate = null;
    this.shownStep = '';
    this.plateUntil = 0;
    if (!hunt.camps) this.buildPlate();
    else if (!save().told.includes('move')) this.showHint();
    if (data.fresh && hunt.phase === 'camp') {
      const things = Object.values(hunt.toPlace).some((n) => n > 0);
      this.banner(things ? 'BUILD YOUR CAMP' : hunt.monster.def.name.toUpperCase(), things ? 'The boss is asleep. Build, then wake it.' : 'The boss is asleep. Wake it when you are ready.');
    }
  }

  // ------------------------------------------------------------ the buttons

  /** One button of the hunt: a picture, a word, its key, a veil that drains as its wait runs out. */
  private pad(
    parent: Phaser.GameObjects.Container, x: number, y: number, icon: string, word: string, ask: Ask, mat: Material, wait: (h: Hunt) => number, left: ((h: Hunt) => number) | null,
    size = PAD, seconds: ((h: Hunt) => number) | null = null, press?: (p: Phaser.Input.Pointer) => void,
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const k = size / PAD;
    // The style's round iron slot, its icon on it, and the word under: the slot is the button.
    c.add(this.add.image(0, -4 * k, uiKey('slot')).setDisplaySize(size + 6, size + 10).setTint(mat === GOLD ? 0xf0d8a8 : 0xffffff));
    const kit = uiIcon(icon);
    c.add(kit ? this.add.image(0, -8 * k, kit).setDisplaySize(40 * k, 40 * k) : this.add.image(0, -8 * k, SHEET, `icon/${icon}`).setScale(ICON * 0.66 * k));
    c.add(label(this, 0, size / 2 - 2, word, { size: 15, face: 'display' }));
    // The wait still to run, as a dark sweep round the slot from the top, as a clock's hand goes.
    const veil = this.add.graphics();
    c.add(veil);
    // The key that does the same, small in the slot's corner, where there are keys.
    if (!this.touch) c.add(label(this, -size / 2 + 2, -size / 2 + 4, KEY_NAMES[ask], { size: 15, align: 'left', color: HOLY.fill, face: 'display' }));
    const count = left ? label(this, size / 2 - 6, -size / 2 + 12, '', { size: 16, align: 'right', color: HOLY.fill }) : null;
    if (count) c.add(count);
    const secs = seconds ? label(this, 0, -8 * k, '', { size: 22, face: 'display' }) : null;
    if (secs) c.add(secs);
    c.setSize(size, size).setInteractive({ useHandCursor: true });
    // It acts as it is pressed, not as it is let go: a roll cannot wait for a finger to lift.
    c.on('pointerdown', (p: Phaser.Input.Pointer) => (press ? press(p) : this.controls.ask(ask)));
    parent.add(c);
    this.pads.push({ ask, root: c, veil, count, wait, left, ready: true, size, secs, seconds });
    return c;
  }

  private buildFight(hunt: Hunt): void {
    const c = this.add.container(0, 0).setDepth(12);
    this.fight = c;
    this.pads = [];
    this.atk = null;
    if (this.touch) this.buildThumbs(hunt, c);
    else this.buildKeys(hunt, c);
  }

  /**
   * Mouse and keys: the hunter's skills, the dodge and the horn in a row bottom right, each with its key in the corner.
   * The mouse attacks and aims; there is no button to press with a thumb.
   */
  private buildKeys(hunt: Hunt, c: Phaser.GameObjects.Container): void {
    const y = view.h - PAD / 2 - 14;
    let x = view.w - PAD / 2 - 14;
    const step = PAD + 8;
    const h = hunt.hunter;
    const [a, b] = hunt.skills;
    this.pad(c, x, y, 'dodge', 'DODGE', 'dodge', BONE, (n) => n.hunter.rollWait / h.def.dodge.wait, null);
    x -= step;
    this.pad(c, x, y, b.id, SHORT[b.id] ?? b.name.toUpperCase(), 'b', IRON, (n) => n.hunter.waits[1] / b.wait, null);
    x -= step;
    this.pad(c, x, y, a.id, SHORT[a.id] ?? a.name.toUpperCase(), 'a', IRON, (n) => n.hunter.waits[0] / a.wait, null);
    hunt.calls.forEach((call, i) => {
      x -= step;
      this.pad(c, x, y, `icon-${call.def.id}`, SHORT[call.def.id] ?? call.def.name.toUpperCase(), `call${i}` as Ask, GOLD, (n) => (n.calls[i].left > 0 ? n.hornWait / 5 : 1), (n) => n.calls[i].left);
    });
    // How the mouse is used, small, beside the row, until the hunter has struck a few times.
    if (save().wins < 3) label(this, x - PAD / 2 - 12, y - 10, 'CLICK: ATTACK\nRIGHT CLICK: DODGE', { size: 15, align: 'right', color: BONE.shade, face: 'display' }).setDepth(12);
  }

  /**
   * Touch: the stick bottom left (drawn each frame), and on the right a big ATTACK with the two skills and the dodge
   * round it in an arc, and the horn further out. A left hand has them the other way round (the pause panel's SIDES).
   */
  private buildThumbs(hunt: Hunt, c: Phaser.GameObjects.Container): void {
    const lefty = !!save().lefty;
    const side = (x: number): number => (lefty ? view.w - x : x);
    const h = hunt.hunter;
    const [a, b] = hunt.skills;
    // Sizes in the layout's units: on a phone a unit is about two thirds of a pixel, so no button is under ~58 pixels.
    const big = 132;
    const small = 92;
    const ax = side(view.w - big / 2 - 26);
    const ay = view.h - big / 2 - 30;
    const sx = side(STICK_R + 64);
    const sy = view.h - STICK_R - 70;
    this.controls.stickHome.x = this.controls.stickAt.x = sx;
    this.controls.stickHome.y = this.controls.stickAt.y = sy;
    // ATTACK: tapped, the blow finds its own mark; held and dragged, it strikes the way it is dragged.
    const atk = this.add.container(ax, ay);
    atk.add(this.add.image(0, -4, uiKey('slot')).setDisplaySize(big + 8, big + 12).setTint(0xe0a090));
    const blade = uiIcon('reap');
    if (blade) atk.add(this.add.image(0, -10, blade).setDisplaySize(58, 58));
    atk.add(label(this, 0, big / 2 - 4, 'ATTACK', { size: 17, face: 'display' }));
    atk.setSize(big, big).setInteractive();
    atk.on('pointerdown', (p: Phaser.Input.Pointer) => this.controls.press('attack', p));
    c.add(atk);
    this.atk = atk;
    // Round it: the skills and the dodge, a quarter circle from beside it to over it; the horn beyond.
    const r = big / 2 + small / 2 + 32;
    const at = (deg: number, rr: number): [number, number] => {
      const t = (deg * Math.PI) / 180;
      return [ax + (lefty ? -1 : 1) * Math.cos(t) * rr, ay + Math.sin(t) * rr];
    };
    const [dx, dy] = at(180, r);
    this.pad(c, dx, dy, 'dodge', 'DODGE', 'dodge', BONE, (n) => n.hunter.rollWait / h.def.dodge.wait, null, small, (n) => n.hunter.rollWait, (p) => this.controls.press('dodge', p));
    const [bx, by] = at(225, r);
    this.pad(c, bx, by, b.id, SHORT[b.id] ?? b.name.toUpperCase(), 'b', IRON, (n) => n.hunter.waits[1] / b.wait, null, small, (n) => n.hunter.waits[1], (p) => this.controls.press('b', p));
    const [qx, qy] = at(270, r);
    this.pad(c, qx, qy, a.id, SHORT[a.id] ?? a.name.toUpperCase(), 'a', IRON, (n) => n.hunter.waits[0] / a.wait, null, small, (n) => n.hunter.waits[0], (p) => this.controls.press('a', p));
    hunt.calls.forEach((call, i) => {
      const [hx, hy] = at(i === 0 ? 200 : 250, r + small + 14);
      this.pad(c, hx, hy, `icon-${call.def.id}`, SHORT[call.def.id] ?? call.def.name.toUpperCase(), `call${i}` as Ask, GOLD, (n) => (n.calls[i].left > 0 ? n.hornWait / 5 : 1), (n) => n.calls[i].left, small);
    });
    // The cancel mark: over the arc, where a thumb aiming a skill can slide to call it off.
    const [cx, cy] = at(270, r + small + 70);
    this.controls.cancelAt = { x: cx, y: Math.max(cy, this.by + 120), r: 46 };
  }

  /** The other way of playing was just used: its buttons in place of these. */
  private rescheme(): void {
    const hunt = theHunt();
    if (!hunt) return;
    const shown = this.fight?.visible ?? true;
    this.fight?.destroy();
    this.buildFight(hunt);
    this.fight?.setVisible(shown);
    this.shownStep = '';
    if (this.hint) {
      this.hint.destroy();
      this.showHint();
    }
  }

  private buildCamp(hunt: Hunt): void {
    const c = this.add.container(0, 0).setDepth(12);
    this.camp = c;
    const brought = BUILDINGS.filter((b) => b.id in hunt.toPlace);
    const bw = view.tall ? Math.min(138, (view.w - 24) / Math.max(1, brought.length) - 8) : 136;
    const y = view.h - 44;
    const wakeW = 170;
    // What there is to build in a row along the bottom; the waking on the right, or over the row where the window is narrow.
    const row = brought.length * (bw + 8);
    const x0 = view.tall ? view.w / 2 - row / 2 + bw / 2 + 4 : 16 + bw / 2;
    brought.forEach((b, i) => {
      const x = x0 + i * (bw + 8);
      const box = this.add.container(x, y);
      box.add(slabImage(this, -bw / 2, -30, bw, 60, IRON, 12, 6));
      const key = this.touch ? '' : `${KEY_NAMES[`place${i}` as Ask]}  `;
      const text = label(this, 0, -3, '', { size: 15 });
      box.add(text);
      box.setSize(bw, 60).setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => {
        // Why it will not go down here is said: the rules know.
        const why = hunt.whyNot(b.id);
        if (why) {
          sfx.play('deny', 0.6);
          this.banner('', why.toUpperCase());
        } else this.controls.ask(`place${i}` as Ask);
      });
      c.add(box);
      this.campPads.push({ root: box, text, id: b.id, n: -1 });
      text.setData('key', key).setData('name', b.name.toUpperCase());
    });
    const wx = view.tall ? view.w / 2 : view.w - wakeW / 2 - 14;
    const wy = view.tall && brought.length ? y - 76 : y;
    const wake = new Button(this, wx, wy, 'WAKE BOSS', () => this.controls.ask('wake'), { width: wakeW, height: 60, size: 24, mat: RUBY });
    c.add(wake.root);
  }

  // ------------------------------------------------------------ what is said

  /** Words across the lair for a moment: a name, and a line under it. */
  banner(text: string, under: string): void {
    this.tweens.killTweensOf([this.bannerText, this.underText]);
    // Under the bars, where nothing fights, and gone quickly: a banner must not lie over the boss or the hunter.
    const y = this.by + (view.tall ? 74 : 66);
    this.bannerText.setText(text).setAlpha(text ? 1 : 0).setScale(text ? 1.15 : 1).setY(y);
    this.underText.setText(under).setAlpha(under ? 1 : 0).setY(y + (text ? 28 : 0));
    if (text) this.tweens.add({ targets: this.bannerText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [this.bannerText, this.underText], alpha: 0, delay: 1000, duration: 350 });
    // A line said under a banner waits its turn: it is moved below it while the banner shows.
    this.bannerUntil = this.clock + 1.35;
  }

  /** The hunter was struck: the screen says so. */
  struck(): void {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0.3);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 320 });
  }

  /**
   * The plate of a hunt that teaches: one short line saying what to do now, and how far through the steps it is. It
   * sits off the fight: beside the buttons at the foot of a wide window, over them in a tall one.
   */
  private buildPlate(): void {
    const padsW = 3 * (PAD + 8) + Math.round(PAD * 1.3) + 22;
    const pw = view.tall ? view.w - 24 : Math.min(600, view.w - padsW - 28);
    const ph = 62;
    const x = view.tall ? view.w / 2 : 14 + pw / 2;
    const y = view.tall ? view.h - PAD - 36 - ph / 2 : view.h - 14 - ph / 2;
    const c = this.add.container(x, y).setDepth(14);
    this.plateBack = slabImage(this, -pw / 2, -ph / 2, pw, ph, IRON, 12, 6);
    this.plateText = label(this, 0, -8, '', { size: 18, wrap: pw - 28 });
    this.plateStep = label(this, 0, ph / 2 - 15, '', { size: 15, color: HOLY.fill });
    c.add([this.plateBack, this.plateText, this.plateStep]);
    c.setAlpha(0);
    this.plate = c;
  }

  /** Shows the step waited on, or what is said when the last is done, and lets the plate go when there is nothing to say. */
  private showPlate(hunt: Hunt): void {
    const c = this.plate;
    if (!c) return;
    const t = hunt.teaching;
    const id = t ? t.step.id : this.clock < this.plateUntil ? 'after' : '';
    if (id === this.shownStep) return;
    this.shownStep = id;
    this.tweens.killTweensOf(c);
    if (!id) {
      this.tweens.add({ targets: c, alpha: 0, duration: 400 });
      return;
    }
    if (t) {
      this.plateText.setText(this.touch ? t.step.says.touch : t.step.says.keys);
      this.plateStep.setText(`${t.index + 1} / ${t.of}`);
    }
    // Long lines sit a little higher, so that the count under them is clear.
    this.plateText.setY(this.plateText.height > 30 ? -12 : -8);
    c.setAlpha(1).setScale(1.12);
    this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /** Says a thing once in a player's life: the first time it matters. */
  private teach(key: string, text: string): void {
    const s = save();
    if (s.told.includes(key)) return;
    s.told.push(key);
    commit();
    this.banner('', text);
  }

  /** What has just happened in the lair, for what it teaches: the tells are the lesson, and these are its few words. */
  noted(e: Ev): void {
    const hunt = theHunt();
    if (hunt && !hunt.camps) {
      // A hunt that teaches says everything on its plate, and nothing across the lair.
      if (e.t === 'learned') {
        sfx.play('click', 0.7, 1.4);
        if (e.id === 'move' && !save().told.includes('move')) {
          save().told.push('move');
          commit();
        }
      } else if (e.t === 'taught' && this.plate) {
        this.plateText.setText(e.says);
        this.plateStep.setText('');
        this.plateUntil = this.clock + 3.5;
      }
      return;
    }
    // The horn, the first time there is something to call.
    if (e.t === 'wake' && hunt && hunt.calls.length > 0) {
      const name = hunt.calls[0].def.name;
      this.teach('horn', this.touch ? `TAP THE HORN TO CALL YOUR ${name.toUpperCase()}.` : `PRESS ${KEY_NAMES.call0} TO CALL YOUR ${name.toUpperCase()}.`);
    }
    if (save().wins > 2) return;
    if (e.t === 'tell' && e.first) this.teach('tell', 'RED ON THE GROUND IS WHERE THE BOSS WILL HIT. GET OUT OF IT.');
    else if (e.t === 'hurt' && e.who === 'hunter') this.teach('roll', this.touch ? 'DODGE GOES THROUGH A HIT.' : 'SPACE: DODGE THROUGH A HIT.');
    else if (e.t === 'open' && e.why === 'recover') this.teach('open', 'GOLD RING: THE BOSS IS OPEN. ATTACK NOW TO STUN IT.');
    else if (e.t === 'summon') this.teach('summon', 'THE DEAD RISE WHERE THE GROUND WAS MARKED.');
    else if (e.t === 'crash') this.teach('crash', 'THE BOSS IS DAZED WHEN IT RUNS INTO SOMETHING.');
  }

  /** How to move, shown to someone who has not yet: keys on a keyboard, a finger on a phone. */
  private showHint(): void {
    const c = this.add.container(view.w / 2, view.h * 0.62).setDepth(15);
    if (this.touch) {
      c.add(label(this, 0, 0, 'MOVE WITH THE STICK, BOTTOM LEFT', { size: 20 }));
    } else {
      const cap = (x: number, y: number, t: string): void => {
        c.add(slabImage(this, x - 17, y - 17, 34, 34, BONE, 8, 5));
        c.add(label(this, x, y - 2, t, { size: 17, color: OUTLINE, stroke: null }));
      };
      cap(-116, -20, 'W');
      cap(-152, 18, 'A');
      cap(-116, 18, 'S');
      cap(-80, 18, 'D');
      c.add(label(this, 44, -12, 'MOVE', { size: 22 }));
      c.add(label(this, 44, 16, 'or the arrow keys', { size: 15, color: BONE.shade }));
    }
    this.tweens.add({ targets: c, scale: 1.04, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.hint = c;
  }

  /** Stops the hunt, or lets it go on. */
  pause(on: boolean): void {
    const lair = this.scene.get('Lair') as LairScene;
    const hunt = theHunt();
    if (!hunt || hunt.over) return;
    if (on === !!this.paused) return;
    if (!on) {
      this.paused?.destroy();
      this.paused = null;
      lair.halted = false;
      ads().gameplayStart();
      return;
    }
    lair.halted = true;
    this.controls.release();
    ads().gameplayStop();
    const c = this.add.container(0, 0).setDepth(100);
    const veil = this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.6).setInteractive();
    const cx = view.w / 2;
    const cy = view.h / 2;
    c.add([veil, slabImage(this, cx - 150, cy - 274, 300, 556, BONE, 18, 8), label(this, cx, cy - 240, 'PAUSED', { size: 30 })]);
    const s = save();
    const toggle = (y: number, name: string, get: () => boolean, set: (v: boolean) => void): void => {
      const b = new Button(this, cx, y, `${name}: ${get() ? 'ON' : 'OFF'}`, () => {
        set(!get());
        commit();
        LairScene.applySound();
        b.setText(`${name}: ${get() ? 'ON' : 'OFF'}`);
      }, { width: 220, height: 46, size: 19, mat: IRON });
      c.add(b.root);
    };
    c.add(new Button(this, cx, cy - 184, 'RESUME', () => this.pause(false), { width: 220, height: 54, size: 24, mat: GOLD }).root);
    toggle(cy - 124, 'SOUND', () => s.sound, (v) => (s.sound = v));
    toggle(cy - 70, 'MUSIC', () => s.music, (v) => (s.music = v));
    // The lines said in a hunt are spice: some would rather play in silence.
    toggle(cy - 16, 'LINES', () => s.talk !== false, (v) => {
      s.talk = v;
      lair.talk.on = v;
      if (!v) lair.talk.drop();
    });
    // How much of the light is made: all of it, the cheap part, or none. A slow machine wants less.
    const light = new Button(this, cx, cy + 38, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
      setLightMode(nextLightMode(lightMode()), true);
      lair.setLight(lightMode());
      light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
    }, { width: 220, height: 46, size: 19, mat: IRON });
    c.add(light.root);
    // How hard the screen is shaken and flashed by a blow: some players want it felt, some find it hard to watch.
    const feel = new Button(this, cx, cy + 92, `EFFECTS: ${FEEL_NAMES[feelMode()]}`, () => {
      setFeelMode(nextFeelMode(feelMode()));
      feel.setText(`EFFECTS: ${FEEL_NAMES[feelMode()]}`);
    }, { width: 220, height: 46, size: 19, mat: IRON });
    c.add(feel.root);
    // On a touch screen, which hand has the stick: a left hand wants the buttons on the left.
    const sides = new Button(this, cx, cy + 146, `BUTTONS: ${s.lefty ? 'LEFT' : 'RIGHT'}`, () => {
      s.lefty = !s.lefty;
      commit();
      sides.setText(`BUTTONS: ${s.lefty ? 'LEFT' : 'RIGHT'}`);
      this.rescheme();
    }, { width: 220, height: 46, size: 19, mat: IRON });
    c.add(sides.root);
    c.add(new Button(this, cx, cy + 222, 'GIVE UP', () => {
      hunt.giveUp();
      this.paused?.destroy();
      this.paused = null;
      lair.halted = false;
    }, { width: 220, height: 46, size: 19, mat: RUBY }).root);
    this.paused = c;
    sfx.play('open', 0.6);
  }

  /** Plates for the partners and a strip for the tasks, built once; their bars and ticks are drawn each frame. */
  private buildParty(hunt: Hunt): void {
    this.partyMarks = [];
    this.taskLines = [];
    this.taskCounts = [];
    this.partyTop = 68;
    const partners = hunt.party.filter((p) => p.index > 0);
    partners.forEach((p, i) => {
      const y = this.partyTop + i * 40;
      this.add.existing(slabImage(this, 10, y, 170, 34, IRON, 2, 3)).setDepth(9);
      // A hand for hire has no likeness drawn yet: the plate goes without.
      if (this.textures.get(CARDS).has(portraitFrame('grim', p.def.id))) {
        const face = this.add.image(28, y + 17, CARDS, portraitFrame('grim', p.def.id)).setDepth(11);
        face.setScale(Math.min(26 / face.width, 28 / face.height));
      }
      label(this, 46, y + 10, p.def.short.toUpperCase(), { size: 15, align: 'left', face: 'display' }).setDepth(12);
      this.partyMarks.push(label(this, 172, y + 10, '', { size: 15, align: 'right', color: '#e05040', face: 'display' }).setDepth(12));
    });
    this.taskTop = this.partyTop + partners.length * 40 + (partners.length ? 4 : 0);
    if (hunt.tasks.length) {
      const h = 10 + hunt.tasks.length * 22;
      this.add.existing(slabImage(this, 10, this.taskTop, 230, h, BONE, 2, 3)).setDepth(9);
      hunt.tasks.forEach((t, i) => {
        // The task's name and how far along it is: what it asks in full is on its bill at the lodge.
        const line = label(this, 36, this.taskTop + 16 + i * 22, t.name, { size: 15, align: 'left', color: '#2a1c10', stroke: null });
        line.setScale(Math.min(1, 120 / line.width)).setDepth(12);
        this.taskLines.push(line);
        this.taskCounts.push(label(this, 232, this.taskTop + 16 + i * 22, '', { size: 15, align: 'right', color: '#2a1c10', stroke: null }).setDepth(12));
      });
    }
    this.partyBars = this.add.graphics().setDepth(11);
  }

  /** The partners' health, a down mark and the help ring's share; each task's box, ticked or struck out. */
  private drawParty(hunt: Hunt): void {
    const g = this.partyBars;
    if (!g) return;
    g.clear();
    hunt.party.filter((p) => p.index > 0).forEach((p, i) => {
      const y = this.partyTop + i * 40;
      g.fillStyle(0x050404, 1).fillRect(46, y + 21, 122, 7);
      if (p.down) {
        // Down: the bar is the help they are being given, filling toward getting up.
        g.fillStyle(0xc89a4a, 1).fillRect(46, y + 21, 122 * Math.min(1, p.help / REVIVE.time), 7);
        this.partyMarks[i]?.setText('DOWN');
      } else {
        g.fillStyle(0x7a1a14, 1).fillRect(46, y + 21, 122 * (p.hp / p.maxHp), 7);
        g.fillStyle(0xb8382a, 1).fillRect(46, y + 21, 122 * (p.hp / p.maxHp), 2);
        this.partyMarks[i]?.setText(hunt.targetWho === p.index ? 'TARGET' : '');
      }
    });
    hunt.tasks.forEach((t, i) => {
      const y = this.taskTop + 16 + i * 22;
      this.taskCounts[i]?.setText(taskCount(t));
      g.lineStyle(2, 0x2a1c10, 1).strokeRect(18, y - 7, 13, 13);
      if (t.done) {
        g.lineStyle(3, 0x2e5f2a, 1).beginPath().moveTo(19, y).lineTo(24, y + 5).lineTo(33, y - 9).strokePath();
        this.taskLines[i]?.setColor('#2e5f2a');
        this.taskCounts[i]?.setColor('#2e5f2a');
      } else if (t.failed) {
        g.lineStyle(3, 0x8a1e16, 1).beginPath().moveTo(18, y - 7).lineTo(31, y + 6).moveTo(31, y - 7).lineTo(18, y + 6).strokePath();
        this.taskLines[i]?.setColor('#8a1e16');
        this.taskCounts[i]?.setColor('#8a1e16');
      }
    });
  }

  /**
   * Both health bars, drawn each frame in the style's hand: an iron trough with a dark rim and rivets, blood that is
   * deep red with a lit top, and behind it the part a blow took, paler, draining away after a breath so that a player
   * sees how much it took. A blow flashes the bar white; healing rises pale. The boss's bar has an iron post at each
   * change of phase with the phase's number over it, and under it the stagger in a trough of its own toward a gold
   * break mark.
   */
  private drawBars(hunt: Hunt, dt: number): void {
    const g = this.bars;
    const h = hunt.hunter;
    const m = hunt.monster;
    g.clear();
    const trough = (x: number, y: number, w: number, hgt: number): void => {
      g.fillStyle(0x0d0b09, 1).fillRect(x - 3, y - 3, w + 6, hgt + 6);
      g.fillStyle(0x4a4640, 1).fillRect(x - 2, y - 2, w + 4, 1.5);
      g.fillStyle(0x050404, 1).fillRect(x, y, w, hgt);
    };
    const blood = (x: number, y: number, w: number, hgt: number, share: number, deep: number, lit: number): void => {
      if (share <= 0) return;
      g.fillStyle(deep, 1).fillRect(x, y, w * share, hgt);
      g.fillStyle(lit, 1).fillRect(x, y, w * share, Math.max(2, hgt * 0.32));
    };
    // The hunter's.
    if (h.hp < this.hpShown - 0.5) this.hpFlash = 0.14;
    const healing = h.hp > this.hpShown + 0.5;
    this.hpShown = healing ? Math.min(h.hp, this.hpShown + h.maxHp * dt * 0.8) : h.hp;
    this.hpLag = this.hpLag > h.hp ? Math.max(h.hp, this.hpLag - h.maxHp * dt * (this.hpFlash > 0 ? 0 : 0.35)) : h.hp;
    const hx = 62;
    const hy = 32;
    const hw = 176;
    trough(hx, hy, hw, 14);
    blood(hx, hy, hw, 14, this.hpLag / h.maxHp, 0x5a3a30, 0x7a5a4a);
    if (healing) blood(hx, hy, hw, 14, h.hp / h.maxHp, 0xb8a080, 0xe0d0b0);
    blood(hx, hy, hw, 14, this.hpShown / h.maxHp, 0x7a1a14, 0xb8382a);
    if (this.hpFlash > 0) g.fillStyle(0xffffff, Math.min(1, this.hpFlash * 6)).fillRect(hx, hy, hw * (this.hpLag / h.maxHp), 14);
    this.hpFlash = Math.max(0, this.hpFlash - dt);
    for (let k = 1; k < 4; k++) g.fillStyle(0x0d0b09, 0.6).fillRect(hx + (hw * k) / 4 - 0.5, hy, 1, 14);
    this.hpText.setText(`${Math.ceil(h.hp)} / ${h.maxHp}`);
    // Near death: the bar's text goes red, the screen's edge goes red and pulses.
    const near = h.hp > 0 && h.hp / h.maxHp < 0.3;
    this.hpText.setColor(near ? '#e05040' : BONE.fill);
    // The screen's own low-health mood is the light's (LairLight: the colors drain and the edges beat red): one, not two.
    this.low.setAlpha(0);

    // The boss's.
    const { bx, by, bw } = this;
    if (m.hp < this.bossShown - 0.5) this.bossFlash = 0.1;
    this.bossShown = m.hp;
    this.bossLag = this.bossLag > m.hp ? Math.max(m.hp, this.bossLag - m.maxHp * dt * (this.bossFlash > 0 ? 0 : 0.12)) : m.hp;
    trough(bx, by, bw, 14);
    const broken = m.state === 'broken';
    blood(bx, by, bw, 14, this.bossLag / m.maxHp, 0x5a3a30, 0x7a5a4a);
    blood(bx, by, bw, 14, m.hp / m.maxHp, broken ? 0xa07428 : 0x7a1a14, broken ? 0xf0d080 : 0xb8382a);
    if (this.bossFlash > 0) g.fillStyle(0xffffff, Math.min(0.8, this.bossFlash * 7)).fillRect(bx, by, bw * (this.bossLag / m.maxHp), 14);
    this.bossFlash = Math.max(0, this.bossFlash - dt);
    // An iron post at each change of phase, with a rivet on it.
    for (const cut of hunt.cuts) {
      const x = bx + bw * cut;
      g.fillStyle(0x0d0b09, 1).fillRect(x - 3, by - 5, 6, 24);
      g.fillStyle(0x6a645a, 1).fillRect(x - 2, by - 4, 4, 22);
      g.fillStyle(0xb0a890, 1).fillCircle(x, by + 7, 1.6);
    }
    // The stagger, toward its break mark.
    const sy = by + 24;
    trough(bx, sy, bw, 7);
    const st = Math.min(1, m.stagger / m.staggerMax);
    if (st > 0) {
      g.fillStyle(0xa07428, 1).fillRect(bx, sy, bw * st, 7);
      g.fillStyle(0xf0d080, 1).fillRect(bx, sy, bw * st, 2);
    }
    g.fillStyle(st >= 1 ? 0xffe8a0 : 0xc89a4a, 1);
    g.fillTriangle(bx + bw + 4, sy - 3, bx + bw + 11, sy + 3.5, bx + bw + 4, sy + 10);
  }

  /**
   * The line being said, as a small caption that hangs by whoever says it, or under the boss's bars for something
   * heard. It is moved as they move. Where it would lie over a warning on the ground or over the hunter it is tried
   * on the other side of the speaker, and if there is no room there either it is dropped: a line never hides what
   * has to be read.
   */
  private showSaid(): void {
    const lair = this.scene.get('Lair') as LairScene | undefined;
    const now = lair?.talk?.now ?? null;
    if (!now || !lair) {
      if (this.said) {
        const c = this.said;
        this.said = null;
        this.tweens.add({ targets: c, alpha: 0, duration: 260, onComplete: () => c.destroy() });
      }
      return;
    }
    if (now.id !== this.saidId) {
      this.said?.destroy();
      this.saidId = now.id;
      this.saidHeard = now.heard;
      const c = this.add.container(0, 0).setDepth(13);
      const wrap = Math.min(300, view.w - 40);
      const line = label(this, 0, 0, now.says, { size: 17, wrap, color: now.heard ? BONE.shade : BONE.fill, weight: now.heard ? 600 : 700 });
      const name = now.heard ? null : label(this, 0, 0, now.name, { size: 15, color: HOLY.fill });
      const w = Math.max(line.width, name?.width ?? 0) + 24;
      const h = line.height + (name ? name.height - 2 : 0) + 14;
      name?.setPosition(0, -h / 2 + 7 + (name?.height ?? 0) / 2);
      line.setPosition(0, h / 2 - 7 - line.height / 2);
      const g = this.add.graphics();
      g.fillStyle(0x0d0b09, now.heard ? 0.6 : 0.85).fillRect(-w / 2, -h / 2, w, h);
      if (!now.heard) g.lineStyle(1.5, now.matters ? 0x9a2a20 : 0x7a7064, 0.9).strokeRect(-w / 2, -h / 2, w, h);
      c.add([g, ...(name ? [name] : []), line]);
      this.saidW = w;
      this.saidH = h;
      c.setAlpha(0).setScale(0.9);
      this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 200, ease: 'Back.easeOut' });
      this.said = c;
    }
    const c = this.said;
    if (!c) return;
    const w = this.saidW;
    const h = this.saidH;
    // Kept off the bars at the top and the buttons and plate at the foot.
    // Clear of the bars and the stagger's mark, and of a banner while one shows.
    const top = this.by + (this.clock < this.bannerUntil ? 120 : 64);
    const foot = view.h - PAD - (view.tall ? 120 : 40);
    const place = (x: number, y: number): [number, number] => [Math.max(8 + w / 2, Math.min(view.w - 8 - w / 2, x)), Math.max(top + h / 2, Math.min(foot - h / 2, y))];
    let at: [number, number] | null;
    if (this.saidHeard) at = place(view.w / 2, top + h / 2 + 4);
    else {
      const p = lair.speakerAt(now.who);
      if (!p) at = null;
      else {
        const above = place(p.x, p.y - h / 2 - 6);
        const below = place(p.x, p.y + h / 2 + 150);
        at = [above, below].find(([x, y]) => lair.clearOf(x - w / 2, y - h / 2, x + w / 2, y + h / 2)) ?? null;
      }
    }
    if (!at) {
      // No room by the speaker that hides nothing: the line goes unsaid.
      lair.talk.drop();
      c.destroy();
      this.said = null;
      return;
    }
    c.setPosition(at[0], at[1]);
  }

  override update(_time: number, delta: number): void {
    const hunt = theHunt();
    if (!hunt || !this.bars) return;
    this.clock += Math.min(0.1, delta / 1000);
    this.drawParty(hunt);
    const h = hunt.hunter;
    const m = hunt.monster;
    const camp = hunt.phase === 'camp';
    this.showSaid();
    this.camp?.setVisible(camp);
    this.fight?.setVisible(!camp);

    this.drawBars(hunt, Math.min(0.1, delta / 1000));
    // Under its bars: what it is doing, by name, while it prepares it; and that it is open, or broken, when it is.
    const doing = m.state === 'tell' || m.state === 'dash' ? (m.attack?.name ?? '').toUpperCase() : '';
    const state = doing || (m.state === 'asleep' ? 'ASLEEP' : m.state === 'broken' ? 'STUNNED' : m.state === 'shift' ? '' : hunt.open ? 'OPEN: ATTACK' : '');
    this.stateText.setText(state).setColor(doing ? RUBY.fill : HOLY.fill).setAlpha(state === 'STUNNED' ? 0.6 + 0.4 * Math.sin(this.clock * 12) ** 2 : 1);

    // Camp: what is left to build, and what to do.
    if (camp) {
      let any = false;
      for (const p of this.campPads) {
        const n = hunt.toPlace[p.id] ?? 0;
        if (n > 0) any = true;
        if (n !== p.n) {
          p.n = n;
          p.text.setText(`${p.text.getData('key') as string}${p.text.getData('name') as string} x${n}`);
          p.root.setAlpha(n > 0 ? 1 : 0.4);
        }
      }
      this.campText.setText(any ? (this.touch ? 'Stand where you want it and press its button.' : 'Stand where you want it and press its button or number.') : 'Walk into the red ring, or press WAKE BOSS.');
    } else this.campText.setText('');

    // A hunt that teaches: its plate, and the button the step is about beats so that it is found.
    this.showPlate(hunt);
    const step = hunt.teaching?.step;
    if (this.atk) this.atk.setScale(this.controls.attackHeld ? 0.94 : step?.wants === 'strike' ? 1.06 + 0.07 * Math.sin(this.clock * 9) : 1);
    const wanted: Ask | null = step?.wants === 'dodge' ? 'dodge' : step?.wants === 'skill' ? (step.skill === 0 ? 'a' : 'b') : null;

    // Each button: its veil is as tall as the share of its wait still to run.
    if (!camp) {
      for (const p of this.pads) {
        if (!this.tweens.isTweening(p.root)) p.root.setScale(p.ask === wanted ? 1.08 + 0.08 * Math.sin(this.clock * 9) : 1);
        const wait = Math.max(0, Math.min(1, p.wait(hunt)));
        p.veil.clear();
        const k = p.size / PAD;
        if (wait > 0.001) {
          p.veil.fillStyle(0x0b0908, 0.72);
          p.veil.slice(0, -8 * k, p.size / 2 - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wait, false).fillPath();
        }
        if (p.count && p.left) p.count.setText(`x${p.left(hunt)}`);
        // On a thumb's button the seconds still to wait are written on it, and it is dimmed till then.
        const secs = p.seconds ? p.seconds(hunt) : 0;
        p.secs?.setText(secs > 0.05 && wait > 0.001 ? (secs < 1 ? secs.toFixed(1) : String(Math.ceil(secs))) : '');
        if (p.seconds) p.root.setAlpha(wait > 0.001 ? 0.62 : 1);
        const ready = wait <= 0;
        if (ready && !p.ready) this.tweens.add({ targets: p.root, scale: { from: 1.18, to: 1 }, duration: 240, ease: 'Back.easeOut' });
        p.ready = ready;
      }
    }

    // Badly hurt: the edge of the screen beats red, so that it is known without looking up at the bar.
    if (!this.tweens.isTweening(this.flash)) this.flash.setAlpha(h.hp > 0 && h.hp <= h.maxHp * 0.3 ? 0.06 + 0.06 * Math.sin(this.clock * 7) ** 2 : 0);

    // The stick, on a touch screen only: its base always there, faint, and the knob where the thumb pushes it.
    const ct = this.controls;
    const g = this.stick;
    g.clear();
    if (this.touch && !this.paused) {
      const held = ct.sticking;
      const { x, y } = ct.stickAt;
      g.fillStyle(hex(OUTLINE), held ? 0.34 : 0.22).fillCircle(x, y, STICK_R + 18);
      g.lineStyle(3, hex(BONE.fill), held ? 0.6 : 0.3).strokeCircle(x, y, STICK_R + 18);
      // Four small marks round the rim: the ways.
      for (let i = 0; i < 4; i++) {
        const t = (i * Math.PI) / 2;
        g.fillStyle(hex(BONE.fill), 0.3).fillCircle(x + Math.cos(t) * (STICK_R + 6), y + Math.sin(t) * (STICK_R + 6), 3);
      }
      g.fillStyle(hex(BONE.fill), held ? 0.85 : 0.5).fillCircle(x + ct.knob.x, y + ct.knob.y, 30);
      g.lineStyle(3, hex(OUTLINE), 0.8).strokeCircle(x + ct.knob.x, y + ct.knob.y, 30);
      // Aiming a skill or the dodge: the cancel mark, which goes red under the thumb.
      const aiming = ct.skillDrag ?? ct.dodgeDrag;
      if (aiming && Controls.dragged(aiming) >= DRAG_MIN) {
        const c = ct.cancelAt;
        const on = ct.cancelling;
        g.fillStyle(on ? 0x8a1e16 : hex(OUTLINE), on ? 0.9 : 0.55).fillCircle(c.x, c.y, c.r);
        g.lineStyle(3, hex(BONE.fill), 0.8).strokeCircle(c.x, c.y, c.r);
        g.lineStyle(6, hex(BONE.fill), 0.9).lineBetween(c.x - 14, c.y - 14, c.x + 14, c.y + 14).lineBetween(c.x + 14, c.y - 14, c.x - 14, c.y + 14);
      }
    }

    // Once they have walked, they know how.
    if (this.hint && this.controls.used) {
      const hint = this.hint;
      this.hint = null;
      this.tweens.killTweensOf(hint);
      this.tweens.add({ targets: hint, alpha: 0, duration: 300, onComplete: () => hint.destroy() });
      save().told.push('move');
      commit();
    }
  }
}

/** How far along a task is, short, for the end of its line: halves of a down as halves. */
function taskCount(t: TaskState): string {
  const n = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  switch (t.id) {
    case 'swift':
      return `${t.now} / ${t.n} s`;
    case 'careful':
      return `hit ${t.now} / ${t.n}`;
    case 'breaks':
    case 'markers':
      return `${t.now} / ${t.n}`;
    case 'villagers':
      return `${t.now} left`;
    case 'together':
      return `down ${n(t.now)} / ${t.n}`;
    default:
      return '';
  }
}
