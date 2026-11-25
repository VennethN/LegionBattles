// The lair as it is seen: the ground, the hunter, the monster, whoever
// fights beside either, what was built, what flies, and above all the
// tells, the shapes on the ground that say what is about to land. It steps
// the hunt (game/hunt.ts) and shows what it finds there; it works nothing
// out for itself.
//
// The hunter and the monster are figures moved part by part. Everyone else
// is one picture each, changed between two as they walk.

import Phaser from 'phaser';
import { BONE, HOLY, OUTLINE, RUBY } from '../../art/kit/palette';
import { huntOf, music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import type { Bot } from '../../game/bot';
import { BUILDINGS, CAMP } from '../../game/content';
import { STEP, type Ev, type Hunt, type Steer, type Tell } from '../../game/hunt';
import { ads } from '../../platform/ads';
import { ASSETS, getManifest } from '../app';
import { ART_SCALE, hex, view } from '../config';
import { Effects } from '../Effects';
import { LairLight } from '../light/LairLight';
import type { LightMode } from '../light/setting';
import { Numbers } from '../Numbers';
import {
  ABILITY_MOVES, ALLY_ART, BUILDING_ART, GRIM_SCALE, HELPER_ART, HUNTER_ART, LAIR_GROUND, LAMP_ART, MONSTER_ART, MONSTER_MOVES, STAND_IN, STONE_ART, TRAP_ART, isGrim, type Art,
} from '../pictures';
import { Figure } from '../art/Figure';
import { GrimFigure } from '../art/GrimFigure';
import { getGrim, thingFrame, wantedThing, wantedUnit } from '../art/grim';
import { SHEET, Sheet, sheet, type UnitKey } from '../art/Sheet';
import { STILL_SCALE } from '../art/scale';
import { beginHunt, finishHunt, save, theHunt } from '../session';
import type { HudScene } from './HudScene';

const INV_ART = 1 / ART_SCALE;
const WHITE = 0xffffff;
const RED = 0xff4a36;
const GOLD = hex(HOLY.fill);

/** Something shown on the field: a figure of the style, or one still picture of a stand-in. */
interface Actor {
  fig: GrimFigure | null;
  img: Phaser.GameObjects.Image | null;
  stamp: number;
  flash: number;
  born: number;
}

/** The pieces a churchyard is dressed with, as shares of the field: what, where, how big, and how deep it stands. */
const CHURCHYARD: Array<[string, number, number, number, 'far' | 'back' | 'field' | 'near']> = [
  ['far-church', 0.5, 0.045, 1.5, 'far'],
  ['wall', 0.1, 0.085, 1.1, 'back'], ['wall', 0.3, 0.085, 1.1, 'back'], ['wall', 0.7, 0.085, 1.1, 'back'], ['wall', 0.9, 0.085, 1.1, 'back'],
  ['lych-gate', 0.5, 0.1, 0.95, 'back'],
  ['dead-tree', 0.07, 0.2, 0.9, 'field'], ['dead-tree', 0.95, 0.16, 0.8, 'field'],
  ['torch-post', 0.2, 0.15, 0.9, 'field'], ['torch-post', 0.8, 0.15, 0.9, 'field'], ['torch-post', 0.04, 0.72, 0.9, 'field'], ['torch-post', 0.965, 0.72, 0.9, 'field'],
  ['headstone-cross', 0.03, 0.36, 0.9, 'field'], ['headstone-round', 0.035, 0.52, 0.9, 'field'], ['headstone-broken', 0.97, 0.4, 0.9, 'field'], ['headstone-round', 0.965, 0.56, 0.9, 'field'],
  ['headstone-broken', 0.13, 0.94, 0.9, 'field'], ['headstone-cross', 0.88, 0.95, 0.9, 'field'],
  ['near-flat', 0.1, 1.04, 1.3, 'near'], ['near-flat', 0.92, 1.05, 1.3, 'near'],
];

export class LairScene extends Phaser.Scene {
  private hunt!: Hunt;
  private hunter!: GrimFigure;
  /** The monster: a figure of the style, or a stand-in moved part by part. */
  private monster: GrimFigure | null = null;
  private standIn: Figure | null = null;
  private fx!: Effects;
  private nums!: Numbers;
  private light!: LairLight;
  /** What lies on the ground and is lit with it: tar. */
  private ground!: Phaser.GameObjects.Graphics;
  /** What is drawn over the dark, sharp: the tells, the rings, the bars. */
  private marks!: Phaser.GameObjects.Graphics;
  private readonly actors = new Map<string, Actor>();
  private spare: Phaser.GameObjects.Image[] = [];
  /** Where each thing stood before the hunt's last step: it is drawn between there and where it stands now. */
  private readonly before = new Map<string, [number, number]>();
  private blend = 1;
  private stamp = 0;
  private acc = 0;
  private clock = 0;
  private ready = false;
  private ended = false;
  private shook = 0;
  /** True while the hunt is held still: the game is paused, or its end is being shown. */
  halted = false;
  /** A player made of rules, for the scripts that film the game and take its pictures. The game never sets it. */
  static pilot: Bot | null = null;
  private overlay = '';
  private resumed = false;
  /** Time in the lair, slowed or held for a moment: a first warning to be read, a heavy blow to be felt. Seconds of real time left, and the share of its pace. */
  private slowLeft = 0;
  private slowBy = 1;
  private stopLeft = 0;
  /** True once a step of a lesson has asked for its first warning to be held. */
  private holdNext = false;

  constructor() {
    super('Lair');
  }

  /** `keep` stands the lair up again round the hunt already going on: the window changed shape. `over` is the screen that was open over it then. */
  create(data: { keep?: boolean; over?: string } = {}): void {
    const kept = data.keep ? theHunt() : null;
    this.hunt = kept ?? theHunt() ?? beginHunt(view.tall);
    this.overlay = data.over ?? '';
    this.resumed = !!kept;
    this.actors.clear();
    this.before.clear();
    this.monster = null;
    this.standIn = null;
    this.spare = [];
    this.acc = 0;
    this.clock = 0;
    this.ready = false;
    this.ended = false;
    this.halted = false;
    this.slowLeft = 0;
    this.stopLeft = 0;
    this.holdNext = false;

    const cam = this.cameras.main;
    cam.setViewport(0, 0, view.width, view.height);
    cam.setZoom(view.zoom);
    cam.setBackgroundColor(OUTLINE);
    this.follow();

    this.fx = new Effects(this, 80);
    this.nums = new Numbers(this, 40);

    // The lair's figures and its ground are brought in by the loader that outlives this screen, and the hunt waits for them.
    const loader = this.scene.get(ASSETS);
    const art = sheet(this.game, getManifest());
    const h = this.hunt;
    const shape = h.tall ? 'tall' : 'wide';
    const lair = LAIR_GROUND[h.monster.def.lair] ?? LAIR_GROUND.churchyard;
    const groundKey = `ground:${h.monster.def.lair}:${shape}`;
    const groundUrl = 'grim' in lair ? `assets/grim/grounds/${lair.grim}-${shape}.svg` : `assets/arena/${lair.legion}-${shape}.svg`;
    // Everything that can be on this field: the hunter, the monster, and all that either side may bring or call up.
    const arts: Art[] = [HUNTER_ART[h.hunter.def.id], MONSTER_ART[h.monster.def.id], ...Object.values(HELPER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART), STONE_ART, TRAP_ART, LAMP_ART];
    const grim = [...new Set(arts.flatMap((a) => (isGrim(a) ? [a.grim] : [])))].map(wantedUnit);
    const things = 'grim' in lair ? [...new Set(CHURCHYARD.map((c) => c[0]))].map(wantedThing) : [];
    const mon = MONSTER_ART[h.monster.def.id];
    const rigged: UnitKey[] = isGrim(mon) ? [] : [{ team: mon.team, unit: mon.legion }];
    const stills: UnitKey[] = arts.flatMap((a) => (isGrim(a) || a === mon ? [] : [{ team: a.team, unit: a.legion }]));
    const ground = new Promise<void>((resolve) => {
      if (this.textures.exists(groundKey)) {
        resolve();
        return;
      }
      // The ground is one big picture: sharp enough for the screen it is on, and no bigger.
      loader.load.svg(groundKey, groundUrl, { scale: Math.min(1.6, Math.max(1, view.zoom)) });
      loader.load.once(`filecomplete-svg-${groundKey}`, () => resolve());
      loader.load.start();
    });
    void ground
      .then(() => art.ensureField(loader, rigged, stills))
      .then(() => art.ensureWanted(loader, [...grim, ...things]))
      .then(() => {
        if (!this.scene.isActive()) return;
        this.build(groundKey, 'grim' in lair);
      });
  }

  /** Everything is in: the lair is stood up. */
  private build(groundKey: string, dressed: boolean): void {
    const h = this.hunt;
    const g = getGrim();
    const floor = this.add.image(0, 0, groundKey).setOrigin(0, 0).setDisplaySize(h.w, h.h).setDepth(-100);
    // A stand-in ground is another style's: it is darkened to sit under this one's figures.
    if (!dressed) floor.setTint(0x6a7a8c);
    const torches: Array<[number, number]> = [];
    if (dressed) {
      // The lair as a stage set, in layers: far off, the back wall, what stands on the field's rim, and black flats in front.
      for (const [id, fx, fy, scale, layer] of CHURCHYARD) {
        const img = this.add.image(fx * h.w, fy * h.h, SHEET, thingFrame(id)).setScale(scale);
        if (layer === 'far') img.setDepth(-90).setScrollFactor(0.86, 0.9).setAlpha(0.9);
        else if (layer === 'back') img.setDepth(-80);
        else if (layer === 'near') img.setDepth(9000).setScrollFactor(1.12, 1.06);
        else img.setDepth(fy * h.h);
        if (id === 'torch-post') torches.push([fx * h.w, fy * h.h - 150 * scale]);
        // Every other piece faces the other way, so that two of a kind are not twins.
        if (fx > 0.5 && id !== 'far-church' && id !== 'lych-gate') img.setFlipX(true);
      }
    }
    this.ground = this.add.graphics().setDepth(1);
    const hp = HUNTER_ART[h.hunter.def.id];
    this.hunter = new GrimFigure(this, isGrim(hp) ? hp.grim : 'marta', g.units[isGrim(hp) ? hp.grim : 'marta'], g.poses, GRIM_SCALE, 1);
    const mp = MONSTER_ART[h.monster.def.id];
    if (isGrim(mp)) this.monster = new GrimFigure(this, mp.grim, g.units[mp.grim], g.poses, GRIM_SCALE, 2);
    else this.standIn = new Figure(this, mp.legion, mp.team, getManifest().units[mp.legion], mp.scale, 'unit', 2);
    this.light = new LairLight(this, h, torches);
    this.marks = this.light.crisp(this.add.graphics().setDepth(2));
    this.ready = true;
    this.sync(0);
    // Before the boss wakes, the lair's near silence; once it is up, its own piece at the step its health has come to.
    if (h.phase === 'camp' || h.monster.state === 'asleep') music.play('lair', h.phase === 'camp' ? 1 : 0);
    else music.play(huntOf(h.monster.def.id), musicStep(h.monster.part, h.cuts.length + 1));
    if (h.over) {
      this.ended = true;
      this.halted = true;
      if (this.overlay) this.scene.launch(this.overlay);
      return;
    }
    ads().gameplayStart();
    this.scene.launch('Hud', { fresh: !this.resumed });
  }

  setLight(mode: LightMode): void {
    this.light?.setMode(mode);
  }

  static applySound(): void {
    const s = save();
    sfx.setVolumes(s.sound ? 0.8 : 0, s.music ? 0.45 : 0);
  }

  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    const real = Math.min(0.1, delta / 1000);
    // The lair's own time: held for a breath on a heavy blow, slow while a first warning is read.
    let pace = 1;
    if (this.stopLeft > 0) {
      this.stopLeft -= real;
      pace = 0.04;
    } else if (this.slowLeft > 0) {
      this.slowLeft -= real;
      // It comes back to its pace over the last third of a second, not at a stroke.
      pace = this.slowBy + (1 - this.slowBy) * (1 - Math.min(1, this.slowLeft / 0.35));
    }
    const dt = real * pace;
    this.clock += dt;
    const hud = this.scene.get('Hud') as HudScene | undefined;
    if (!this.halted) {
      this.acc += dt;
      const steer: Steer = LairScene.pilot ? LairScene.pilot.steer(this.hunt) : { ...(hud?.controls?.steer ?? { x: 0, y: 0 }) };
      // What was asked for is asked once, and the first step of the hunt after that takes it.
      const places = BUILDINGS.filter((b) => b.id in this.hunt.toPlace).map((b) => b.id);
      for (const ask of hud?.controls?.take() ?? []) {
        if (ask === 'dodge') steer.dodge = true;
        else if (ask === 'a') steer.a = true;
        else if (ask === 'b') steer.b = true;
        else if (ask === 'wake') steer.wake = true;
        else if (ask.startsWith('call')) steer.call = Number(ask.slice(4));
        else if (ask.startsWith('place')) steer.place = places[Number(ask.slice(5))];
      }
      let steps = 0;
      while (this.acc >= STEP && steps++ < 6) {
        this.remember();
        this.hunt.step(steps === 1 ? steer : { x: steer.x, y: steer.y });
        this.acc -= STEP;
      }
      // A frame that took far too long is not caught up on: the hunt would lurch.
      if (steps >= 6) this.acc = 0;
      // The rules go in fixed steps and the screen does not: each thing is drawn as far from where it stood to where
      // it stands as this frame is into the next step, so that what moves, moves evenly whatever the screen's rate.
      this.blend = Math.min(1, this.acc / STEP);
      this.react(this.hunt.drain());
    }
    this.sync(dt);
    this.fx.update(dt);
    this.nums.update(dt);
    if (this.hunt.over && !this.ended) this.finish();
  }

  /** The hunt is over, one way or the other. */
  private finish(): void {
    this.ended = true;
    const won = this.hunt.over === 'won';
    ads().gameplayStop();
    const hud = this.scene.get('Hud') as HudScene | undefined;
    hud?.controls?.release();
    finishHunt();
    // The music ends the hunt itself: it resolves on a win and sinks on a loss.
    music.moment(won ? 'fall' : 'lost');
    if (won) {
      this.monster?.die(this.clock);
      this.standIn?.die(this.clock);
    } else this.hunter.die(this.clock);
    this.cameras.main.shake(320, 0.01);
    // The fall is watched before anything is said of it.
    this.time.delayedCall(won ? 1700 : 1300, () => {
      this.halted = true;
      this.scene.stop('Hud');
      this.scene.launch('Result');
    });
  }

  // ------------------------------------------------------------ what has happened

  /** Holds the lair nearly still for a moment: a blow that lands is felt. */
  stop(seconds: number): void {
    this.stopLeft = Math.max(this.stopLeft, seconds);
  }

  /** Slows the lair for some real seconds, to a share of its pace. */
  slow(seconds: number, by: number): void {
    this.slowLeft = seconds;
    this.slowBy = by;
  }

  private shake(ms: number, by: number): void {
    // One shake at a time, the bigger: many small ones on top of each other are only noise.
    if (this.clock < this.shook) return;
    this.shook = this.clock + ms / 1000;
    this.cameras.main.shake(ms, by);
  }

  private react(events: Ev[]): void {
    const w = this.hunt;
    const h = w.hunter;
    const m = w.monster;
    this.light.react(events);
    const hud = this.scene.get('Hud') as HudScene | undefined;
    for (const e of events) {
      hud?.noted(e);
      switch (e.t) {
        case 'wake':
          sfx.play('spawn', 1, 0.6);
          sfx.play('fight', 0.7);
          music.moment('wake');
          music.play(huntOf(m.def.id), 0);
          this.shake(500, 0.012);
          hud?.banner(m.def.name.toUpperCase(), 'The boss is awake');
          break;
        case 'lesson':
          this.holdNext = e.hold;
          break;
        case 'tell': {
          const t = w.tells.find((x) => x.id === e.id);
          if (e.first && t && this.holdNext) {
            // The first warning of a step that teaches it: the moment is held, so that it is seen before it is over.
            this.holdNext = false;
            this.slow(1.7, 0.22);
          }
          if (e.first && t) {
            // The monster draws back for as long as the tell shows, and its blow falls as the tell lands: its own move
            // for that attack where it has one, and else the one for the shape it marks.
            const move = MONSTER_MOVES[m.def.id]?.[e.attack] ?? (t.kind === 'line' ? 'slam' : t.kind === 'cone' ? 'sweep' : 'ring');
            this.monster?.play(move, this.clock, t.of, 0.3);
            this.standIn?.attack(this.clock, t.of, true);
            sfx.play('skill', 0.5, 0.8);
          } else if (t && t.by !== 0 && t.foe) this.actors.get(`h${t.by}`)?.fig?.play('claw', this.clock, t.of, 0.15);
          break;
        }
        case 'land':
          if (e.foe) {
            sfx.play(e.r > 60 ? 'thud' : 'hit', e.r > 60 ? 0.7 : 0.35, 0.8);
            if (e.r > 60) this.shake(140, 0.006);
            if (e.kind === 'ring') this.fx.spawn('fx/dust', e.x, e.y, { dur: 0.3, from: 0.6, to: Math.max(1, e.r / 28), alpha: 0.5, depth: 4 });
          }
          break;
        case 'strike':
          this.hunter.play('', this.clock, 0.07, 0.12);
          if (e.kind === 'arc') {
            this.fx.spawn('fx/slash', e.x + Math.cos(e.angle) * e.reach * 0.5, e.y - 30 + Math.sin(e.angle) * e.reach * 0.5, {
              dur: 0.16, from: (e.reach / 60) * 0.9, to: (e.reach / 60) * 1.15, rotation: e.angle, alpha: 0.9, depth: h.y + 40,
            });
            sfx.play('slash', 0.5, 0.95 + Math.random() * 0.1);
          }
          break;
        case 'loose':
          sfx.play('shoot', e.from === 'ballista' ? 0.6 : 0.35, e.from === 'ballista' ? 0.7 : 1);
          // A ballista that has just shot is the one nearest where the bolt left from.
          if (e.from === 'ballista') {
            const b = w.buildings.find((x) => x.def.kind === 'ballista' && Math.hypot(x.x - e.x, x.y - 10 - e.y) < 4);
            if (b) this.actors.get(`b${b.id}`)?.fig?.play('loose', this.clock, 0.04, 0.2);
          }
          break;
        case 'hit': {
          const big = e.big;
          if (e.who === 'monster') {
            this.nums.show(e.x + (Math.random() - 0.5) * 50, e.y - this.tall() * 0.7, String(e.amount), big ? GOLD : e.open ? WHITE : hex(BONE.shade), big ? 30 : e.open ? 24 : 19);
            if (e.open && !big) this.monster?.hit(this.clock);
            if (big || e.open) this.standIn?.hit(this.clock, h.x);
            sfx.play(big ? 'bigHit' : 'hit', big ? 0.6 : 0.4, 0.9 + Math.random() * 0.2);
          } else {
            const s = this.actors.get(`h${e.id}`);
            if (s) s.flash = 0.1;
            s?.fig?.hit(this.clock);
            this.nums.show(e.x, e.y - 44, String(e.amount), WHITE, 18);
          }
          this.fx.spawn('fx/spark', e.x + (Math.random() - 0.5) * 30, e.y - (e.who === 'monster' ? 60 : 24), { dur: 0.12, from: 0.3, to: big ? 1.2 : 0.8, alpha: 0.9, depth: e.y + 60 });
          break;
        }
        case 'hurt':
          if (e.who === 'hunter') {
            this.hunter.hit(this.clock);
            this.nums.show(h.x, h.y - 70, `-${e.amount}`, RED, 28);
            sfx.play('bigHit', 0.8, 0.7);
            this.shake(220, 0.012);
            hud?.struck();
          } else {
            const s = this.actors.get(`${e.who === 'ally' ? 'a' : 'b'}${e.id}`);
            if (s) s.flash = 0.12;
            s?.fig?.hit(this.clock);
            this.nums.show(e.x, e.y - 50, `-${e.amount}`, RED, 18);
          }
          break;
        case 'roll':
          sfx.play('lift', 0.5, 1.3);
          this.fx.spawn('fx/dust', e.x, e.y - 4, { dur: 0.3, from: 0.5, to: 1.2, alpha: 0.7, depth: e.y - 1 });
          break;
        case 'dodged':
          this.nums.show(e.x, e.y - 70, '-', WHITE, 16);
          this.fx.spawn('fx/sparkle', e.x, e.y - 40, { dur: 0.3, from: 0.5, to: 1.1, depth: e.y + 30 });
          break;
        case 'turned':
          sfx.play('blast', 0.7, 1.4);
          this.shake(200, 0.01);
          hud?.banner('', 'BLOCKED');
          break;
        case 'ability':
          sfx.play(e.id === 'heel' ? 'heal' : e.id === 'jawtrap' ? 'place' : 'skill', 0.7);
          if (ABILITY_MOVES[e.id]) this.hunter.play(ABILITY_MOVES[e.id], this.clock, 0.16, 0.3);
          // The ring's picture is 64 units from its middle to its rim.
          if (e.id === 'reap') this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.22, from: (e.r / 64) * 0.5, to: e.r / 64, alpha: 0.7, depth: 4 });
          if (e.id === 'flare') this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.35, from: 0.4, to: e.r / 64, tint: GOLD, alpha: 0.8, depth: 4 });
          break;
        case 'open':
          this.monster?.drop();
          if (e.why !== 'recover') {
            sfx.play('status', 0.7);
            hud?.banner('', e.why === 'crash' ? 'DAZED: ATTACK NOW' : e.why === 'held' ? 'HELD: ATTACK NOW' : e.why === 'bell' ? 'THE BELL STOPPED IT: ATTACK NOW' : 'BLINDED: ATTACK NOW');
          }
          break;
        case 'broken':
          sfx.play('blast', 0.9, 0.7);
          this.shake(420, 0.014);
          music.moment('break');
          hud?.banner('STUNNED', 'Double damage: attack now');
          this.monster?.drop();
          this.standIn?.hit(this.clock, h.x);
          break;
        case 'shift':
          sfx.play('spawn', 1, 0.5);
          this.shake(900, 0.012);
          music.play(huntOf(m.def.id), musicStep(e.part, w.cuts.length + 1));
          hud?.banner(m.def.name.toUpperCase(), `Phase ${e.part + 1}`);
          break;
        case 'dash':
          sfx.play('lift', 0.9, 0.6);
          break;
        case 'crash':
          sfx.play('blast', 1, 0.6);
          this.shake(380, 0.016);
          break;
        case 'summon':
          sfx.play('spawn', 0.5, 1.2);
          this.fx.spawn('fx/dust', e.x, e.y - 4, { dur: 0.4, from: 0.4, to: 1.2, alpha: 0.7, depth: e.y - 1 });
          break;
        case 'call':
          sfx.play('claim', 0.8);
          hud?.banner('', 'REINFORCEMENTS');
          break;
        case 'place':
          sfx.play('place', 0.8);
          this.fx.spawn('fx/dust', e.x, e.y, { dur: 0.3, from: 0.6, to: 1.4, alpha: 0.7, depth: e.y - 1 });
          break;
        case 'bell':
          sfx.play('levelUp', 0.9, 0.7);
          this.shake(200, 0.008);
          break;
        case 'blast':
          sfx.play('blast', 1);
          this.shake(300, 0.014);
          break;
        case 'alight':
          sfx.play('cast', 0.8, 0.7);
          break;
        case 'trap':
          sfx.play('trap', 0.9);
          this.fx.spawn('fx/spark', e.x, e.y - 10, { dur: 0.2, from: 0.5, to: 1.4, depth: e.y + 30 });
          break;
        case 'mend':
          sfx.play('heal', 0.6);
          this.nums.show(e.x, e.y - 70, `+${e.amount}`, 0x8fe07a, 22);
          break;
        case 'fall':
          if (e.who === 'helper' || e.who === 'ally') {
            sfx.play('death', 0.4, 1 + Math.random() * 0.2);
            this.fx.spawn('fx/dust', e.x, e.y - 10, { dur: 0.3, from: 0.4, to: 0.9, alpha: 0.7, depth: e.y + 2 });
          } else if (e.who === 'building') {
            sfx.play('thud', 0.8, 0.7);
            for (let i = 0; i < 5; i++) this.fx.spawn('fx/chip', e.x, e.y - 20, { dur: 0.5, vx: (Math.random() - 0.5) * 260, vy: -160 - Math.random() * 120, gravity: 700, spin: 8, depth: e.y + 20 });
          }
          break;
        case 'spared':
          hud?.banner('', 'YOUR TROPHY SAVED YOU');
          sfx.play('levelUp', 0.9);
          break;
        case 'enrage':
          hud?.banner('', 'THE BOSS IS ENRAGED');
          sfx.play('spawn', 1, 0.5);
          break;
        default:
          break;
      }
    }
  }

  // ------------------------------------------------------------ the lair as it stands

  private follow(): void {
    const w = this.hunt;
    const cam = this.cameras.main;
    // The view never leaves the lair. Where the window shows more than all of it, it sits in the middle.
    // It follows the hunter where they are drawn, which is between the rules' steps, so that the two move as one.
    const hx = this.ready ? this.hunter.x : w.hunter.x;
    const hy = this.ready ? this.hunter.y : w.hunter.y;
    const cx = view.w >= w.w ? w.w / 2 : Math.max(view.w / 2, Math.min(w.w - view.w / 2, hx));
    const cy = view.h >= w.h ? w.h / 2 : Math.max(view.h / 2, Math.min(w.h - view.h / 2, hy - 20));
    cam.centerOn(cx, cy);
  }

  /** How tall the monster stands on the field, for what floats over it. */
  private tall(): number {
    return this.monster?.height ?? this.standIn?.height ?? 120;
  }

  private take(frame: string): Phaser.GameObjects.Image {
    const img = this.spare.pop() ?? this.add.image(0, 0, SHEET, frame);
    return img.setTexture(SHEET, frame).setVisible(true).setAlpha(1).setRotation(0).setScale(1).setFlipX(false).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Writes down where everything that moves stands, before the hunt takes a step. */
  private remember(): void {
    const w = this.hunt;
    const b = this.before;
    b.clear();
    b.set('hunter', [w.hunter.x, w.hunter.y]);
    b.set('monster', [w.monster.x, w.monster.y]);
    for (const f of w.helpers) b.set(`h${f.id}`, [f.x, f.y]);
    for (const a of w.allies) b.set(`a${a.id}`, [a.x, a.y]);
    for (const s of w.shots) b.set(`x${s.id}`, [s.x, s.y]);
  }

  /** Where a thing is drawn this frame: between where it stood before the last step and where it stands now. */
  private at(key: string, x: number, y: number): [number, number] {
    const b = this.before.get(key);
    if (!b || this.halted) return [x, y];
    // Something that jumped (set on, thrown back) is shown where it is: a slide across the field would be a lie.
    if (Math.abs(x - b[0]) + Math.abs(y - b[1]) > 60) return [x, y];
    return [b[0] + (x - b[0]) * this.blend, b[1] + (y - b[1]) * this.blend];
  }

  /**
   * Shows one thing: a figure of the style where the kit has drawn it, or a
   * stand-in's still picture as a dark shape. Made the first time it is
   * seen, and kept while it lasts.
   */
  private show(key: string, art: Art, x: number, y: number, face: number, walking: boolean): Actor {
    let s = this.actors.get(key);
    if (!s) {
      s = { fig: null, img: null, stamp: 0, flash: 0, born: this.clock };
      if (isGrim(art)) s.fig = new GrimFigure(this, art.grim, getGrim().units[art.grim], getGrim().poses, GRIM_SCALE, key.length * 7 + this.actors.size);
      else s.img = this.take(Sheet.stillFrame(art.team, art.legion, 'a'));
      this.actors.set(key, s);
    }
    s.stamp = this.stamp;
    const age = this.clock - s.born;
    const grow = age < 0.18 ? 0.4 + (age / 0.18) * 0.6 : 1;
    if (s.flash > 0) s.flash -= 1 / 60;
    if (s.fig) {
      const f = s.fig;
      f.x = x;
      f.y = y;
      f.facing = face < 0 ? -1 : 1;
      f.moving = walking && !this.halted;
      f.scale = GRIM_SCALE * grow;
      f.tint = s.flash > 0 ? 0xffd0c0 : 0xffffff;
      f.alpha = 1;
      return s;
    }
    const img = s.img as Phaser.GameObjects.Image;
    if (!isGrim(art)) {
      const stride = walking && !this.halted && Math.floor((this.clock + key.length * 0.37) * 7) % 2 === 1;
      img.setFrame(Sheet.stillFrame(art.team, art.legion, stride ? 'b' : 'a'));
      img.setPosition(x, y).setScale((art.scale * grow) / STILL_SCALE).setFlipX(face < 0).setDepth(y);
      // A stand-in is a dark shape and nothing more: struck, it is pale for a moment.
      img.setTint(s.flash > 0 ? 0x8a8f94 : STAND_IN).setTintMode(Phaser.TintModes.FILL);
    }
    return s;
  }

  private sync(dt: number): void {
    const w = this.hunt;
    const h = w.hunter;
    const m = w.monster;
    this.stamp++;
    const stamp = this.stamp;

    // The hunter.
    const fig = this.hunter;
    [fig.x, fig.y] = this.at('hunter', h.x, h.y);
    fig.facing = h.roll > 0 ? (h.rx >= 0 ? 1 : -1) : w.phase === 'camp' ? h.face : Math.cos(h.aim) >= 0 ? 1 : -1;
    fig.moving = h.moving && !this.halted && h.roll <= 0;
    fig.pace = h.def.speed / 160;
    fig.hold(h.bracing > 0 ? 'brace' : null);
    // Rolling, they are low and half seen; struck, they flicker for the moment nothing can hurt them.
    fig.alpha = h.roll > 0 ? 0.6 : h.grace > 0 && Math.floor(this.clock * 20) % 2 === 0 ? 0.6 : 1;
    fig.update(this.clock, dt);
    if (h.roll > 0) fig.root.scaleY *= 0.62;

    // The monster.
    const [mx, my] = this.at('monster', m.x, m.y);
    const shudder = m.state === 'shift' ? Math.sin(this.clock * 60) * 3 : 0;
    if (this.monster) {
      const mf = this.monster;
      mf.x = mx + shudder;
      mf.y = my;
      mf.facing = m.face;
      mf.moving = m.moving && !this.halted;
      mf.pace = m.state === 'dash' ? 2.4 : 0.55;
      // Broken, dazed or held, it sags: its own still for that.
      mf.hold(m.state === 'broken' || m.state === 'dazed' || m.state === 'held' ? 'stagger' : null);
      mf.tint = m.state === 'shift' ? 0xff8a7a : 0xffffff;
      mf.update(this.clock, dt);
    } else if (this.standIn) {
      const mf = this.standIn;
      mf.x = mx + shudder + (m.state === 'broken' || m.state === 'dazed' ? Math.sin(this.clock * 9) * 1.5 : 0);
      mf.y = my;
      mf.facing = m.face;
      mf.moving = m.moving && !this.halted;
      mf.update(this.clock, dt);
      // A stand-in: its shape in the dark, redder as it changes, paler when it is broken.
      const tint = m.state === 'shift' ? 0x6a2a24 : m.state === 'broken' ? 0x4a4a40 : STAND_IN;
      for (const part of mf.root.list) (part as Phaser.GameObjects.Image).setTint(tint).setTintMode(Phaser.TintModes.FILL);
    }

    // Those the monster calls up.
    for (const f of w.helpers) {
      const [x, y] = this.at(`h${f.id}`, f.x, f.y);
      const s = this.show(`h${f.id}`, HELPER_ART[f.def.id], x + (f.held > 0 ? Math.sin(this.clock * 40) * 1.5 : 0), y, f.face, f.moving);
      if (s.fig) s.fig.pace = 0.6;
    }
    // Those who fight beside the hunter. A hound that is down lies still.
    for (const a of w.allies) {
      const [x, y] = this.at(`a${a.id}`, a.x, a.y);
      const s = this.show(`a${a.id}`, ALLY_ART[a.group] ?? ALLY_ART.pikemen, x, y, a.face, a.moving);
      if (s.fig) {
        s.fig.pace = a.group === 'hound' ? 1.6 : 1;
        s.fig.hold(a.state === 'down' ? 'fall' : null);
        s.fig.alpha = a.state === 'down' ? 0.7 : 1;
      } else if (s.img && a.state === 'down') s.img.setRotation(a.face * 1.3).setAlpha(0.7);
    }
    for (const b of w.buildings) {
      const s = this.show(`b${b.id}`, BUILDING_ART[b.def.id], b.x, b.y + 12, 1, false);
      // A bell that has been rung hangs dull until it can be rung again.
      if (s.img && b.def.kind === 'bell' && b.cool > 0 && s.flash <= 0) s.img.setTint(0x0e1418);
    }
    w.stones.forEach((st, i) => this.show(`s${i}`, STONE_ART, st.x, st.y + 16, 1, false));
    // The lamp Agnes stands on the ground, in the middle of its light.
    for (const d of w.wards) this.show(`w${d.id}`, LAMP_ART, d.x, d.y + 6, 1, false);
    for (const t of w.traps) {
      const s = this.show(`t${t.id}`, TRAP_ART, t.x, t.y + 6, 1, false);
      s.img?.setDepth(3).setAlpha(t.arm > 0 ? 0.5 : 1);
    }
    for (const s of w.shots) {
      const v = this.actors.get(`x${s.id}`) ?? { fig: null, img: this.take('fx/bolt'), stamp: 0, flash: 0, born: this.clock };
      this.actors.set(`x${s.id}`, v);
      v.stamp = stamp;
      const [x, y] = this.at(`x${s.id}`, s.x, s.y);
      v.img?.setPosition(x, y - 18).setRotation(Math.atan2(s.vy, s.vx)).setScale((s.from === 'ballista' ? 1.5 : 0.9) * INV_ART).setDepth(s.y + 40);
    }
    for (const [key, s] of this.actors) {
      if (s.stamp === stamp) {
        s.fig?.update(this.clock, dt);
        continue;
      }
      if (s.img) {
        s.img.setVisible(false);
        this.spare.push(s.img);
      }
      s.fig?.destroy();
      this.actors.delete(key);
    }

    // Tar on the ground: lit with the ground, since it is part of it.
    const g = this.ground;
    g.clear();
    for (const p of w.pools) {
      const a = Math.min(0.8, p.life * 0.5);
      g.fillStyle(p.burning > 0 ? 0x5a2410 : 0x1c1612, a).fillCircle(p.x, p.y, p.r);
      g.lineStyle(3, p.burning > 0 ? 0xff8a3c : 0x0c0a08, a).strokeCircle(p.x, p.y, p.r);
    }

    this.drawMarks();

    this.follow();
    this.light.update(dt, this.clock, this.halted);
  }

  /** Everything that is drawn over the dark: what is about to land, where it is safe to build, when the monster is open. */
  private drawMarks(): void {
    const w = this.hunt;
    const h = w.hunter;
    const m = w.monster;
    const g = this.marks;
    g.clear();

    if (w.phase === 'camp') {
      // How near it nothing can be built, and how near it wakes.
      g.lineStyle(2, GOLD, 0.35).strokeCircle(m.x, m.y, CAMP.clear);
      g.lineStyle(3, RED, 0.5 + 0.2 * Math.sin(this.clock * 4)).strokeCircle(m.x, m.y, CAMP.wakeAt);
      // Where a building would go if it were set down now.
      const left = BUILDINGS.find((b) => w.toPlace[b.id] > 0);
      if (left) {
        const ok = w.whyNot(left.id) === '';
        g.lineStyle(3, ok ? 0x9be07a : RED, 0.9).strokeCircle(h.x + Math.cos(h.aim) * 46, h.y + Math.sin(h.aim) * 46, left.r);
      }
    }

    // A ward on the ground.
    for (const d of w.wards) {
      const a = Math.min(1, d.life);
      g.fillStyle(GOLD, 0.1 * a).fillCircle(d.x, d.y, d.r);
      g.lineStyle(3, GOLD, 0.8 * a).strokeCircle(d.x, d.y, d.r);
    }
    // A watchfire's reach, faintly: where blows come faster.
    for (const b of w.buildings) {
      if (b.def.kind === 'fire') g.lineStyle(2, 0xff9a4a, 0.22).strokeCircle(b.x, b.y, b.def.reach);
      if (b.def.kind === 'bell' && b.cool <= 0) g.lineStyle(2, GOLD, 0.3 + 0.2 * Math.sin(this.clock * 5)).strokeCircle(b.x, b.y, b.def.reach);
      if (b.hp < b.maxHp) {
        g.fillStyle(hex(OUTLINE), 0.9).fillRect(b.x - 22, b.y - 62, 44, 7);
        g.fillStyle(0x7ac0ff, 1).fillRect(b.x - 20, b.y - 60, 40 * (b.hp / b.maxHp), 3);
      }
    }
    for (const a of w.allies) {
      if (a.hp >= a.maxHp || a.state === 'down') continue;
      g.fillStyle(hex(OUTLINE), 0.9).fillRect(a.x - 16, a.y - 64, 32, 6);
      g.fillStyle(0x7ac0ff, 1).fillRect(a.x - 14, a.y - 62, 28 * (a.hp / a.maxHp), 2);
    }

    // Open: a gold ring round it says so. Broken: a wide one that beats.
    if (w.open && m.state !== 'dead') {
      const broken = m.state === 'broken';
      g.lineStyle(broken ? 7 : 4, GOLD, broken ? 0.7 + 0.3 * Math.sin(this.clock * 12) : 0.75).strokeCircle(m.x, m.y, m.def.r + 22 + (broken ? 6 * Math.sin(this.clock * 12) : 0));
    }

    // What is about to land. The pale shape is all of it; the bright one fills it as its time runs out.
    for (const t of w.tells) this.drawTell(g, t);
    // The line it is running down.
    const run = w.running;
    if (run) {
      this.strip(g, m.x, m.y, run.angle, run.left + 30, m.def.r * 2, RED, 0.3);
    }

    // The hunter's own: braced, a bright arc before them; their health over their head once it is not full.
    if (h.bracing > 0) g.lineStyle(6, WHITE, 0.9).beginPath().arc(h.x, h.y - 26, 40, h.aim - 1, h.aim + 1).strokePath();
    if (h.hp < h.maxHp && h.hp > 0) {
      g.fillStyle(hex(OUTLINE), 0.9).fillRect(h.x - 24, h.y + 8, 48, 8);
      g.fillStyle(hex(RUBY.fill), 1).fillRect(h.x - 22, h.y + 10, 44 * (h.hp / h.maxHp), 4);
    }
    if (h.root > 0) g.lineStyle(4, 0x9be07a, 0.9).strokeCircle(h.x, h.y, 22);
  }

  private strip(g: Phaser.GameObjects.Graphics, x: number, y: number, angle: number, len: number, wide: number, color: number, alpha: number): void {
    const cx = Math.cos(angle);
    const cy = Math.sin(angle);
    const nx = -cy * (wide / 2);
    const ny = cx * (wide / 2);
    g.fillStyle(color, alpha).beginPath();
    g.moveTo(x + nx, y + ny);
    g.lineTo(x + cx * len + nx, y + cy * len + ny);
    g.lineTo(x + cx * len - nx, y + cy * len - ny);
    g.lineTo(x - nx, y - ny);
    g.closePath().fillPath();
  }

  /** A band between two circles, as one shape: out along the outer rim and back along the inner. */
  private band(g: Phaser.GameObjects.Graphics, x: number, y: number, inner: number, outer: number, color: number, alpha: number): void {
    const n = 40;
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= n; i++) pts.push(new Phaser.Math.Vector2(x + Math.cos((i / n) * Math.PI * 2) * outer, y + Math.sin((i / n) * Math.PI * 2) * outer));
    for (let i = n; i >= 0; i--) pts.push(new Phaser.Math.Vector2(x + Math.cos((i / n) * Math.PI * 2) * inner, y + Math.sin((i / n) * Math.PI * 2) * inner));
    g.fillStyle(color, alpha).fillPoints(pts, true);
  }

  private drawTell(g: Phaser.GameObjects.Graphics, t: Tell): void {
    const k = Math.max(0, Math.min(1, 1 - t.left / t.of));
    const color = t.foe ? RED : GOLD;
    // In its last moments it flickers: now.
    const last = t.left < 0.18 ? 0.25 : 0;
    if (t.kind === 'ring') {
      if (t.inner > 0) {
        // A ring with a safe middle: a band, filling outward from its inner rim.
        this.band(g, t.x, t.y, t.inner, t.r, color, 0.14 + last);
        if (k > 0.03) this.band(g, t.x, t.y, t.inner, t.inner + (t.r - t.inner) * k, color, 0.26);
        g.lineStyle(3, color, 0.9).strokeCircle(t.x, t.y, t.r).strokeCircle(t.x, t.y, t.inner);
        return;
      }
      g.fillStyle(color, 0.14 + last).fillCircle(t.x, t.y, t.r);
      if (t.r * k > 2) g.fillStyle(color, 0.28).fillCircle(t.x, t.y, t.r * k);
      g.lineStyle(3, color, 0.9).strokeCircle(t.x, t.y, t.r);
      return;
    }
    if (t.kind === 'cone') {
      g.fillStyle(color, 0.14 + last).slice(t.x, t.y, t.r, t.angle - t.half, t.angle + t.half, false).fillPath();
      // A wedge of no size is not drawn at all: the arc of one cannot be worked out.
      if (t.r * k > 4) g.fillStyle(color, 0.28).slice(t.x, t.y, t.r * k, t.angle - t.half, t.angle + t.half, false).fillPath();
      g.lineStyle(3, color, 0.9).slice(t.x, t.y, t.r, t.angle - t.half, t.angle + t.half, false).strokePath();
      return;
    }
    this.strip(g, t.x, t.y, t.angle, t.len, t.w, color, 0.14 + last);
    if (k > 0.01) this.strip(g, t.x, t.y, t.angle, t.len * k, t.w, color, 0.28);
    const cx = Math.cos(t.angle);
    const cy = Math.sin(t.angle);
    const nx = -cy * (t.w / 2);
    const ny = cx * (t.w / 2);
    g.lineStyle(3, color, 0.9).beginPath();
    g.moveTo(t.x + nx, t.y + ny);
    g.lineTo(t.x + cx * t.len + nx, t.y + cy * t.len + ny);
    g.lineTo(t.x + cx * t.len - nx, t.y + cy * t.len - ny);
    g.lineTo(t.x - nx, t.y - ny);
    g.closePath().strokePath();
  }
}

/** The step of a boss's piece for a part of its health: a hunt of three parts plays all three, a shorter one ends on the last. */
function musicStep(part: number, parts: number): number {
  return parts <= 1 ? 0 : Math.round((part * 2) / (parts - 1));
}
