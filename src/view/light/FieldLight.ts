// The light of the field: what hour it is, what gives light and where,
// what burns, and what hangs in the air. It reads the wave as it stands
// (game/world.ts) and is told what has happened, as the field's own screen
// is; it changes nothing about the fight.
//
// Three things are set up when it is on:
//   - a filter on the field's camera (StageFilter.ts), told every frame
//     where the lights are;
//   - the emit picture: what shines by itself (Glow.ts) is drawn into a
//     picture of its own, half the size, which the filter adds after the
//     hour's light, so that night does not dim a flame;
//   - a second camera with no filter, for the few things that have to stay
//     sharp and bright whatever the hour: numbers, the hero's health, and
//     the red warnings of what an enemy is about to do.
//
// With it off none of the three exists and the field is drawn as it was.

import Phaser from 'phaser';
import type { Land } from '../../game/data';
import type { Ev, Shot, World } from '../../game/world';
import { SHEET } from '../art/Sheet';
import { Glow, type BitOpts, glowScale } from './Glow';
import { ELEMENTS, HERO_LIGHT, LANTERN, SUN_ANGLE, WEAPON_LIGHT, darkness, hourOf, type Element, type Hour } from './hours';
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
  /** The hero's own light is never dropped, however many others there are. */
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

interface ShotView {
  halo: Phaser.GameObjects.Image | null;
  core: Phaser.GameObjects.Image | null;
  el: Element | null;
  x: number;
  y: number;
  /** How far it has flown since it last left a bit of trail behind. */
  since: number;
  stamp: number;
}

interface Mote {
  img: Phaser.GameObjects.Image;
  /** Where it is in the view, as shares of it, before the view's own moving is taken off. */
  u: number;
  v: number;
  du: number;
  dv: number;
  size: number;
  /** How much nearer than the ground it is: the nearer, the faster it slides when the view moves. */
  near: number;
  phase: number;
  alpha: number;
}

type Seen = Phaser.GameObjects.GameObject & { cameraFilter: number };

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** What element a shot is, by its picture's name. Nothing for what is only wood and iron. */
function shotElement(s: Shot): Element | null {
  if (!s.art.startsWith('orb-')) return null;
  return ELEMENTS[s.art.slice(4)] ?? ELEMENTS.arcane;
}

export class FieldLight {
  private mode: LightMode = 'off';
  private filter: StageFilter | null = null;
  private crispCam: Phaser.Cameras.Scene2D.Camera | null = null;
  private emit: Phaser.Textures.DynamicTexture | null = null;
  private glow: Glow | null = null;
  private smoke: Phaser.GameObjects.Image[] = [];
  private readonly crispSet = new Set<Seen>();
  private readonly emitSet = new Set<Seen>();
  /** The hour of this wave: its light, and how long its shadows are. */
  readonly hour: Hour;
  private readonly dark: number;
  /** The ground's own picture again, soft, laid over the far and near edges of the view: what is out of focus there is the ground, never a figure. */
  private soft: Phaser.GameObjects.Image[] = [];
  private fieldH = 0;
  private readonly land: Land;
  private lit: Lit[] = [];
  /** Lights asked for from outside for the frame to come (a companion that glows, a move): taken up by the next update. */
  private asked: Lit[] = [];
  private flashes: Flash[] = [];
  private readonly shots = new Map<number, ShotView>();
  private readonly burning = new Set<number>();
  private motes: Mote[] = [];
  private drawn: Phaser.GameObjects.Image[] = [];
  private stamp = 0;
  private clock = 0;
  private age = 0;
  private slow = 0;
  private budget = 0;
  private gone = false;
  private dimLeft = 0;
  private dimOf = 1;
  private dimBy = 0;
  /** The view this frame, in the field's units: its top left corner and its size. */
  private vx = 0;
  private vy = 0;
  private vw = 800;
  private vh = 600;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    private readonly heroId: string,
  ) {
    this.land = world.wave.land;
    this.hour = hourOf(this.land, world.wave.n, world.night);
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
    this.glow ??= new Glow(scene, 520, (img) => {
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
    for (const v of this.shots.values()) this.dropShot(v);
    this.shots.clear();
    for (const m of this.motes) this.glow?.give(m.img);
    this.motes = [];
    this.glow?.clear();
    for (const s of this.smoke) s.setVisible(false);
    for (const g of this.soft) g.setVisible(false);
    this.flashes = [];
    // Every camera draws everything again.
    for (const child of scene.children.list) (child as Seen).cameraFilter = 0;
  }

  /** The field's screen is being shut: everything on it goes with it, and only what outlives a screen is taken away here. */
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

  /**
   * The ground a second time, from a picture of it made small, which a
   * screen shows soft. It is laid over the top and the bottom of the view,
   * fading to nothing toward the middle: far and near ground are out of
   * focus, as through a long lens, and everything that stands on it is
   * drawn after and stays sharp.
   */
  ground(softKey: string, w: number, h: number): void {
    this.fieldH = h;
    for (let i = 0; i < 2; i++) this.soft.push(this.scene.add.image(0, 0, softKey).setOrigin(0, 0).setDisplaySize(w, h).setDepth(-99).setVisible(false));
  }

  /** Puts the soft ground where the view's far and near edges are this frame. */
  private focus(): void {
    const on = this.mode === 'full';
    // How much of the view's height each edge's soft band takes: the far one more than the near.
    const bands: Array<[number, number, number]> = [[0, 0.3, 1], [0.8, 1, 0.9]];
    this.soft.forEach((img, i) => {
      img.setVisible(on);
      if (!on) return;
      const [from, to, most] = bands[i];
      const y0 = Math.max(0, this.vy + this.vh * from);
      const y1 = Math.min(this.fieldH, this.vy + this.vh * to);
      if (y1 - y0 < 4) {
        img.setVisible(false);
        return;
      }
      const k = img.frame.height / this.fieldH;
      img.setCrop(0, y0 * k, img.frame.width, (y1 - y0) * k);
      // Whole at the view's edge, nothing where the band ends.
      if (i === 0) img.setAlpha(most, most, 0, 0);
      else img.setAlpha(0, 0, most, most);
    });
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

  /** A thing that has to stay sharp and bright whatever the hour. */
  crisp(obj: Phaser.GameObjects.GameObject): void {
    this.crispSet.add(obj as Seen);
    if (this.filter) this.see(obj as Seen);
  }

  /** It is a thing of the field again: a picture from the pool, given back. */
  plain(obj: Phaser.GameObjects.GameObject): void {
    if (!this.crispSet.delete(obj as Seen)) return;
    if (this.filter) this.see(obj as Seen);
  }

  /** True where the light draws a shot itself, as light, and the field's own picture of it is not wanted. */
  draws(s: Shot): boolean {
    // An enemy's shot keeps its drawn picture inside its glow: it has to be told from the hero's own at a glance.
    return this.filter !== null && s.mine && shotElement(s) !== null;
  }

  // ------------------------------------------------------------ lights

  private light(x: number, y: number, r: number, color: number, strength: number, first = false): void {
    this.lit.push({ x, y, r, color, strength, first });
  }

  /** A light that dies away by itself. */
  flash(x: number, y: number, r: number, color: number, strength: number, dur: number): void {
    if (!this.filter) return;
    // A flash on top of the hero is held down: lit past white, they would bloom away to a blob and be lost.
    const h = this.world.hero;
    if (Math.hypot(x - h.x, y - (h.y - 26)) < 80) strength = Math.min(strength, 0.3);
    this.flashes.push({ x, y, r, color, strength, t: 0, dur });
  }

  /**
   * The field goes dim for a moment, and what gives light of its own does not: a hero's move is seen against it.
   * `by` is how much of the hour's light is taken, at the most.
   */
  dim(seconds: number, by: number): void {
    this.dimOf = seconds;
    this.dimLeft = seconds;
    this.dimBy = by;
  }

  /** A light for the frame to come, for whoever shows something that glows and is not the wave's own to tell of. */
  lamp(x: number, y: number, r: number, el: string, strength: number): void {
    if (!this.filter) return;
    this.asked.push({ x, y, r, color: (ELEMENTS[el] ?? ELEMENTS.holy).light, strength: strength * this.reach, first: false });
  }

  /** A bit of light of an element: a flame, a spark, a mote. Nothing, with the light off. */
  bit(x: number, y: number, el: string, o: BitOpts = {}): void {
    if (!this.filter || !this.glow) return;
    // A big bright bit over the hero would hide them as a flash would.
    const h = this.world.hero;
    if ((o.from ?? 0) > 34 && !o.frame && Math.hypot(x - h.x, y - (h.y - 26)) < 60) o = { ...o, alpha: Math.min(o.alpha ?? 1, 0.3) };
    // A ring that begins at their feet is a filled disc of light for its first moments: it begins a pace out instead.
    if (o.frame && (o.from ?? 0) < 90 && (o.to ?? 0) > 90 && Math.hypot(x - h.x, y - h.y) < 30) o = { ...o, from: 90, alpha: Math.min(o.alpha ?? 1, 0.5) };
    this.glow.spawn(x, y, ELEMENTS[el] ?? ELEMENTS.holy, o);
  }

  /** Something of an element goes up, as a burst of the wave's own does. */
  boom(x: number, y: number, r: number, el: string, smoke = false): void {
    if (this.filter && this.glow) this.blast(x, y, r, ELEMENTS[el] ?? ELEMENTS.fire, smoke);
  }

  /** Sparks thrown out from a place. */
  spray(x: number, y: number, el: string, n: number, speed: number, dur: number): void {
    if (this.filter && this.glow) this.sparks(x, y, ELEMENTS[el] ?? ELEMENTS.spark, n, speed, dur);
  }

  /** Smoke from a place. */
  smokeAt(x: number, y: number, n: number): void {
    if (this.filter) this.puff(x, y, n);
  }

  /** How much a light made by the fight counts at this hour: a fire at noon lights little. */
  private get reach(): number {
    return 0.42 + 0.58 * this.dark;
  }

  // ------------------------------------------------------------ what has happened

  react(events: readonly Ev[]): void {
    const glow = this.glow;
    if (!this.filter || !glow) return;
    const w = this.world;
    const h = w.hero;
    for (const e of events) {
      switch (e.t) {
        case 'burst': {
          if (e.kind === 'slam') {
            this.flash(e.x, e.y, e.r * 2.2, ELEMENTS.spark.light, 0.5, 0.18);
            this.sparks(e.x, e.y - 6, ELEMENTS.spark, 6, 260, 0.4);
            break;
          }
          if (e.kind === 'rain') {
            // Arrows coming down: no fire in it, only what they strike out of the ground.
            this.sparks(e.x, e.y - 4, ELEMENTS.spark, 3, 150, 0.3);
            break;
          }
          const el =
            e.kind === 'light' ? ELEMENTS.holy : e.kind === 'venom' ? ELEMENTS.venom : e.kind === 'foe' || e.kind === 'rise' ? ELEMENTS.red
              : e.kind === 'frost' ? ELEMENTS.frost : e.kind === 'star' ? ELEMENTS.arcane : ELEMENTS.fire;
          this.blast(e.x, e.y, e.r, el, e.kind === 'powder' || e.kind === 'fire' || e.kind === 'foe');
          break;
        }
        case 'strike': {
          const slot = w.slots[e.slot];
          const el = ELEMENTS[WEAPON_LIGHT[slot.def.id] ?? ''];
          if (!el) break;
          if (slot.def.motion === 'sweep') {
            // A burning thing swung leaves its fire along the stroke.
            for (let i = 0; i < 9 && this.spend(); i++) {
              const a = e.angle + (i / 8 - 0.5) * 1.5;
              const d = e.range * rnd(0.55, 0.95);
              glow.spawn(h.x + Math.cos(a) * d, h.y - 24 + Math.sin(a) * d, el, { dur: rnd(0.25, 0.45), vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 40, from: rnd(20, 30), to: 4, flame: true, sway: 3 });
            }
            this.flash(h.x + Math.cos(e.angle) * e.range * 0.6, h.y - 24 + Math.sin(e.angle) * e.range * 0.6, e.range * 1.9, el.light, 0.5, 0.22);
          } else if (slot.def.motion === 'pulse') {
            // What a pulse does to the ground is shown by its burst; here it is only the light of it on the hero.
            this.flash(h.x, h.y - 14, e.range * 2.3, el.light, 0.3, 0.28);
          }
          break;
        }
        case 'loose': {
          const el = ELEMENTS[WEAPON_LIGHT[w.slots[e.slot].def.id] ?? ''];
          if (el) this.flash(h.x + Math.cos(e.angle) * 30, h.y - 28 + Math.sin(e.angle) * 30, 90, el.light, 0.6, 0.12);
          break;
        }
        case 'hit':
          if (e.crit) {
            this.flash(e.x, e.y - 22, 80, ELEMENTS.holy.light, 0.7, 0.14);
            this.sparks(e.x, e.y - 22, ELEMENTS.spark, 5, 240, 0.35);
          } else if (!e.soft) this.sparks(e.x, e.y - 22, ELEMENTS.spark, 2, 170, 0.25);
          break;
        case 'fall':
          if (e.boss && !e.swept) {
            this.blast(e.x, e.y - 20, 110, ELEMENTS.holy, true);
            this.flash(e.x, e.y - 20, 620, ELEMENTS.holy.light, 0.9, 0.7);
          } else if (this.burning.has(e.id) && !e.swept) {
            // What dies burning goes up.
            for (let i = 0; i < 7 && this.spend(); i++) {
              glow.spawn(e.x + rnd(-10, 10), e.y - rnd(4, 36), ELEMENTS.fire, { dur: rnd(0.4, 0.7), vx: rnd(-30, 30), vy: rnd(-110, -50), from: rnd(18, 28), to: 3, flame: true, sway: 4 });
            }
            this.flash(e.x, e.y - 16, 110, ELEMENTS.fire.light, 0.6, 0.25);
            this.puff(e.x, e.y - 30, 2);
          }
          this.burning.delete(e.id);
          break;
        case 'hurt':
          this.flash(h.x, h.y - 24, 190, ELEMENTS.red.light, 0.45, 0.22);
          break;
        case 'mend':
          for (let i = 0; i < 4 && this.spend(); i++) {
            glow.spawn(h.x + rnd(-16, 16), h.y - rnd(8, 40), ELEMENTS.venom, { dur: rnd(0.5, 0.8), vy: rnd(-70, -40), from: 9, to: 2, alpha: 0.9 });
          }
          break;
        case 'take':
          if (e.kind === 'heart') this.flash(h.x, h.y - 24, 150, 0xff8a9a, 0.6, 0.3);
          else if (e.kind === 'pack') this.flash(h.x, h.y - 24, 220, ELEMENTS.holy.light, 0.9, 0.4);
          break;
        case 'mark':
          if (e.boss) this.flash(e.x, e.y, 300, ELEMENTS.red.light, 0.8, 0.9);
          break;
        default:
          break;
      }
    }
  }

  /** A level made: the hero stands in a column of gold for a moment. */
  levelUp(x: number, y: number): void {
    const glow = this.glow;
    if (!this.filter || !glow) return;
    this.flash(x, y - 30, 330, ELEMENTS.holy.light, 0.6, 0.6);
    for (let i = 0; i < 22; i++) {
      glow.spawn(x + rnd(-22, 22), y - rnd(0, 20), ELEMENTS.holy, { dur: rnd(0.5, 1), vy: rnd(-190, -70), drag: 0.8, from: rnd(6, 13), to: 1, stretch: 0.6, alpha: 0.95 });
    }
    // A ring going out along the ground, not a ball of light on top of them.
    glow.spawn(x, y - 4, ELEMENTS.holy, { dur: 0.5, from: 30, to: 150, alpha: 0.7, flat: 0.62, frame: 'fx/ring' });
  }

  /** True while there is room this frame for one more bit of light. A horde can ask for hundreds. */
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
    // One that goes out from the hero must not hide them: its fire is a ring round them, with no bright heart.
    const h = this.world.hero;
    const round = Math.hypot(x - h.x, y - h.y) < 36;
    this.flash(x, y, r * 3.2, el.light, round ? 0.45 : 0.85, 0.4);
    if (!round) glow.spawn(x, y - 6, el, { dur: 0.18, from: r * 0.6, to: r * 1.5, alpha: 0.45 });
    // The edge of it: how far it reached has to be seen.
    glow.spawn(x, y, el, { dur: 0.3, from: r * 0.45, to: r * 1.05, alpha: 0.5, flat: 0.62, frame: 'fx/ring' });
    const n = Math.round(Math.min(16, 7 + r / 9));
    for (let i = 0; i < n && this.spend(); i++) {
      const a = rnd(0, Math.PI * 2);
      const d = r * (round ? rnd(0.6, 0.95) : rnd(0.25, 0.85));
      glow.spawn(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.62, el, {
        dur: rnd(0.3, 0.6), vx: Math.cos(a) * r * 0.9, vy: Math.sin(a) * r * 0.6 - 50, gravity: -90, drag: 2.6, from: rnd(r * 0.3, r * 0.55), to: 4, flame: true, sway: 3, alpha: round ? 0.5 : 0.7,
      });
    }
    this.sparks(x, y - 8, el === ELEMENTS.fire ? ELEMENTS.spark : el, 8, r * 5, 0.7);
    if (smoke) this.puff(x, y - 14, 3);
  }

  /** Smoke: dark, and so drawn on the field with everything else, where the hour's light falls on it too. */
  private puff(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      let img = this.smoke.find((s) => !s.visible);
      if (!img) {
        if (this.smoke.length >= 36) return;
        img = this.scene.add.image(0, 0, SHEET, 'fx/glow').setTint(0x2a2420);
        this.smoke.push(img);
      }
      img.setVisible(true).setPosition(x + rnd(-12, 12), y + rnd(-6, 6)).setDepth(y + 80).setAlpha(0.01);
      img.setData('t', -i * 0.05).setData('dur', rnd(0.9, 1.5)).setData('vx', rnd(-14, 14)).setData('vy', rnd(-52, -30)).setData('s', rnd(26, 40));
    }
  }

  // ------------------------------------------------------------ every frame

  /**
   * Called when the field has been put where it stands this frame. `carried`
   * is where each of the hero's weapons hangs: its place and how it leans.
   */
  update(dt: number, clock: number, halted: boolean, carried: ReadonlyArray<{ id: string; x: number; y: number; rot: number; seen: boolean }>): void {
    this.clock = clock;
    this.age += dt;
    if (this.dimLeft > 0 && !halted) this.dimLeft -= dt;
    this.watch(dt, halted);
    const filter = this.filter;
    const glow = this.glow;
    if (!filter || !glow || this.gone) return;
    const w = this.world;
    const h = w.hero;
    const cam = this.scene.cameras.main;
    this.vw = cam.width / cam.zoom;
    this.vh = cam.height / cam.zoom;
    this.vx = cam.scrollX + cam.width / 2 - this.vw / 2;
    this.vy = cam.scrollY + cam.height / 2 - this.vh / 2;
    this.crispCam?.setZoom(cam.zoom).setScroll(cam.scrollX, cam.scrollY);
    this.lit.length = 0;
    for (const a of this.asked) this.lit.push(a);
    this.asked.length = 0;
    this.budget = this.mode === 'full' ? 46 : 20;
    this.stamp++;
    const reach = this.reach;
    const flick = (seed: number): number => 0.86 + 0.14 * Math.sin(clock * 17 + seed * 3.1) * Math.sin(clock * 7.3 + seed);

    // The hero carries light: little by day, a lantern's worth by night.
    // On a night march the light they carry is small: what comes is seen late.
    // By day it is little, but it is there: the hero stands in a pool a shade brighter than the field, which nobody else has,
    // and is not dull when the shade drifts over them. On snow, which is nearly white already, it is less.
    if (h.hp > 0) this.light(h.x, h.y - 20, (230 + 120 * this.dark) * (w.night ? 0.66 : 1), HERO_LIGHT[this.heroId] ?? LANTERN, (this.land === 'snow' ? 0.12 : 0.24) + 0.4 * this.dark, true);

    // What they carry that burns or glows.
    // Many burning things in the hands do not make the hero a lamp: they share one light's worth between them.
    const glowing = carried.filter((c) => c.seen && WEAPON_LIGHT[c.id]).length;
    const share = 1 / Math.sqrt(Math.max(1, glowing));
    carried.forEach((c, i) => {
      const el = ELEMENTS[WEAPON_LIGHT[c.id] ?? ''];
      if (!el || !c.seen) return;
      // The head of the thing, up its own length from where it is held.
      const tx = c.x + Math.sin(c.rot) * 24;
      const ty = c.y - Math.cos(c.rot) * 24;
      if (el === ELEMENTS.fire) {
        if (!halted && Math.random() < 0.5) glow.spawn(tx + rnd(-2, 2), ty + rnd(-1, 2), el, { dur: rnd(0.24, 0.4), vx: rnd(-6, 6), vy: rnd(-105, -60), from: rnd(8, 11), to: 2, flame: true, sway: 2, alpha: 0.6 });
        if (!halted && Math.random() < 0.06) glow.spawn(tx, ty, ELEMENTS.spark, { dur: rnd(0.6, 1.1), vx: rnd(-24, 24), vy: rnd(-110, -60), from: 4, to: 1, sway: 5 });
        this.light(tx, ty, 140, el.light, 0.34 * reach * share * flick(i));
      } else {
        if (!halted && Math.random() < 0.16) glow.spawn(tx + rnd(-5, 5), ty + rnd(-5, 5), el, { dur: rnd(0.4, 0.8), vx: rnd(-10, 10), vy: rnd(-34, -10), from: rnd(6, 10), to: 1 });
        glow.spawn(tx, ty, el, { dur: 0.05, from: 13 + 2 * Math.sin(clock * 5 + i), to: 13, alpha: 0.1 });
        this.light(tx, ty, 100, el.light, 0.2 * reach * share);
      }
    });

    this.showShots(halted, reach);
    this.showFoes(halted, reach, flick);

    // Clouds on the ground glow a little, and breathe motes.
    for (const z of w.zones) {
      // Arrows coming down give no light; what burns, what is blessed and what is poisoned each glow in their own color.
      if (z.kind === 'rain') continue;
      const el = z.kind === 'fire' ? ELEMENTS.fire : z.kind === 'holy' ? ELEMENTS.holy : ELEMENTS.venom;
      const live = Math.min(1, z.life);
      this.light(z.x, z.y, z.r * 1.5, el.light, (z.kind === 'fire' ? 0.3 * flick(z.id) : z.kind === 'holy' ? 0.26 : 0.16) * reach * live);
      if (halted) continue;
      const at = (): [number, number] => {
        const a = rnd(0, Math.PI * 2);
        const d = Math.sqrt(Math.random()) * z.r;
        return [z.x + Math.cos(a) * d, z.y + Math.sin(a) * d * 0.62];
      };
      if (z.kind === 'fire') {
        // Ground that burns: flames standing all over it, as many as it is wide.
        const n = Math.min(3, Math.ceil(z.r / 40));
        for (let i = 0; i < n && Math.random() < 0.7 * live && this.spend(); i++) {
          const [x, y] = at();
          glow.spawn(x, y, el, { dur: rnd(0.3, 0.55), vx: rnd(-8, 8), vy: rnd(-90, -50), from: rnd(13, 21), to: 2, flame: true, sway: 3, alpha: 0.6 });
        }
      } else if (Math.random() < 0.3 && this.spend()) {
        const [x, y] = at();
        glow.spawn(x, y, el, { dur: rnd(0.7, 1.2), vy: rnd(-34, -14), from: rnd(6, 11), to: 1, alpha: 0.7, sway: 4 });
      }
    }

    // A heart on the ground glows, so that it can be found in the dark; a pack more so.
    for (const p of w.picks) {
      if (p.kind === 'heart') this.light(p.x, p.y - 8, 60, 0xff8a9a, 0.22 * reach);
      else if (p.kind === 'pack') this.light(p.x, p.y - 8, 110, ELEMENTS.holy.light, 0.4 * reach);
    }

    for (const f of this.flashes) {
      f.t += dt;
      const k = Math.max(0, 1 - f.t / f.dur);
      this.light(f.x, f.y, f.r * (0.7 + 0.3 * k), f.color, f.strength * k * k * (0.36 + 0.64 * this.dark));
    }
    if (this.flashes.some((f) => f.t >= f.dur)) this.flashes = this.flashes.filter((f) => f.t < f.dur);

    this.focus();
    this.moveAir(dt, halted);
    this.moveSmoke(dt);
    if (!halted) glow.update(dt);
    this.tell(filter);
    this.drawEmit(filter, glow);
  }

  private showShots(halted: boolean, reach: number): void {
    const glow = this.glow as Glow;
    const stamp = this.stamp;
    for (const s of this.world.shots) {
      let v = this.shots.get(s.id);
      const el = shotElement(s);
      let y = s.y;
      if (s.lob) y -= Math.sin(Math.min(1, s.lob.at / s.lob.of) * Math.PI) * 70;
      if (!v) {
        v = { halo: el ? glow.take() : null, core: el ? glow.take() : null, el, x: s.x, y, since: 0, stamp };
        this.shots.set(s.id, v);
      }
      v.stamp = stamp;
      const step = Math.hypot(s.x - v.x, y - v.y);
      v.since += step;
      const angle = Math.atan2(s.vy, s.vx);
      if (el && v.halo && v.core) {
        const big = s.mine ? 1 : 1.15;
        const pulse = 1 + 0.08 * Math.sin(this.clock * 30 + s.id);
        if (s.mine) {
          // The band's own: a thin bright streak along its way. An enemy's is round and red. The two are told apart by shape as well as color.
          v.halo.setPosition(s.x, y - 2).setRotation(angle).setScale(glowScale(40) * 2.3 * pulse, glowScale(40) * 0.6).setTint(el.mid).setAlpha(0.8);
          v.core.setPosition(s.x, y - 2).setRotation(angle).setScale(glowScale(15) * 3, glowScale(15) * 0.7).setTint(el.hot).setAlpha(1);
        } else {
          v.halo.setPosition(s.x, y - 2).setRotation(0).setScale(glowScale(48) * pulse, glowScale(48) * pulse).setTint(el.cool).setAlpha(0.85);
          v.core.setAlpha(0);
        }
        // What it leaves behind: a tail that cools, and now and then a bit that falls away.
        while (v.since > 7 && !halted) {
          v.since -= 7;
          if (!this.spend()) break;
          glow.spawn(s.x + rnd(-2, 2), y - 2 + rnd(-2, 2), el, { dur: rnd(0.22, 0.34), vx: -s.vx * 0.06 + rnd(-14, 14), vy: -s.vy * 0.06 + rnd(-14, 14) - (el === ELEMENTS.fire ? 22 : 0), from: (s.mine ? 12 : 19) * big, to: 2, alpha: 0.7, flame: el === ELEMENTS.fire });
          if (Math.random() < 0.22) glow.spawn(s.x, y, el, { dur: rnd(0.4, 0.7), vx: rnd(-40, 40), vy: rnd(-40, 30), gravity: el === ELEMENTS.fire ? -60 : 90, from: 5, to: 1 });
        }
        this.light(s.x, y, s.mine ? 105 : 110, el.light, (s.mine ? 0.34 : 0.38) * reach);
      } else if (s.art === 'bomb') {
        // A fuse spits.
        if (!halted && Math.random() < 0.5 && this.spend()) glow.spawn(s.x, y - 8, ELEMENTS.spark, { dur: rnd(0.15, 0.3), vx: rnd(-50, 50), vy: rnd(-70, -10), gravity: 300, from: 6, to: 1, turn: true, stretch: 2 });
      } else if (s.art !== 'stone') {
        // Iron in flight catches the light: a thin pale line after it.
        while (v.since > 16 && !halted) {
          v.since -= 16;
          if (!this.spend()) break;
          glow.spawn(s.x - Math.cos(angle) * 10, y - Math.sin(angle) * 10, ELEMENTS.spark, { dur: 0.14, vx: s.vx * 0.2, vy: s.vy * 0.2, from: 9, to: 2, turn: true, stretch: 3.2, alpha: s.mine ? 0.34 : 0.26 });
        }
      }
      v.x = s.x;
      v.y = y;
    }
    for (const [id, v] of this.shots) {
      if (v.stamp === stamp) continue;
      // It is gone: it struck something, or burnt out. What it was made of scatters.
      if (v.el && !halted) {
        this.sparks(v.x, v.y, v.el, 5, 190, 0.32);
        this.flash(v.x, v.y, 90, v.el.light, 0.55, 0.14);
      }
      this.dropShot(v);
      this.shots.delete(id);
    }
  }

  private dropShot(v: ShotView): void {
    if (v.halo) this.glow?.give(v.halo);
    if (v.core) this.glow?.give(v.core);
    v.halo = v.core = null;
  }

  private showFoes(halted: boolean, reach: number, flick: (seed: number) => number): void {
    const glow = this.glow as Glow;
    const h = this.world.hero;
    let fires = 0;
    for (const f of this.world.foes) {
      const size = f.def.size ?? 1;
      if (f.boss) {
        // A captain stands in a light of their own: there is no losing sight of them.
        // A warm one, like a fire's, so that the hour does not color them: a captain in a blue night is not a blue captain.
        this.light(f.x, f.y - 30 * size, 250, 0xffb48a, (0.42 + 0.07 * Math.sin(this.clock * 2.2)) * (0.5 + 0.5 * this.dark));
      }
      if (f.burn > 0) {
        this.burning.add(f.id);
        if (!halted && Math.random() < 0.3 && this.spend()) {
          glow.spawn(f.x + rnd(-9, 9) * size, f.y - rnd(8, 38) * size, ELEMENTS.fire, { dur: rnd(0.3, 0.5), vx: rnd(-10, 10), vy: rnd(-96, -52), from: rnd(11, 17) * Math.min(1.5, size), to: 2, flame: true, sway: 3, alpha: 0.6 });
        }
        if (!halted && Math.random() < 0.04 && this.spend()) glow.spawn(f.x, f.y - 30 * size, ELEMENTS.spark, { dur: rnd(0.6, 1), vx: rnd(-26, 26), vy: rnd(-120, -70), from: 4, to: 1, sway: 5 });
        // Only the few nearest the hero throw light: there are sixteen lights in all.
        if (fires < 5 && Math.hypot(f.x - h.x, f.y - h.y) < 360) {
          fires++;
          this.light(f.x, f.y - 20 * size, 100, ELEMENTS.fire.light, 0.3 * reach * flick(f.id));
        }
      } else this.burning.delete(f.id);
      if (f.slow > 0 && !halted && Math.random() < 0.06 && this.spend()) {
        glow.spawn(f.x + rnd(-10, 10) * size, f.y - rnd(10, 44) * size, ELEMENTS.frost, { dur: rnd(0.5, 0.9), vx: rnd(-8, 8), vy: rnd(14, 34), from: rnd(5, 8), to: 1, alpha: 0.85 });
      }
    }
  }

  // ------------------------------------------------------------ the air

  /** What hangs in the air of this land at this hour. */
  private makeAir(): void {
    const glow = this.glow as Glow;
    const night = this.dark > 0.55;
    const n = this.land === 'snow' ? 54 : this.land === 'desert' ? 26 : night ? 22 : 30;
    for (let i = 0; i < n; i++) {
      const near = rnd(1, 1.7);
      const m: Mote = { img: glow.take(), u: Math.random(), v: Math.random(), du: 0, dv: 0, size: 4, near, phase: rnd(0, 6.28), alpha: 0.6 };
      if (this.land === 'snow') {
        // Snow falls aslant, the near flakes bigger and faster.
        m.du = -0.02 * near - 0.02;
        m.dv = 0.09 * near;
        m.size = rnd(9, 15) * near;
        m.alpha = rnd(0.5, 0.9);
        m.img.setTint(0xe6f2ff);
      } else if (this.land === 'desert') {
        // Sand goes by on the wind by day; embers drift up at night.
        m.du = night ? rnd(-0.01, 0.02) : rnd(0.16, 0.34) * near;
        m.dv = night ? rnd(-0.05, -0.02) : rnd(-0.01, 0.02);
        m.size = night ? rnd(8, 13) : rnd(8, 12) * near;
        m.alpha = night ? rnd(0.5, 0.9) : rnd(0.16, 0.34);
        m.img.setTint(night ? 0xffa050 : 0xffe2b0);
      } else if (night) {
        // Fireflies.
        m.du = rnd(-0.02, 0.02);
        m.dv = rnd(-0.015, 0.015);
        m.size = rnd(13, 19);
        m.alpha = 1;
        m.img.setTint(0xd8ff7a);
      } else {
        // Pollen and dust in the sun.
        m.du = rnd(0.004, 0.02);
        m.dv = rnd(-0.022, -0.006);
        m.size = rnd(8, 14) * near;
        m.alpha = rnd(0.35, 0.75);
        m.img.setTint(0xfff0c0);
      }
      this.motes.push(m);
    }
  }

  private moveAir(dt: number, halted: boolean): void {
    const fireflies = this.land === 'meadow' && this.dark > 0.55;
    const windy = this.land === 'desert' && this.dark <= 0.55;
    for (const m of this.motes) {
      if (!halted) {
        m.u += m.du * dt;
        m.v += m.dv * dt;
        m.phase += dt;
      }
      // It is in the air in front of the ground, so when the view moves it slides by faster than the ground does.
      const u = (((m.u - (this.vx * m.near) / this.vw) % 1) + 1) % 1;
      const v = (((m.v - (this.vy * m.near) / this.vh) % 1) + 1) % 1;
      const wander = fireflies ? 14 : 5;
      const x = this.vx + u * this.vw + Math.sin(m.phase * 1.3) * wander;
      const y = this.vy + v * this.vh + Math.cos(m.phase * 0.9) * wander * 0.7;
      const s = glowScale(m.size);
      const blink = fireflies ? Math.max(0, Math.sin(m.phase * 2.1)) ** 2 : 0.7 + 0.3 * Math.sin(m.phase * 2.4);
      m.img.setPosition(x, y).setScale(windy ? s * 4 : s, s).setAlpha(m.alpha * blink);
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
      s.setScale(glowScale((s.getData('s') as number) * (1 + k * 1.6)) * 1.0).setAlpha(0.5 * Math.sin(Math.min(1, k * 4) * Math.PI * 0.5) * (1 - k));
    }
  }

  // ------------------------------------------------------------ to the card

  /** Tells the filter this frame's lights: the hero's, then the strongest and nearest of the rest. */
  private tell(filter: StageFilter): void {
    const hour = this.hour;
    filter.view = [this.vw, this.vh];
    filter.scroll = [this.vx, this.vy];
    filter.time = this.clock;
    // Dimmed for a move: quickly down, slowly back.
    const u = this.dimLeft > 0 ? 1 - this.dimLeft / this.dimOf : 1;
    const dim = this.dimLeft > 0 ? this.dimBy * Math.min(1, u * 8) * Math.min(1, (1 - u) * 2.5) : 0;
    const keep = 1 - dim;
    filter.ambient = [hour.ambient[0] * keep, hour.ambient[1] * keep, hour.ambient[2] * keep];
    filter.sun = [hour.sun[0] * keep, hour.sun[1] * keep, hour.sun[2] * keep];
    filter.sunDir = [Math.cos(SUN_ANGLE), Math.sin(SUN_ANGLE)];
    filter.clouds = hour.clouds;
    filter.shade = hour.shade;
    filter.vignette = hour.vignette;
    // A flame in full sun is a pale thing; at night it is all there is to see.
    filter.emitAmount = 0.8 + 0.2 * this.dark;
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

  /** Draws what shines by itself into its own picture, as the field's camera would have seen it. */
  private drawEmit(filter: StageFilter, glow: Glow): void {
    const emit = this.emit;
    if (!emit) return;
    this.drawn.length = 0;
    glow.alight(this.drawn);
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
