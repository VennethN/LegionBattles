// What lies over the field while a wave is fought: the hero's health and
// level, the wave and how long is left of it, the coins, a boss's health,
// and the stick under a finger. It reads the wave and shows it; the field
// itself is the screen under this one.
//
// It also takes the steering, because it is the screen on top: a press that
// lands on one of its buttons is the button's, and any other press is the
// stick.

import Phaser from 'phaser';
import { BONE, FIRE, GOLD, HOLY, IRON, LINEN, OUTLINE, RUBY, VENOM, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { levelNeeds } from '../../game/data';
import { heroOf } from '../../game/run';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { byFinger, hex, view } from '../config';
import { Controls } from '../input';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, save, theRun, theWorld } from '../session';
import { pillImage, slabImage } from '../ui/bake';
import { Button, heading, label } from '../ui/widgets';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
import { ArenaScene } from './ArenaScene';

const ICON = 0.5;
/** The dark timber the HUD's plates are made of. */
const PLATE: Material = { fill: '#4a3524', shade: '#2f2015' };

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
  private callText: Phaser.GameObjects.Text | null = null;
  private plateBox: Phaser.GameObjects.Container | null = null;
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
  private bossY = 82;

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

    // The top of the field goes dark behind what is written over it: scenery at a field's edge was drawn straight
    // under the bars on a tall screen, and neither could be read.
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, 132).setTint(hex(OUTLINE)).setAlpha(0.62, 0.62, 0, 0).setDepth(2);

    // The hero's plate: who they are, in a frame, and beside them their health, their fury, their level and how
    // their quirk stands. One thing in one corner, where it was five loose bars.
    this.add.existing(slabImage(this, 8, 6, 252, 102, PLATE, 14, 6)).setDepth(9);
    this.add.existing(slabImage(this, 16, 14, 64, 64, LINEN, 10, 4)).setDepth(10);
    const who = theRun();
    if (who) {
      const pic = this.add.image(48, 74, CARDS, portraitFrame('blue', heroOf(who).unit)).setDepth(11);
      pic.setScale(Math.min(58 / (pic.frame.height || 1), 58 / (pic.frame.width || 1)));
    }
    this.bars = this.add.graphics().setDepth(10);
    this.hpText = label(this, 169, 25, '', { size: 15 }).setDepth(12);
    this.lvText = label(this, 48, 91, '', { size: 15 }).setDepth(12);
    // What only this hero has, and how it stands: its name, gold while it is on, over a bar of how near it is.
    this.quirkText = label(this, 90, 79, '', { size: 15, align: 'left' }).setDepth(12);

    // The wave and what is left of it, on a small plate of their own.
    // On a narrow screen the hero's plate reaches past the middle: the wave's plate stands clear of it, and a captain's name and health go under both.
    const mid = Math.max(w / 2, 326);
    this.bossY = w < 700 ? 124 : 82;
    this.add.existing(slabImage(this, mid - 58, 4, 116, 64, PLATE, 14, 5)).setDepth(9);
    this.waveText = label(this, mid, 18, '', { size: 15, color: BONE.fill }).setDepth(12);
    this.timeText = label(this, mid, 44, '', { size: 32 }).setDepth(12);
    this.bossText = label(this, w / 2, this.bossY, '', { size: 16, color: RUBY.fill }).setDepth(12);

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

    // Words across the field stand well above the hero, who is in the middle of it: a hero's own line was once written through their figure.
    const top = Math.min(view.h * 0.2, view.h / 2 - 190) + 20;
    this.bannerText = label(this, w / 2, top, '', { size: 44 }).setDepth(20).setAlpha(0);
    this.underText = label(this, w / 2, top + 38, '', { size: 18, color: HOLY.fill }).setDepth(20).setAlpha(0);
    this.lineText = label(this, w / 2, top + 66, '', { size: 16, color: BONE.fill, wrap: Math.min(520, w - 40) }).setDepth(20).setAlpha(0);
    if (data.banner) this.banner(data.banner, data.under ?? '', data.line ?? '');
    // Who the hero is was said first: the wave is said after.
    const then = data.then;
    if (then) this.time.delayedCall(1900, () => this.banner(then.banner, then.under));

    // The hero's move, in a corner where a thumb is: its name, the bar that kills fill, and a press that lets it loose.
    const move = theWorld()?.move;
    this.moveBar = null;
    this.moveText = null;
    this.fury = -1;
    this.moveGold = null;
    this.moveBox = null;
    this.callText = null;
    this.plateBox = null;
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
      this.callText = label(this, w - bw / 2 - 12, view.h - bh - 34, '', { size: 22, color: HOLY.fill }).setDepth(14).setAlpha(0);
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

  /** True where the player steers with a finger. */
  get byFinger(): boolean {
    return byFinger(this.game);
  }

  /** Where a plate of words at the foot of the screen stands: clear of the fight, and of the move's button on a narrow screen. */
  private foot(): number {
    return view.h - (view.w < 760 ? 138 : 50);
  }

  /**
   * How to move, shown to someone who has not yet, on a plate at the foot of the screen: keys on a keyboard, a
   * thumb on a phone. It was once drawn across the middle of the fight, and showed keys to someone with none.
   */
  private showHint(): void {
    const c = this.add.container(view.w / 2, this.foot()).setDepth(15);
    if (byFinger(this.game)) {
      c.add(pillImage(this, 0, 0, 300, 48, IRON.shade).setAlpha(0.92));
      // A thumb on a stick: a ring, and the knob pushed to one side of it.
      const g = this.add.graphics();
      g.lineStyle(3, hex(BONE.fill), 0.9).strokeCircle(-112, 0, 15);
      g.fillStyle(hex(BONE.fill), 1).fillCircle(-106, -3, 8);
      c.add(g);
      c.add(label(this, 18, -1, 'DRAG TO MOVE', { size: 20 }));
    } else {
      c.add(pillImage(this, 0, 0, 380, 48, IRON.shade).setAlpha(0.92));
      const cap = (x: number, t: string): void => {
        c.add(slabImage(this, x - 15, -15, 30, 30, BONE, 7, 4));
        c.add(label(this, x, -2, t, { size: 16, color: OUTLINE, stroke: null }));
      };
      cap(-160, 'W');
      cap(-126, 'A');
      cap(-92, 'S');
      cap(-58, 'D');
      c.add(label(this, 76, -1, 'OR ARROW KEYS: MOVE', { size: 18 }));
    }
    this.hint = c;
  }

  /** A line of words on a plate at the foot of the screen, for a few seconds: something the player has just met, said once. */
  plate(text: string, seconds = 3.4): void {
    this.plateBox?.destroy();
    const c = this.add.container(view.w / 2, this.foot()).setDepth(15).setAlpha(0);
    const t = label(this, 0, -1, text, { size: 17, wrap: Math.min(440, view.w - 60) });
    const pw = Math.min(view.w - 24, t.width + 44);
    const ph = Math.max(44, t.height + 20);
    c.add([pillImage(this, 0, 0, pw, ph, IRON.shade).setAlpha(0.92), t]);
    this.plateBox = c;
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.tweens.add({ targets: c, alpha: 0, duration: 320, delay: seconds * 1000, onComplete: () => {
      if (this.plateBox === c) this.plateBox = null;
      c.destroy();
    } });
  }

  /** Says a thing once in a player's life: the first time it is met. */
  teach(key: string, text: string): void {
    const s = save();
    if (s.told.includes(key) || this.hint) return;
    s.told.push(key);
    commit();
    this.plate(text);
  }

  /** The move was let loose: its name, by its button. The field itself is left to the move. */
  moveCalled(name: string): void {
    const t = this.callText;
    if (!t) return;
    this.tweens.killTweensOf(t);
    t.setText(name).setAlpha(1).setScale(1.5);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, duration: 400, delay: 1100 });
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
    c.add([veil, slabImage(this, cx - 150, cy - 229, 300, 458, BONE, 18, 8), ...heading(this, cx, cy - 194, 'PAUSED')]);
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
    toggle(cy + 49, 'AUTO SKILL', () => s.auto, (v) => {
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
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(88, 13, 162, 24, 8);
      g.fillStyle(hex(RUBY.shade), 1).fillRoundedRect(92, 17, 154, 16, 5);
      if (h.hp > 0) g.fillStyle(hex(RUBY.fill), 1).fillRoundedRect(92, 17, Math.max(10, 154 * (h.hp / h.maxHp)), 16, 5);
      // Fury, under their health: what kills fill, and the move is let loose from.
      if (world.move) {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(88, 39, 162, 13, 5);
        g.fillStyle(hex(world.fury >= 1 ? HOLY.fill : FIRE.fill), 1).fillRoundedRect(91, 42, Math.max(4, 156 * Math.min(1, world.fury)), 7, 3);
      }
      // Experience, toward the next level.
      g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(88, 54, 162, 11, 5);
      g.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(91, 57, Math.max(4, 156 * (xp / levelNeeds(level))), 5, 2);
      // The quirk's bar: how near it is to being on.
      if (world.quirk && world.quirk !== 'unfinished' && world.quirk !== 'deepcold') {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(88, 89, 162, 10, 4);
        g.fillStyle(hex(trait.on ? HOLY.fill : BONE.shade), 1).fillRoundedRect(91, 92, Math.max(3, 156 * trait.share), 4, 2);
      }
      this.quirkText.setText(world.quirk ? heroOf(run).quirkName.toUpperCase() : '').setColor(trait.on ? HOLY.fill : BONE.shade);
      if (boss) {
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(w / 2 - 150, this.bossY + 12, 300, 18, 7);
        g.fillStyle(hex(RUBY.fill), 1).fillRoundedRect(w / 2 - 146, this.bossY + 16, Math.max(8, 292 * (boss.hp / boss.maxHp)), 10, 4);
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
      this.banner(boss.def.name.toUpperCase(), 'Defeat the boss to win the wave');
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
        const touch = byFinger(this.game);
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
        this.time.delayedCall(500, () => this.plate('YOU ATTACK AUTOMATICALLY. COLLECT THE COINS.', 4));
      }
    }
  }
}
