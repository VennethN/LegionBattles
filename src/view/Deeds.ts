// What makes a hero that hero on the field, and who stands with them: the
// move as it goes off, the quirk as it stands, and the companions. The wave
// (game/world.ts) says what happens and what state everyone is in; this
// shows it, with the light where the light is on (view/light) and plainly
// where it is not. It works nothing out.

import Phaser from 'phaser';
import { BONE, FIRE, FROST, HOLY, OUTLINE, RUBY, STEEL } from '../art/kit/palette';
import { sfx } from '../audio/sfx';
import { QUIRKS, type HeroDef, type MoveId } from '../game/heroes';
import type { Ally, Burst, Ev, World } from '../game/world';
import { getManifest } from './app';
import { ART_SCALE, hex } from './config';
import type { Effects } from './Effects';
import { Figure } from './art/Figure';
import { SHEET } from './art/Sheet';
import type { FieldLight } from './light/FieldLight';
import { label } from './ui/widgets';

/** How big a companion's canvas is drawn: a little smaller than the hero, whom they stand beside and must not hide. */
const ALLY_SCALE = 0.47;
/** Seconds a companion's name stays over it when it comes onto a field. */
const NAMED = 3.2;
const INV_ART = 1 / ART_SCALE;
const GOLD_TINT = hex(HOLY.fill);
const RED = hex(RUBY.fill);

/** The element of light each ring, each thing that falls and each move is shown in. */
const RING_EL: Record<string, string> = { fire: 'fire', bell: 'holy', cry: 'red', frost: 'frost', flare: 'holy', roar: 'red' };
const RING_TINT: Record<string, number> = { fire: hex(FIRE.fill), bell: GOLD_TINT, cry: RED, frost: hex(FROST.fill), flare: hex(HOLY.light), roar: RED };
const FALL_EL: Partial<Record<Burst, string>> = { star: 'arcane', light: 'holy', frost: 'frost', fire: 'fire' };
const MOVE_EL: Record<MoveId, string> = {
  gate: 'holy', oneshot: 'spark', starfall: 'arcane', vanish: 'spark', wildfire: 'fire', charge: 'spark', opengrave: 'red', toll: 'holy', whiteout: 'frost', judgment: 'holy',
};
/** The companions that give light of their own, and of what element. */
const ALLY_LIGHT: Record<string, string | undefined> = { pip: 'holy', ember: 'fire' };

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

interface AllyView {
  fig: Figure;
  tag: Phaser.GameObjects.Text;
  tagLeft: number;
  back: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
  aimFor: number;
  aimFace: 1 | -1;
}

interface Omen {
  disc: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  left: number;
  of: number;
  r: number;
}

export class Deeds {
  /** Seconds the wave is held still for: the breath in which a move is seen to begin. The field does not step it while this is above 0. */
  hold = 0;
  private readonly allies = new Map<number, AllyView>();
  private omens: Omen[] = [];
  /** The quirk's sign on the ground under the hero: Bram's shield set, Aldous's fold. */
  private readonly sign: Phaser.GameObjects.Image;
  private streak = 0;
  /** True while Orrin's doubled bolt is the next: the wave does not say, so this stays off until a screen is made for it. */
  private readonly third = false;
  private clock = 0;
  private share = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    private readonly fx: Effects,
    private readonly light: FieldLight,
    private readonly hero: Figure,
    private readonly def: HeroDef,
    /** Words across the screen for a moment. */
    private readonly say: (big: string, under: string) => void,
    private readonly shake: (ms: number, by: number) => void,
  ) {
    this.sign = scene.add.image(0, 0, SHEET, 'fx/ring').setVisible(false).setDepth(2);
  }

  // ------------------------------------------------------------ what has happened

  /** Shows one thing the wave says happened. False if it is not one of these. */
  react(e: Ev): boolean {
    const w = this.world;
    const h = w.hero;
    const light = this.light;
    switch (e.t) {
      case 'move':
        this.loose(e.id, e.x, e.y, e.dx, e.dy);
        return true;
      case 'warn': {
        // The player's own: marked in gold, not in the red of what is coming for them, and with a hard edge that says how far it reaches.
        const disc = this.scene.add.image(e.x, e.y, SHEET, 'fx/disc').setTint(GOLD_TINT).setDepth(3);
        const ring = this.scene.add.image(e.x, e.y, SHEET, 'fx/ring').setTint(GOLD_TINT).setDepth(3);
        light.crisp(ring);
        this.omens.push({ disc, ring, left: e.seconds, of: e.seconds, r: e.r });
        return true;
      }
      case 'ring': {
        const r = Math.min(e.r, 760);
        const el = RING_EL[e.kind];
        // Its edge running out along the ground, drawn as a thing where the light is off and as light where it is on.
        if (!light.on) this.fx.spawn('fx/ring', e.x, e.y, { dur: Math.max(0.25, e.seconds), from: 0.3, to: (r / 32) * 1.05, tint: RING_TINT[e.kind], alpha: 0.9, flat: 0.62, depth: 5 });
        for (let i = 0; i < 2; i++) light.bit(e.x, e.y, el, { dur: Math.max(0.3, e.seconds) * (1 + i * 0.25), from: r * 0.12, to: r * (1 - i * 0.12), alpha: 0.7 - i * 0.25, flat: 0.62, frame: 'fx/ring' });
        light.flash(e.x, e.y - 20, r * 2.2, RING_TINT[e.kind], 0.7, 0.45);
        if (e.kind === 'bell') {
          // A bell's ring shimmers: motes go up all the way out to where it was heard.
          for (let i = 0; i < 26; i++) {
            const a = rnd(0, Math.PI * 2);
            const d = rnd(0.2, 1) * r;
            light.bit(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.62, 'holy', { dur: rnd(0.6, 1.2), vy: rnd(-70, -30), from: rnd(6, 11), to: 1, sway: 4, alpha: 0.9 });
          }
          sfx.play('levelUp', 0.6, 0.6);
        } else if (e.kind === 'cry' || e.kind === 'roar') {
          this.shake(220, 0.009);
          light.spray(e.x, e.y - 30, 'red', 14, r * 2.4, 0.5);
          sfx.play('blast', 0.5, 0.6);
        } else if (e.kind === 'frost') {
          for (let i = 0; i < 20; i++) {
            const a = rnd(0, Math.PI * 2);
            const d = rnd(0.1, 1) * Math.min(r, 420);
            light.bit(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.62 - 20, 'frost', { dur: rnd(0.6, 1.1), vy: rnd(20, 50), from: rnd(7, 13), to: 1, sway: 3 });
          }
        } else if (e.kind === 'flare') light.spray(e.x, e.y - 20, 'holy', 10, 320, 0.4);
        return true;
      }
      case 'fury':
        sfx.play('levelUp', 0.5, 1.3);
        light.flash(h.x, h.y - 30, 200, GOLD_TINT, 0.4, 0.4);
        for (let i = 0; i < 8; i++) light.bit(h.x + rnd(-18, 18), h.y - rnd(0, 20), MOVE_EL[this.def.move], { dur: rnd(0.4, 0.8), vy: rnd(-150, -70), from: rnd(5, 9), to: 1, stretch: 0.6 });
        return true;
      case 'quirk':
        if (e.on) {
          this.fx.spawn('fx/sparkle', h.x, h.y - 78, { dur: 0.35, from: 0.4, to: 1, tint: GOLD_TINT, depth: h.y + 60 });
          if (w.quirk === 'standfast') sfx.play('thud', 0.35, 1.4);
        }
        return true;
      case 'freeze': {
        const f = w.foes.find((x) => x.id === e.id);
        if (!f) return true;
        // Cased in ice: a crack of cold light and shards flying off it.
        this.fx.spawn('fx/sparkle', f.x, f.y - 30, { dur: 0.3, from: 0.5, to: 1.3, tint: hex(FROST.light), depth: f.y + 40 });
        light.spray(f.x, f.y - 24, 'frost', 5, 200, 0.4);
        light.flash(f.x, f.y - 20, 110, hex(FROST.light), 0.6, 0.2);
        return true;
      }
      case 'rise':
        sfx.play('blast', 0.8, 0.6);
        this.shake(320, 0.012);
        this.say(`${this.def.short.toUpperCase()} GETS UP`, 'Once in a land');
        light.boom(e.x, e.y, 120, 'red', true);
        this.hold = 0.16;
        return true;
      case 'rescue':
        sfx.play('heal', 0.9, 0.8);
        this.say('ON YOUR FEET', 'Tam drags you up');
        light.flash(h.x, h.y - 30, 320, GOLD_TINT, 0.8, 0.6);
        return true;
      case 'hurt':
        // What a blow costs Wren is seen leaving her.
        if (w.quirk === 'unseen' && this.share > 0.3) light.spray(h.x, h.y - 34, 'venom', 10, 220, 0.5);
        return false;
      case 'allyStrike': {
        const v = this.allies.get(e.id);
        if (!v) return true;
        v.aimFace = Math.cos(e.angle) >= 0 ? 1 : -1;
        v.aimFor = 0.45;
        v.fig.facing = v.aimFace;
        v.fig.attack(this.clock, 0.07);
        this.fx.spawn('fx/spark', e.x, e.y - 20, { dur: 0.12, from: 0.3, to: 0.8, alpha: 0.9, depth: e.y + 30 });
        return true;
      }
      case 'allyHurt': {
        const v = this.allies.get(e.id);
        v?.fig.hit(this.clock, v.fig.x - v.fig.facing * 10);
        return true;
      }
      case 'allyDown': {
        const v = this.allies.get(e.id);
        if (v) {
          this.fx.spawn('fx/dust', v.fig.x, v.fig.y - 10, { dur: 0.3, from: 0.5, to: 1.2, alpha: 0.7, depth: v.fig.y + 2 });
          v.tag.setText(`${this.nameOf(e.id)} is down`).setAlpha(1);
          v.tagLeft = 1.6;
        }
        sfx.play('death', 0.5, 0.7);
        return true;
      }
      case 'allyUp': {
        const v = this.allies.get(e.id);
        if (v) {
          this.fx.spawn('fx/sparkle', v.fig.x, v.fig.y - 50, { dur: 0.4, from: 0.5, to: 1.2, tint: GOLD_TINT, depth: v.fig.y + 60 });
          light.flash(v.fig.x, v.fig.y - 20, 150, GOLD_TINT, 0.6, 0.3);
        }
        sfx.play('heal', 0.5);
        return true;
      }
      case 'allyQuirk':
        this.allyDoes(e.id, e.quirk, e.x, e.y);
        return true;
      default:
        return false;
    }
  }

  /** The hero's move goes off: the wave is held for a breath, the field shakes, and each move has a look of its own. */
  private loose(id: MoveId, x: number, y: number, dx: number, dy: number): void {
    const light = this.light;
    const el = MOVE_EL[id];
    this.hold = 0.12;
    this.shake(170, 0.007);
    sfx.play('claim', 0.8, 0.8);
    this.say(this.world.move?.name.toUpperCase() ?? '', '');
    this.hero.attack(this.clock, 0.05, true);
    // What every move has: light going up off the hero as it leaves them.
    for (let i = 0; i < 10; i++) light.bit(x + rnd(-20, 20), y - rnd(0, 30), el, { dur: rnd(0.4, 0.8), vy: rnd(-200, -90), from: rnd(6, 11), to: 1, stretch: 0.6 });
    if (!light.on) this.fx.spawn('fx/ring', x, y - 6, { dur: 0.35, from: 0.4, to: 3, tint: GOLD_TINT, alpha: 0.9, flat: 0.62, depth: 5 });
    switch (id) {
      case 'charge':
        // The run itself is shown while it lasts (update): here only its start, dust kicked up behind.
        for (let i = 0; i < 4; i++) this.fx.spawn('fx/dust', x - dx * (10 + i * 12), y - 6 - dy * (10 + i * 12), { dur: 0.3, from: 0.5, to: 1.3, alpha: 0.6, flat: 0.6, depth: y - 1 });
        sfx.play('slash', 0.7, 0.6);
        break;
      case 'vanish':
        light.smokeAt(x, y - 30, 6);
        for (let i = 0; i < 6; i++) this.fx.spawn('fx/dust', x + rnd(-22, 22), y - rnd(4, 50), { dur: rnd(0.4, 0.7), from: 0.6, to: 1.6, alpha: 0.7, vy: -20, depth: y + 60 });
        break;
      case 'whiteout':
        // Everything goes white for an instant, and then it is very cold.
        light.flash(x, y - 20, 1500, hex(FROST.light), 0.95, 0.7);
        this.shake(260, 0.01);
        sfx.play('blast', 0.5, 1.6);
        break;
      case 'wildfire':
        sfx.play('blast', 0.7, 0.8);
        break;
      default:
        break;
    }
  }

  private nameOf(id: number): string {
    return this.world.band.find((a) => a.id === id)?.def.name ?? '';
  }

  /** A companion does the thing only it does. */
  private allyDoes(id: number, quirk: string, x: number, y: number): void {
    const light = this.light;
    const v = this.allies.get(id);
    switch (quirk) {
      case 'fetch':
        // Biscuit brings it in: a coin tossed up over him as he hands it over.
        this.fx.spawn('icon/coin', x, y - 44, { dur: 0.5, from: 0.5, to: 0.7, vy: -70, gravity: 260, depth: y + 60 });
        sfx.play('coin', 0.4, 1.3);
        break;
      case 'flare':
        this.fx.spawn('fx/sparkle', x, y - 30, { dur: 0.35, from: 0.8, to: 2.4, tint: hex(HOLY.light), depth: y + 80 });
        break;
      case 'bulwark':
        this.fx.spawn('fx/ring', x, y, { dur: 0.4, from: 0.4, to: 2.6, tint: hex(STEEL.fill), alpha: 0.8, flat: 0.62, depth: 5 });
        light.bit(x, y, 'spark', { dur: 0.4, from: 16, to: 84, alpha: 0.5, flat: 0.62, frame: 'fx/ring' });
        break;
      case 'keen':
        // Marked: a red sign over whoever she struck.
        this.fx.spawn('fx/sparkle', x, y - 56, { dur: 0.6, from: 0.9, to: 0.5, tint: RED, hold: 0.8, depth: y + 80 });
        break;
      case 'roar':
        if (v) v.fig.attack(this.clock, 0.05, true);
        break;
      case 'rally':
        light.bit(x, y, 'holy', { dur: 0.6, from: 20, to: 120, alpha: 0.4, flat: 0.62, frame: 'fx/ring' });
        break;
      case 'stampede':
        for (let i = 0; i < 4; i++) this.fx.spawn('fx/dust', x + rnd(-20, 20), y - rnd(0, 14), { dur: 0.35, from: 0.5, to: 1.4, alpha: 0.7, flat: 0.6, depth: y + 2 });
        this.shake(90, 0.004);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------ every frame

  update(dt: number, clock: number, halted: boolean): void {
    this.clock = clock;
    if (this.hold > 0) this.hold -= dt;
    const w = this.world;
    const h = w.hero;
    const light = this.light;
    const hero = this.hero;
    const t = w.trait;
    this.share = t.share;
    const live = !halted && h.hp > 0;

    // The quirk, as it stands.
    let brace = 0;
    let sign = 0;
    let signR = 46;
    switch (w.quirk) {
      case 'standfast':
        // Bram's shield is coming up while he stands, and set when the ring under him is whole.
        brace = t.on ? 1 : t.share * 0.4;
        sign = t.on ? 0.8 : 0.22 * t.share;
        signR = t.on ? 44 + 2 * Math.sin(clock * 5) : 30 + 14 * t.share;
        if (t.on) light.lamp(h.x, h.y - 18, 150, 'holy', 0.3);
        break;
      case 'unseen':
        // Wren, untouched: a quiet light gathers on her, and is knocked off her by a blow.
        if (t.share > 0.15) {
          light.lamp(h.x, h.y - 30, 100 + 70 * t.share, 'venom', 0.34 * t.share);
          if (live && Math.random() < 0.3 * t.share) light.bit(h.x + rnd(-16, 16), h.y - rnd(4, 64), 'venom', { dur: rnd(0.5, 0.9), vy: rnd(-40, -16), from: rnd(4, 7), to: 1, alpha: 0.7 });
        }
        break;
      case 'tilt':
        // Isaura riding straight: the air drawn out behind her, the more the nearer her lance is to couched.
        if (live && h.moving && t.share > 0.25) {
          this.streak -= dt;
          if (this.streak <= 0) {
            this.streak = 0.045;
            light.bit(h.x - hero.facing * rnd(6, 26), h.y - rnd(8, 66), 'spark', { dur: 0.24, vx: -hero.facing * rnd(200, 320), from: 4 + 3 * t.share, to: 1, stretch: 5, turn: true, alpha: 0.6 * t.share });
            if (!light.on && Math.random() < 0.3) this.fx.spawn('fx/dust', h.x - hero.facing * 16, h.y - 4, { dur: 0.25, from: 0.3, to: 0.8, alpha: 0.5, flat: 0.6, depth: h.y - 1 });
          }
        }
        break;
      case 'gravedebt':
        // Hroth, hurt: he glows like a coal, the more the nearer he is to falling.
        if (t.share > 0.3) {
          light.lamp(h.x, h.y - 30, 150, 'red', 0.4 * t.share);
          if (live && Math.random() < 0.35 * t.share) light.bit(h.x + rnd(-18, 18), h.y - rnd(6, 60), 'red', { dur: rnd(0.4, 0.8), vy: rnd(-90, -40), from: rnd(4, 8), to: 1, sway: 4 });
        }
        break;
      case 'unfinished':
        // Orrin's third bolt, waiting in the staff, once the staff has learned it.
        if (w.own && w.own.tier >= 1 && this.third) {
          const tx = h.x + hero.muzzleReach;
          const ty = h.y - hero.muzzleHeight;
          light.lamp(tx, ty, 110, 'arcane', 0.5);
          if (live && Math.random() < 0.5) light.bit(tx + rnd(-6, 6), ty + rnd(-6, 6), 'arcane', { dur: rnd(0.3, 0.6), vy: rnd(-40, -10), from: rnd(6, 12), to: 1 });
        }
        break;
      case 'shepherd':
        // Aldous's fold: how near him the band has to be.
        sign = 0.14 + 0.06 * t.share;
        signR = QUIRKS.shepherd.r;
        break;
      default:
        break;
    }
    hero.brace += (brace - hero.brace) * Math.min(1, dt * 10);
    this.sign.setVisible(sign > 0.01 && h.hp > 0);
    if (sign > 0.01) this.sign.setPosition(h.x, h.y).setTint(GOLD_TINT).setAlpha(sign).setScale((signR / 60) * INV_ART, (signR / 60) * INV_ART * 0.62);

    // A charge, while it lasts: light torn off the hero, and the ground kicked up.
    if (h.dash && live) {
      const d = h.dash;
      for (let i = 0; i < 3; i++) {
        light.bit(h.x - d.dx * rnd(0, 34) + rnd(-8, 8), h.y - rnd(6, 66), 'spark', { dur: rnd(0.2, 0.36), vx: -d.dx * rnd(220, 380), vy: -d.dy * rnd(220, 380), from: rnd(7, 12), to: 1, stretch: 5, turn: true, alpha: 0.8 });
      }
      light.lamp(h.x, h.y - 26, 170, 'spark', 0.45);
      if (Math.random() < 0.6) this.fx.spawn('fx/dust', h.x - d.dx * 14, h.y - 4 - d.dy * 14, { dur: 0.28, from: 0.4, to: 1.1, alpha: 0.6, flat: 0.6, depth: h.y - 1 });
    }
    // Unseen: smoke hangs where they are.
    if (h.unseen > 0 && live && Math.random() < 0.12) light.smokeAt(h.x + rnd(-10, 10), h.y - rnd(10, 40), 1);
    // Their blows heal them: the red of it on them.
    if (h.feast > 0 && h.hp > 0) light.lamp(h.x, h.y - 30, 170, 'red', 0.35 + 0.1 * Math.sin(clock * 9));

    // A ring of fire running out: flames all the way round its edge.
    for (const r of w.rings) {
      if (halted) break;
      const n = Math.min(14, 4 + Math.floor(r.r / 26));
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2);
        light.bit(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r, 'fire', { dur: rnd(0.3, 0.55), vx: Math.cos(a) * 30, vy: rnd(-110, -60), from: rnd(18, 30), to: 3, flame: true, sway: 3, alpha: 0.75 });
      }
      for (let i = 0; i < 4; i++) {
        const a = clock * 0.7 + (i * Math.PI) / 2;
        light.lamp(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r, 170, 'fire', 0.5);
      }
      if (!light.on && Math.random() < 0.5) {
        const a = rnd(0, Math.PI * 2);
        this.fx.spawn('fx/orb-fire', r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r, { dur: 0.3, from: 0.6, to: 0.2, vy: -40 });
      }
    }

    // What is on its way down: a star with its tail, a hammer of light with the pillar it comes down in.
    for (const f of w.falls) {
      const el = FALL_EL[f.kind];
      if (!el || halted) continue;
      const k = Math.max(0, f.left);
      const hx = f.x + k * 110;
      const hy = f.y - 16 - k * 680;
      const big = f.kind === 'light';
      light.bit(hx, hy, el, { dur: 0.3, from: big ? 46 : 22, to: 4, alpha: 0.95 });
      light.bit(hx + rnd(-5, 5), hy + rnd(-5, 5), el, { dur: rnd(0.3, 0.5), vx: rnd(-30, 30), vy: rnd(-30, 30), from: rnd(5, 9), to: 1 });
      light.lamp(hx, Math.min(hy + 80, f.y), big ? 240 : 130, el, 0.55);
      if (big && k < 0.45) {
        // The pillar: light standing from the ground up, thicker as the hammer nears.
        for (let i = 0; i < 3; i++) light.bit(f.x + rnd(-14, 14), f.y - rnd(0, 360), 'holy', { dur: rnd(0.18, 0.3), vy: rnd(240, 420), from: rnd(18, 30), to: 6, stretch: 3.5, turn: true, alpha: 0.5 });
      }
      if (!light.on) this.fx.spawn(big ? 'fx/orb-holy' : 'fx/orb-arcane', hx, hy, { dur: 0.08, from: big ? 1.6 : 0.9, to: big ? 1.6 : 0.9, depth: 6000 });
    }

    // Ground that is being rained on: the arrows coming down.
    for (const z of w.zones) {
      if (z.kind !== 'rain' || halted) continue;
      for (let i = 0; i < 2; i++) {
        if (Math.random() > 0.7) continue;
        const a = rnd(0, Math.PI * 2);
        const d = Math.sqrt(Math.random()) * z.r;
        const x = z.x + Math.cos(a) * d;
        const y = z.y + Math.sin(a) * d * 0.62;
        this.fx.spawn('fx/arrow', x - 34, y - 190, { dur: 0.18, vx: 190, vy: 1050, rotation: 1.39, from: 0.7, to: 0.7, alpha: 0.95, hold: 0.9, depth: y + 60 });
        this.fx.spawn('fx/dust', x, y - 2, { dur: 0.2, delay: 0.17, from: 0.2, to: 0.5, alpha: 0.5, flat: 0.6, depth: y - 1 });
      }
    }

    // A champion stands in a light of its own kind, as a captain does: it is not one of the rest, and is seen not to be.
    for (const f of w.foes) {
      if (!f.champion || f.dead) continue;
      const el = f.champion === 'burning' ? 'fire' : f.champion === 'quick' ? 'venom' : 'spark';
      light.lamp(f.x, f.y - 26, 150, el, 0.4 + 0.08 * Math.sin(clock * 3 + f.id));
      if (!halted && Math.random() < 0.12) light.bit(f.x + rnd(-14, 14), f.y - rnd(8, 50), el, { dur: rnd(0.4, 0.8), vy: rnd(-60, -24), from: rnd(4, 8), to: 1, flame: el === 'fire', sway: 3 });
    }

    // The ground marked for what is about to land.
    for (const o of this.omens) {
      o.left -= halted ? 0 : dt;
      if (o.left <= 0) {
        o.disc.destroy();
        o.ring.destroy();
        continue;
      }
      const k = 1 - o.left / o.of;
      o.disc.setScale((o.r / 30) * INV_ART * (0.3 + 0.7 * k), (o.r / 30) * INV_ART * (0.3 + 0.7 * k) * 0.62).setAlpha(0.14 + 0.2 * k);
      o.ring.setScale((o.r / 60) * INV_ART, (o.r / 60) * INV_ART * 0.62).setAlpha(0.55 + 0.35 * Math.sin(clock * 16) ** 2);
    }
    if (this.omens.some((o) => o.left <= 0)) this.omens = this.omens.filter((o) => o.left > 0);

    this.band(dt, clock, halted);
  }

  /** The companions: where the wave says each is, on its feet or down, with its name when it comes on and its health when it is hurt. */
  private band(dt: number, clock: number, halted: boolean): void {
    const light = this.light;
    for (const a of this.world.band) {
      let v = this.allies.get(a.id);
      if (!v) v = this.enlist(a);
      const fig = v.fig;
      const down = a.down > 0;
      fig.x = a.x;
      fig.y = a.y;
      if (v.aimFor > 0) v.aimFor -= dt;
      fig.facing = v.aimFor > 0 ? v.aimFace : a.face;
      fig.moving = a.moving && !down && !halted;
      fig.stride = a.state === 'dash' || a.state === 'fetch' ? 1.6 : 1;
      fig.down = down;
      // One that is down lies grey where it fell until it gets up; one that was just struck flickers.
      fig.shade(down ? 0x8a8f98 : null);
      fig.alpha = down ? 0.75 : a.grace > 0 && Math.floor(clock * 20) % 2 === 0 ? 0.6 : 1;
      fig.update(clock, dt);

      const top = a.y - fig.height - 8;
      if (v.tagLeft > 0) {
        v.tagLeft -= dt;
        v.tag.setPosition(a.x, top - 8).setAlpha(Math.min(1, v.tagLeft * 3)).setVisible(true);
      } else v.tag.setVisible(false);
      const hurt = a.maxHp > 0 && a.hp < a.maxHp && !down;
      v.back.setVisible(hurt);
      v.bar.setVisible(hurt);
      if (hurt) {
        v.back.setPosition(a.x, a.y + 10).setDisplaySize(38, 7).setDepth(a.y + 1);
        v.bar.setPosition(a.x - 17, a.y + 10).setDisplaySize(34 * Math.max(0, a.hp / a.maxHp), 3).setDepth(a.y + 2);
      }
      // How long until it is up again, counted over it.
      v.count.setVisible(down && v.tagLeft <= 0);
      if (down) v.count.setText(String(Math.ceil(a.down))).setPosition(a.x, a.y - 34);

      const el = ALLY_LIGHT[a.def.id];
      if (el && !down) {
        light.lamp(a.x, a.y - 24, el === 'holy' ? 190 : 120, el, el === 'holy' ? 0.42 : 0.3);
        if (!halted && Math.random() < 0.25) light.bit(a.x + rnd(-8, 8), a.y - rnd(14, 40), el, { dur: rnd(0.4, 0.8), vy: rnd(-50, -20), from: rnd(5, 9), to: 1, flame: el === 'fire', sway: 3 });
      }
      // Tam's colors: everyone near them strikes faster, and the ground says how near.
      if (a.def.quirk === 'rally' && !down && Math.floor(clock * 2) !== Math.floor((clock - dt) * 2) && !halted) {
        light.bit(a.x, a.y, 'holy', { dur: 0.5, from: 30, to: 150, alpha: 0.22, flat: 0.62, frame: 'fx/ring' });
      }
    }
  }

  private enlist(a: Ally): AllyView {
    const scene = this.scene;
    const fig = new Figure(scene, a.def.unit, 'blue', getManifest().units[a.def.unit], ALLY_SCALE, 'unit', a.id);
    const tag = label(scene, 0, 0, a.def.name, { size: 16 }).setDepth(9000).setVisible(false);
    const count = label(scene, 0, 0, '', { size: 20, color: BONE.fill }).setDepth(9000).setVisible(false);
    const back = scene.add.image(0, 0, SHEET, 'fx/solid').setTint(hex(OUTLINE)).setVisible(false);
    const bar = scene.add.image(0, 0, SHEET, 'fx/solid').setTint(0x6fc7e8).setOrigin(0, 0.5).setVisible(false);
    for (const o of [tag, count, back, bar]) this.light.crisp(o);
    const v: AllyView = { fig, tag, tagLeft: NAMED, back, bar, count, aimFor: 0, aimFace: 1 };
    this.allies.set(a.id, v);
    return v;
  }
}
