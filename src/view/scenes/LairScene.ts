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
import { BUILDINGS, CAMP, REVIVE } from '../../game/content';
import { STEP, type Ev, type Hunt, type Steer, type Tell } from '../../game/hunt';
import { Talk } from '../../game/talk';
import { ads } from '../../platform/ads';
import { ASSETS, getManifest } from '../app';
import { ART_SCALE, hex, view } from '../config';
import { Effects } from '../Effects';
import { LairLight } from '../light/LairLight';
import type { LightMode } from '../light/setting';
import { Numbers } from '../Numbers';
import { drawTell as drawMarkedTell } from '../vfx/Tells';
import { Vfx } from '../vfx/Vfx';
import {
  ABILITY_MOVES, ALLY_ART, BLOW_MOVES, BUILDING_ART, FIELD_THINGS, FIELD_THING_R, HELPER_ALPHA, GRIM_SCALE, HUNTER_SCALE, HELPER_ART, HUNTER_ART, LAIR_GROUND, LAMP_ART, MONSTER_ART, MONSTER_MOVES, STAND_IN, STONE_ART, TRAP_ART, VILLAGERS, isGrim, type Art,
} from '../pictures';
import { Figure } from '../art/Figure';
import { GrimFigure } from '../art/GrimFigure';
import { getGrim, thingFrame, wantedThing, wantedUnit } from '../art/grim';
import { SHEET, Sheet, sheet, type UnitKey } from '../art/Sheet';
import { STILL_SCALE } from '../art/scale';
import { beginHunt, finishHunt, save, theHunt } from '../session';
import type { HudScene } from './HudScene';
import { Controls, DRAG_FAR, DRAG_MIN, type Target } from '../input';

const INV_ART = 1 / ART_SCALE;
/** What each prop of a lair leaves when it is broken, as the kit names it. */
const LEFT_BROKEN = new Map<string, string>([['eggsac', 'eggsac-burst'], ['barrel', 'barrel-broken'], ['mirror', 'mirror-stand-broken']]);
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

/** The winter wood the Antlered King is hunted in, dressed the same way. */
const WOOD: Array<[string, number, number, number, 'far' | 'back' | 'field' | 'near']> = [
  ['far-trees', 0.25, 0.05, 1.4, 'far'], ['far-trees', 0.75, 0.05, 1.4, 'far'],
  ['hunting-wall', 0.15, 0.09, 1, 'back'], ['hunting-wall', 0.85, 0.09, 1, 'back'],
  ['fallen-tree', 0.5, 0.11, 1, 'back'],
  ['hanging-charm', 0.06, 0.24, 0.9, 'field'], ['hanging-charm', 0.95, 0.3, 0.9, 'field'],
  ['standing-stone', 0.03, 0.42, 0.9, 'field'], ['standing-stone-low', 0.97, 0.5, 0.9, 'field'], ['standing-stone', 0.96, 0.9, 0.9, 'field'], ['standing-stone-low', 0.05, 0.92, 0.9, 'field'],
  ['trunk-flat', 0.04, 1.04, 1.3, 'near'], ['trunk-flat', 0.95, 1.05, 1.3, 'near'],
];
/** The rotten cellar under Harrow, where the Spinner hangs: vaults far off, cask racks, pillars, broken casks. */
const CELLAR: typeof CHURCHYARD = [
  ['far-vaults', 0.3, 0.045, 1.4, 'far'], ['far-vaults', 0.72, 0.045, 1.4, 'far'],
  ['cask-rack', 0.14, 0.09, 1, 'back'], ['cask-rack', 0.86, 0.09, 1, 'back'],
  ['cellar-pillar', 0.04, 0.3, 0.95, 'field'], ['cellar-pillar', 0.96, 0.34, 0.95, 'field'], ['cellar-pillar', 0.05, 0.78, 0.95, 'field'], ['cellar-pillar', 0.95, 0.8, 0.95, 'field'],
  ['broken-casks', 0.035, 0.55, 0.9, 'field'], ['broken-casks', 0.965, 0.58, 0.9, 'field'], ['broken-casks', 0.14, 0.95, 0.9, 'field'],
  ['cellar-flat', 0.08, 1.04, 1.3, 'near'], ['cellar-flat', 0.93, 1.05, 1.3, 'near'],
];

/** The drowned abbey of Saint Wenna, where the Bell Abbot rings: its far arches, fallen columns, pews and the font. */
const ABBEY: typeof CHURCHYARD = [
  ['far-abbey', 0.5, 0.045, 1.5, 'far'],
  ['fallen-column', 0.18, 0.1, 1, 'back'], ['fallen-column', 0.82, 0.1, 1, 'back'],
  ['pew', 0.04, 0.32, 0.9, 'field'], ['pew', 0.96, 0.3, 0.9, 'field'], ['pew', 0.035, 0.6, 0.9, 'field'], ['pew', 0.965, 0.64, 0.9, 'field'],
  ['font', 0.05, 0.9, 0.9, 'field'], ['font', 0.94, 0.92, 0.9, 'field'],
  ['abbey-flat', 0.08, 1.04, 1.3, 'near'], ['abbey-flat', 0.93, 1.05, 1.3, 'near'],
];

/** The old foundry at Black Pit, where the Furnace burns: its far chimneys, hoists, mould racks and heaps of coal. */
const FOUNDRY: typeof CHURCHYARD = [
  ['far-foundry', 0.3, 0.045, 1.4, 'far'], ['far-foundry', 0.74, 0.045, 1.4, 'far'],
  ['hoist', 0.12, 0.1, 1, 'back'], ['mould-rack', 0.5, 0.09, 1, 'back'], ['hoist', 0.88, 0.1, 1, 'back'],
  ['coal-heap', 0.04, 0.4, 0.9, 'field'], ['coal-heap', 0.96, 0.44, 0.9, 'field'], ['mould-rack', 0.04, 0.78, 0.9, 'field'],
  ['poured-iron', 0.95, 0.8, 0.9, 'field'],
  ['foundry-flat', 0.08, 1.04, 1.3, 'near'], ['foundry-flat', 0.93, 1.05, 1.3, 'near'],
];

/** The mirror maker's hall, where the Mirror King is not where he seems: far pillars, benches, crates of panes. */
const HALL: typeof CHURCHYARD = [
  ['far-hall', 0.5, 0.045, 1.5, 'far'],
  ['hall-pillar', 0.1, 0.1, 1, 'back'], ['hall-pillar', 0.36, 0.09, 1, 'back'], ['hall-pillar', 0.64, 0.09, 1, 'back'], ['hall-pillar', 0.9, 0.1, 1, 'back'],
  ['bench', 0.04, 0.36, 0.9, 'field'], ['bench', 0.96, 0.4, 0.9, 'field'],
  ['pane-crate', 0.04, 0.72, 0.9, 'field'], ['pane-crate', 0.96, 0.76, 0.9, 'field'],
  ['hall-flat', 0.08, 1.04, 1.3, 'near'], ['hall-flat', 0.93, 1.05, 1.3, 'near'],
];

const DRESSING: Record<string, typeof CHURCHYARD> = { churchyard: CHURCHYARD, wood: WOOD, cellar: CELLAR, abbey: ABBEY, foundry: FOUNDRY, hall: HALL };
/** What a crow will sit on. */
const PERCHED = new Set(['wall', 'lych-gate', 'dead-tree', 'hunting-wall', 'fallen-tree', 'standing-stone', 'fallen-column', 'hoist', 'cask-rack']);

export class LairScene extends Phaser.Scene {
  private hunt!: Hunt;
  private hunter!: GrimFigure;
  /**
   * The player's hunter again, as a bright shape drawn over everything, shown only while something stands in front
   * of them: in a game of reading where to step, the player must never lose where they are.
   */
  private echo!: GrimFigure;
  /** How much of the echo shows: it comes up and goes down over a moment, never at once. */
  private echoK = 0;
  /** The monster: a figure of the style, or a stand-in moved part by part. */
  private monster: GrimFigure | null = null;
  private standIn: Figure | null = null;
  /** The props of a lair where they stand, what is left of those broken, and the pictures lying on the field for both. */
  private readonly props = new Map<number, { id: string; x: number; y: number }>();
  private readonly broken = new Map<string, { thing: string; x: number; y: number }>();
  /** Figures that stand where they were broken, in the kit's still for it: a grave marker, a totem, the cart. */
  private readonly wrecks = new Map<string, { art: Art; x: number; y: number }>();
  /** The buildings as they stood last frame, so that one destroyed can be left lying where it was. */
  private readonly built = new Map<number, { id: string; x: number; y: number }>();
  /** When the cart last turned its wheels over, and where it was then: it rolls only while it goes. */
  private cartRoll = { at: -9, x: 0, y: 0, face: 1 as 1 | -1 };
  private readonly lying = new Map<string, Phaser.GameObjects.Image>();
  private fx!: Effects;
  private nums!: Numbers;
  private light!: LairLight;
  /** What flies off a blow, what it leaves on the ground, how the screen takes it, and the lair breathing (vfx/). */
  private vfx: Vfx | null = null;
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
  private halo!: Phaser.GameObjects.Image;
  /** What the hunter and the boss say: spice, never a rule. The HUD shows its line. */
  talk!: Talk;
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
  /** The warnings shown, by their number, so that a blow that lands can be drawn along the shape it was told in. */
  private told = new Map<number, Tell>();

  constructor() {
    super('Lair');
  }

  /** `keep` stands the lair up again round the hunt already going on: the window changed shape. `over` is the screen that was open over it then. */
  create(data: { keep?: boolean; over?: string } = {}): void {
    const kept = data.keep ? theHunt() : null;
    this.hunt = kept ?? theHunt() ?? beginHunt(view.tall);
    this.overlay = data.over ?? '';
    this.resumed = !!kept;
    // Its own dice, never the hunt's: a line said or not changes nothing that happens.
    this.talk = new Talk(save().hunts * 7919 + 17, this.hunt.hunter.def.id, this.hunt.monster.def.id, save().talk !== false);
    this.actors.clear();
    this.before.clear();
    this.props.clear();
    this.broken.clear();
    this.wrecks.clear();
    this.cartRoll = { at: -9, x: 0, y: 0, face: 1 };
    this.built.clear();
    this.lying.clear();
    this.monster = null;
    this.standIn = null;
    this.vfx = null;
    this.spare = [];
    this.acc = 0;
    this.clock = 0;
    this.ready = false;
    this.ended = false;
    this.halted = false;
    this.slowLeft = 0;
    this.stopLeft = 0;
    this.holdNext = false;
    this.told.clear();

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
    // Marta's figure always: it stands for the player's own hunter while theirs is not drawn yet.
    const arts: Art[] = [...VILLAGERS, HUNTER_ART.marta, ...h.party.map((p) => HUNTER_ART[p.def.id] ?? HUNTER_ART.marta), MONSTER_ART[h.monster.def.id], ...Object.values(HELPER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART), STONE_ART, TRAP_ART, LAMP_ART];
    const grim = [...new Set(arts.flatMap((a) => (isGrim(a) ? [a.grim] : [])))].map(wantedUnit);
    const dressing = DRESSING[h.monster.def.lair] ?? [];
    // What the later lairs and hunters leave on the field, and what their props leave when broken: few and small, so always.
    const things = [...new Set([...('grim' in lair ? dressing.map((c) => c[0]) : []), ...Object.values(FIELD_THINGS), ...LEFT_BROKEN.values()])].map(wantedThing);
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
    // Where crows sit: the tops of walls, the gate and the trees.
    const perches: Array<[number, number]> = [];
    if (dressed) {
      // The lair as a stage set, in layers: far off, the back wall, what stands on the field's rim, and black flats in front.
      for (const [id, fx, fy, scale, layer] of DRESSING[h.monster.def.lair] ?? []) {
        const img = this.add.image(fx * h.w, fy * h.h, SHEET, thingFrame(id)).setScale(scale);
        if (layer === 'far') img.setDepth(-90).setScrollFactor(0.86, 0.9).setAlpha(0.9);
        else if (layer === 'back') img.setDepth(-80);
        else if (layer === 'near') img.setDepth(9000).setScrollFactor(1.12, 1.06);
        else img.setDepth(fy * h.h);
        if (id === 'torch-post') torches.push([fx * h.w, fy * h.h - 150 * scale]);
        if (PERCHED.has(id) && layer !== 'far' && layer !== 'near') {
          const top = img.y - img.displayHeight * img.originY;
          for (const at of [-0.25, 0.2]) if (Math.random() < 0.6) perches.push([img.x + at * img.displayWidth, top + img.displayHeight * (id === 'dead-tree' ? 0.25 : 0.04)]);
        }
        // Every other piece faces the other way, so that two of a kind are not twins.
        if (fx > 0.5 && id !== 'far-church' && id !== 'lych-gate') img.setFlipX(true);
      }
    }
    this.ground = this.add.graphics().setDepth(1);
    const hp = HUNTER_ART[h.hunter.def.id];
    // The player's own hunter is drawn a little bigger than the rest, and carries a warm light of their own, so that they
    // are found at a glance beside a boss four times their height.
    this.hunter = new GrimFigure(this, isGrim(hp) ? hp.grim : 'marta', g.units[isGrim(hp) ? hp.grim : 'marta'], g.poses, HUNTER_SCALE, 1);
    this.echo = new GrimFigure(this, isGrim(hp) ? hp.grim : 'marta', g.units[isGrim(hp) ? hp.grim : 'marta'], g.poses, HUNTER_SCALE, 1);
    this.echo.tint = 0xffe2a0;
    this.echo.fill = true;
    this.halo = this.add.image(0, 0, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb060).setAlpha(0.55);
    const mp = MONSTER_ART[h.monster.def.id];
    if (isGrim(mp)) {
      this.monster = new GrimFigure(this, mp.grim, g.units[mp.grim], g.poses, GRIM_SCALE, 2);
      this.monster.big = true;
    }
    else this.standIn = new Figure(this, mp.legion, mp.team, getManifest().units[mp.legion], mp.scale, 'unit', 2);
    this.light = new LairLight(this, h, torches);
    this.marks = this.light.crisp(this.add.graphics().setDepth(2));
    this.light.crisp(this.echo.root);
    this.vfx = new Vfx({
      scene: this, hunt: h, light: this.light, perches,
      hunter: () => this.hunter, monster: () => this.monster, tall: () => this.tall(),
      stop: (s) => this.stop(s), slow: (s, by) => this.slow(s, by),
    });
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
      const steer: Steer = LairScene.pilot ? LairScene.pilot.steer(this.hunt) : this.steered(hud?.controls ?? null);
      // What was asked for is asked once, and the first step of the hunt after that takes it, aimed where it was aimed.
      const places = BUILDINGS.filter((b) => b.id in this.hunt.toPlace).map((b) => b.id);
      for (const { ask, at } of hud?.controls?.take() ?? []) {
        if (ask === 'dodge') {
          steer.dodge = true;
          const t = this.targetOf(at, 'dodge');
          if (t) steer.toward = Math.atan2(t.y - this.hunt.hunter.y, t.x - this.hunt.hunter.x);
          // Dragged from the dodge, it goes that way even while walking.
          if (at?.kind === 'drag' && t) [steer.x, steer.y] = [Math.cos(steer.toward as number), Math.sin(steer.toward as number)];
        } else if (ask === 'a' || ask === 'b') {
          steer[ask] = true;
          const t = this.targetOf(at, ask === 'a' ? 0 : 1);
          if (t) steer.at = t;
        } else if (ask === 'wake') steer.wake = true;
        else if (ask.startsWith('call')) steer.call = Number(ask.slice(4));
        else if (ask.startsWith('place')) {
          // A number picks its card. Pressed again with no pointer on the field, it is set down where the hunter faces.
          const id = places[Number(ask.slice(5))];
          const c = hud?.controls;
          if (!id || !hud || !c) continue;
          if (c.picking === id && !(c.scheme === 'mouse' && c.mouse)) steer.place = id;
          else hud.pickCard(id);
        }
      }
      // A press on the ground in camp: the picked card set down there, or a building there picked up.
      for (const spot of hud?.controls?.takeSpots() ?? []) {
        if (this.hunt.phase !== 'camp') break;
        const p = this.cameras.main.getWorldPoint(spot.x, spot.y);
        const id = hud?.controls?.picking;
        if (spot.kind === 'place' && id) {
          const why = this.hunt.whyNotAt(id, p.x, p.y);
          if (why) {
            sfx.play('deny', 0.6);
            hud?.banner('', why.toUpperCase());
          } else steer.placeAt = { id, x: p.x, y: p.y };
        } else if (spot.kind === 'lift') {
          const b = this.hunt.buildings.find((x) => x.def.id in this.hunt.toPlace && Math.hypot(x.x - p.x, x.y - p.y) < x.def.r + 18);
          if (b) steer.lift = b.id;
        }
      }
      let steps = 0;
      while (this.acc >= STEP && steps++ < 6) {
        this.remember();
        this.hunt.step(steps === 1 ? steer : { x: steer.x, y: steer.y, attack: steer.attack, aim: steer.aim, auto: steer.auto });
        this.acc -= STEP;
      }
      // A frame that took far too long is not caught up on: the hunt would lurch.
      if (steps >= 6) this.acc = 0;
      // The rules go in fixed steps and the screen does not: each thing is drawn as far from where it stood to where
      // it stands as this frame is into the next step, so that what moves, moves evenly whatever the screen's rate.
      this.blend = Math.min(1, this.acc / STEP);
      this.react(this.hunt.drain());
      this.talk.step(dt);
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
    } else {
      this.hunter.die(this.clock);
      this.echo.die(this.clock);
    }
    this.shake(320, 0.01);
    // The fall is watched before anything is said of it.
    this.time.delayedCall(won ? 1700 : 1300, () => {
      this.halted = true;
      this.scene.stop('Hud');
      this.scene.launch('Result');
    });
  }

  // ------------------------------------------------------------ what has happened

  /**
   * The steering of this frame, by the way of playing in use. With a mouse, blows go where it points. On a touch
   * screen, ATTACK dragged strikes the way it is dragged, and tapped finds its own mark (the rules choose it).
   */
  private steered(c: Controls | null): Steer {
    if (!c) return { x: 0, y: 0 };
    const steer: Steer = { ...c.steer, attack: c.attacking };
    if (c.scheme === 'mouse') steer.aim = this.aimed();
    else {
      const d = c.attackDrag;
      if (d && Controls.dragged(d) >= DRAG_MIN) steer.aim = Math.atan2(d.y - d.y0, d.x - d.x0);
      else steer.auto = true;
    }
    return steer;
  }

  /**
   * Where a mouse points, as the angle from the hunter, for the next blow to go: none on a touch screen or with no
   * mouse on the field.
   */
  private aimed(): number | undefined {
    const hud = this.scene.get('Hud') as HudScene | undefined;
    const c = hud?.controls;
    if (!c || c.scheme !== 'mouse' || !c.mouse || !this.ready) return undefined;
    const at = this.cameras.main.getWorldPoint(c.mouse.x, c.mouse.y);
    return Math.atan2(at.y - this.hunt.hunter.y, at.x - this.hunt.hunter.x);
  }

  /**
   * Where on the field a skill or a dodge was aimed: the point under the mouse, or as far from the hunter, the way the
   * thumb was dragged, as the drag is of its longest (the skill's own reach, or the dodge's length).
   */
  private targetOf(at: Target | undefined, what: 0 | 1 | 'dodge'): { x: number; y: number } | null {
    if (!at) return null;
    const h = this.hunt.hunter;
    if (at.kind === 'screen') {
      const p = this.cameras.main.getWorldPoint(at.x, at.y);
      return { x: p.x, y: p.y };
    }
    const len = Math.hypot(at.dx, at.dy) || 1;
    const far = what === 'dodge' ? h.def.dodge.dist : (h.abilities[what].range ?? h.abilities[what].r ?? 100);
    const k = Math.min(1, len / DRAG_FAR) * far;
    return { x: h.x + (at.dx / len) * k, y: h.y + (at.dy / len) * k };
  }

  /**
   * Where the card picked up in camp would stand, and whether it may: under the mouse, or where a finger last was on
   * the ground, or a step in front of the hunter when neither is known.
   */
  private ghostAt(): { id: string; x: number; y: number; ok: boolean } | null {
    const w = this.hunt;
    const c = (this.scene.get('Hud') as HudScene | undefined)?.controls;
    const id = c?.picking;
    if (!c || !id || w.phase !== 'camp' || !w.toPlace[id]) return null;
    const at = c.scheme === 'mouse' ? c.mouse : c.ground;
    const h = w.hunter;
    const p = at ? this.cameras.main.getWorldPoint(at.x, at.y) : { x: h.x + Math.cos(h.aim) * 46, y: h.y + Math.sin(h.aim) * 46 };
    return { id, x: p.x, y: p.y, ok: w.whyNotAt(id, p.x, p.y) === '' };
  }

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
    // The effects shake the view and the tells' camera with it, so that a tell never slides off its ground.
    if (this.vfx) this.vfx.rumble(ms, by);
    else this.cameras.main.shake(ms, by);
  }

  private react(events: Ev[]): void {
    const w = this.hunt;
    const h = w.hunter;
    const m = w.monster;
    this.light.react(events);
    this.vfx?.react(events);
    this.talk.hear(events, this.hunt);
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
          hud?.banner(m.def.name.toUpperCase(), 'The boss is awake', true);
          break;
        case 'lesson':
          this.holdNext = e.hold;
          break;
        case 'tell': {
          const t = w.tells.find((x) => x.id === e.id);
          if (t) this.told.set(t.id, { ...t });
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
            // The blow is drawn along the shape it was told in: a smear down a line, a sweep across a cone.
            const t = this.told.get(e.id);
            this.told.delete(e.id);
            if (t && t.by === 0 && t.kind === 'line') {
              for (let i = 1; i <= 3; i++) {
                const k = i / 4;
                this.fx.spawn('fx/slash', t.x + Math.cos(t.angle) * t.len * k, t.y + Math.sin(t.angle) * t.len * k, {
                  dur: 0.22, from: (t.w / 60) * 0.8, to: (t.w / 60) * 1.4, rotation: t.angle, alpha: 0.75, delay: i * 0.025, depth: t.y + 50,
                });
              }
              this.fx.spawn('fx/dust', t.x + Math.cos(t.angle) * t.len * 0.8, t.y + Math.sin(t.angle) * t.len * 0.8, { dur: 0.35, from: 0.6, to: 1.6, alpha: 0.6, depth: 4 });
            } else if (t && t.by === 0 && t.kind === 'cone') {
              this.fx.spawn('fx/slash', t.x + Math.cos(t.angle) * t.r * 0.55, t.y + Math.sin(t.angle) * t.r * 0.55, {
                dur: 0.24, from: (t.r / 60) * 0.7, to: (t.r / 60) * 1.25, rotation: t.angle + Math.PI / 2, alpha: 0.8, depth: t.y + 50,
              });
            }
          }
          break;
        case 'strike':
          if (e.who !== 0) {
            this.actors.get(`p${e.who}`)?.fig?.play(BLOW_MOVES[w.party[e.who]?.def.id ?? '']?.[e.n] ?? '', this.clock, 0.07, 0.12);
            break;
          }
          this.hunter.play(BLOW_MOVES[h.def.id]?.[e.n] ?? '', this.clock, 0.07, 0.12);
          this.echo.play(BLOW_MOVES[h.def.id]?.[e.n] ?? '', this.clock, 0.07, 0.12);
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
            if (big) this.stop(0.05);
            this.nums.add('monster', e.x + (Math.random() - 0.5) * 50, Math.max(this.cameras.main.worldView.y + 110, e.y - this.tall() * 0.45), e.amount, big ? GOLD : e.open ? WHITE : hex(BONE.shade), big ? 30 : e.open ? 24 : 19);
            if (e.open && !big) this.monster?.hit(this.clock);
            if (big || e.open) this.standIn?.hit(this.clock, h.x);
            sfx.play(big ? 'bigHit' : 'hit', big ? 0.6 : 0.4, 0.9 + Math.random() * 0.2);
          } else {
            const s = this.actors.get(`h${e.id}`);
            if (s) s.flash = 0.1;
            s?.fig?.hit(this.clock);
            this.nums.add(`h${e.id}`, e.x, e.y - 44, e.amount, WHITE, 18);
          }
          this.fx.spawn('fx/spark', e.x + (Math.random() - 0.5) * 30, e.y - (e.who === 'monster' ? 60 : 24), { dur: 0.12, from: 0.3, to: big ? 1.2 : 0.8, alpha: 0.9, depth: e.y + 60 });
          break;
        }
        case 'hurt':
          if (e.who === 'hunter' && e.id !== 0) {
            // A partner struck: their own flash and number, and nothing of the player's.
            const s = this.actors.get(`p${e.id}`);
            if (s) s.flash = 0.12;
            s?.fig?.hit(this.clock);
            this.nums.add(`p${e.id}`, e.x, e.y - 60, e.amount, RED, 20, '-');
          } else if (e.who === 'hunter') {
            this.hunter.hit(this.clock);
            this.echo.hit(this.clock);
            // A blow that lands is felt: the lair stops for a breath, longer for a heavier one.
            this.stop(Math.min(0.11, 0.04 + e.amount / 400));
            this.nums.add('me', h.x, h.y - 70, e.amount, RED, 28, '-');
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
          if (ABILITY_MOVES[e.id]) (e.who === 0 ? this.hunter : this.actors.get(`p${e.who}`)?.fig)?.play(ABILITY_MOVES[e.id], this.clock, 0.16, 0.3);
          if (ABILITY_MOVES[e.id] && e.who === 0) this.echo.play(ABILITY_MOVES[e.id], this.clock, 0.16, 0.3);
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
          // The biggest moment of a hunt: everything stops, he drops, a ring bursts off him, and the lair goes on slow
          // for a beat.
          sfx.play('blast', 0.9, 0.7);
          this.stop(0.18);
          this.slow(0.9, 0.35);
          this.shake(520, 0.018);
          this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.5, from: 0.5, to: 5, tint: GOLD, alpha: 0.9, depth: 5 });
          this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.7, from: 0.3, to: 3.2, tint: GOLD, alpha: 0.6, delay: 0.08, depth: 5 });
          this.fx.spawn('fx/dust', e.x, e.y, { dur: 0.6, from: 1, to: 3, alpha: 0.6, depth: 4 });
          music.moment('break');
          hud?.banner('STUNNED', 'Double damage: attack now');
          this.monster?.drop();
          this.standIn?.hit(this.clock, h.x);
          break;
        case 'shift':
          sfx.play('spawn', 1, 0.5);
          this.shake(900, 0.012);
          music.play(huntOf(m.def.id), musicStep(e.part, w.cuts.length + 1));
          hud?.banner(m.def.name.toUpperCase(), `Phase ${e.part + 1}`, true);
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
          hud?.banner('', 'REINFORCEMENTS', true);
          break;
        case 'place':
          // Set down with weight: a thump, a shake and dust thrown out round its foot.
          sfx.play('place', 0.9);
          this.shake(90, 0.004);
          this.fx.spawn('fx/dust', e.x, e.y, { dur: 0.35, from: 0.6, to: 1.8, alpha: 0.75, depth: e.y - 1 });
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            this.fx.spawn('fx/dust', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 9, { dur: 0.3, from: 0.3, to: 0.8, alpha: 0.6, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, depth: e.y - 1 });
          }
          break;
        case 'lift':
          sfx.play('click', 0.7);
          this.fx.spawn('fx/dust', e.x, e.y, { dur: 0.25, from: 0.4, to: 1, alpha: 0.5, depth: e.y - 1 });
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
          if (e.who === 'helper') {
            // A prop broken leaves its pieces where it stood.
            const p = this.props.get(e.id);
            const left = p && LEFT_BROKEN.get(p.id);
            if (p && left) this.broken.set(`b${e.id}`, { thing: left, x: p.x, y: p.y });
            else if (p && this.breaks(HELPER_ART[p.id])) this.wrecks.set(`r${e.id}`, { art: HELPER_ART[p.id], x: p.x, y: p.y });
            this.props.delete(e.id);
          }
          if (e.who === 'building') {
            const b = this.built.get(e.id);
            if (b && this.breaks(BUILDING_ART[b.id])) this.wrecks.set(`rb${e.id}`, { art: BUILDING_ART[b.id], x: b.x, y: b.y + 12 });
          }
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

  /**
   * Where a speaker is, in the HUD's units: the point over their head that a line hangs from. A reinforcement's
   * line hangs over the nearest of its own; a boss that is not seen speaks from where it stands. Null if the
   * speaker is not on the field.
   */
  speakerAt(who: string): { x: number; y: number } | null {
    if (!this.ready) return null;
    const cam = this.cameras.main;
    const at = (x: number, y: number): { x: number; y: number } => ({ x: x - cam.worldView.x, y: y - cam.worldView.y });
    if (who === this.hunt.hunter.def.id) return at(this.hunter.x, this.hunter.y - this.hunter.height - 10);
    if (who === this.hunt.monster.def.id) return at(this.hunt.monster.x, this.hunt.monster.y - this.tall() * 0.9);
    const own = this.hunt.allies.filter((a) => a.group === who && a.state !== 'down');
    if (own.length === 0) return at(this.hunter.x, this.hunter.y - this.hunter.height - 10);
    const near = own.reduce((b, a) => (Math.hypot(a.x - this.hunter.x, a.y - this.hunter.y) < Math.hypot(b.x - this.hunter.x, b.y - this.hunter.y) ? a : b));
    return at(near.x, near.y - 80);
  }

  /** True if a box, in the HUD's units, lies over no warning on the ground and not over the hunter: a line never hides what must be read. */
  clearOf(x0: number, y0: number, x1: number, y1: number): boolean {
    const cam = this.cameras.main;
    const ox = cam.worldView.x;
    const oy = cam.worldView.y;
    const hits = (a0: number, b0: number, a1: number, b1: number): boolean => a0 < x1 + ox && a1 > x0 + ox && b0 < y1 + oy && b1 > y0 + oy;
    for (const t of this.hunt.tells) {
      if (!t.foe) continue;
      if (t.kind === 'line') {
        const ex = t.x + Math.cos(t.angle) * t.len;
        const ey = t.y + Math.sin(t.angle) * t.len;
        const pad = t.w / 2;
        if (hits(Math.min(t.x, ex) - pad, Math.min(t.y, ey) - pad, Math.max(t.x, ex) + pad, Math.max(t.y, ey) + pad)) return false;
      } else if (hits(t.x - t.r, t.y - t.r, t.x + t.r, t.y + t.r)) return false;
    }
    const h = this.hunter;
    return !hits(h.x - 26, h.y - h.height, h.x + 26, h.y + 4);
  }

  private follow(): void {
    const w = this.hunt;
    const cam = this.cameras.main;
    // The view never leaves the lair. Where the window shows more than all of it, it sits in the middle.
    // It follows the hunter where they are drawn, which is between the rules' steps, so that the two move as one.
    const hx0 = this.ready ? this.hunter.x : w.hunter.x;
    const hy0 = this.ready ? this.hunter.y : w.hunter.y;
    // It leans a third of the way toward the boss, and toward the middle of its height: up close, the boss's head
    // and what it is about to do are in the picture as well as the hunter.
    const m = w.monster;
    const lean = m.state === 'asleep' || m.state === 'dead' ? 0 : 0.32;
    // Where the boss is drawn, between the rules' steps, as the hunter is: so that the view does not judder.
    const mx = this.ready && this.monster ? this.monster.x : m.x;
    const my = this.ready && this.monster ? this.monster.y : m.y;
    const hx = hx0 + (mx - hx0) * lean;
    const hy = hy0 - 20 + (my - this.tall() * 0.45 - (hy0 - 20)) * lean;
    // Never so far toward the boss that the hunter is near the edge of the view: they stay in its middle part.
    const kx = Math.max(hx0 - view.w * 0.28, Math.min(hx0 + view.w * 0.28, hx));
    let ky = Math.max(hy0 - view.h * 0.24, Math.min(hy0 + view.h * 0.2, hy));
    // A tall boss's head is kept below the bars across the top, as long as the hunter can still be seen above the
    // buttons at the foot: the view rises to show it rather than letting the bars cut it off.
    const bars = view.tall ? 170 : 84;
    ky = Math.max(Math.min(ky, my - this.tall() - bars + view.h / 2), hy0 + 130 - view.h / 2);
    const cx = view.w >= w.w ? w.w / 2 : Math.max(view.w / 2, Math.min(w.w - view.w / 2, kx));
    // The view may rise a little above the field's top edge, where the far layer stands, so that a tall boss stood
    // near it keeps its head below the bars.
    const above = Math.max(0, this.tall() + bars - my);
    const cy = view.h >= w.h ? w.h / 2 : Math.max(view.h / 2 - Math.min(110, above), Math.min(w.h - view.h / 2, ky));
    cam.centerOn(cx, cy);
    this.vfx?.apply(cam, view.zoom);
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

  /**
   * What, if anything, stands in front of the player's hunter this frame: the boss's body reaching down over them, or
   * any other figure whose feet are just below theirs and close beside. Figures are drawn by how low their feet are,
   * so these are the ones drawn over the hunter.
   */
  /** True if the kit drew a figure broken, so that it can be left standing broken when it is. */
  private breaks(art: Art | undefined): art is { grim: string } {
    return !!art && isGrim(art) && !!getGrim().units[art.grim]?.stills.broken;
  }

  /** True if a blow is marked on the ground within `pad` of a point of the field. */
  private marked(x: number, y: number, pad: number): boolean {
    return this.hunt.tells.some((t) => {
      if (!t.foe) return false;
      if (t.kind !== 'line') return Math.hypot(t.x - x, t.y - y) < t.r + pad;
      // A line: how near the point comes to it.
      const dx = Math.cos(t.angle);
      const dy = Math.sin(t.angle);
      const along = Math.max(0, Math.min(t.len, (x - t.x) * dx + (y - t.y) * dy));
      return Math.hypot(t.x + dx * along - x, t.y + dy * along - y) < t.w / 2 + pad;
    });
  }

  private coveredBy(): 'monster' | 'other' | null {
    const fig = this.hunter;
    const hx = fig.x;
    const hy = fig.y;
    const tall = fig.height;
    const m = this.monster;
    if (m && m.y > hy && m.y - m.height < hy - tall * 0.3 && Math.abs(m.x - hx) < m.height * 0.38) return 'monster';
    for (const [key, s] of this.actors) {
      if (key.startsWith('x') || key.startsWith('ghost')) continue;
      const o = s.fig ? s.fig.root : s.img;
      if (!o || !o.visible) continue;
      const below = o.y - hy;
      if (below > 0 && below < 70 && Math.abs(o.x - hx) < 36) return 'other';
    }
    return null;
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
    const echo = this.echo;
    echo.x = fig.x;
    echo.y = fig.y;
    echo.facing = fig.facing;
    echo.moving = fig.moving;
    echo.pace = fig.pace;
    echo.hold(h.bracing > 0 ? 'brace' : null);
    this.halo.setPosition(fig.x, fig.y - 40).setDisplaySize(170, 150).setDepth(fig.y - 1).setVisible(h.hp > 0);

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
      // Broken, dazed or held, it sags: its own still for that. Up in the dark, it hangs; cooled, it shows its water.
      const heat = m.def.heat;
      mf.hold(m.state === 'broken' || m.state === 'dazed' || m.state === 'held' ? 'stagger' : m.aloft ? 'hang' : heat && m.heat <= heat.cool ? 'cooled' : null);
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

    // Does anything stand in front of the player's hunter? The boss's body over them, or a figure just below their feet.
    const covered = this.coveredBy();
    // The boss's body over the player is seen through, so that both are read.
    if (this.monster) this.monster.root.alpha *= covered === 'monster' ? 0.55 : 1;
    this.echoK += ((covered && h.hp > 0 ? 1 : 0) - this.echoK) * Math.min(1, dt * 12);
    echo.alpha = 0.5 * this.echoK;
    echo.update(this.clock, dt);
    if (h.roll > 0) echo.root.scaleY *= 0.62;
    echo.root.depth = 9500;
    echo.root.setVisible(this.echoK > 0.02);

    // The player's partners, each by their own figure; one who is down lies still until helped up.
    for (const p of w.party) {
      if (p.index === 0) continue;
      const [x, y] = this.at(`p${p.index}`, p.x, p.y);
      const s = this.show(`p${p.index}`, HUNTER_ART[p.def.id] ?? HUNTER_ART.marta, x, y, p.face, p.moving);
      if (s.fig) {
        s.fig.hold(p.down ? 'fall' : null);
        s.fig.alpha = p.down ? 0.7 : 1;
      } else if (s.img) s.img.setRotation(p.down ? p.face * 1.3 : 0).setAlpha(p.down ? 0.7 : 1);
    }
    // Those the monster calls up.
    for (const f of w.helpers) {
      const [x, y] = this.at(`h${f.id}`, f.x, f.y);
      const s = this.show(`h${f.id}`, HELPER_ART[f.def.id], x + (f.held > 0 ? Math.sin(this.clock * 40) * 1.5 : 0), y, f.face, f.moving);
      if (s.fig) {
        s.fig.pace = 0.6;
        s.fig.alpha = HELPER_ALPHA[f.def.id] ?? 1;
      }
      // A prop is remembered where it stands, so that what is left of it can lie there when it is broken.
      if (LEFT_BROKEN.has(f.def.id) || this.breaks(HELPER_ART[f.def.id])) this.props.set(f.id, { id: f.def.id, x: f.x, y: f.y });
    }
    // Those who fight beside the hunter. A hound that is down lies still.
    for (const a of w.allies) {
      const [x, y] = this.at(`a${a.id}`, a.x, a.y);
      const folk = a.group === 'villager';
      const s = this.show(`a${a.id}`, folk ? VILLAGERS[a.id % VILLAGERS.length] : (ALLY_ART[a.group] ?? ALLY_ART.pikemen), x, y, a.face, a.moving);
      if (s.fig) {
        s.fig.pace = a.group === 'hound' ? 1.6 : folk ? 1.3 : 1;
        // A villager runs hunched with their arms over their head, and cowers where a blow is marked near them.
        const cower = folk && !a.moving && this.marked(a.x, a.y, 60);
        s.fig.hold(a.state === 'down' ? 'fall' : cower ? 'cower' : null);
        if (folk) s.fig.rest = a.moving ? (getGrim().units[s.fig.id]?.moves.flee?.windup ?? null) : null;
        s.fig.alpha = a.state === 'down' ? 0.7 : 1;
      } else if (s.img && a.state === 'down') s.img.setRotation(a.face * 1.3).setAlpha(0.7);
      else if (s.img && a.group === 'villager') {
        // A villager running out of a warning: bent forward, bobbing, as someone fleeing runs.
        const run = a.moving && !this.halted;
        s.img.setRotation(run ? a.face * 0.22 : 0).setY(y - (run ? Math.abs(Math.sin(this.clock * 16)) * 5 : 0));
      }
    }
    for (const b of w.buildings) {
      const s = this.show(`b${b.id}`, BUILDING_ART[b.def.id], b.x, b.y + 12, 1, false);
      this.built.set(b.id, { id: b.def.id, x: b.x, y: b.y });
      if (s.fig && b.def.id === 'cart') {
        // The cart's wheels turn over while it goes, and it faces the way it goes.
        const r = this.cartRoll;
        const moved = Math.hypot(b.x - r.x, b.y - r.y);
        if (moved > 1 && !this.halted && this.clock - r.at > 0.42) {
          s.fig.play('roll', this.clock, 0.16, 0.02);
          const face = Math.abs(b.x - r.x) > 0.5 ? (b.x < r.x ? -1 : 1) : r.face;
          this.cartRoll = { at: this.clock, x: b.x, y: b.y, face };
        }
        s.fig.facing = this.cartRoll.face;
      }
      // A bell that has been rung hangs dull until it can be rung again.
      if (s.img && b.def.kind === 'bell' && b.cool > 0 && s.flash <= 0) s.img.setTint(0x0e1418);
    }
    // In camp, the card picked up stands as a ghost where it would go: pale, and red where it may not stand.
    const ghost = this.ghostAt();
    if (ghost) {
      const s = this.show(`ghost-${ghost.id}`, BUILDING_ART[ghost.id], ghost.x, ghost.y + 12, 1, false);
      const tint = ghost.ok ? 0xc8f0b0 : 0xff8070;
      if (s.fig) {
        s.fig.alpha = 0.55;
        s.fig.tint = tint;
      }
      s.img?.setAlpha(0.55).setTint(tint);
    }
    // A stone of the lair, or an anvil a hunter dropped, which stays a while.
    w.stones.forEach((st, i) => {
      if (st.life === undefined) this.show(`s${i}`, STONE_ART, st.x, st.y + 16, 1, false);
    });
    // The lamp Agnes stands on the ground, in the middle of its light. A lantern's trail is light alone, drawn below.
    for (const d of w.wards) if (!d.haste) this.show(`w${d.id}`, LAMP_ART, d.x, d.y + 6, 1, false);
    this.fieldThings();
    for (const t of w.traps) {
      const s = this.show(`t${t.id}`, TRAP_ART, t.x, t.y + 6, 1, false);
      s.img?.setDepth(3).setAlpha(t.arm > 0 ? 0.5 : 1);
      // Laid shut, and sprung open once it is set.
      s.fig?.hold(t.arm > 0 ? 'shut' : null);
    }
    // What was broken stands broken where it was.
    for (const [key, r] of this.wrecks) this.show(key, r.art, r.x, r.y, 1, false).fig?.hold('broken');
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
    // Up in the dark: the rest of the thread she hangs by, from where the kit's line ends to the top of the screen.
    if (w.monster.aloft && this.monster) {
      const top = this.cameras.main.worldView.y - 20;
      const end = this.monster.y - this.monster.height - 190 * this.monster.scale;
      if (end > top) g.lineStyle(2, 0xc8c0b0, 0.7).lineBetween(this.monster.x, end, this.monster.x, top);
    }
    for (const p of w.pools) {
      // Webs and water are pictures of their own (fieldThings).
      if (p.def.id === 'web' || p.def.id === 'water') continue;
      const a = Math.min(0.8, p.life * 0.5);
      g.fillStyle(p.burning > 0 ? 0x5a2410 : 0x1c1612, a).fillCircle(p.x, p.y, p.r);
      g.lineStyle(3, p.burning > 0 ? 0xff8a3c : 0x0c0a08, a).strokeCircle(p.x, p.y, p.r);
    }

    // A ring of warm light at the player's feet: theirs, and nobody else's.
    if (h.hp > 0) {
      const [rx, ry] = [fig.x, fig.y];
      g.fillStyle(0xe8b860, 0.16).fillEllipse(rx, ry, 70, 28);
      g.lineStyle(4, 0xffd27a, 1).strokeEllipse(rx, ry, 66, 27);
      g.lineStyle(8, 0xe8b860, 0.3).strokeEllipse(rx, ry, 78, 32);
    }

    this.drawMarks();

    this.vfx?.update(dt, this.clock, this.halted);
    this.follow();
    this.light.update(dt, this.clock, this.halted);
  }

  /**
   * What the later lairs and hunters leave on the field, as the kit drew them: webs, the abbey's shallows, a lantern's
   * light, an anvil, a keg on its fuse, and what is left of a prop that was broken. Each at the size the rules give it.
   */
  private fieldThings(): void {
    const w = this.hunt;
    const seen = new Set<string>();
    const put = (key: string, thing: string, x: number, y: number, r: number | null, depth: number, alpha = 1): void => {
      seen.add(key);
      let img = this.lying.get(key);
      if (!img) {
        img = this.add.image(x, y, SHEET, thingFrame(thing));
        this.lying.set(key, img);
      }
      const t = getGrim().things[thing];
      const k = r === null ? 1 : (r * 2) / ((FIELD_THING_R[thing] ?? t.width / 2) * 2);
      img.setPosition(x, y).setScale(k).setDepth(depth).setAlpha(alpha);
    };
    for (const p of w.pools) {
      if (p.def.id === 'web') put(`pool${p.id}`, FIELD_THINGS.web, p.x, p.y, p.r, 2, Math.min(1, p.life));
      else if (p.def.id === 'water') put(`pool${p.id}`, FIELD_THINGS.water, p.x, p.y, p.r, -50);
    }
    for (const d of w.wards) if (d.haste) put(`ward${d.id}`, FIELD_THINGS.wake, d.x, d.y, d.r, 2, Math.min(1, d.life));
    w.stones.forEach((st, i) => {
      if (st.life !== undefined) put(`anvil${i}`, FIELD_THINGS.anvil, st.x, st.y, null, st.y);
    });
    for (const t of w.tells) if (t.own === 'keg') put(`keg${t.id}`, FIELD_THINGS.keg, t.x, t.y, null, t.y);
    for (const [key, b] of this.broken) put(key, b.thing, b.x, b.y, null, 2);
    for (const [key, img] of this.lying) {
      if (seen.has(key)) continue;
      img.destroy();
      this.lying.delete(key);
    }
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
      // The card picked up: its ground and its true reach, green where it may stand and red where not.
      const ghost = this.ghostAt();
      if (ghost) {
        const def = BUILDINGS.find((b) => b.id === ghost.id) as (typeof BUILDINGS)[number];
        const col = ghost.ok ? 0x9be07a : RED;
        g.fillStyle(col, 0.22).fillCircle(ghost.x, ghost.y, def.r + 4);
        g.lineStyle(3, col, 0.95).strokeCircle(ghost.x, ghost.y, def.r + 4);
        // What it reaches: a fire's light, a bell's ring, a ballista's range.
        if (def.reach > 0) {
          g.fillStyle(col, 0.06).fillCircle(ghost.x, ghost.y, def.reach);
          g.lineStyle(2, col, 0.55).strokeCircle(ghost.x, ghost.y, def.reach);
        }
      }
    }

    // A ward on the ground.
    for (const d of w.wards) {
      const a = Math.min(1, d.life);
      g.fillStyle(GOLD, 0.1 * a).fillCircle(d.x, d.y, d.r);
      g.lineStyle(3, GOLD, 0.8 * a).strokeCircle(d.x, d.y, d.r);
    }
    // The cart's road, faintly: two ruts in the ground from where it stands to where it is going.
    const road = w.cartRoad;
    if (road && w.buildings.some((b) => b.def.id === 'cart')) {
      const cart = w.buildings.find((b) => b.def.id === 'cart') as (typeof w.buildings)[number];
      const pts: Array<[number, number]> = [[cart.x, cart.y], ...road.points.slice(road.next)];
      for (const side of [-1, 1]) {
        g.lineStyle(3, 0xc8a878, 0.16).beginPath();
        pts.forEach(([x, y], i) => {
          const [nx, ny] = pts[Math.min(i + 1, pts.length - 1)];
          const [px, py] = pts[Math.max(i - 1, 0)];
          const d = Math.hypot(nx - px, ny - py) || 1;
          const ox = (-(ny - py) / d) * 13 * side;
          const oy = ((nx - px) / d) * 13 * side;
          if (i === 0) g.moveTo(x + ox, y + oy + 10);
          else g.lineTo(x + ox, y + oy + 10);
        });
        g.strokePath();
      }
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

    // Partners: their health over them once hurt; one who is down, a ring that fills as someone stands by them.
    for (const p of w.party) {
      if (p.index === 0) continue;
      if (p.down) {
        const k = Math.min(1, p.help / REVIVE.time);
        g.lineStyle(2, 0xe8dcc0, 0.5).strokeCircle(p.x, p.y, REVIVE.r);
        if (k > 0) g.lineStyle(5, GOLD, 0.95).beginPath().arc(p.x, p.y, REVIVE.r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2).strokePath();
      } else if (p.hp < p.maxHp) {
        g.fillStyle(hex(OUTLINE), 0.9).fillRect(p.x - 22, p.y + 8, 44, 7);
        g.fillStyle(0xb8382a, 1).fillRect(p.x - 20, p.y + 10, 40 * (p.hp / p.maxHp), 3);
      }
    }

    // Whom the boss is about to strike: a red mark that beats over their head. Only when it is not plain who.
    const tw = w.party[w.targetWho];
    if (tw && w.party.length > 1 && !tw.down && m.state !== 'dead') {
      const [tx, ty] = tw.index === 0 ? [this.hunter.x, this.hunter.y - this.hunter.height - 18] : [tw.x, tw.y - 112];
      const b = 1 + 0.15 * Math.sin(this.clock * 9);
      g.fillStyle(RED, 0.95).fillTriangle(tx - 9 * b, ty - 12 * b, tx + 9 * b, ty - 12 * b, tx, ty);
      g.lineStyle(2, 0x0d0b09, 1).strokeTriangle(tx - 9 * b, ty - 12 * b, tx + 9 * b, ty - 12 * b, tx, ty);
    }

    // Being aimed: a skill's own shape where it will go, a dodge's way, or ATTACK dragged.
    this.drawAiming(g);
    // With a mouse, where the next blow goes: a faint wedge at the hunter's feet. On a touch screen, ATTACK dragged.
    const hud = this.scene.get('Hud') as HudScene | undefined;
    const ad = hud?.controls?.scheme === 'touch' ? hud.controls.attackDrag : null;
    const aim = ad && Controls.dragged(ad) >= DRAG_MIN ? Math.atan2(ad.y - ad.y0, ad.x - ad.x0) : this.aimed();
    if (aim !== undefined && w.phase !== 'camp' && h.hp > 0) {
      const r0 = 26;
      const r1 = 58;
      g.fillStyle(0xe8b860, 0.28).beginPath();
      g.moveTo(h.x + Math.cos(aim - 0.32) * r0, h.y + Math.sin(aim - 0.32) * r0 * 0.6);
      g.lineTo(h.x + Math.cos(aim) * r1, h.y + Math.sin(aim) * r1 * 0.6);
      g.lineTo(h.x + Math.cos(aim + 0.32) * r0, h.y + Math.sin(aim + 0.32) * r0 * 0.6);
      g.closePath().fillPath();
    }
  }

  /**
   * A skill being aimed, a key held with a mouse or a thumb dragging its button: its shape on the ground as the rules
   * will make it, at the hunter or where it will be thrown; a dodge being dragged, the line it will go.
   */
  private drawAiming(g: Phaser.GameObjects.Graphics): void {
    const hud = this.scene.get('Hud') as HudScene | undefined;
    const c = hud?.controls;
    const h = this.hunt.hunter;
    if (!c || this.hunt.phase === 'camp' || h.hp <= 0) return;
    let i: 0 | 1 | null = null;
    let at: Target | undefined;
    if (c.scheme === 'mouse' && c.holding !== null && c.mouse) [i, at] = [c.holding, { kind: 'screen', x: c.mouse.x, y: c.mouse.y }];
    else if (c.skillDrag && Controls.dragged(c.skillDrag) >= DRAG_MIN) {
      const d = c.skillDrag;
      [i, at] = [d.i, { kind: 'drag', dx: d.x - d.x0, dy: d.y - d.y0 }];
    }
    const off = c.cancelling;
    const color = off ? 0x8a8a8a : 0xe8b860;
    if (i !== null) {
      const a = h.abilities[i];
      const r = a.r ?? 60;
      if (a.kind === 'pool') {
        // Thrown: where it lands, no further than its reach, and the line it is thrown along.
        const t = this.targetOf(at, i) ?? { x: h.x, y: h.y };
        const d = Math.hypot(t.x - h.x, t.y - h.y);
        const k = Math.min(1, (a.range ?? 300) / (d || 1));
        const [tx, ty] = [h.x + (t.x - h.x) * k, h.y + (t.y - h.y) * k];
        g.lineStyle(2, color, 0.5).lineBetween(h.x, h.y, tx, ty);
        g.fillStyle(color, 0.16).fillCircle(tx, ty, r);
        g.lineStyle(3, color, 0.85).strokeCircle(tx, ty, r);
        g.lineStyle(1, color, 0.3).strokeCircle(h.x, h.y, a.range ?? 300);
      } else {
        // Used where the hunter stands: its reach round them.
        g.fillStyle(color, 0.14).fillCircle(h.x, h.y, r);
        g.lineStyle(3, color, 0.85).strokeCircle(h.x, h.y, r);
      }
    }
    const dd = c.dodgeDrag;
    if (dd && Controls.dragged(dd) >= DRAG_MIN) {
      const t = this.targetOf({ kind: 'drag', dx: dd.x - dd.x0, dy: dd.y - dd.y0 }, 'dodge');
      if (t) {
        const ang = Math.atan2(t.y - h.y, t.x - h.x);
        const far = h.def.dodge.dist;
        this.strip(g, h.x, h.y, ang, far, 34, color, 0.2);
        g.fillStyle(color, 0.8).fillTriangle(h.x + Math.cos(ang) * far, h.y + Math.sin(ang) * far, h.x + Math.cos(ang + 2.7) * 18 + Math.cos(ang) * far, h.y + Math.sin(ang + 2.7) * 18 + Math.sin(ang) * far, h.x + Math.cos(ang - 2.7) * 18 + Math.cos(ang) * far, h.y + Math.sin(ang - 2.7) * 18 + Math.sin(ang) * far);
      }
    }
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

  private drawTell(g: Phaser.GameObjects.Graphics, t: Tell): void {
    // Marked ground in the style, at the rules' own shape and size, with the time shown as a fill that reaches its edge as it lands (vfx/Tells.ts).
    drawMarkedTell(g, t, this.clock, this.hunt.hunter, this.hunt.monster.def.lair);
  }

}

/** The step of a boss's piece for a part of its health: a hunt of three parts plays all three, a shorter one ends on the last. */
function musicStep(part: number, parts: number): number {
  return parts <= 1 ? 0 : Math.round((part * 2) / (parts - 1));
}
