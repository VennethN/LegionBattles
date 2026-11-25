// The field as it is seen: the ground, the hero with what they carry at
// their side, whoever comes at them, what flies, and what lies about. It
// steps the wave (game/world.ts) and shows what it finds there; it works
// nothing out for itself.
//
// The hero and a boss are figures moved part by part. The horde is one
// picture each, changed between two as it walks: there can be a hundred of
// them.

import Phaser from 'phaser';
import { BONE, FIRE, FROST, HOLY, OUTLINE, RUBY, VENOM } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, LAND_NAMES, ROAD, byId, levelNeeds, omenOf, type Land } from '../../game/data';
import { heroOf, type RunData } from '../../game/run';
import { STEP, slotPlace, type Burst, type Ev, type Foe, type World, type ZoneKind } from '../../game/world';
import { ads } from '../../platform/ads';
import { ASSETS, getManifest } from '../app';
import { ART_SCALE, hex, view } from '../config';
import { Deeds } from '../Deeds';
import { Effects } from '../Effects';
import { weaponIcon } from '../icons';
import { Numbers } from '../Numbers';
import { RoadField } from '../RoadField';
import { Figure } from '../art/Figure';
import { FieldLight } from '../light/FieldLight';
import type { LightMode } from '../light/setting';
import { SHEET, Sheet, sheet, type UnitKey } from '../art/Sheet';
import { STILL_SCALE } from '../art/scale';
import { beginWave, finishWave, save, theRun, theWorld } from '../session';
import type { HudScene } from './HudScene';

const INV_ART = 1 / ART_SCALE;
/**
 * How big a figure's canvas is drawn on the field. The hero is drawn a good deal bigger than those who come at
 * them (about 78 of the field's units tall to their 60): the hero is who the player is and has to be found at a
 * glance in a crowd. What can hurt them is still the same small circle at their feet (HERO_RADIUS).
 */
const HERO_SCALE = 0.6;
/** A captain's and a companion's figure, before its own size. */
const FIGURE_SCALE = 0.5;
const FOE_SCALE = 0.46;
/** How big what a hero has bought is drawn beside them: small, so that it does not hide them. */
const WEAPON_SCALE = 0.3;
/** How long before their own weapon strikes the figure begins to draw it back. */
const WINDUP = 0.2;

const WHITE = 0xffffff;
const RED = hex(RUBY.fill);
const BURSTS: Record<Burst, number> = {
  powder: hex(FIRE.fill), fire: hex(FIRE.fill), slam: hex(BONE.fill), light: hex(HOLY.fill), venom: hex(VENOM.fill), foe: RED,
  star: hex(HOLY.light), frost: hex(FROST.fill), rain: hex(BONE.fill), rise: RED, bolt: hex(HOLY.light),
};
/** What each kind of ground that goes on doing something is tinted. */
const ZONES: Record<ZoneKind, number> = { cloud: hex(VENOM.fill), holy: hex(HOLY.fill), fire: hex(FIRE.fill), rain: hex(BONE.shade) };
/** Which way each weapon's picture points when it stands upright: most point up; a bow looses to its right. */
const POINTS_RIGHT = new Set(['bow', 'longbow', 'rimebow']);
/** What does not turn to its mark at all: it is swung, thrown or shaken where it hangs. */
const HANGS = new Set(['sling', 'bomb', 'censer', 'holywater', 'gourd', 'hail', 'hatchet']);

interface FoeView {
  foe: Foe;
  img: Phaser.GameObjects.Image | null;
  fig: Figure | null;
  flash: number;
  born: number;
  stamp: number;
}

interface Thing {
  img: Phaser.GameObjects.Image;
  stamp: number;
}

interface Warning {
  img: Phaser.GameObjects.Image;
  id: number;
  left: number;
  of: number;
  kind: 'line' | 'ring';
  r: number;
}

export class ArenaScene extends Phaser.Scene {
  private run!: RunData;
  private world!: World;
  private hero!: Figure;
  private heroBar!: Phaser.GameObjects.Image;
  private heroBarBack!: Phaser.GameObjects.Image;
  /** A picture for each weapon that floats. The hero's own weapon has none: it is in their figure's hand. */
  private weapons: Array<Phaser.GameObjects.Image | null> = [];
  /** Which way their own weapon last struck, and for how long the figure goes on facing it. */
  private aimFace: 1 | -1 = 1;
  private aimFor = 0;
  private fx!: Effects;
  /** The hour, the lights and what burns (view/light). It is told what the field shows and changes nothing of it. */
  private light!: FieldLight;
  private carried: Array<{ id: string; x: number; y: number; rot: number; seen: boolean }> = [];
  /** What the road and the relics put on the field. */
  private road!: RoadField;
  private nums!: Numbers;
  private foes = new Map<number, FoeView>();
  private shots = new Map<number, Thing>();
  private picks = new Map<number, Thing>();
  private marks = new Map<number, Thing>();
  private zones = new Map<number, Thing>();
  private warnings: Warning[] = [];
  /** The move, the quirk and the band, as they are shown (view/Deeds.ts). */
  private deeds!: Deeds;
  private wantAct = false;
  private spare: Phaser.GameObjects.Image[] = [];
  private stamp = 0;
  private acc = 0;
  private clock = 0;
  private ready = false;
  private ended = false;
  private lastCoin = 0;
  /** True while the wave is held still: the game is paused, or its end is being shown. */
  halted = false;
  private overlay = '';
  private still = false;
  private resumed = false;
  private level = -1;

  constructor() {
    super('Arena');
  }

  /**
   * `keep` stands the field up again round the wave that is already being fought: the window changed shape. `over`
   * is the screen that was open over it then. `camp` stands it up for a run taken up in its camp, with no wave on it.
   */
  create(data: { keep?: boolean; over?: string; camp?: boolean } = {}): void {
    const run = theRun();
    const kept = data.keep ? theWorld() : null;
    if (!run || (!kept && !data.camp && run.phase !== 'fight')) {
      this.scene.start('Title');
      return;
    }
    this.run = run;
    this.world = kept ?? beginWave(view.tall);
    this.overlay = data.camp ? 'Camp' : (data.over ?? '');
    // A field with nothing left to fight on it: it is only what the camp or the result is shown over.
    this.still = !!data.camp || !!this.world.over;
    this.resumed = !!kept;
    this.foes.clear();
    this.shots.clear();
    this.picks.clear();
    this.marks.clear();
    this.zones.clear();
    this.warnings = [];
    this.wantAct = false;
    this.spare = [];
    this.weapons = [];
    this.acc = 0;
    this.clock = 0;
    this.level = -1;
    this.ready = false;
    this.ended = false;
    this.halted = false;

    const cam = this.cameras.main;
    cam.setViewport(0, 0, view.width, view.height);
    cam.setZoom(view.zoom);
    cam.setBackgroundColor(OUTLINE);
    this.follow();

    this.fx = new Effects(this, 140);
    this.nums = new Numbers(this, 60);

    // The wave's figures and its ground are brought in by the loader that outlives this screen, and the wave waits for them.
    const loader = this.scene.get(ASSETS);
    const art = sheet(this.game, getManifest());
    const hero = heroOf(run);
    const land = this.world.wave.land;
    const shape = view.tall ? 'tall' : 'wide';
    const groundKey = `arena:${land}:${shape}`;
    const stills: UnitKey[] = this.world.wave.mix.map(([id]) => ({ team: 'red', unit: id }));
    // Whoever a caller calls up is not in the wave's own list.
    for (const [id] of this.world.wave.mix) {
      const calls = ENEMY_CALLS[id];
      if (calls) stills.push({ team: 'red', unit: calls });
    }
    const rigged: UnitKey[] = [{ team: 'blue', unit: hero.unit }, ...run.band.map((b) => ({ team: 'blue' as const, unit: byId(COMPANIONS, b.id).unit }))];
    // Whoever is in the cage on this road may be let out and fight: their figure is brought in with the band's.
    if (this.world.omen === 'stray' && run.road.stray) rigged.push({ team: 'blue', unit: byId(COMPANIONS, run.road.stray).unit });
    if (this.world.wave.boss) {
      rigged.push({ team: 'red', unit: this.world.wave.boss });
      const calls = ENEMY_CALLS[this.world.wave.boss];
      if (calls) stills.push({ team: 'red', unit: calls });
    }
    const ground = new Promise<void>((resolve) => {
      if (this.textures.exists(groundKey)) {
        resolve();
        return;
      }
      // The ground is one big picture: sharp enough for the screen it is on, and no bigger.
      loader.load.svg(groundKey, `assets/arena/${land}-${shape}.svg`, { scale: Math.min(1.6, Math.max(1, view.zoom)) });
      loader.load.once(`filecomplete-svg-${groundKey}`, () => resolve());
      loader.load.start();
    });
    void ground
      .then(() => art.ensureField(loader, rigged, stills))
      .then(() => {
        if (!this.scene.isActive()) return;
        this.build(groundKey, land);
      });
  }

  /** Everything is in: the field is stood up and the wave begins. */
  private build(groundKey: string, land: Land): void {
    const w = this.world;
    this.add.image(0, 0, groundKey).setOrigin(0, 0).setDisplaySize(w.w, w.h).setDepth(-100);
    const def = heroOf(this.run);
    // Their own weapon is in their figure's hand, and the figure swings it. What they have bought floats beside them.
    this.hero = new Figure(this, def.unit, 'blue', getManifest().units[def.unit], HERO_SCALE, 'unit', 1);
    this.aimFor = 0;
    this.heroBarBack = this.add.image(0, 0, SHEET, 'fx/solid').setTint(hex(OUTLINE)).setVisible(false);
    this.heroBar = this.add.image(0, 0, SHEET, 'fx/solid').setTint(RED).setOrigin(0, 0.5).setVisible(false);
    w.slots.forEach((slot) => {
      this.weapons.push(slot.own ? null : this.add.image(0, 0, SHEET, weaponIcon(slot.def.id)).setScale(WEAPON_SCALE * INV_ART));
    });
    this.light = new FieldLight(this, w, def.id);
    this.deeds = new Deeds(this, w, this.fx, this.light, this.hero, def,
      (big, under) => (this.scene.get('Hud') as HudScene | undefined)?.banner(big, under),
      (ms, by) => this.cameras.main.shake(ms, by));
    this.light.crisp(this.heroBarBack);
    this.light.crisp(this.heroBar);
    this.road = new RoadField(this, w, this.fx, { banner: (text, under) => (this.scene.get('Hud') as HudScene | undefined)?.banner(text, under), foeScale: FOE_SCALE });
    this.road.plainNight(!this.light.on);
    this.ready = true;
    this.sync(0);
    if (this.still) {
      this.ended = true;
      this.halted = true;
      if (this.overlay) this.scene.launch(this.overlay);
      return;
    }
    music.play(land, 'battle');
    ads().gameplayStart();
    if (this.resumed) {
      this.scene.launch('Hud', {});
      return;
    }
    sfx.play('fight', 0.7);
    // A road with an omen says which it was as the wave begins.
    const omen = w.omen === 'quiet' ? '' : omenOf(w.omen).name;
    const under = omen || (w.wave.n === 1 || waveStartsLand(w.wave.n) ? LAND_NAMES[land] : w.wave.boss ? 'A captain leads them' : '');
    // A run begins as its hero's: who they are is said before the wave is.
    if (w.wave.n === 1) this.scene.launch('Hud', { banner: def.name.toUpperCase(), under: def.epithet, line: `"${def.line}"`, then: { banner: `WAVE ${w.wave.n}`, under } });
    else this.scene.launch('Hud', { banner: `WAVE ${w.wave.n}`, under });
  }

  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    const dt = Math.min(0.1, delta / 1000);
    this.clock += dt;
    const hud = this.scene.get('Hud') as HudScene | undefined;
    // A move holds the wave still for a breath as it begins: it is seen to begin.
    if (!this.halted && this.deeds.hold <= 0) {
      this.acc += dt;
      const steer = hud?.controls?.steer ?? { x: 0, y: 0 };
      // The move is asked for once, and the first step of the wave after that takes it.
      this.wantAct = hud?.controls?.takeAct() || this.wantAct;
      let steps = 0;
      while (this.acc >= STEP && steps++ < 6) {
        this.world.step(this.wantAct ? { ...steer, act: true } : steer);
        this.wantAct = false;
        this.acc -= STEP;
      }
      // A frame that took far too long is not caught up on: the wave would lurch.
      if (steps >= 6) this.acc = 0;
      this.react(this.world.drain());
    }
    this.sync(dt);
    this.fx.update(dt);
    this.nums.update(dt);
    this.cheer();
    if (this.world.over && !this.ended) this.finish();
  }

  /** A level made in the middle of a wave is seen on the hero at once, though its choice waits for the camp. */
  private cheer(): void {
    let xp = this.run.xp + this.world.xp;
    let level = this.run.level;
    while (xp >= levelNeeds(level)) xp -= levelNeeds(level++);
    if (level > this.level && this.level >= 0) {
      const h = this.world.hero;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.fx.spawn('fx/sparkle', h.x + Math.cos(a) * 26, h.y - 34 + Math.sin(a) * 18, { dur: 0.55, from: 0.4, to: 1.1, tint: hex(HOLY.fill), vy: -60, delay: i * 0.03, depth: h.y + 60 });
      }
      this.fx.spawn('fx/ring', h.x, h.y - 6, { dur: 0.45, from: 0.3, to: 2.2, tint: hex(HOLY.fill), alpha: 0.8, flat: 0.5, depth: h.y - 2 });
      this.light.levelUp(h.x, h.y);
    }
    this.level = level;
  }

  /** The wave is over, one way or the other. */
  private finish(): void {
    this.ended = true;
    this.halted = true;
    const cleared = this.world.over === 'cleared';
    ads().gameplayStop();
    const hud = this.scene.get('Hud') as HudScene | undefined;
    hud?.controls?.release();
    finishWave();
    if (cleared) {
      sfx.play('victory', 0.7);
      music.play(this.world.wave.land, 'calm');
      this.time.delayedCall(650, () => {
        this.scene.stop('Hud');
        this.scene.launch('Camp');
      });
    } else {
      sfx.play('defeat', 0.8);
      this.hero.die(this.clock);
      this.cameras.main.shake(260, 0.008);
      this.time.delayedCall(1300, () => {
        this.scene.stop('Hud');
        this.scene.launch('Result');
      });
    }
  }

  // ------------------------------------------------------------ what has happened

  private react(events: Ev[]): void {
    const w = this.world;
    const h = w.hero;
    this.light.react(events);
    for (const e of events) {
      this.deeds.react(e);
      this.road.react(e);
      switch (e.t) {
        case 'mark':
          if (e.boss) sfx.play('spawn', 0.9, 0.7);
          break;
        case 'stand': {
          const f = w.foes.find((x) => x.id === e.id);
          if (f) this.fx.spawn('fx/dust', f.x, f.y - 4, { dur: 0.24, from: 0.3, to: 0.7, alpha: 0.6, flat: 0.5, depth: f.y - 1 });
          break;
        }
        case 'strike': {
          const slot = w.slots[e.slot];
          const melee = slot.def.kind === 'melee';
          if (slot.own) this.swing(e.angle);
          if (slot.def.motion === 'sweep') {
            this.fx.spawn('fx/slash', h.x + Math.cos(e.angle) * e.range * 0.55, h.y - 24 + Math.sin(e.angle) * e.range * 0.55, {
              dur: 0.16, from: (e.range / 60) * 0.9, to: (e.range / 60) * 1.15, rotation: e.angle, alpha: 0.9, depth: h.y + 40,
            });
          } else if (slot.def.motion === 'thrust') {
            this.fx.spawn('fx/spark', e.x, e.y - 24, { dur: 0.14, from: 0.5, to: 1, rotation: e.angle, alpha: 0.9, depth: h.y + 40 });
          }
          sfx.play(melee ? 'slash' : 'cast', melee ? 0.5 : 0.45, 0.9 + (e.slot % 3) * 0.08);
          break;
        }
        case 'loose':
          if (w.slots[e.slot].own) this.swing(e.angle);
          sfx.play(w.slots[e.slot].def.kind === 'magic' ? 'cast' : 'shoot', 0.4, 0.95 + (e.slot % 3) * 0.06);
          break;
        case 'hit': {
          const v = this.foes.get(e.id);
          if (v) v.flash = e.soft ? 0.05 : 0.09;
          // Fire and clouds tick on dozens at once: their numbers are small and plain, a blow's are big.
          this.nums.show(e.x + (Math.random() - 0.5) * 14, e.y - 44, String(e.amount), e.crit ? hex(HOLY.fill) : e.soft ? hex(BONE.shade) : WHITE, e.crit ? 28 : e.soft ? 15 : 20);
          if (!e.soft) this.fx.spawn('fx/spark', e.x, e.y - 22, { dur: 0.12, from: 0.3, to: 0.8, alpha: 0.9, depth: e.y + 30 });
          break;
        }
        case 'fall': {
          const v = this.foes.get(e.id);
          if (v) this.dropFoe(v, e.swept);
          this.foes.delete(e.id);
          this.warnings = this.warnings.filter((x) => {
            if (x.id !== e.id) return true;
            this.free(x.img);
            return false;
          });
          if (e.boss && !e.swept) {
            this.cameras.main.shake(300, 0.01);
            this.fx.spawn('fx/ring', e.x, e.y - 20, { dur: 0.5, from: 0.6, to: 6, tint: hex(HOLY.fill), alpha: 0.9, depth: 6000 });
            sfx.play('blast', 0.9, 0.7);
            ads().happy();
          } else if (!e.swept) sfx.play('death', 0.32, 0.9 + Math.random() * 0.3);
          break;
        }
        case 'burst': {
          const tint = BURSTS[e.kind];
          // With the light on a burst is drawn as fire and light (view/light); without it, as a disc and a ring.
          if (!this.light.on) {
            this.fx.spawn('fx/disc', e.x, e.y, { dur: 0.22, from: (e.r / 32) * 0.5, to: e.r / 32, tint, alpha: 0.4, flat: 0.62, depth: 4 });
            this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.3, from: (e.r / 32) * 0.4, to: (e.r / 32) * 1.1, tint, alpha: 0.9, flat: 0.62, depth: 5 });
          }
          if (e.kind === 'powder' || e.kind === 'foe' || e.kind === 'slam') {
            this.cameras.main.shake(110, e.kind === 'foe' ? 0.006 : 0.003);
            sfx.play(e.kind === 'slam' ? 'thud' : 'blast', 0.55);
          }
          break;
        }
        case 'hurt':
          this.hero.hit(this.clock, e.x);
          this.cameras.main.shake(140, 0.006);
          this.nums.show(h.x, h.y - 70, `-${e.amount}`, RED, 30);
          sfx.play('bigHit', 0.8);
          (this.scene.get('Hud') as HudScene | undefined)?.hurt();
          break;
        case 'dodge':
          this.fx.spawn('fx/dust', h.x, h.y - 20, { dur: 0.25, from: 0.6, to: 1.4, alpha: 0.6, depth: h.y + 5 });
          break;
        case 'mend':
          this.nums.show(h.x, h.y - 70, `+${e.amount}`, hex(VENOM.fill), 22);
          this.fx.spawn('fx/sparkle', h.x, h.y - 40, { dur: 0.4, from: 0.5, to: 1.1, tint: hex(VENOM.fill), vy: -40, depth: h.y + 30 });
          break;
        case 'take':
          if (e.kind === 'coin') {
            // A heap of coins coming in at once is one sound rising, not thirty on top of each other.
            if (this.clock - this.lastCoin > 0.05) {
              sfx.play('coin', 0.35, 1 + Math.min(0.5, (this.clock - this.lastCoin < 0.25 ? 0.2 : 0)));
              this.lastCoin = this.clock;
            }
          } else if (e.kind === 'heart') sfx.play('heal', 0.7);
          else sfx.play('claim', 0.8);
          break;
        case 'aim':
          this.warn(e);
          break;
        case 'foeShot':
          sfx.play('shoot', 0.25, 0.7);
          break;
        case 'gather':
          (this.scene.get('Hud') as HudScene | undefined)?.banner('CLEARED', '');
          break;
        case 'end':
          break;
        default:
          break;
      }
    }
  }

  /** Their own weapon strikes that way: the figure turns to it, and its blow lands now. */
  private swing(angle: number): void {
    this.aimFace = Math.cos(angle) >= 0 ? 1 : -1;
    this.aimFor = 0.4;
    // A blow that was not seen coming (nobody was near a moment ago) is thrown at once.
    if (!this.hero.acting) this.hero.attack(this.clock, 0.05);
  }

  /** A foe that is about to do something says so on the ground: a line it will run down, a ring it will burst in. */
  private warn(e: Extract<Ev, { t: 'aim' }>): void {
    const f = this.world.foes.find((x) => x.id === e.id);
    if (!f) return;
    if (e.doing === 'charge') {
      const img = this.crisp(this.take('fx/solid')).setOrigin(0, 0.5).setTint(RED).setDepth(3).setRotation(Math.atan2(e.dy, e.dx));
      img.setDisplaySize((f.def.dash ?? 400) * (f.boss ? 0.7 : 0.62), f.def.r * 2.2);
      this.warnings.push({ img, id: e.id, left: e.seconds, of: e.seconds, kind: 'line', r: 0 });
    } else if (e.doing === 'burst' || e.doing === 'ring' || e.doing === 'blaze') {
      const r = e.doing === 'burst' ? (f.def.burst ?? 80) : e.doing === 'blaze' ? ROAD.champions.blaze : 70;
      const img = this.crisp(this.take('fx/disc')).setTint(RED).setDepth(3);
      this.warnings.push({ img, id: e.id, left: e.seconds, of: e.seconds, kind: 'ring', r });
    } else {
      this.fx.spawn('fx/sparkle', f.x, f.y - 60 * (f.def.size ?? 1), { dur: e.seconds, from: 0.5, to: 1.2, tint: RED, depth: f.y + 40 });
    }
  }

  // ------------------------------------------------------------ pictures, handed round

  private take(frame: string): Phaser.GameObjects.Image {
    const img = this.spare.pop() ?? this.add.image(0, 0, SHEET, frame);
    img.setTexture(SHEET, frame).setVisible(true).setActive(true).setAlpha(1).setScale(1).setRotation(0).clearTint().setTintMode(Phaser.TintModes.MULTIPLY).setFlipX(false);
    return img;
  }

  private free(img: Phaser.GameObjects.Image): void {
    img.setVisible(false).setActive(false);
    this.light.plain(img);
    this.spare.push(img);
  }

  private dropFoe(v: FoeView, swept: boolean): void {
    const f = v.foe;
    if (v.img) this.free(v.img);
    if (v.fig) {
      // A boss falls as a figure falls, and is taken away when it has faded.
      const fig = v.fig;
      fig.die(this.clock, swept);
      this.time.delayedCall(1600, () => fig.destroy());
    }
    this.fx.spawn('fx/dust', f.x, f.y - 14, { dur: 0.26, from: 0.35, to: 0.8 * (f.def.size ?? 1), alpha: 0.7, depth: f.y + 2 });
  }

  // ------------------------------------------------------------ the field as it stands

  private follow(): void {
    const w = this.world;
    const cam = this.cameras.main;
    // The view never leaves the field. Where the window shows more than all of it, it sits in the middle.
    const cx = view.w >= w.w ? w.w / 2 : Math.max(view.w / 2, Math.min(w.w - view.w / 2, w.hero.x));
    const cy = view.h >= w.h ? w.h / 2 : Math.max(view.h / 2, Math.min(w.h - view.h / 2, w.hero.y - 20));
    cam.centerOn(cx, cy);
  }

  private sync(dt: number): void {
    const w = this.world;
    const h = w.hero;
    this.stamp++;
    const stamp = this.stamp;

    // The hero.
    const fig = this.hero;
    fig.x = h.x;
    fig.y = h.y;
    // They face what they strike while they strike it, and the way they go otherwise.
    if (this.aimFor > 0) this.aimFor -= dt;
    fig.facing = this.aimFor > 0 ? this.aimFace : h.face;
    fig.moving = h.moving && !this.halted;
    // The blow is drawn back a moment before it lands, so that it lands on time: the wave says how long is left.
    const own = w.own;
    if (own && !this.halted && own.cool > 0 && own.cool < WINDUP && !fig.acting && h.hp > 0) {
      const reach = w.rangeOf(own.def) * 1.15;
      let near: Foe | null = null;
      for (const f of w.foes) if (!f.dead && Math.hypot(f.x - h.x, f.y - h.y) < reach && (!near || Math.abs(f.x - h.x) < Math.abs(near.x - h.x))) near = f;
      if (near) {
        this.aimFace = near.x >= h.x ? 1 : -1;
        this.aimFor = own.cool + 0.4;
        fig.facing = this.aimFace;
        fig.attack(this.clock, own.cool, own.def.motion === 'slam');
      }
    }
    // Struck, they flicker for the moment nothing can hurt them.
    fig.alpha = h.unseen > 0 ? 0.35 : h.grace > 0 && Math.floor(this.clock * 20) % 2 === 0 ? 0.55 : 1;
    fig.update(this.clock, dt);
    const hurt = h.hp < h.maxHp && h.hp > 0;
    this.heroBarBack.setVisible(hurt);
    this.heroBar.setVisible(hurt);
    if (hurt) {
      this.heroBarBack.setPosition(h.x, h.y + 12).setDisplaySize(52, 8).setDepth(h.y + 1);
      this.heroBar.setPosition(h.x - 24, h.y + 12).setDisplaySize(48 * (h.hp / h.maxHp), 4).setDepth(h.y + 2);
    }

    // What they have bought, each in its place beside them.
    const n = w.slots.length;
    const owned = own ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const slot = w.slots[i];
      const img = this.weapons[i];
      const id = slot.def.id;
      if (!img) {
        // Their own: where its head is in the figure's hand, for the light it gives.
        this.carried[i] = { id, x: h.x + fig.muzzleReach, y: h.y - fig.muzzleHeight + 24, rot: 0, seen: h.hp > 0 };
        continue;
      }
      const place = slotPlace(i - owned, n - owned);
      let x = h.x + place.x;
      let y = h.y + place.y + Math.sin(this.clock * 3 + i) * 1.5;
      // It leans out from the hero at rest, and turns to its mark for a moment when it strikes.
      const rest = Math.atan2(place.y + 30, place.x) * 0.25 + (place.x < 0 ? -0.25 : 0.25);
      const hold = 0.24;
      const k = slot.since < hold ? 1 - slot.since / hold : 0;
      let rot = rest;
      if (!HANGS.has(id)) {
        const aimed = POINTS_RIGHT.has(id) ? slot.angle : slot.angle + Math.PI / 2;
        if (slot.since < 0.5) rot = aimed;
        if (slot.def.motion === 'sweep') rot = aimed + (k * 2 - 1) * 0.9 * (slot.since < hold ? 1 : 0);
        else if (slot.def.motion === 'thrust' || slot.def.motion === 'slam') {
          const reach = Math.sin(k * Math.PI) * Math.min(46, w.rangeOf(slot.def) * 0.4);
          x += Math.cos(slot.angle) * reach;
          y += Math.sin(slot.angle) * reach;
        } else if (k > 0) {
          x -= Math.cos(slot.angle) * 5 * k;
          y -= Math.sin(slot.angle) * 5 * k;
        }
      } else if (k > 0) rot = rest + Math.sin(k * Math.PI * 2) * 0.5;
      const pop = slot.def.motion === 'pulse' && k > 0 ? 1 + k * 0.35 : 1;
      // Behind the hero when it hangs above their middle, in front when below; and dimmer while it waits, so that the figure is read first.
      const busy = slot.since < 0.5 ? 1 : 0.72;
      img.setPosition(x, y).setRotation(rot).setScale(WEAPON_SCALE * INV_ART * pop * (slot.since < hold ? 1.25 : 1)).setDepth(h.y + (place.y > -42 ? 3 : -3));
      img.setAlpha(fig.alpha * busy).setVisible(h.hp > 0);
      this.carried[i] = { id, x, y, rot, seen: h.hp > 0 };
    }
    this.carried.length = n;

    this.deeds.update(dt, this.clock, this.halted);
    this.road.sync(this.clock, dt);

    // Whoever comes at them.
    for (const f of w.foes) {
      // A wagon or a cage is a thing, shown with the rest of what a road puts on the field.
      if (f.def.prop) continue;
      let v = this.foes.get(f.id);
      if (!v) {
        v = { foe: f, img: null, fig: null, flash: 0, born: this.clock, stamp };
        if (f.boss) {
          v.fig = new Figure(this, f.def.unit, 'red', getManifest().units[f.def.unit], FIGURE_SCALE * (f.def.size ?? 1.5), 'unit', f.id);
        } else v.img = this.take(Sheet.stillFrame('red', f.def.unit, 'a'));
        this.foes.set(f.id, v);
      }
      v.stamp = stamp;
      const size = f.def.size ?? 1;
      if (v.fig) {
        v.fig.x = f.x;
        v.fig.y = f.y;
        v.fig.facing = f.face;
        v.fig.moving = f.moving && !this.halted;
        v.fig.update(this.clock, dt);
        if (v.flash > 0) v.flash -= dt;
        continue;
      }
      const img = v.img as Phaser.GameObjects.Image;
      // Two pictures in turn as it walks: a step, and standing.
      const stride = f.moving && !this.halted && Math.floor((this.clock + f.id * 0.37) * (f.state === 'dash' ? 12 : 6)) % 2 === 1;
      img.setFrame(Sheet.stillFrame('red', f.def.unit, stride ? 'b' : 'a'));
      // It comes up out of the ground it was marked on, and shudders while it is stunned or winding up.
      const age = this.clock - v.born;
      const grow = age < 0.18 ? 0.4 + (age / 0.18) * 0.6 : 1;
      const wind = f.state === 'aim' ? 1 + Math.sin(this.clock * 40) * 0.04 : 1;
      const s = (FOE_SCALE * size * grow) / STILL_SCALE;
      img.setPosition(f.x + (f.stun > 0 ? Math.sin(this.clock * 50) * 1.5 : 0), f.y).setScale(s * wind, s / wind).setFlipX(f.face < 0).setDepth(f.y);
      // Struck, it is all white for a moment. Burning and slowed, it is tinted, so that a glance says which.
      if (v.flash > 0) {
        v.flash -= dt;
        img.setTint(WHITE).setTintMode(Phaser.TintModes.FILL);
      } else {
        img.setTintMode(Phaser.TintModes.MULTIPLY);
        if (f.frozen > 0) img.setTint(hex(FROST.fill));
        else if (f.burn > 0) img.setTint(hex(FIRE.light));
        else if (f.slow > 0) img.setTint(hex(FROST.light));
        else img.clearTint();
      }
    }
    for (const [id, v] of this.foes) {
      if (v.stamp === stamp) continue;
      // Gone without a word: taken away as it is.
      if (v.img) this.free(v.img);
      v.fig?.destroy();
      this.foes.delete(id);
    }

    // The ground marked where they will stand.
    this.each(this.marks, w.marks, stamp, () => this.crisp(this.take('fx/ring').setTint(RED)), (img, m) => {
      const k = 1 - Math.max(0, m.left) / 0.9;
      const s = (m.boss ? 1.5 : 0.5) * (0.7 + 0.3 * Math.sin(this.clock * 14) ** 2);
      img.setPosition(m.x, m.y).setScale(s * INV_ART * 1.4, s * INV_ART * 0.9).setAlpha(0.25 + 0.5 * k).setDepth(2);
    });

    // What flies.
    this.each(this.shots, w.shots, stamp, (s) => {
      const frame = s.art === 'stone' ? 'icon/shot-stone' : s.art === 'bomb' ? 'icon/shot-bomb' : s.art === 'orb-red' ? 'fx/orb-fire' : `fx/${s.art}`;
      const img = this.take(frame);
      if (s.art === 'orb-red') img.setTint(0xff6a5a);
      return img;
    }, (img, s) => {
      let y = s.y;
      let size = s.mine ? 0.9 : 1.1;
      if (s.lob) {
        // A thing thrown rises and falls on its way.
        const t = Math.min(1, s.lob.at / s.lob.of);
        y -= Math.sin(t * Math.PI) * 70;
        size = 0.8 + Math.sin(t * Math.PI) * 0.3;
        img.setRotation(this.clock * 8);
      } else if (s.art === 'stone' || s.art === 'bomb') img.setRotation(this.clock * 10);
      else img.setRotation(Math.atan2(s.vy, s.vx));
      img.setPosition(s.x, y).setScale(size * INV_ART * (s.art.startsWith('orb') ? 1 : 0.85)).setDepth(s.y + 40).setVisible(!this.light.draws(s));
    });

    // Clouds on the ground.
    this.each(this.zones, w.zones, stamp, (z) => this.take('fx/disc').setTint(ZONES[z.kind]), (img, z) => {
      const breath = 1 + Math.sin(this.clock * 5 + z.id) * 0.06;
      img.setPosition(z.x, z.y).setScale((z.r / 30) * INV_ART * breath, (z.r / 30) * INV_ART * 0.62 * breath).setAlpha(Math.min(0.42, z.life * 0.5)).setDepth(1);
    });

    // What lies about.
    this.each(this.picks, w.picks, stamp, (p) => this.take(p.kind === 'heart' ? 'icon/heart' : p.kind === 'pack' ? 'pack/thornwood' : p.value >= 10 ? 'icon/sack' : 'icon/coin'), (img, p) => {
      const base = p.kind === 'pack' ? 0.2 : p.kind === 'heart' ? 0.44 : p.value >= 10 ? 0.5 : p.value >= 3 ? 0.42 : 0.3;
      const hop = p.pulled ? 0 : Math.abs(Math.sin(Math.min(1, p.age * 2.2) * Math.PI)) * 14 * Math.max(0, 1 - p.age);
      img.setPosition(p.x, p.y - 8 - hop + Math.sin(this.clock * 4 + p.id) * 1.2).setScale(base * INV_ART * 2).setDepth(p.y - 6);
    });

    // What is about to happen.
    for (const x of this.warnings) {
      x.left -= this.halted ? 0 : dt;
      const f = w.foes.find((o) => o.id === x.id);
      if (!f || x.left <= 0) {
        this.free(x.img);
        x.left = -1;
        continue;
      }
      const k = 1 - x.left / x.of;
      if (x.kind === 'line') x.img.setPosition(f.x, f.y - 6).setAlpha(0.18 + 0.3 * k);
      else x.img.setPosition(f.x, f.y).setScale((x.r / 30) * INV_ART * (0.3 + 0.7 * k), (x.r / 30) * INV_ART * (0.3 + 0.7 * k) * 0.62).setAlpha(0.2 + 0.25 * k);
    }
    if (this.warnings.some((x) => x.left < 0)) this.warnings = this.warnings.filter((x) => x.left >= 0);

    this.follow();
    this.light.update(dt, this.clock, this.halted, this.carried);
  }

  /** The player has asked for more of the light, or less. */
  setLight(mode: LightMode): void {
    if (!this.ready) return;
    this.light.setMode(mode);
    this.road.plainNight(!this.light.on);
  }

  /** A picture that stays sharp and bright whatever the hour: a warning has to be read. */
  private crisp(img: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
    this.light.crisp(img);
    return img;
  }

  /** Shows a list of the wave's things as pictures: one made for each new thing, moved while it lasts, taken back when it is gone. */
  private each<T extends { id: number }>(
    held: Map<number, Thing>,
    list: readonly T[],
    stamp: number,
    make: (item: T) => Phaser.GameObjects.Image,
    place: (img: Phaser.GameObjects.Image, item: T) => void,
  ): void {
    for (const item of list) {
      let v = held.get(item.id);
      if (!v) {
        v = { img: make(item), stamp };
        held.set(item.id, v);
      }
      v.stamp = stamp;
      place(v.img, item);
    }
    for (const [id, v] of held) {
      if (v.stamp === stamp) continue;
      this.free(v.img);
      held.delete(id);
    }
  }

  /** How sound and music stand in the save, put on the mix. */
  static applySound(): void {
    const s = save();
    sfx.setVolumes(s.sound ? 0.8 : 0, s.music ? 0.45 : 0);
  }
}

import { ENEMIES } from '../../game/data';

/** Who each caller calls up, by the caller's name. */
const ENEMY_CALLS: Record<string, string | undefined> = Object.fromEntries(ENEMIES.map((e) => [e.id, e.calls]));

/** True for the first wave of a land: its name is said then. */
function waveStartsLand(n: number): boolean {
  const at = ((n - 1) % 20) + 1;
  return at === 1 || at === 8 || at === 15;
}
