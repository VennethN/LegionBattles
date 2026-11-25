// What lies over the field while a wave is fought: the hero's health and
// level, the wave and how long is left of it, the coins, a boss's health,
// and the stick under a finger. It reads the wave and shows it; the field
// itself is the screen under this one.
//
// It also takes the steering, because it is the screen on top: a press that
// lands on one of its buttons is the button's, and any other press is the
// stick.

import Phaser from 'phaser';
import { BONE, FIRE, GOLD, HOLY, IRON, OUTLINE, RUBY, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { levelNeeds } from '../../game/data';
import { heroOf } from '../../game/run';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { Controls } from '../input';
import { SHEET } from '../art/Sheet';
import { commit, save, theRun, theWorld } from '../session';
import { pillImage, slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
import { ArenaScene } from './ArenaScene';

const ICON = 0.5;

export class HudScene extends Phaser.Scene {
  controls!: Controls;
  private bars!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private lvText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private underText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private quirkText!: Phaser.GameObjects.Text;
  private moveGold: Phaser.GameObjects.Image | null = null;
  private moveBox: Phaser.GameObjects.Container | null = null;
  private ripe = false;
  private hint: Phaser.GameObjects.Container | null = null;
  private stick!: Phaser.GameObjects.Graphics;
  /** The move: its button, the bar that fills it, and its name. */
  private moveBar: Phaser.GameObjects.Graphics | null = null;
  private moveText: Phaser.GameObjects.Text | null = null;
  private moveName = '';
  private fury = -1;
  private flash!: Phaser.GameObjects.Image;
  private paused: Phaser.GameObjects.Container | null = null;
  private drawn = '';
  private pending = 0;
  private told = false;
  private gold = 0;
  private second = -1;
  private bossSeen = false;
  private clock = 0;

  constructor() {
    super('Hud');
  }

  create(data: { banner?: string; under?: string; line?: string; then?: { banner: string; under: string } }): void {
    setupCamera(this);
    this.controls = new Controls(this);
    this.drawn = '';
    this.pending = 0;
    this.paused = null;
    this.hint = null;
    this.gold = -1;
    this.second = -1;
    this.bossSeen = false;
    this.clock = 0;
    const w = view.w;

    // Struck: the whole screen goes red for a breath.
    this.flash = this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(RUBY.fill)).setAlpha(0).setDepth(1);

    this.bars = this.add.graphics().setDepth(10);
    this.add.image(26, 26, SHEET, 'icon/heart').setScale(ICON * 0.62).setDepth(11);
    this.hpText = label(this, 132, 25, '', { size: 15 }).setDepth(12);
    this.lvText = label(this, 46, 63, '', { size: 15, align: 'left' }).setDepth(12);
    // What only this hero has, and how it stands: its name, gold while it is on, over a bar of how near it is.
    this.quirkText = label(this, 46, 86, '', { size: 15, align: 'left' }).setDepth(12);

    this.waveText = label(this, w / 2, 16, '', { size: 16, color: BONE.fill }).setDepth(12);
    this.timeText = label(this, w / 2, 44, '', { size: 34 }).setDepth(12);
    this.bossText = label(this, w / 2, 76, '', { size: 15, color: RUBY.fill }).setDepth(12);

    pillImage(this, w - 122, 26, 104, 30, IRON.shade).setDepth(10);
    this.add.image(w - 160, 26, SHEET, 'icon/coin').setScale(ICON * 0.6).setDepth(11);
    this.goldText = label(this, w - 110, 25, '0', { size: 20, color: HOLY.fill }).setDepth(12);

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

    this.bannerText = label(this, w / 2, view.h * 0.3, '', { size: 46 }).setDepth(20).setAlpha(0);
    this.underText = label(this, w / 2, view.h * 0.3 + 40, '', { size: 18, color: HOLY.fill }).setDepth(20).setAlpha(0);
    this.lineText = label(this, w / 2, view.h * 0.3 + 70, '', { size: 16, color: BONE.fill, wrap: Math.min(520, w - 40) }).setDepth(20).setAlpha(0);
    if (data.banner) this.banner(data.banner, data.under ?? '', data.line ?? '');
    // Who the hero is was said first: the wave is said after.
    const then = data.then;
    if (then) this.time.delayedCall(1900, () => this.banner(then.banner, then.under));

    // The hero's move, in a corner where a thumb is: its name, the bar that kills fill, and a press that lets it loose.
    // Plain for now: the proper showing of it is still to be made.
    const move = theWorld()?.move;
    this.moveBar = null;
    this.moveText = null;
    this.fury = -1;
    this.moveGold = null;
    this.moveBox = null;
    this.ripe = false;
    if (move) {
      // Big enough for a thumb, in the corner a thumb rests in. It turns gold when the move is full.
      const bw = 188;
      const bh = 70;
      const c = this.add.container(w - bw / 2 - 12, view.h - bh / 2 - 12).setDepth(12);
      this.moveName = move.name.toUpperCase();
      this.moveText = label(this, 0, -15, this.moveName, { size: 17 });
      this.moveGold = slabImage(this, -bw / 2, -bh / 2, bw, bh, GOLD, 14, 6).setVisible(false);
      c.add([slabImage(this, -bw / 2, -bh / 2, bw, bh, IRON, 14, 6), this.moveGold, this.moveText]);
      c.setSize(bw, bh).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.controls.act());
      this.moveBox = c;
      this.moveBar = this.add.graphics().setDepth(13);
    }

    this.stick = this.add.graphics().setDepth(5);
    this.told = save().told.includes('move');
    if (!this.told) this.showHint();
  }

  /** Words across the middle of the screen for a moment: the wave's number, that it is cleared. */
  banner(text: string, under: string, line = ''): void {
    // A long name is drawn smaller rather than run off a narrow screen.
    this.bannerText.setText(text).setAlpha(0).setScale(0.7);
    const fit = Math.min(1, (view.w - 30) / Math.max(1, this.bannerText.width / 0.7));
    this.bannerText.setScale(0.7 * fit);
    this.underText.setText(under).setAlpha(0);
    this.lineText.setText(line).setAlpha(0);
    this.tweens.killTweensOf([this.bannerText, this.underText, this.lineText]);
    this.tweens.add({ targets: this.bannerText, alpha: 1, scale: fit, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.underText, alpha: 1, duration: 180, delay: 80 });
    if (line) this.tweens.add({ targets: this.lineText, alpha: 1, duration: 260, delay: 260 });
    this.tweens.add({ targets: [this.bannerText, this.underText, this.lineText], alpha: 0, duration: 320, delay: line ? 1600 : 1300 });
  }

  /** The hero was struck. */
  hurt(): void {
    this.flash.setAlpha(0.28);
    this.tweens.killTweensOf(this.flash);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 260 });
  }

  /** How to move, shown to someone who has not yet: keys on a keyboard, a finger on a phone. */
  private showHint(): void {
    const c = this.add.container(view.w / 2, view.h - 62).setDepth(15);
    const touch = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
    if (touch) {
      c.add(label(this, 0, 0, 'DRAG ANYWHERE TO MOVE', { size: 20 }));
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

  /** Stops the wave, or lets it go on. */
  pause(on: boolean): void {
    const arena = this.scene.get('Arena') as ArenaScene;
    const world = theWorld();
    if (!world || world.over) return;
    if (on === !!this.paused) return;
    if (!on) {
      this.paused?.destroy();
      this.paused = null;
      arena.halted = false;
      ads().gameplayStart();
      return;
    }
    arena.halted = true;
    this.controls.release();
    ads().gameplayStop();
    const c = this.add.container(0, 0).setDepth(100);
    const veil = this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.6).setInteractive();
    const cx = view.w / 2;
    const cy = view.h / 2;
    c.add([veil, slabImage(this, cx - 150, cy - 229, 300, 458, BONE, 18, 8), label(this, cx, cy - 191, 'PAUSED', { size: 30 })]);
    const s = save();
    const toggle = (y: number, name: string, get: () => boolean, set: (v: boolean) => void): void => {
      const b = new Button(this, cx, y, `${name}: ${get() ? 'ON' : 'OFF'}`, () => {
        set(!get());
        commit();
        ArenaScene.applySound();
        b.setText(`${name}: ${get() ? 'ON' : 'OFF'}`);
      }, { width: 220, height: 46, size: 19, mat: IRON });
      c.add(b.root);
    };
    c.add(new Button(this, cx, cy - 131, 'RESUME', () => this.pause(false), { width: 220, height: 54, size: 24, mat: GOLD }).root);
    toggle(cy - 67, 'SOUND', () => s.sound, (v) => (s.sound = v));
    toggle(cy - 9, 'MUSIC', () => s.music, (v) => (s.music = v));
    // Whether the move goes off by itself when it is full. It is so for a new player, who has not yet been told there is one.
    toggle(cy + 49, 'AUTO MOVE', () => s.auto, (v) => {
      s.auto = v;
      world.auto = v;
    });
    // How much of the light is made: all of it, the cheap part, or none. A slow machine wants less.
    const light = new Button(this, cx, cy + 107, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
      setLightMode(nextLightMode(lightMode()), true);
      arena.setLight(lightMode());
      light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
    }, { width: 220, height: 46, size: 19, mat: IRON });
    c.add(light.root);
    c.add(new Button(this, cx, cy + 175, 'GIVE UP', () => {
      // Giving up ends the run as a fall does: the hero's health is taken, and the wave ends itself.
      world.hero.hp = 0;
      world.over = 'dead';
      this.paused?.destroy();
      this.paused = null;
    }, { width: 220, height: 46, size: 19, mat: RUBY }).root);
    this.paused = c;
    sfx.play('open', 0.6);
  }

  override update(_time: number, delta: number): void {
    const world = theWorld();
    const run = theRun();
    if (!world || !run) return;
    this.clock += Math.min(0.1, delta / 1000);
    const h = world.hero;
    const w = view.w;

    // Experience gathered this wave may already have made a level or more: it is said as it happens, and chosen in the camp.
    let xp = run.xp + world.xp;
    let level = run.level;
    let pending = 0;
    while (xp >= levelNeeds(level)) {
      xp -= levelNeeds(level);
      level++;
      pending++;
    }
    if (pending > this.pending) {
      sfx.play('levelUp', 0.7);
      this.banner('LEVEL UP', '');
    }
    this.pending = pending;
    const boss = world.boss;
    const trait = world.trait;
    const key = `${h.hp}/${h.maxHp}/${Math.round((xp / levelNeeds(level)) * 100)}/${boss ? Math.ceil((boss.hp / boss.maxHp) * 100) : -1}/${Math.round(world.fury * 60)}/${Math.round(trait.share * 30)}${trait.on}`;
    if (key !== this.drawn) {
      this.drawn = key;
      const g = this.bars;
      g.clear();
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(44, 13, 180, 24, 9);
      g.fillStyle(hex(RUBY.shade), 1).fillRoundedRect(48, 17, 172, 16, 6);
      if (h.hp > 0) g.fillStyle(hex(RUBY.fill), 1).fillRoundedRect(48, 17, Math.max(10, 172 * (h.hp / h.maxHp)), 16, 6);
      // Fury, under their health: what kills fill, and the move is let loose from.
      if (world.move) {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(44, 39, 180, 13, 5);
        g.fillStyle(hex(world.fury >= 1 ? HOLY.fill : FIRE.fill), 1).fillRoundedRect(47, 42, Math.max(4, 174 * Math.min(1, world.fury)), 7, 3);
      }
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(96, 57, 128, 12, 5);
      g.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(99, 60, Math.max(4, 122 * (xp / levelNeeds(level))), 6, 3);
      // The quirk's bar: how near it is to being on.
      if (world.quirk && world.quirk !== 'unfinished' && world.quirk !== 'deepcold') {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(44, 97, 124, 10, 4);
        g.fillStyle(hex(trait.on ? HOLY.fill : BONE.shade), 1).fillRoundedRect(47, 100, Math.max(3, 118 * trait.share), 4, 2);
      }
      this.quirkText.setText(world.quirk ? heroOf(run).quirkName.toUpperCase() : '').setColor(trait.on ? HOLY.fill : BONE.shade);
      if (boss) {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(w / 2 - 150, 88, 300, 18, 7);
        g.fillStyle(hex(RUBY.fill), 1).fillRoundedRect(w / 2 - 146, 92, Math.max(8, 292 * (boss.hp / boss.maxHp)), 10, 4);
      }
      this.hpText.setText(`${h.hp} / ${h.maxHp}`);
    }
    this.lvText.setText(pending > 0 ? `LV ${run.level} +${pending}` : `LV ${run.level}`).setColor(pending > 0 ? HOLY.fill : BONE.fill);
    this.waveText.setText(`WAVE ${world.wave.n}`);
    const left = Math.ceil(world.left);
    this.timeText.setText(world.gathering >= 0 ? '' : String(left)).setColor(left <= 5 ? RUBY.fill : BONE.fill);
    // The last five seconds are counted aloud: the wave is nearly won.
    if (left !== this.second && !this.paused && !world.over && world.gathering < 0) {
      if (left <= 5 && left > 0 && this.second > 0) {
        sfx.play('tick', 0.6, 1 + (5 - left) * 0.06);
        this.tweens.add({ targets: this.timeText, scale: { from: 1.3, to: 1 }, duration: 220 });
      }
      this.second = left;
    }
    this.bossText.setText(boss ? boss.def.name.toUpperCase() : '');
    // A boss is named as it steps onto the field.
    if (boss && !this.bossSeen) {
      this.bossSeen = true;
      this.banner(boss.def.name.toUpperCase(), 'Beat it and the wave is won');
    }
    const gold = Math.floor(run.gold + world.gold);
    if (gold !== this.gold) {
      if (this.gold >= 0 && gold > this.gold) {
        this.tweens.killTweensOf(this.goldText);
        this.tweens.add({ targets: this.goldText, scale: { from: 1.25, to: 1 }, duration: 160 });
      }
      this.gold = gold;
      this.goldText.setText(String(gold));
    }
    // Badly hurt: the edge of the screen beats red, so that it is known without looking up at the bar.
    if (h.hp > 0 && h.hp <= h.maxHp * 0.3 && !this.tweens.isTweening(this.flash)) this.flash.setAlpha(0.07 + 0.07 * Math.sin(this.clock * 7) ** 2);
    else if (h.hp > h.maxHp * 0.3 && !this.tweens.isTweening(this.flash)) this.flash.setAlpha(0);

    // The move's bar: how full it is, and gold with its key named when it is ready.
    if (this.moveBar && this.moveText) {
      const full = world.fury >= 1;
      const shown = full ? 100 + (Math.floor(this.clock * 2) % 2) : Math.round(world.fury * 100);
      if (shown !== this.fury) {
        this.fury = shown;
        const bx = w - 188 - 12 + 22;
        const by = view.h - 12 - 26;
        const g = this.moveBar;
        g.clear();
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(bx, by, 144, 14, 6);
        g.fillStyle(hex(full ? HOLY.fill : VENOM.fill), 1).fillRoundedRect(bx + 3, by + 3, Math.max(4, 138 * Math.min(1, world.fury)), 8, 4);
        const touch = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
        this.moveText.setText(full && shown === 101 ? (touch ? 'TAP!' : 'PRESS SPACE') : this.moveName).setColor(full ? OUTLINE : BONE.fill).setStroke(full ? HOLY.light : OUTLINE, full ? 3 : 5);
        this.moveGold?.setVisible(full);
      }
      // Full: the button beats, so that it is seen without being looked for.
      if (full !== this.ripe) {
        this.ripe = full;
        if (this.moveBox) {
          this.tweens.killTweensOf(this.moveBox);
          this.moveBox.setScale(1);
          if (full) this.tweens.add({ targets: this.moveBox, scale: 1.07, duration: 320, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
    }

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

    // Once they have moved, they know how.
    if (this.hint && this.controls.used) {
      const hint = this.hint;
      this.hint = null;
      this.tweens.killTweensOf(hint);
      this.tweens.add({ targets: hint, alpha: 0, duration: 300, onComplete: () => hint.destroy() });
      if (!this.told) {
        this.told = true;
        save().told.push('move');
        commit();
        this.time.delayedCall(700, () => this.banner('', 'What you carry strikes by itself. Gather the coins.'));
      }
    }
  }
}
