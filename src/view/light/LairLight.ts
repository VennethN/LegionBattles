// The light of a lair: how dark it is, what gives light and where, what
// burns, and what hangs in the air. It reads the hunt as it stands
// (game/hunt.ts) and is told what has happened, as the lair's own screen
// is; it changes nothing about the fight.
//
// Three things are set up when it is on:
//   - a filter on the lair's camera (StageFilter.ts), told every frame
//     where the lights are;
//   - the emit picture: what shines by itself (Glow.ts) is drawn into a
//     picture of its own, half the size, which the filter adds after the
//     dark, so that the dark does not dim a flame;
//   - a second camera with no filter, for what has to stay sharp and
//     bright however dark it is: the tells on the ground above all, and
//     numbers, bars and names.
//
// With it off none of the three exists and the lair is drawn plainly.

import Phaser from 'phaser';
import type { Ev, Hunt } from '../../game/hunt';
import { SHEET } from '../art/Sheet';
import { Glow, glowScale } from './Glow';
import { ELEMENTS, LAIRS, LANTERN, darkness, type Element, type Hour } from './hours';
import { lightMode, stepLightDown, type LightMode } from './setting';
import { MAX_LIGHTS } from './shaders';
import { StageFilter, lightPossible, registerStage } from './StageFilter';

const EMIT_KEY = 'light:emit';
/** How much smaller than the view the emit picture is. Light has no edges to lose. */
const EMIT_SCALE = 0.5;
/** A frame slower than this many milliseconds, for this many seconds on end, and the light is taken down a step. */
const SLOW_MS = 30;
const SLOW_SECONDS = 4;

interface Lit {
  x: number;
  y: number;
  r: number;
  color: number;
  strength: number;
  /** The hunter's own light is never dropped, however many others there are. */
  first: boolean;
}

interface Flash {
  x: number;
  y: number;
  r: number;
  color: number;
  strength: number;
  t: number;
  dur: number;
}

interface Mote {
  img: Phaser.GameObjects.Image;
  u: number;
  v: number;
  du: number;
  dv: number;
  size: number;
  near: number;
  phase: number;
  alpha: number;
}

type Seen = Phaser.GameObjects.GameObject & { cameraFilter: number };

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export class LairLight {
  private mode: LightMode = 'off';
  private filter: StageFilter | null = null;
  private crispCam: Phaser.Cameras.Scene2D.Camera | null = null;
  private emit: Phaser.Textures.DynamicTexture | null = null;
  private glow: Glow | null = null;
  private smoke: Phaser.GameObjects.Image[] = [];
  private readonly crispSet = new Set<Seen>();
  private readonly emitSet = new Set<Seen>();
  /** What others hand over to shine: drawn into the light's picture with the glow, when they are on show. */
  private readonly shiners: Phaser.GameObjects.Image[] = [];
  private readonly hour: Hour;
  private readonly dark: number;
  private lit: Lit[] = [];
  private flashes: Flash[] = [];
  private readonly shotAt = new Map<number, { x: number; y: number; since: number }>();
  private motes: Mote[] = [];
  private drawn: Phaser.GameObjects.Image[] = [];
  private clock = 0;
  private age = 0;
  private slow = 0;
  private budget = 0;
  private gone = false;
  /** Seconds the boss's own lamp gutters for: broken, it nearly goes out. */
  private gutterLeft = 0;
  /** How far the lair's dark has lifted, 0 to 1: the boss is dead and the place breathes again. */
  private liftK = 0;
  /** How hurt the hunter is, 0 to 1, and the beat of their heart: the colors drain and the edges close in. */
  hurt = 0;
  /** The view this frame, in the field's units: its top left corner and its size. */
  private vx = 0;
  private vy = 0;
  private vw = 800;
  private vh = 600;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hunt: Hunt,
    /** Where the lair's own fires burn: the heads of its torch posts. */
    private readonly torches: ReadonlyArray<readonly [number, number]> = [],
  ) {
    this.hour = LAIRS[hunt.monster.def.lair] ?? LAIRS.churchyard;
    this.dark = darkness(this.hour);
    scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.added, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.setMode(lightMode());
  }

  /** True while the light is made at all. */
  get on(): boolean {
    return this.filter !== null;
  }

  // ------------------------------------------------------------ on and off

  /** Puts the light up, takes it down, or changes how much of it there is. */
  setMode(mode: LightMode): void {
    if (this.gone) return;
    const want = lightPossible(this.scene.game) ? mode : 'off';
    if (want === this.mode) return;
    if (want === 'off') this.takeDown();
    else if (this.mode === 'off') this.putUp();
    this.mode = want;
    if (this.filter) this.filter.full = want === 'full';
    this.slow = 0;
  }

  private putUp(): void {
    const scene = this.scene;
    const cam = scene.cameras.main;
    registerStage(scene.game);
    this.filter = new StageFilter(cam);
    cam.filters.internal.add(this.filter);
    this.crispCam = scene.cameras.add(cam.x, cam.y, cam.width, cam.height, false, 'crisp');
    if (scene.textures.exists(EMIT_KEY)) scene.textures.remove(EMIT_KEY);
    this.emit = scene.textures.addDynamicTexture(EMIT_KEY, Math.max(8, Math.ceil(cam.width * EMIT_SCALE)), Math.max(8, Math.ceil(cam.height * EMIT_SCALE)));
    this.glow ??= new Glow(scene, 420, (img) => {
      this.emitSet.add(img as unknown as Seen);
      this.see(img as unknown as Seen);
    });
    for (const child of scene.children.list) this.see(child as Seen);
    for (const img of this.glow.all()) this.see(img as unknown as Seen);
    this.makeAir();
  }

  private takeDown(): void {
    const scene = this.scene;
    if (this.filter) scene.cameras.main.filters.internal.remove(this.filter, true);
    this.filter = null;
    if (this.crispCam) scene.cameras.remove(this.crispCam);
    this.crispCam = null;
    if (this.emit && scene.textures.exists(EMIT_KEY)) scene.textures.remove(EMIT_KEY);
    this.emit = null;
    this.shotAt.clear();
    for (const m of this.motes) this.glow?.give(m.img);
    this.motes = [];
    this.glow?.clear();
    for (const s of this.smoke) s.setVisible(false);
    this.flashes = [];
    // Every camera draws everything again.
    for (const child of scene.children.list) (child as Seen).cameraFilter = 0;
  }

  /** The lair's screen is being shut: everything on it goes with it, and only what outlives a screen is taken away here. */
  private destroy(): void {
    if (this.gone) return;
    this.gone = true;
    this.scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.added, this);
    if (this.emit && this.scene.textures.exists(EMIT_KEY)) this.scene.textures.remove(EMIT_KEY);
    this.emit = null;
    this.filter = null;
    this.crispCam = null;
    this.mode = 'off';
  }

  // ------------------------------------------------------------ who draws what

  private added(obj: Phaser.GameObjects.GameObject): void {
    if (this.filter) this.see(obj as Seen);
  }

  /** Tells the two cameras which of them draws a thing. What shines by itself is drawn by neither. */
  private see(obj: Seen): void {
    const main = this.scene.cameras.main.id;
    const crisp = this.crispCam?.id ?? 0;
    if (this.emitSet.has(obj)) obj.cameraFilter = main | crisp;
    else if (this.crispSet.has(obj) || obj.type === 'BitmapText') obj.cameraFilter = main;
    else obj.cameraFilter = crisp;
  }

  /** A thing that shines by itself: drawn through the light's own picture, so that the dark does not dim it. */
  shine<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.emitSet.add(obj as unknown as Seen);
    this.shiners.push(obj as unknown as Phaser.GameObjects.Image);
    if (this.filter) this.see(obj as unknown as Seen);
    return obj;
  }

  /** The boss's lamp gutters for a while, as when he is broken. */
  gutter(seconds: number): void {
    this.gutterLeft = Math.max(this.gutterLeft, seconds);
  }

  /** A thing that has to stay sharp and bright however dark it is. */
  crisp<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.crispSet.add(obj as unknown as Seen);
    if (this.filter) this.see(obj as unknown as Seen);
    return obj;
  }

  // ------------------------------------------------------------ lights

  private light(x: number, y: number, r: number, color: number, strength: number, first = false): void {
    this.lit.push({ x, y, r, color, strength, first });
  }

  /** A light that dies away by itself. */
  flash(x: number, y: number, r: number, color: number, strength: number, dur: number): void {
    if (!this.filter) return;
    this.flashes.push({ x, y, r, color, strength, t: 0, dur });
  }

  /** True while there is room this frame for one more bit of light. */
  private spend(): boolean {
    return this.budget-- > 0;
  }

  private sparks(x: number, y: number, el: Element, n: number, speed: number, dur: number): void {
    const glow = this.glow as Glow;
    for (let i = 0; i < n && this.spend(); i++) {
      const a = rnd(0, Math.PI * 2);
      const sp = speed * rnd(0.4, 1);
      glow.spawn(x, y, el, { dur: dur * rnd(0.6, 1.2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 60, gravity: 520, drag: 1.4, from: rnd(4.5, 7.5), to: 1, turn: true, stretch: 2.6 });
    }
  }

  /** Something goes up: a flash, a ring running out along the ground, fire all through it, sparks thrown out, and smoke after. */
  private blast(x: number, y: number, r: number, el: Element, smoke: boolean): void {
    const glow = this.glow as Glow;
    this.flash(x, y, r * 3.4, el.light, 1, 0.45);
    glow.spawn(x, y - 6, el, { dur: 0.2, from: r * 0.6, to: r * 1.6, alpha: 0.5 });
    glow.spawn(x, y, el, { dur: 0.32, from: r * 0.5, to: r * 1.1, alpha: 0.55, frame: 'fx/ring' });
    const n = Math.round(Math.min(18, 8 + r / 9));
    for (let i = 0; i < n && this.spend(); i++) {
      const a = rnd(0, Math.PI * 2);
      const d = r * rnd(0.2, 0.85);
      glow.spawn(x + Math.cos(a) * d, y + Math.sin(a) * d, el, {
        dur: rnd(0.3, 0.65), vx: Math.cos(a) * r * 0.9, vy: Math.sin(a) * r * 0.7 - 50, gravity: -90, drag: 2.6, from: rnd(r * 0.3, r * 0.55), to: 4, flame: true, sway: 3, alpha: 0.7,
      });
    }
    this.sparks(x, y - 8, ELEMENTS.spark, 10, r * 5, 0.7);
    if (smoke) this.puff(x, y - 14, 4);
  }

  /** Smoke: dark, and so drawn in the lair with everything else, where the dark falls on it too. */
  private puff(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      let img = this.smoke.find((s) => !s.visible);
      if (!img) {
        if (this.smoke.length >= 30) return;
        img = this.scene.add.image(0, 0, SHEET, 'fx/glow').setTint(0x2a2420);
        this.smoke.push(img);
      }
      img.setVisible(true).setPosition(x + rnd(-12, 12), y + rnd(-6, 6)).setDepth(y + 80).setAlpha(0.01);
      img.setData('t', -i * 0.05).setData('dur', rnd(0.9, 1.5)).setData('vx', rnd(-14, 14)).setData('vy', rnd(-52, -30)).setData('s', rnd(26, 40));
    }
  }

  // ------------------------------------------------------------ what has happened

  react(events: readonly Ev[]): void {
    const glow = this.glow;
    if (!this.filter || !glow) return;
    const h = this.hunt.hunter;
    const m = this.hunt.monster;
    for (const e of events) {
      switch (e.t) {
        case 'hit':
          if (e.who === 'monster') {
            this.sparks(e.x + rnd(-14, 14), e.y - 40, e.big ? ELEMENTS.holy : ELEMENTS.spark, e.big ? 7 : 3, 220, 0.3);
            if (e.big) this.flash(e.x, e.y - 40, 150, ELEMENTS.holy.light, 0.5, 0.16);
          } else this.sparks(e.x, e.y - 20, ELEMENTS.spark, 2, 160, 0.25);
          break;
        case 'hurt':
          if (e.who === 'hunter') this.flash(h.x, h.y - 24, 220, ELEMENTS.red.light, 0.6, 0.25);
          break;
        case 'land':
          if (e.foe) {
            this.flash(e.x, e.y, Math.min(260, e.kind === 'line' ? 160 : e.r * 1.6), ELEMENTS.red.light, 0.5, 0.22);
            if (e.kind !== 'line') this.sparks(e.x, e.y - 4, ELEMENTS.red, 4, 200, 0.35);
          }
          break;
        case 'blast':
          this.blast(e.x, e.y, e.r, ELEMENTS.fire, true);
          break;
        case 'alight':
          this.flash(e.x, e.y, e.r * 2.6, ELEMENTS.fire.light, 0.9, 0.5);
          break;
        case 'turned':
          this.flash(e.x, e.y - 30, 240, ELEMENTS.spark.light, 1, 0.3);
          this.sparks(e.x, e.y - 36, ELEMENTS.spark, 14, 380, 0.5);
          break;
        case 'broken':
          this.flash(e.x, e.y - 40, 460, ELEMENTS.holy.light, 0.6, 0.7);
          this.sparks(e.x, e.y - 60, ELEMENTS.holy, 18, 420, 0.8);
          glow.spawn(e.x, e.y - 20, ELEMENTS.holy, { dur: 0.5, from: 60, to: 240, alpha: 0.22, frame: 'fx/ring' });
          break;
        case 'crash':
          this.flash(e.x, e.y - 20, 360, ELEMENTS.spark.light, 0.9, 0.4);
          this.sparks(e.x, e.y - 30, ELEMENTS.spark, 16, 420, 0.6);
          this.puff(e.x, e.y - 20, 4);
          break;
        case 'bell':
          this.flash(e.x, e.y - 40, 460, ELEMENTS.holy.light, 0.6, 0.7);
          glow.spawn(e.x, e.y - 30, ELEMENTS.holy, { dur: 0.6, from: 40, to: 400, alpha: 0.22, frame: 'fx/ring' });
          break;
        case 'ability':
          if (e.id === 'flare') {
            this.flash(e.x, e.y - 30, e.r * 3, 0xffffff, 0.9, 0.6);
            glow.spawn(e.x, e.y - 30, ELEMENTS.holy, { dur: 0.3, from: 40, to: e.r * 1.6, alpha: 0.4 });
            this.sparks(e.x, e.y - 30, ELEMENTS.holy, 16, 460, 0.6);
          } else if (e.id === 'reap') {
            this.flash(e.x, e.y - 20, e.r * 2, ELEMENTS.spark.light, 0.4, 0.25);
            glow.spawn(e.x, e.y - 6, ELEMENTS.spark, { dur: 0.22, from: e.r * 0.8, to: e.r * 2, alpha: 0.16, frame: 'fx/ring' });
          } else if (e.id === 'lamp') this.flash(e.x, e.y, e.r * 2.6, ELEMENTS.holy.light, 0.7, 0.5);
          else if (e.id === 'heel') this.flash(e.x, e.y - 20, 240, ELEMENTS.venom.light, 0.6, 0.5);
          else if (e.id === 'brace') this.flash(e.x, e.y - 30, 150, ELEMENTS.spark.light, 0.5, 0.3);
          break;
        case 'shift':
          this.flash(m.x, m.y - 60, 700, ELEMENTS.red.light, 1.1, 1.6);
          break;
        case 'wake':
          this.flash(m.x, m.y - 60, 600, ELEMENTS.red.light, 1, 1.2);
          break;
        case 'summon':
          this.flash(e.x, e.y, 110, ELEMENTS.venom.light, 0.6, 0.5);
          for (let i = 0; i < 5 && this.spend(); i++) glow.spawn(e.x + rnd(-14, 14), e.y - rnd(0, 20), ELEMENTS.venom, { dur: rnd(0.5, 0.9), vy: rnd(-70, -30), from: rnd(6, 11), to: 1, alpha: 0.8, sway: 4 });
          break;
        case 'fall':
          if (e.who === 'monster') {
            this.blast(e.x, e.y - 40, 130, ELEMENTS.holy, true);
            // A last light, not a white page: the dark is to lift after it, not be blown away.
            this.flash(e.x, e.y - 40, 560, ELEMENTS.holy.light, 0.7, 1.2);
          }
          break;
        case 'mend':
          for (let i = 0; i < 6 && this.spend(); i++) glow.spawn(e.x + rnd(-16, 16), e.y - rnd(8, 40), ELEMENTS.venom, { dur: rnd(0.5, 0.8), vy: rnd(-70, -40), from: 9, to: 2, alpha: 0.9 });
          break;
        case 'spared':
          this.flash(h.x, h.y - 30, 420, ELEMENTS.holy.light, 1.2, 0.9);
          break;
        default:
          break;
      }
    }
  }

  // ------------------------------------------------------------ every frame

  /** Called when the lair has been put where it stands this frame. */
  update(dt: number, clock: number, halted: boolean): void {
    this.clock = clock;
    this.age += dt;
    this.watch(dt, halted);
    const filter = this.filter;
    const glow = this.glow;
    if (!filter || !glow || this.gone) return;
    const w = this.hunt;
    const h = w.hunter;
    const m = w.monster;
    const cam = this.scene.cameras.main;
    this.vw = cam.width / cam.zoom;
    this.vh = cam.height / cam.zoom;
    this.vx = cam.scrollX + cam.width / 2 - this.vw / 2;
    this.vy = cam.scrollY + cam.height / 2 - this.vh / 2;
    this.crispCam?.setZoom(cam.zoom).setScroll(cam.scrollX, cam.scrollY);
    this.lit.length = 0;
    this.budget = this.mode === 'full' ? 46 : 20;
    const flick = (seed: number): number => 0.86 + 0.14 * Math.sin(clock * 17 + seed * 3.1) * Math.sin(clock * 7.3 + seed);

    // The hunter's lantern: the one light there always is.
    const lamp = this.hour.lamp;
    if (h.hp > 0) this.light(h.x, h.y - 40, 360, LANTERN, 0.9 * lamp * flick(1), true);

    // The monster is seen by a light of its own, dull while it sleeps: it is what the lair is about.
    const awake = m.state !== 'asleep' && m.state !== 'dead';
    if (m.state !== 'dead') {
      const broken = m.state === 'broken';
      const color = broken ? ELEMENTS.holy.light : w.open ? 0xffc890 : ELEMENTS.red.light;
      // It carries its own light, low on its chest: red, and the brighter for being awake.
      // Drawing back for a blow, its lamp flares: the more, the nearer the blow is.
      let gather = 0;
      for (const t of w.tells) if (t.by === 0 && t.foe) gather = Math.max(gather, 1 - t.left / t.of);
      // Broken, it gutters and nearly goes out.
      if (this.gutterLeft > 0) this.gutterLeft = Math.max(0, this.gutterLeft - dt);
      const gutter = this.gutterLeft > 0 ? 0.25 + 0.35 * Math.abs(Math.sin(clock * 23) * Math.sin(clock * 9)) : 1;
      this.light(m.x + m.face * 30, m.y - 150, 440 * (1 + 0.1 * gather), color, (awake ? 0.7 + 0.08 * Math.sin(clock * 2.2) + (broken ? 0.1 : 0) + 0.22 * gather * gather * gather : 0.45) * (0.5 + 0.5 * lamp) * gutter);
      if (broken && !halted && Math.random() < 0.4 && this.spend()) glow.spawn(m.x + rnd(-40, 40), m.y - rnd(20, 160), ELEMENTS.holy, { dur: rnd(0.4, 0.8), vy: rnd(-60, -20), from: rnd(6, 10), to: 1 });
    }

    // The lair's own torches burn where they stand.
    this.torches.forEach(([tx, ty], i) => {
      this.light(tx, ty + 60, 250, ELEMENTS.fire.light, 0.5 * flick(40 + i));
      if (!halted && Math.random() < 0.5 && this.spend()) glow.spawn(tx + rnd(-4, 4), ty + rnd(-2, 4), ELEMENTS.fire, { dur: rnd(0.3, 0.5), vx: rnd(-6, 6), vy: rnd(-90, -50), from: rnd(10, 16), to: 2, flame: true, sway: 3, alpha: 0.6 });
    });

    // Fires: a watchfire burns and lights its ground.
    for (const b of w.buildings) {
      if (b.def.kind !== 'fire') continue;
      this.light(b.x, b.y - 30, 300, ELEMENTS.fire.light, 0.75 * flick(b.id));
      if (halted) continue;
      if (Math.random() < 0.7 && this.spend()) glow.spawn(b.x + rnd(-9, 9), b.y - rnd(46, 56), ELEMENTS.fire, { dur: rnd(0.3, 0.55), vx: rnd(-8, 8), vy: rnd(-120, -66), from: rnd(14, 22), to: 3, flame: true, sway: 3, alpha: 0.7 });
      if (Math.random() < 0.08 && this.spend()) glow.spawn(b.x, b.y - 20, ELEMENTS.spark, { dur: rnd(0.7, 1.2), vx: rnd(-26, 26), vy: rnd(-130, -70), from: 4, to: 1, sway: 5 });
    }

    // Tar that burns.
    for (const p of w.pools) {
      if (p.burning <= 0) continue;
      this.light(p.x, p.y, p.r * 2.4, ELEMENTS.fire.light, 0.6 * flick(p.id));
      if (halted) continue;
      for (let i = 0; i < 3 && this.spend(); i++) {
        const a = rnd(0, Math.PI * 2);
        const d = Math.sqrt(Math.random()) * p.r;
        glow.spawn(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, ELEMENTS.fire, { dur: rnd(0.3, 0.6), vx: rnd(-8, 8), vy: rnd(-110, -60), from: rnd(14, 24), to: 3, flame: true, sway: 3, alpha: 0.6 });
      }
    }

    // A lamp stood on the ground lights what is round it.
    for (const d of w.wards) this.light(d.x, d.y - 40, d.r * 2, LANTERN, 0.6 * Math.min(1, d.life) * flick(d.id));

    // The tells throw a little red on the ground under them: the nearest few.
    let told = 0;
    for (const t of w.tells) {
      if (told >= 5 || t.kind === 'line') continue;
      told++;
      const k = 1 - t.left / t.of;
      this.light(t.x, t.y, Math.min(240, t.r * 1.5), t.foe ? ELEMENTS.red.light : ELEMENTS.fire.light, 0.12 + 0.2 * k);
    }

    // What flies leaves a pale line after it.
    for (const s of w.shots) {
      let v = this.shotAt.get(s.id);
      if (!v) {
        v = { x: s.x, y: s.y, since: 0 };
        this.shotAt.set(s.id, v);
      }
      v.since += Math.hypot(s.x - v.x, s.y - v.y);
      const angle = Math.atan2(s.vy, s.vx);
      while (v.since > 14 && !halted) {
        v.since -= 14;
        if (!this.spend()) break;
        glow.spawn(s.x - Math.cos(angle) * 10, s.y - 18 - Math.sin(angle) * 10, ELEMENTS.spark, { dur: 0.16, vx: s.vx * 0.2, vy: s.vy * 0.2, from: s.from === 'ballista' ? 14 : 9, to: 2, turn: true, stretch: 3.2, alpha: 0.4 });
      }
      v.x = s.x;
      v.y = s.y;
    }
    if (this.shotAt.size > w.shots.length + 8) {
      for (const id of this.shotAt.keys()) if (!w.shots.some((s) => s.id === id)) this.shotAt.delete(id);
    }

    for (const f of this.flashes) {
      f.t += dt;
      const k = Math.max(0, 1 - f.t / f.dur);
      this.light(f.x, f.y, f.r * (0.7 + 0.3 * k), f.color, f.strength * k * k);
    }
    if (this.flashes.some((f) => f.t >= f.dur)) this.flashes = this.flashes.filter((f) => f.t < f.dur);

    this.moveAir(dt, halted);
    this.moveSmoke(dt);
    if (!halted) glow.update(dt);
    this.tell(filter);
    this.drawEmit(filter, glow);
  }

  // ------------------------------------------------------------ the air

  /** What hangs in the air of a lair: a few lights over a churchyard, snow in a winter wood. */
  private makeAir(): void {
    const glow = this.glow as Glow;
    const snow = this.hunt.monster.def.lair === 'wood';
    const n = snow ? 46 : 16;
    for (let i = 0; i < n; i++) {
      const near = rnd(1, 1.7);
      const m: Mote = { img: glow.take(), u: Math.random(), v: Math.random(), du: 0, dv: 0, size: 4, near, phase: rnd(0, 6.28), alpha: 0.6 };
      if (snow) {
        m.du = -0.02 * near - 0.02;
        m.dv = 0.09 * near;
        m.size = rnd(8, 13) * near;
        m.alpha = rnd(0.35, 0.7);
        m.img.setTint(0xe6f2ff);
      } else {
        // Corpse lights: they drift, and go out, and come back.
        m.du = rnd(-0.015, 0.015);
        m.dv = rnd(-0.012, 0.012);
        m.size = rnd(12, 18);
        m.alpha = 0.9;
        m.img.setTint(0xa8ffc4);
      }
      this.motes.push(m);
    }
  }

  private moveAir(dt: number, halted: boolean): void {
    const lights = this.hunt.monster.def.lair !== 'wood';
    for (const m of this.motes) {
      if (!halted) {
        m.u += m.du * dt;
        m.v += m.dv * dt;
        m.phase += dt;
      }
      const u = (((m.u - (this.vx * m.near) / this.vw) % 1) + 1) % 1;
      const v = (((m.v - (this.vy * m.near) / this.vh) % 1) + 1) % 1;
      const wander = lights ? 14 : 5;
      const x = this.vx + u * this.vw + Math.sin(m.phase * 1.3) * wander;
      const y = this.vy + v * this.vh + Math.cos(m.phase * 0.9) * wander * 0.7;
      const s = glowScale(m.size);
      const blink = lights ? Math.max(0, Math.sin(m.phase * 0.9)) ** 2 : 0.7 + 0.3 * Math.sin(m.phase * 2.4);
      m.img.setPosition(x, y).setScale(s).setAlpha(m.alpha * blink);
    }
  }

  private moveSmoke(dt: number): void {
    for (const s of this.smoke) {
      if (!s.visible) continue;
      const t = (s.getData('t') as number) + dt;
      const dur = s.getData('dur') as number;
      s.setData('t', t);
      if (t < 0) continue;
      if (t >= dur) {
        s.setVisible(false);
        continue;
      }
      const k = t / dur;
      s.x += (s.getData('vx') as number) * dt;
      s.y += (s.getData('vy') as number) * dt * (1 - k * 0.5);
      s.setScale(glowScale((s.getData('s') as number) * (1 + k * 1.6))).setAlpha(0.5 * Math.sin(Math.min(1, k * 4) * Math.PI * 0.5) * (1 - k));
    }
  }

  // ------------------------------------------------------------ to the card

  /** Tells the filter this frame's lights: the hunter's, then the strongest and nearest of the rest. */
  private tell(filter: StageFilter): void {
    const hour = this.hour;
    filter.view = [this.vw, this.vh];
    filter.scroll = [this.vx, this.vy];
    filter.time = this.clock;
    filter.ambient = hour.ambient;
    filter.sun = hour.sun;
    filter.shafts = hour.shafts;
    filter.clouds = hour.clouds;
    // The boss dead, the dark lifts over a few seconds; the hunter hurt, the colors drain and the edges beat red.
    if (this.hunt.monster.state === 'dead') this.liftK = Math.min(1, this.liftK + 0.006);
    const lift = 1 + 0.55 * this.liftK;
    filter.ambient = [hour.ambient[0] * lift, hour.ambient[1] * lift, hour.ambient[2] * lift];
    const beat = this.hurt > 0 ? 0.6 + 0.4 * Math.max(0, Math.sin(this.clock * 7.2)) ** 6 + 0.25 * Math.max(0, Math.sin(this.clock * 7.2 - 0.9)) ** 6 : 0;
    const red = this.hurt * beat;
    filter.shade = [hour.shade[0] + 0.22 * red, hour.shade[1] * (1 - 0.18 * red), hour.shade[2] * (1 - 0.22 * red)];
    filter.vignette = hour.vignette + 0.3 * red;
    filter.saturation = 1.06 - 0.45 * this.hurt;
    filter.emitAmount = 0.8 + 0.2 * this.dark;
    // The line of focus is where the hunter stands, so that they and what is round them are always sharp.
    filter.focus = Math.max(0.2, Math.min(0.8, (this.hunt.hunter.y - 30 - this.vy) / this.vh));
    const cx = this.vx + this.vw / 2;
    const cy = this.vy + this.vh / 2;
    const seen = this.lit.filter((l) => l.strength > 0.01 && Math.abs(l.x - cx) < this.vw / 2 + l.r && Math.abs(l.y - cy) < this.vh / 2 + l.r);
    if (seen.length > MAX_LIGHTS) {
      const weight = (l: Lit): number => (l.first ? 1e9 : l.strength * l.r);
      seen.sort((a, b) => weight(b) - weight(a));
      seen.length = MAX_LIGHTS;
    }
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = seen[i];
      filter.lights[i * 4] = l ? l.x - this.vx : 0;
      filter.lights[i * 4 + 1] = l ? l.y - this.vy : 0;
      filter.lights[i * 4 + 2] = l ? l.r : 1;
      filter.lights[i * 4 + 3] = l ? l.strength : 0;
      filter.colors[i * 3] = l ? ((l.color >> 16) & 255) / 255 : 0;
      filter.colors[i * 3 + 1] = l ? ((l.color >> 8) & 255) / 255 : 0;
      filter.colors[i * 3 + 2] = l ? (l.color & 255) / 255 : 0;
    }
  }

  /** Draws what shines by itself into its own picture, as the lair's camera would have seen it. */
  private drawEmit(filter: StageFilter, glow: Glow): void {
    const emit = this.emit;
    if (!emit) return;
    this.drawn.length = 0;
    glow.alight(this.drawn);
    for (const img of this.shiners) if (img.visible && img.alpha > 0.01) this.drawn.push(img);
    const cam = this.scene.cameras.main;
    emit.camera.setZoom(cam.zoom * EMIT_SCALE);
    emit.camera.centerOn(this.vx + this.vw / 2, this.vy + this.vh / 2);
    emit.fill(0x000000, 1);
    if (this.drawn.length) emit.draw(this.drawn);
    emit.render();
    filter.emit = emit.getWebGLTexture();
  }

  /** Slow frames, for seconds on end, take the light down a step: a game that stutters is worse than a plain one. */
  private watch(dt: number, halted: boolean): void {
    if (this.mode === 'off' || halted || this.age < 3) return;
    const ms = this.scene.game.loop.rawDelta;
    this.slow = ms > SLOW_MS ? this.slow + dt : Math.max(0, this.slow - dt * 2);
    if (this.slow > SLOW_SECONDS && stepLightDown()) this.setMode(lightMode());
  }
}
