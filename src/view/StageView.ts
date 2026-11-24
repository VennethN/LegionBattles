// The fight as it is seen: the ground, the camp, the legion in its ranks on
// the left of the road and whoever bars its way coming up it from the
// right. It shows what the battle says happened (game/battle.ts) and decides
// nothing itself.
//
// Figures are brought in as they are wanted: a hero's when it is hired, a
// land's enemies as the legion comes to it. Until a figure's pictures have
// loaded it is simply not there yet, and the fight goes on regardless.

import Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { BAND, MARCH_H, MARCH_W } from '../art/march';
import { ARCANE, FIRE, FROST, HIGHLIGHT, HOLY, VENOM } from '../art/kit/palette';
import { sfx } from '../audio/sfx';
import { CAMP, HEROES, LAND_STAGES, type Ground } from '../game/data';
import { fmt } from '../game/format';
import { enemyAt, kindOf, landOf, spawnSeconds } from '../game/rules';
import type { SaveData } from '../game/state';
import { WINDUP, type Battle } from '../game/battle';
import type { Rect } from './app';
import { Figure } from './art/Figure';
import { SHEET, type Sheet, type UnitKey } from './art/Sheet';
import { ART_SCALE, hex, view } from './config';
import { Effects } from './Effects';
import { Numbers } from './Numbers';

const INV_ART = 1 / ART_SCALE;

/** What each hero's blow looks like as it lands or flies, and the color it gathers before a cast. */
const SHOTS: Readonly<Record<string, { frame: string; glow?: string }>> = {
  archer: { frame: 'fx/arrow' },
  cleric: { frame: 'fx/orb-holy', glow: HOLY.fill },
  mage: { frame: 'fx/orb-arcane', glow: ARCANE.fill },
  herald: { frame: 'fx/orb-holy', glow: HOLY.fill },
  beekeeper: { frame: 'fx/orb-venom', glow: VENOM.fill },
  lamplighter: { frame: 'fx/orb-fire', glow: FIRE.fill },
  frostwitch: { frame: 'fx/orb-frost', glow: FROST.fill },
  pyromancer: { frame: 'fx/orb-fire', glow: FIRE.fill },
};

/** The pack that comes to each kind of land. */
const PACKS: Readonly<Record<Ground, string>> = { meadow: 'thornwood', desert: 'dunes', snow: 'frost' };

/** Everyone whose figure the fight needs for a save as it stands: the heroes hired, what the camp has, the land's enemies. */
export function unitsNeeded(save: SaveData): UnitKey[] {
  const out: UnitKey[] = [];
  HEROES.forEach((h, i) => {
    if (save.run.heroes[i] > 0) out.push({ team: 'blue', unit: h.unit });
  });
  CAMP.forEach((c, i) => {
    if (save.run.camp[i] > 0) out.push({ team: 'blue', unit: c.unit });
  });
  out.push(...enemiesOf(save.run.stage));
  return out;
}

/** The figures of a stage's land: its troops, its captain and its boss. */
function enemiesOf(stage: number): UnitKey[] {
  const land = landOf(stage);
  return [...new Set([...land.troops, land.captain, land.boss])].map((unit) => ({ team: 'red', unit }));
}

interface Coin {
  img: Phaser.GameObjects.Image;
  active: boolean;
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where it was when it turned for the purse. */
  fx: number;
  fy: number;
}

/** The key of the scene that loads pictures for as long as the game runs (scenes/AssetsScene.ts). */
export const ASSETS = 'Assets';

/** How many ranks deep the legion stands, and how many files wide. */
const RANKS = 5;
const FILES = 4;

const COIN_BURST = 0.38;
const COIN_FLY = 0.36;

export class StageView {
  readonly effects: Effects;
  readonly numbers: Numbers;
  /** Where coins fly to: the purse on the screen. The scene sets it. */
  purse = { x: 0, y: 0 };
  /** Called when a coin reaches the purse. */
  onCoin: (() => void) | null = null;
  /** Called when the supply pack on the ground is pressed. */
  onPack: (() => void) | null = null;

  private readonly bandTop: number;
  private readonly bandBottom: number;
  /** How big a unit of a figure's canvas is drawn. */
  private readonly unit: number;
  private readonly frontX: number;
  private readonly colGap: number;
  /** Where the enemy stands. The scene hangs the enemy's bar over it. */
  readonly enemyX: number;
  private readonly enemyY: number;
  /** Half the width of the bar that hangs over the enemy: the camp keeps clear of it. */
  readonly barHalf: number;

  private backdrop: Phaser.GameObjects.Image | null = null;
  private ground: Ground | null = null;
  private readonly heroes: Array<Figure | null> = HEROES.map(() => null);
  private readonly camp: Array<Figure | null> = CAMP.map(() => null);
  private readonly pool = new Map<string, Figure[]>();
  /** Who stands to be fought, or is walking up to. */
  private foe: Figure | null = null;
  private foeFrom = 0;
  private foeWalk = 0;
  private foeT = 0;
  private foeBig = false;
  private foeSwing = 0;
  private lastFlinch = -1;
  private loading = new Set<string>();
  private readonly coins: Coin[] = [];
  private pack: Phaser.GameObjects.Image | null = null;
  private packTween: Phaser.Tweens.Tween | null = null;
  /** Damage dealt since the last number was shown, and how long ago that was. */
  private dealt = 0;
  private dealtT = 0;
  private soundT = 0;
  private seed = 1;
  private destroyed = false;
  private readonly offWipe: () => void;
  /**
   * The scene whose loader brings pictures in. It is not the scene the fight is shown in: that one is made again
   * whenever the window changes shape, and a loader that is put away in the middle of its work never says it is done.
   */
  private readonly assets: Phaser.Scene;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly rect: Rect,
    private readonly sheet: Sheet,
    private readonly manifest: Manifest,
    private readonly save: SaveData,
    private readonly battle: Battle,
  ) {
    // The band the figures stand in: under the stage's plate and the camp, over the buttons.
    this.bandTop = rect.y + (view.tall ? 196 : 222);
    this.bandBottom = rect.y + rect.h - (view.tall ? 84 : 104);
    const band = this.bandBottom - this.bandTop;
    this.unit = Math.max(0.56, Math.min(0.8, band / 520));
    this.frontX = rect.x + rect.w * 0.47;
    // Five ranks deep, from the front one back to the edge of the screen.
    // The giants stand in the rearmost, and are not to be cut off by the edge of the screen.
    this.colGap = Math.min(110 * this.unit, (this.frontX - rect.x - 86 * this.unit) / (RANKS - 1));
    this.enemyX = rect.x + rect.w * 0.75;
    this.enemyY = this.bandTop + band * 0.62;
    this.barHalf = Math.floor(Math.min(170, rect.x + rect.w - 14 - this.enemyX));
    this.effects = new Effects(scene, 80);
    this.numbers = new Numbers(scene, 24);
    for (let i = 0; i < 28; i++) {
      const img = scene.add.image(0, 0, SHEET, 'icon/coin').setVisible(false).setDepth(7400);
      this.coins.push({ img, active: false, t: 0, x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0 });
    }
    // The sheet has room for everyone in the game at once (tests/sheet.test.ts). Should it ever not, it takes
    // every figure off to make room and says so first: the fight lets go of them all, and stands them up again.
    this.offWipe = sheet.onWipe(() => this.letGo());
    this.assets = scene.scene.get(ASSETS);
    this.land();
    this.sync();
    // An enemy is on its way from the first frame.
    this.walkIn(this.battle.wait);
  }

  // ------------------------------------------------------------ who is there

  private slotOf(hero: number): { x: number; y: number } {
    const [col, row] = HEROES[hero].slot;
    const rowGap = (this.bandBottom - this.bandTop) / (FILES + 0.3);
    return {
      // Each file stands a little aside from the one above it, so that the legion is a slant of ranks and every head shows.
      x: this.frontX - col * this.colGap + (row - (FILES - 1) / 2) * this.colGap * 0.16,
      y: this.bandTop + rowGap * (row + 0.78),
    };
  }

  /** Brings a figure's pictures in, and calls back when they are there. Asked twice for the same figure, it answers once. */
  private want(key: UnitKey, then: () => void): void {
    if (this.sheet.has(key)) {
      then();
      return;
    }
    const id = `${key.team}/${key.unit}`;
    if (this.loading.has(id)) return;
    this.loading.add(id);
    void this.sheet.ensure(this.assets, [key]).then(() => {
      this.loading.delete(id);
      if (!this.destroyed) then();
    });
  }

  private letGo(): void {
    for (let i = 0; i < this.heroes.length; i++) {
      this.heroes[i]?.destroy();
      this.heroes[i] = null;
    }
    for (let i = 0; i < this.camp.length; i++) {
      this.camp[i]?.destroy();
      this.camp[i] = null;
    }
    for (const list of this.pool.values()) for (const f of list) f.destroy();
    this.pool.clear();
    this.foe = null;
    this.scene.time.delayedCall(60, () => {
      if (!this.destroyed) this.sync();
    });
  }

  /** Stands up whoever has been hired or built since this was last asked. */
  sync(): void {
    HEROES.forEach((def, i) => {
      if (this.save.run.heroes[i] <= 0 || this.heroes[i]) return;
      this.want({ team: 'blue', unit: def.unit }, () => {
        if (this.heroes[i]) return;
        const glow = SHOTS[def.id]?.glow;
        const big = def.unit === 'colossus' || def.unit === 'icegolem' ? 1.3 : 1;
        const f = new Figure(this.scene, def.unit, 'blue', this.manifest.units[def.unit], this.unit * big, 'unit', i, glow ? hex(glow) : null);
        const at = this.slotOf(i);
        f.x = at.x;
        f.y = at.y;
        this.heroes[i] = f;
        // A hero that has just joined comes down with a puff of dust.
        this.effects.spawn('fx/dust', at.x, at.y - 6, { from: 0.5, to: 1.5, dur: 0.4, flat: 0.5, alpha: 0.7, depth: at.y - 1 });
      });
    });
    CAMP.forEach((def, i) => {
      if (this.save.run.camp[i] <= 0 || this.camp[i]) return;
      this.want({ team: 'blue', unit: def.unit }, () => {
        if (this.camp[i]) return;
        const f = new Figure(this.scene, def.unit, 'blue', this.manifest.units[def.unit], this.unit * 0.74, 'building', 40 + i);
        // The camp is pitched behind the legion, in the corner of the land over its heads: the first four things
        // built in a row, the next four in a row behind that. It ends where the enemy's bar begins.
        const room = this.enemyX - this.barHalf - this.rect.x - 16;
        const gap = Math.min(92 * this.unit, room / 4.5);
        const back = i >= 4;
        f.x = this.rect.x + 10 + gap * (0.5 + (i % 4)) + (back ? gap * 0.5 : 0);
        f.y = this.bandTop - (back ? 74 : 12) * this.unit;
        // Whoever stands in the legion's back rank stands in front of it.
        f.lift = -400;
        this.camp[i] = f;
      });
    });
  }

  /** Lays the ground of the land the legion is in, and brings in that land's enemies, and the next land's a little ahead. */
  land(): void {
    const stage = this.save.run.stage;
    const ground = landOf(stage).ground;
    if (ground !== this.ground) {
      this.ground = ground;
      const key = `ground:${ground}`;
      const show = (): void => {
        if (this.destroyed || this.ground !== ground) return;
        this.backdrop?.destroy();
        const r = this.rect;
        // Big enough to cover the stage, and for its band to lie under the figures' feet.
        const band = this.bandBottom - this.bandTop;
        const k = Math.max(r.w / MARCH_W, band / (BAND[1] - BAND[0]), (this.bandTop - r.y) / BAND[0], (r.y + r.h - this.bandTop) / (MARCH_H - BAND[0]));
        this.backdrop = this.scene.add
          .image(r.x + r.w / 2, this.bandTop - BAND[0] * k, key)
          .setOrigin(0.5, 0)
          .setDisplaySize(MARCH_W * k, MARCH_H * k)
          .setDepth(-1000);
      };
      if (this.scene.textures.exists(key)) show();
      else {
        this.scene.textures.once(`addtexture-${key}`, show);
        this.assets.load.svg(key, `assets/ground/${ground}.svg`, { scale: Math.min(2, Math.max(1, view.zoom)) });
        this.assets.load.start();
      }
    }
    for (const key of enemiesOf(stage)) this.want(key, () => {});
    // Three stages from the end of a land, the next land's are asked for, so that they are there when it is come to.
    if ((stage - 1) % LAND_STAGES >= LAND_STAGES - 3) for (const key of enemiesOf(stage + 3)) this.want(key, () => {});
  }

  // ------------------------------------------------------------ the enemy

  private figureFor(unit: string, scale: number): Figure | null {
    if (!this.sheet.has({ team: 'red', unit })) return null;
    let list = this.pool.get(unit);
    if (!list) {
      list = [];
      this.pool.set(unit, list);
    }
    for (const f of list) {
      if (f.gone && f !== this.foe) {
        f.scale = scale;
        f.revive();
        return f;
      }
    }
    if (list.length >= 5) return null;
    const f = new Figure(this.scene, unit, 'red', this.manifest.units[unit], scale, 'unit', 100 + this.seed++);
    list.push(f);
    return f;
  }

  /** The next enemy sets out from off the screen, to stand before the legion in `seconds`. */
  walkIn(seconds: number): void {
    const run = this.save.run;
    const kind = kindOf(run.stage);
    const unit = enemyAt(run.stage, run.kills);
    const scale = this.unit * (kind === 'boss' ? 1.7 : kind === 'captain' ? 1.32 : 1);
    this.foeBig = kind !== 'troop';
    const f = this.figureFor(unit, scale);
    this.foe = f;
    if (!f) return;
    f.facing = -1;
    this.foeFrom = this.rect.x + this.rect.w + 70 * scale;
    this.foeWalk = Math.max(0.12, seconds);
    this.foeT = 0;
    f.x = this.foeFrom;
    f.y = this.enemyY + (kind === 'boss' ? 26 * this.unit : 0);
    f.moving = true;
    // In a hurry when the legion is: its steps keep up with how fast it has to come.
    f.stride = Math.min(2.4, 0.7 / this.foeWalk + 0.6);
    f.lift = 0.5;
    this.foeSwing = 1 + Math.random();
  }

  /** The enemy that was walking up now stands. */
  stand(): void {
    const f = this.foe;
    // If its pictures were not there when it set out, it comes as soon as they are (update).
    if (!f) return;
    f.x = this.enemyX;
    f.moving = false;
  }

  /** Where a blow lands on the enemy: the middle of it. */
  private mark(): { x: number; y: number } {
    const f = this.foe;
    if (!f) return { x: this.enemyX, y: this.enemyY - 50 * this.unit };
    return { x: f.x, y: f.y - f.height * 0.5 };
  }

  private thud(name: 'hit' | 'slash' | 'shoot' | 'cast', volume: number): void {
    // A legion of eighteen strikes a dozen times a second. It is heard a few times a second.
    if (this.soundT > 0) return;
    this.soundT = 0.11;
    sfx.play(name, volume, 0.92 + Math.random() * 0.2);
  }

  private flinch(now: number, fromX: number): void {
    const f = this.foe;
    if (!f || f.dead || now - this.lastFlinch < 0.18) return;
    this.lastFlinch = now;
    f.hit(now, fromX);
  }

  // ------------------------------------------------------------ what the battle says

  /** A hero starts a blow. */
  swing(hero: number, now: number): void {
    this.heroes[hero]?.attack(now, WINDUP, false);
  }

  /** A hero's blow lands. */
  blow(hero: number, damage: number, now: number): void {
    const def = HEROES[hero];
    const f = this.heroes[hero];
    const at = this.mark();
    this.dealt += damage;
    if (def.ranged && f) {
      const shot = SHOTS[def.id] ?? SHOTS.archer;
      const sx = f.x + f.muzzleReach;
      const sy = f.y - f.muzzleHeight;
      const dx = at.x - sx;
      const dy = at.y - sy + (Math.random() - 0.5) * 20;
      const dur = 0.14;
      this.effects.spawn(shot.frame, sx, sy, { dur, vx: dx / dur, vy: dy / dur, rotation: Math.atan2(dy, dx), from: 0.9 * this.unit, hold: 0.95, depth: 6000 });
      this.effects.spawn('fx/spark', at.x, at.y + (Math.random() - 0.5) * 24, { delay: dur, dur: 0.18, from: 0.5 * this.unit, to: 1.1 * this.unit, tint: shot.glow ? hex(shot.glow) : 0xffffff });
      this.thud(shot.frame === 'fx/arrow' ? 'shoot' : 'cast', 0.35);
    } else {
      this.effects.spawn('fx/slash', at.x - 18 * this.unit, at.y + (Math.random() - 0.5) * 30, {
        dur: 0.2, from: 0.7 * this.unit, to: 1.15 * this.unit, rotation: (Math.random() - 0.5) * 1.2, hold: 0.4,
      });
      this.thud('slash', 0.4);
    }
    this.flinch(now, this.frontX);
  }

  /** The player's own blow, where the screen was pressed. */
  tap(x: number, y: number, damage: number, crit: boolean, now: number): void {
    const at = this.mark();
    // The mark of the blow is on the enemy, a little toward where the press was.
    const px = at.x + Math.max(-40, Math.min(40, (x - at.x) * 0.25));
    const py = at.y + Math.max(-40, Math.min(40, (y - at.y) * 0.25));
    this.effects.spawn('fx/slash', px, py, { dur: 0.22, from: (crit ? 1.3 : 0.9) * this.unit, to: (crit ? 2 : 1.4) * this.unit, rotation: Math.random() * 6.28, tint: crit ? hex(HOLY.light) : 0xffffff, hold: 0.4 });
    this.effects.spawn('fx/ring', px, py, { dur: 0.25, from: 0.3 * this.unit, to: (crit ? 1.5 : 0.9) * this.unit, alpha: 0.8, hold: 0.2 });
    if (damage > 0) this.numbers.show(px, py - 20, fmt(damage), crit ? hex(HOLY.fill) : hex(HIGHLIGHT), crit ? 34 : 24);
    sfx.play(crit ? 'bigHit' : 'hit', crit ? 0.7 : 0.5, 0.95 + Math.random() * 0.15);
    const f = this.foe;
    if (f && !f.dead) {
      this.lastFlinch = now;
      f.hit(now, f.x - 100);
    }
  }

  /** The watchtower's shot. */
  shot(damage: number, now: number): void {
    const tower = this.camp[CAMP.findIndex((c) => c.effect === 'volley')];
    const at = this.mark();
    this.dealt += damage;
    if (tower) {
      tower.attack(now, 0.05);
      const sx = tower.x + tower.muzzleReach;
      const sy = tower.y - tower.muzzleHeight;
      const dx = at.x - sx;
      const dy = at.y - sy;
      const dur = 0.2;
      this.effects.spawn('fx/arrow', sx, sy, { dur, vx: dx / dur, vy: dy / dur, rotation: Math.atan2(dy, dx), from: 0.8 * this.unit, hold: 0.95 });
    }
    this.effects.spawn('fx/spark', at.x, at.y, { delay: 0.2, dur: 0.15, from: 0.4 * this.unit, to: 0.9 * this.unit });
    this.flinch(now, this.rect.x);
  }

  /** The Volley: arrows from over the legion's heads, all at once. */
  storm(damage: number, now: number): void {
    const at = this.mark();
    for (let i = 0; i < 14; i++) {
      const sx = this.rect.x + this.rect.w * 0.15 + Math.random() * this.rect.w * 0.3;
      const sy = this.rect.y - 30;
      const tx = at.x + (Math.random() - 0.5) * 90 * this.unit;
      const ty = at.y + (Math.random() - 0.3) * 80 * this.unit;
      const dur = 0.26 + i * 0.012;
      const delay = i * 0.03;
      this.effects.spawn('fx/arrow', sx, sy, { delay, dur, vx: (tx - sx) / dur, vy: (ty - sy) / dur, rotation: Math.atan2(ty - sy, tx - sx), from: this.unit, hold: 0.95 });
      this.effects.spawn('fx/spark', tx, ty, { delay: delay + dur, dur: 0.2, from: 0.5 * this.unit, to: 1.2 * this.unit });
    }
    this.numbers.show(at.x, at.y - 40, fmt(damage), hex(FIRE.light), 36);
    sfx.play('shoot', 0.9, 0.8);
    sfx.play('bigHit', 0.8);
    this.flinch(now, this.rect.x);
  }

  /** The enemy falls, and pays. The next sets out. */
  down(gold: number, big: boolean, now: number): void {
    const f = this.foe;
    const at = this.mark();
    this.flush();
    if (f) {
      // When they fall faster than they can lie down, they do not lie down.
      const quick = spawnSeconds(this.save) < 0.5 || this.battle.wait < 0.5;
      f.die(now, quick && !big);
      this.effects.spawn('fx/dust', f.x, f.y - 4, { delay: 0.2, dur: 0.4, from: 0.6 * f.scale, to: 1.6 * f.scale, flat: 0.5, alpha: 0.7, depth: f.y - 1 });
    }
    const n = big ? 10 : 3;
    for (let i = 0; i < n; i++) this.coin(at.x, at.y);
    this.numbers.show(at.x, at.y - 50 * this.unit, `+${fmt(gold)}`, hex(HOLY.fill), big ? 32 : 22);
    if (big) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.28;
        this.effects.spawn('fx/sparkle', at.x, at.y, { dur: 0.6, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 - 60, gravity: 300, from: 0.9, to: 0.3, tint: hex(HOLY.light), spin: 4 });
      }
      this.effects.spawn('fx/ring', at.x, at.y, { dur: 0.5, from: 0.6, to: 3.2, alpha: 0.8, hold: 0.2, tint: hex(HOLY.light) });
      sfx.play('victory', 0.8);
      for (const h of this.heroes) if (h) h.cheering = true;
      this.scene.time.delayedCall(900, () => {
        for (const h of this.heroes) if (h) h.cheering = false;
      });
    } else sfx.play('death', 0.35, 0.9 + Math.random() * 0.25);
    this.foe = null;
    this.walkIn(this.battle.wait);
  }

  /** A captain or a boss was not brought down in time: it turns its back, and the legion is where it was a stage ago. */
  failed(): void {
    const f = this.foe;
    if (f) {
      f.cheering = true;
      const gone = f;
      this.scene.tweens.add({ targets: gone, alpha: 0, duration: 500, delay: 250, onComplete: () => gone.die(-10, true) });
    }
    sfx.play('defeat', 0.7);
    this.foe = null;
    this.land();
    this.walkIn(this.battle.wait);
  }

  /** Shows what has been dealt since the last number, as one. */
  private flush(): void {
    if (this.dealt <= 0) return;
    const at = this.mark();
    this.numbers.show(at.x + (Math.random() - 0.5) * 30, at.y - 10, fmt(this.dealt), hex(HIGHLIGHT), 22);
    this.dealt = 0;
    this.dealtT = 0;
  }

  // ------------------------------------------------------------ coins, the pack

  private coin(x: number, y: number): void {
    for (const c of this.coins) {
      if (c.active) continue;
      c.active = true;
      c.t = 0;
      c.x = x;
      c.y = y;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 160 + Math.random() * 160;
      c.vx = Math.cos(a) * v;
      c.vy = Math.sin(a) * v;
      c.img.setVisible(true).setPosition(x, y).setScale(0.5 * INV_ART).setAlpha(1);
      return;
    }
  }

  /** A supply pack lands on the ground and waits to be pressed. */
  dropPack(): void {
    if (this.pack || !this.ground) return;
    const x = this.rect.x + this.rect.w * (view.tall ? 0.62 : 0.6);
    const y = this.bandBottom + 8 * this.unit;
    const pack = this.scene.add.image(x, this.rect.y - 80, SHEET, `pack/${PACKS[this.ground]}`).setDepth(7300).setScale(0.44 * this.unit);
    pack.setInteractive({ useHandCursor: true });
    pack.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.onPack?.();
    });
    this.pack = pack;
    this.scene.tweens.add({ targets: pack, y: y - 40 * this.unit, duration: 520, ease: 'Bounce.easeOut' });
    this.packTween = this.scene.tweens.add({ targets: pack, angle: { from: -7, to: 7 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 520 });
    sfx.play('pop', 0.8);
  }

  /** Where the pack is, for whatever is shown over it. Null when there is none. */
  get packAt(): { x: number; y: number } | null {
    return this.pack ? { x: this.pack.x, y: this.pack.y } : null;
  }

  /** The pack goes: opened, with a burst, or unopened, quietly. */
  clearPack(opened: boolean): void {
    const pack = this.pack;
    if (!pack) return;
    this.pack = null;
    this.packTween?.stop();
    this.packTween = null;
    pack.disableInteractive();
    if (opened) {
      this.effects.spawn('fx/ring', pack.x, pack.y, { dur: 0.4, from: 0.5, to: 2.6, alpha: 0.9, hold: 0.2, tint: hex(HOLY.light) });
      for (let i = 0; i < 8; i++) this.coin(pack.x, pack.y);
      this.scene.tweens.add({ targets: pack, scale: pack.scale * 1.5, alpha: 0, duration: 220, onComplete: () => pack.destroy() });
    } else this.scene.tweens.add({ targets: pack, alpha: 0, y: pack.y + 20, duration: 300, onComplete: () => pack.destroy() });
  }

  // ------------------------------------------------------------ every frame

  update(now: number, dt: number): void {
    this.soundT -= dt;
    // The enemy walks up, and then stands and makes a show of fighting back.
    const fighting = this.battle.phase === 'fight';
    // Whoever is being fought and is not shown, because their pictures came late, is shown now.
    if (!this.foe && fighting) this.walkIn(0.12);
    const f = this.foe;
    if (f && f.moving) {
      this.foeT += dt;
      const k = Math.min(1, this.foeT / this.foeWalk);
      f.x = this.foeFrom + (this.enemyX - this.foeFrom) * (1 - (1 - k) * (1 - k));
      if (k >= 1 && fighting) f.moving = false;
    } else if (f && !f.dead) {
      this.foeSwing -= dt;
      if (this.foeSwing <= 0) {
        this.foeSwing = 1.5 + Math.random() * 1.2;
        f.attack(now, 0.32, this.foeBig);
        // Whoever is in the front rank takes it, and is none the worse.
        const front = this.heroes.filter((h, i) => h && HEROES[i].slot[0] === 0);
        const struck = front[Math.floor(Math.random() * front.length)];
        if (struck) this.scene.time.delayedCall(320, () => struck.hit(this.scene.time.now / 1000, this.enemyX));
      }
    }
    for (const h of this.heroes) h?.update(now, dt);
    for (const c of this.camp) c?.update(now, dt);
    for (const list of this.pool.values()) for (const e of list) e.update(now, dt);

    // What the legion has dealt is told a few times a second, not blow by blow.
    this.dealtT += dt;
    if (this.dealtT >= 0.32) this.flush();

    for (const c of this.coins) {
      if (!c.active) continue;
      c.t += dt;
      if (c.t < COIN_BURST) {
        c.vy += 700 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.fx = c.x;
        c.fy = c.y;
      } else {
        const k = Math.min(1, (c.t - COIN_BURST) / COIN_FLY);
        const e = k * k;
        c.x = c.fx + (this.purse.x - c.fx) * e;
        c.y = c.fy + (this.purse.y - c.fy) * e;
        if (k >= 1) {
          c.active = false;
          c.img.setVisible(false);
          this.onCoin?.();
          continue;
        }
      }
      c.img.setPosition(c.x, c.y);
    }
    this.effects.update(dt);
    this.numbers.update(dt);
  }

  destroy(): void {
    this.destroyed = true;
    this.offWipe();
  }
}
