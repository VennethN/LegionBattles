// What lies over the lair: the hunter's health, the monster's in its three
// parts with its stagger under it, the buttons for what the hunter can do
// (which are also what teaches the keys), and the stick under a finger. In
// camp it shows what there is to build instead. It reads the hunt and shows
// it; the lair itself is the screen under this one.
//
// It also takes the steering, because it is the screen on top: a press that
// lands on one of its buttons is the button's, and any other press is the
// stick.

import Phaser from 'phaser';
import { BONE, GOLD, HOLY, IRON, OUTLINE, RUBY, STEEL, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { BUILDINGS } from '../../game/content';
import type { Ev, Hunt } from '../../game/hunt';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { abilityIcon } from '../icons';
import { Controls, KEY_NAMES, type Ask } from '../input';
import { SHEET } from '../art/Sheet';
import { commit, save, theHunt } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
import { LairScene } from './LairScene';

const ICON = 0.5;
const PAD = 70;

/** A button of the hunt: what it asks for, and how it reads whether it is ready. */
interface Pad {
  root: Phaser.GameObjects.Container;
  veil: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text | null;
  /** How much of its wait is left, as a share, and how many it has left where it counts. */
  wait: (h: Hunt) => number;
  left: ((h: Hunt) => number) | null;
  ready: boolean;
}

/** The short word on a pad for each thing: a pad is narrow. */
const SHORT: Record<string, string> = { jawtrap: 'TRAP', tarflask: 'TAR', seton: 'SET ON', lamp: 'LAMP', pikemen: 'PIKES', crossbowmen: 'BOWS', sappers: 'SAPPERS' };

export class HudScene extends Phaser.Scene {
  controls!: Controls;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private underText!: Phaser.GameObjects.Text;
  private campText!: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Container | null = null;
  private stick!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Image;
  private paused: Phaser.GameObjects.Container | null = null;
  private pads: Pad[] = [];
  private campPads: Array<{ root: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; id: string; n: number }> = [];
  private camp: Phaser.GameObjects.Container | null = null;
  private fight: Phaser.GameObjects.Container | null = null;
  private drawn = '';
  private clock = 0;
  private touch = false;
  /** Where the monster's bar is, and how wide. */
  private bx = 0;
  private by = 0;
  private bw = 300;

  constructor() {
    super('Hud');
  }

  create(data: { fresh?: boolean }): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.drawn = '';
    this.paused = null;
    this.hint = null;
    this.pads = [];
    this.campPads = [];
    this.clock = 0;
    const hunt = theHunt();
    if (!hunt) return;
    const w = view.w;
    this.touch = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;

    // Struck: the whole screen goes red for a breath.
    this.flash = this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(RUBY.fill)).setAlpha(0).setDepth(1);

    this.bars = this.add.graphics().setDepth(10);
    this.add.image(26, 26, SHEET, 'icon/heart').setScale(ICON * 0.62).setDepth(11);
    this.hpText = label(this, 132, 25, '', { size: 15 }).setDepth(12);
    label(this, 46, 50, hunt.hunter.def.short.toUpperCase(), { size: 15, align: 'left' }).setDepth(12);

    // The monster's bar: across the top of a wide window, and under the hunter's in a tall one, where there is no room beside it.
    this.bw = view.tall ? w - 60 : Math.min(360, w - 420);
    this.bx = view.tall ? 30 : w / 2 - this.bw / 2;
    this.by = view.tall ? 88 : 30;
    label(this, this.bx + this.bw / 2, this.by - 15, hunt.monster.def.name.toUpperCase(), { size: 16, color: RUBY.fill }).setDepth(12);
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

    this.bannerText = label(this, w / 2, view.h * 0.3, '', { size: 44 }).setDepth(20).setAlpha(0);
    this.underText = label(this, w / 2, view.h * 0.3 + 40, '', { size: 18, color: HOLY.fill, wrap: Math.min(520, w - 40) }).setDepth(20).setAlpha(0);
    this.campText = label(this, w / 2, view.tall ? 150 : 96, '', { size: 16, wrap: Math.min(560, w - 40) }).setDepth(12);

    this.buildFight(hunt);
    this.buildCamp(hunt);

    this.stick = this.add.graphics().setDepth(5);
    if (!save().told.includes('move')) this.showHint();
    if (data.fresh && hunt.phase === 'camp') {
      const things = Object.values(hunt.toPlace).some((n) => n > 0);
      this.banner(things ? 'SET YOUR CAMP' : hunt.monster.def.name.toUpperCase(), things ? 'It sleeps. Build, then wake it.' : 'It sleeps. Wake it when you are ready.');
    }
  }

  // ------------------------------------------------------------ the buttons

  /** One button of the hunt: a picture, a word, its key, a veil that drains as its wait runs out. */
  private pad(parent: Phaser.GameObjects.Container, x: number, y: number, icon: string, word: string, ask: Ask, mat: Material, wait: (h: Hunt) => number, left: ((h: Hunt) => number) | null): void {
    const c = this.add.container(x, y);
    c.add(slabImage(this, -PAD / 2, -PAD / 2, PAD, PAD, mat, 14, 6));
    c.add(this.add.image(0, -12, SHEET, icon).setScale(ICON * 0.72));
    c.add(label(this, 0, 20, word, { size: 15 }));
    const veil = this.add.image(-PAD / 2 + 3, -PAD / 2 + 3, SHEET, 'fx/solid').setOrigin(0, 0).setTint(hex(OUTLINE)).setAlpha(0.72).setDisplaySize(PAD - 6, 0);
    c.add(veil);
    // The key that does the same, where there are keys.
    if (!this.touch) c.add(label(this, -PAD / 2 + 4, -PAD / 2 - 9, KEY_NAMES[ask], { size: 15, align: 'left', color: HOLY.fill }));
    const count = left ? label(this, PAD / 2 - 6, -PAD / 2 + 12, '', { size: 16, align: 'right', color: HOLY.fill }) : null;
    if (count) c.add(count);
    c.setSize(PAD, PAD).setInteractive({ useHandCursor: true });
    // It acts as it is pressed, not as it is let go: a roll cannot wait for a finger to lift.
    c.on('pointerdown', () => this.controls.ask(ask));
    parent.add(c);
    this.pads.push({ root: c, veil, count, wait, left, ready: true });
  }

  private buildFight(hunt: Hunt): void {
    const c = this.add.container(0, 0).setDepth(12);
    this.fight = c;
    const y = view.h - PAD / 2 - 14;
    let x = view.w - PAD / 2 - 12;
    const step = PAD + 8;
    const h = hunt.hunter;
    const [a, b] = hunt.skills;
    this.pad(c, x, y, 'icon/boot', 'ROLL', 'dodge', BONE, (n) => n.hunter.rollWait / h.def.dodge.wait, null);
    x -= step;
    this.pad(c, x, y, abilityIcon(b.id), SHORT[b.id] ?? b.name.toUpperCase(), 'b', IRON, (n) => n.hunter.waits[1] / b.wait, null);
    x -= step;
    this.pad(c, x, y, abilityIcon(a.id), SHORT[a.id] ?? a.name.toUpperCase(), 'a', IRON, (n) => n.hunter.waits[0] / a.wait, null);
    hunt.calls.forEach((call, i) => {
      x -= step;
      this.pad(c, x, y, 'icon/horn', SHORT[call.def.id] ?? call.def.name.toUpperCase(), `call${i}` as Ask, GOLD, (n) => (n.calls[i].left > 0 ? n.hornWait / 5 : 1), (n) => n.calls[i].left);
    });
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
    const wake = new Button(this, wx, wy, 'WAKE IT', () => this.controls.ask('wake'), { width: wakeW, height: 60, size: 24, mat: RUBY });
    c.add(wake.root);
  }

  // ------------------------------------------------------------ what is said

  /** Words across the lair for a moment: a name, and a line under it. */
  banner(text: string, under: string): void {
    this.tweens.killTweensOf([this.bannerText, this.underText]);
    this.bannerText.setText(text).setAlpha(text ? 1 : 0).setScale(text ? 1.25 : 1);
    this.underText.setText(under).setAlpha(under ? 1 : 0).setY(view.h * 0.3 + (text ? 40 : 0));
    if (text) this.tweens.add({ targets: this.bannerText, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [this.bannerText, this.underText], alpha: 0, delay: 1700, duration: 450 });
  }

  /** The hunter was struck: the screen says so. */
  struck(): void {
    this.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0.3);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 320 });
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
    if (save().wins > 2) return;
    if (e.t === 'tell' && e.first) this.teach('tell', 'RED ON THE GROUND IS WHERE IT WILL STRIKE. STEP OUT OF IT.');
    else if (e.t === 'hurt' && e.who === 'hunter') this.teach('roll', this.touch ? 'ROLL GOES THROUGH A BLOW.' : 'SPACE ROLLS THROUGH A BLOW.');
    else if (e.t === 'open' && e.why === 'recover') this.teach('open', 'A GOLD RING: IT IS OPEN. STRIKE NOW, AND IT WILL BREAK.');
    else if (e.t === 'summon') this.teach('summon', 'THE DEAD GET UP WHERE THE GROUND WAS MARKED.');
    else if (e.t === 'crash') this.teach('crash', 'WHAT IT RUNS INTO DAZES IT.');
  }

  /** How to move, shown to someone who has not yet: keys on a keyboard, a finger on a phone. */
  private showHint(): void {
    const c = this.add.container(view.w / 2, view.h * 0.62).setDepth(15);
    if (this.touch) {
      c.add(label(this, 0, 0, 'DRAG ANYWHERE TO WALK', { size: 20 }));
    } else {
      const cap = (x: number, y: number, t: string): void => {
        c.add(slabImage(this, x - 17, y - 17, 34, 34, BONE, 8, 5));
        c.add(label(this, x, y - 2, t, { size: 17, color: OUTLINE, stroke: null }));
      };
      cap(-116, -20, 'W');
      cap(-152, 18, 'A');
      cap(-116, 18, 'S');
      cap(-80, 18, 'D');
      c.add(label(this, 44, -12, 'WALK', { size: 22 }));
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
    c.add([veil, slabImage(this, cx - 150, cy - 200, 300, 400, BONE, 18, 8), label(this, cx, cy - 162, 'PAUSED', { size: 30 })]);
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
    c.add(new Button(this, cx, cy - 102, 'RESUME', () => this.pause(false), { width: 220, height: 54, size: 24, mat: GOLD }).root);
    toggle(cy - 38, 'SOUND', () => s.sound, (v) => (s.sound = v));
    toggle(cy + 20, 'MUSIC', () => s.music, (v) => (s.music = v));
    // How much of the light is made: all of it, the cheap part, or none. A slow machine wants less.
    const light = new Button(this, cx, cy + 78, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
      setLightMode(nextLightMode(lightMode()), true);
      lair.setLight(lightMode());
      light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
    }, { width: 220, height: 46, size: 19, mat: IRON });
    c.add(light.root);
    c.add(new Button(this, cx, cy + 146, 'GIVE UP', () => {
      hunt.giveUp();
      this.paused?.destroy();
      this.paused = null;
      lair.halted = false;
    }, { width: 220, height: 46, size: 19, mat: RUBY }).root);
    this.paused = c;
    sfx.play('open', 0.6);
  }

  override update(_time: number, delta: number): void {
    const hunt = theHunt();
    if (!hunt || !this.bars) return;
    this.clock += Math.min(0.1, delta / 1000);
    const h = hunt.hunter;
    const m = hunt.monster;
    const camp = hunt.phase === 'camp';
    this.camp?.setVisible(camp);
    this.fight?.setVisible(!camp);

    const key = `${Math.ceil(h.hp)}/${Math.ceil((m.hp / m.maxHp) * 300)}/${Math.round((m.stagger / m.staggerMax) * 100)}/${m.state}`;
    if (key !== this.drawn) {
      this.drawn = key;
      const g = this.bars;
      g.clear();
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(44, 13, 180, 24, 9);
      g.fillStyle(hex(RUBY.shade), 1).fillRoundedRect(48, 17, 172, 16, 6);
      if (h.hp > 0) g.fillStyle(hex(RUBY.fill), 1).fillRoundedRect(48, 17, Math.max(10, 172 * (h.hp / h.maxHp)), 16, 6);
      this.hpText.setText(`${Math.ceil(h.hp)} / ${h.maxHp}`);
      // The monster: its health in three parts, and under it the stagger that blows in its openings fill.
      const { bx, by, bw } = this;
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(bx - 4, by - 4, bw + 8, 22, 8);
      g.fillStyle(hex(RUBY.shade), 1).fillRect(bx, by, bw, 14);
      g.fillStyle(m.state === 'broken' ? hex(HOLY.fill) : hex(RUBY.fill), 1).fillRect(bx, by, bw * (m.hp / m.maxHp), 14);
      for (const cut of hunt.cuts) g.fillStyle(hex(OUTLINE), 1).fillRect(bx + bw * cut - 2, by - 2, 4, 18);
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(bx - 4, by + 20, bw + 8, 12, 5);
      g.fillStyle(hex(STEEL.shade), 1).fillRect(bx, by + 23, bw, 6);
      g.fillStyle(hex(HOLY.fill), 1).fillRect(bx, by + 23, bw * Math.min(1, m.stagger / m.staggerMax), 6);
    }
    // Under its bars: what it is doing, by name, while it prepares it; and that it is open, or broken, when it is.
    const doing = m.state === 'tell' || m.state === 'dash' ? (m.attack?.name ?? '').toUpperCase() : '';
    const state = doing || (m.state === 'asleep' ? 'ASLEEP' : m.state === 'broken' ? 'BROKEN' : m.state === 'shift' ? '' : hunt.open ? 'OPEN' : '');
    this.stateText.setText(state).setColor(doing ? RUBY.fill : HOLY.fill).setAlpha(state === 'BROKEN' ? 0.6 + 0.4 * Math.sin(this.clock * 12) ** 2 : 1);

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
      this.campText.setText(any ? (this.touch ? 'Stand where you want a thing and press its button.' : 'Stand where you want a thing and press its button or its number.') : 'Step into the red ring, or press WAKE IT.');
    } else this.campText.setText('');

    // Each button: its veil is as tall as the share of its wait still to run.
    if (!camp) {
      for (const p of this.pads) {
        const wait = Math.max(0, Math.min(1, p.wait(hunt)));
        p.veil.setDisplaySize(PAD - 6, (PAD - 10) * wait);
        if (p.count && p.left) p.count.setText(`x${p.left(hunt)}`);
        const ready = wait <= 0;
        if (ready && !p.ready) this.tweens.add({ targets: p.root, scale: { from: 1.14, to: 1 }, duration: 180 });
        p.ready = ready;
      }
    }

    // Badly hurt: the edge of the screen beats red, so that it is known without looking up at the bar.
    if (!this.tweens.isTweening(this.flash)) this.flash.setAlpha(h.hp > 0 && h.hp <= h.maxHp * 0.3 ? 0.06 + 0.06 * Math.sin(this.clock * 7) ** 2 : 0);

    // The stick, where the finger is.
    const st = this.controls.stick;
    this.stick.clear();
    if (st && !this.paused) {
      const dx = st.x - st.x0;
      const dy = st.y - st.y0;
      const len = Math.hypot(dx, dy);
      const k = len > 46 ? 46 / len : 1;
      this.stick.fillStyle(hex(OUTLINE), 0.25).fillCircle(st.x0, st.y0, 54);
      this.stick.lineStyle(3, hex(BONE.fill), 0.5).strokeCircle(st.x0, st.y0, 54);
      this.stick.fillStyle(hex(BONE.fill), 0.7).fillCircle(st.x0 + dx * k, st.y0 + dy * k, 22);
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
