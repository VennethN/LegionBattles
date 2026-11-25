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
import { music } from '../../audio/music';
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
import { ALLY_ART, BUILDING_ART, HELPER_ART, HUNTER_ART, LAIR_GROUND, MONSTER_ART, STONE_ART, TRAP_ART, type Picture } from '../pictures';
import { Figure } from '../art/Figure';
import { SHEET, Sheet, sheet, type UnitKey } from '../art/Sheet';
import { STILL_SCALE } from '../art/scale';
import { beginHunt, finishHunt, save, theHunt } from '../session';
import type { HudScene } from './HudScene';

const INV_ART = 1 / ART_SCALE;
const WHITE = 0xffffff;
const RED = 0xff4a36;
const GOLD = hex(HOLY.fill);

interface Still {
  img: Phaser.GameObjects.Image;
  stamp: number;
  flash: number;
  born: number;
}

export class LairScene extends Phaser.Scene {
  private hunt!: Hunt;
  private hunter!: Figure;
  private monster!: Figure;
  private fx!: Effects;
  private nums!: Numbers;
  private light!: LairLight;
  /** What lies on the ground and is lit with it: tar. */
  private ground!: Phaser.GameObjects.Graphics;
  /** What is drawn over the dark, sharp: the tells, the rings, the bars. */
  private marks!: Phaser.GameObjects.Graphics;
  private readonly stills = new Map<string, Still>();
  private spare: Phaser.GameObjects.Image[] = [];
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

  constructor() {
    super('Lair');
  }

  /** `keep` stands the lair up again round the hunt already going on: the window changed shape. `over` is the screen that was open over it then. */
  create(data: { keep?: boolean; over?: string } = {}): void {
    const kept = data.keep ? theHunt() : null;
    this.hunt = kept ?? theHunt() ?? beginHunt(view.tall);
    this.overlay = data.over ?? '';
    this.resumed = !!kept;
    this.stills.clear();
    this.spare = [];
    this.acc = 0;
    this.clock = 0;
    this.ready = false;
    this.ended = false;
    this.halted = false;

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
    const land = LAIR_GROUND[h.monster.def.lair] ?? 'meadow';
    const groundKey = `arena:${land}:${shape}`;
    const rigged: UnitKey[] = [{ team: 'blue', unit: HUNTER_ART[h.hunter.def.id].unit }, { team: 'red', unit: MONSTER_ART[h.monster.def.id].unit }];
    const stills: UnitKey[] = [
      ...Object.values(HELPER_ART).map((p) => ({ team: 'red', unit: p.unit })),
      ...Object.values(ALLY_ART).map((p) => ({ team: 'blue', unit: p.unit })),
      ...Object.values(BUILDING_ART).map((p) => ({ team: 'blue', unit: p.unit })),
      { team: 'red', unit: STONE_ART.unit },
      { team: 'blue', unit: TRAP_ART.unit },
    ];
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

  /** Everything is in: the lair is stood up. */
  private build(groundKey: string, land: string): void {
    const h = this.hunt;
    this.add.image(0, 0, groundKey).setOrigin(0, 0).setDisplaySize(h.w, h.h).setDepth(-100);
    this.ground = this.add.graphics().setDepth(1);
    const hp = HUNTER_ART[h.hunter.def.id];
    const mp = MONSTER_ART[h.monster.def.id];
    this.hunter = new Figure(this, hp.unit, 'blue', getManifest().units[hp.unit], hp.scale, 'unit', 1);
    this.monster = new Figure(this, mp.unit, 'red', getManifest().units[mp.unit], mp.scale, 'unit', 2);
    this.light = new LairLight(this, h);
    this.marks = this.light.crisp(this.add.graphics().setDepth(2));
    this.ready = true;
    this.sync(0);
    music.play(land, h.phase === 'camp' ? 'calm' : 'battle');
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
    const dt = Math.min(0.1, delta / 1000);
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
        this.hunt.step(steps === 1 ? steer : { x: steer.x, y: steer.y });
        this.acc -= STEP;
      }
      // A frame that took far too long is not caught up on: the hunt would lurch.
      if (steps >= 6) this.acc = 0;
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
    sfx.play(won ? 'victory' : 'defeat', 0.8);
    music.play(LAIR_GROUND[this.hunt.monster.def.lair] ?? 'meadow', 'calm');
    if (won) this.monster.die(this.clock);
    else this.hunter.die(this.clock);
    this.cameras.main.shake(320, 0.01);
    // The fall is watched before anything is said of it.
    this.time.delayedCall(won ? 1700 : 1300, () => {
      this.halted = true;
      this.scene.stop('Hud');
      this.scene.launch('Result');
    });
  }

  // ------------------------------------------------------------ what has happened

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
          music.play(LAIR_GROUND[m.def.lair] ?? 'meadow', 'battle');
          this.shake(500, 0.012);
          hud?.banner(m.def.name.toUpperCase(), 'It is awake');
          break;
        case 'tell': {
          const t = w.tells.find((x) => x.id === e.id);
          if (e.first && t) {
            // The monster draws back for as long as the tell shows, and its blow falls as the tell lands.
            this.monster.attack(this.clock, t.of, true);
            sfx.play('skill', 0.5, 0.8);
          }
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
          this.hunter.attack(this.clock, 0.06);
          if (e.kind === 'arc') {
            this.fx.spawn('fx/slash', e.x + Math.cos(e.angle) * e.reach * 0.5, e.y - 30 + Math.sin(e.angle) * e.reach * 0.5, {
              dur: 0.16, from: (e.reach / 60) * 0.9, to: (e.reach / 60) * 1.15, rotation: e.angle, alpha: 0.9, depth: h.y + 40,
            });
            sfx.play('slash', 0.5, 0.95 + Math.random() * 0.1);
          }
          break;
        case 'loose':
          sfx.play('shoot', e.from === 'ballista' ? 0.6 : 0.35, e.from === 'ballista' ? 0.7 : 1);
          break;
        case 'hit': {
          const big = e.big;
          if (e.who === 'monster') {
            this.nums.show(e.x + (Math.random() - 0.5) * 50, e.y - this.monster.height * 0.7, String(e.amount), big ? GOLD : e.open ? WHITE : hex(BONE.shade), big ? 30 : e.open ? 24 : 19);
            if (big || e.open) this.monster.hit(this.clock, h.x);
            sfx.play(big ? 'bigHit' : 'hit', big ? 0.6 : 0.4, 0.9 + Math.random() * 0.2);
          } else {
            const s = this.stills.get(`h${e.id}`);
            if (s) s.flash = 0.1;
            this.nums.show(e.x, e.y - 44, String(e.amount), WHITE, 18);
          }
          this.fx.spawn('fx/spark', e.x + (Math.random() - 0.5) * 30, e.y - (e.who === 'monster' ? 60 : 24), { dur: 0.12, from: 0.3, to: big ? 1.2 : 0.8, alpha: 0.9, depth: e.y + 60 });
          break;
        }
        case 'hurt':
          if (e.who === 'hunter') {
            this.hunter.hit(this.clock, m.x);
            this.nums.show(h.x, h.y - 70, `-${e.amount}`, RED, 28);
            sfx.play('bigHit', 0.8, 0.7);
            this.shake(220, 0.012);
            hud?.struck();
          } else {
            const s = this.stills.get(`${e.who === 'ally' ? 'a' : 'b'}${e.id}`);
            if (s) s.flash = 0.12;
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
          hud?.banner('', 'TURNED');
          break;
        case 'ability':
          sfx.play(e.id === 'heel' ? 'heal' : e.id === 'jawtrap' ? 'place' : 'skill', 0.7);
          // The ring's picture is 64 units from its middle to its rim.
          if (e.id === 'reap') this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.22, from: (e.r / 64) * 0.5, to: e.r / 64, alpha: 0.7, depth: 4 });
          if (e.id === 'flare') this.fx.spawn('fx/ring', e.x, e.y, { dur: 0.35, from: 0.4, to: e.r / 64, tint: GOLD, alpha: 0.8, depth: 4 });
          break;
        case 'open':
          if (e.why !== 'recover') {
            sfx.play('status', 0.7);
            hud?.banner('', e.why === 'crash' ? 'IT IS DAZED: STRIKE' : e.why === 'held' ? 'IT IS HELD: STRIKE' : e.why === 'bell' ? 'THE BELL BROKE IT: STRIKE' : 'IT IS BLIND: STRIKE');
          }
          break;
        case 'broken':
          sfx.play('blast', 0.9, 0.7);
          this.shake(420, 0.014);
          hud?.banner('BROKEN', 'It is down: everything you have, now');
          this.monster.hit(this.clock, h.x);
          break;
        case 'shift':
          sfx.play('spawn', 1, 0.5);
          this.shake(900, 0.012);
          hud?.banner(m.def.name.toUpperCase(), e.part === 1 ? 'It changes' : 'It changes again');
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
          hud?.banner('', 'THEY COME');
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
          hud?.banner('', "THE SEXTON'S SPADE HOLDS YOU UP");
          sfx.play('levelUp', 0.9);
          break;
        case 'enrage':
          hud?.banner('', 'IT HAS LOST PATIENCE');
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
    const cx = view.w >= w.w ? w.w / 2 : Math.max(view.w / 2, Math.min(w.w - view.w / 2, w.hunter.x));
    const cy = view.h >= w.h ? w.h / 2 : Math.max(view.h / 2, Math.min(w.h - view.h / 2, w.hunter.y - 20));
    cam.centerOn(cx, cy);
  }

  private take(frame: string): Phaser.GameObjects.Image {
    const img = this.spare.pop() ?? this.add.image(0, 0, SHEET, frame);
    return img.setTexture(SHEET, frame).setVisible(true).setAlpha(1).setRotation(0).setScale(1).setFlipX(false).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Shows one thing as a still picture, made the first time it is seen and kept while it lasts. */
  private still(key: string, pic: Picture, team: string, x: number, y: number, face: number, walking: boolean, size = 1): Still {
    let s = this.stills.get(key);
    if (!s) {
      s = { img: this.take(Sheet.stillFrame(team, pic.unit, 'a')), stamp: 0, flash: 0, born: this.clock };
      this.stills.set(key, s);
    }
    s.stamp = this.stamp;
    const stride = walking && !this.halted && Math.floor((this.clock + key.length * 0.37) * 7) % 2 === 1;
    s.img.setFrame(Sheet.stillFrame(team, pic.unit, stride ? 'b' : 'a'));
    const age = this.clock - s.born;
    const grow = age < 0.18 ? 0.4 + (age / 0.18) * 0.6 : 1;
    const k = (pic.scale * size * grow) / STILL_SCALE;
    s.img.setPosition(x, y).setScale(k).setFlipX(face < 0).setDepth(y);
    if (s.flash > 0) {
      s.flash -= 1 / 60;
      s.img.setTint(WHITE).setTintMode(Phaser.TintModes.FILL);
    } else s.img.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
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
    fig.x = h.x;
    fig.y = h.y;
    fig.facing = h.roll > 0 ? (h.rx >= 0 ? 1 : -1) : w.phase === 'camp' ? h.face : Math.cos(h.aim) >= 0 ? 1 : -1;
    fig.moving = h.moving && !this.halted;
    // Rolling, they are low and half seen; struck, they flicker for the moment nothing can hurt them.
    fig.alpha = h.roll > 0 ? 0.55 : h.grace > 0 && Math.floor(this.clock * 20) % 2 === 0 ? 0.55 : 1;
    fig.update(this.clock, dt);
    if (h.roll > 0) fig.root.scaleY *= 0.62;

    // The monster.
    const mf = this.monster;
    const shudder = m.state === 'shift' ? Math.sin(this.clock * 60) * 3 : m.state === 'broken' || m.state === 'dazed' ? Math.sin(this.clock * 9) * 1.5 : 0;
    mf.x = m.x + shudder;
    mf.y = m.y;
    mf.facing = m.face;
    mf.moving = m.moving && !this.halted;
    mf.update(this.clock, dt);
    const tint = m.state === 'asleep' ? 0x9a9aaa : m.state === 'shift' ? 0xff7a6a : m.state === 'broken' ? (Math.floor(this.clock * 8) % 2 ? 0xffe9a0 : 0xffffff) : 0xffffff;
    for (const part of mf.root.list) (part as Phaser.GameObjects.Image).setTint(tint);

    // Those the monster calls up.
    for (const f of w.helpers) this.still(`h${f.id}`, HELPER_ART[f.def.id], 'red', f.x + (f.held > 0 ? Math.sin(this.clock * 40) * 1.5 : 0), f.y, f.face, f.moving);
    // Those who fight beside the hunter. A hound that is down lies still and grey.
    for (const a of w.allies) {
      const s = this.still(`a${a.id}`, ALLY_ART[a.group] ?? ALLY_ART.pikemen, 'blue', a.x, a.y, a.face, a.moving);
      if (a.state === 'down') s.img.setTint(0x666666).setRotation(a.face * 1.3).setAlpha(0.7);
      else s.img.setRotation(0).setAlpha(1);
    }
    for (const b of w.buildings) {
      const s = this.still(`b${b.id}`, BUILDING_ART[b.def.id], 'blue', b.x, b.y + 14, 1, false);
      // A bell that has been rung hangs dull until it can be rung again.
      if (b.def.kind === 'bell' && b.cool > 0 && s.flash <= 0) s.img.setTint(0x9a9a9a);
    }
    w.stones.forEach((st, i) => this.still(`s${i}`, STONE_ART, 'red', st.x, st.y + 16, 1, false));
    for (const t of w.traps) this.still(`t${t.id}`, TRAP_ART, 'blue', t.x, t.y + 6, 1, false).img.setDepth(3).setAlpha(t.arm > 0 ? 0.5 : 1);
    for (const s of w.shots) {
      const v = this.stills.get(`x${s.id}`) ?? { img: this.take('fx/bolt'), stamp: 0, flash: 0, born: this.clock };
      this.stills.set(`x${s.id}`, v);
      v.stamp = stamp;
      v.img.setPosition(s.x, s.y - 18).setRotation(Math.atan2(s.vy, s.vx)).setScale((s.from === 'ballista' ? 1.5 : 0.9) * INV_ART).setDepth(s.y + 40);
    }
    for (const [key, s] of this.stills) {
      if (s.stamp === stamp) continue;
      s.img.setVisible(false);
      this.spare.push(s.img);
      this.stills.delete(key);
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
