// A battle from start to finish: the player arranges their units, presses
// FIGHT, watches it play out, and is told who won.
//
// The scene decides nothing about the fight. It steps the simulation on a
// fixed clock, reads the events each step gives, and animates them.

import Phaser from 'phaser';
import {
  ARCANE, BONE, CLOTH, FIRE, FROST, GOLD, GRASS, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM, type Accent,
} from '../../art/kit/palette';
import { SKIRMISH_ROSTER, UNITS } from '../../data/units';
import { ads } from '../../platform/ads';
import { Battle, type SimUnit } from '../../sim/battle';
import { COLS, DT, HALF_COLS, ROWS, TILE } from '../../sim/constants';
import { hash32 } from '../../sim/rng';
import { defaultFormation, isPlayerTile, randomEnemyTeam } from '../../sim/setup';
import type { BattleEvent, Placement } from '../../sim/types';
import { getManifest, setupCamera } from '../app';
import { H, W, hex } from '../config';
import { Effects } from '../Effects';
import {
  BOARD_PX_H, BOARD_PX_W, BOARD_X, BOARD_Y, TILE_H, TILE_W, UNIT_SCALE, Y_SCALE,
  screenX, screenY, tileAt, tileScreenX, tileScreenY,
} from '../layout';
import { Numbers } from '../Numbers';
import { Button, label, slab } from '../ui/widgets';
import { SHEET, sheet } from '../Sheet';
import { UnitView } from '../UnitView';

export interface BattleConfig {
  seed?: number;
  /** The player's units and where they stand. The usual four in the usual places if left out. */
  team?: Placement[];
  /** The enemy. Four at random from the seed if left out. */
  enemies?: Placement[];
}

type Phase = 'loading' | 'placement' | 'fighting' | 'result';

const ACCENTS: Record<string, Accent> = { arcane: ARCANE, fire: FIRE, frost: FROST, holy: HOLY, venom: VENOM };

/** The magic color of what a unit shoots, if it shoots magic. */
function accentOf(kind: string | undefined): Accent | null {
  if (!kind || !kind.startsWith('orb-')) return null;
  return ACCENTS[kind.slice(4)] ?? null;
}

const INFO_STYLE = { size: 18, weight: 600 as const };

export class BattleScene extends Phaser.Scene {
  private seed = 1;
  private phase: Phase = 'loading';
  private team: Placement[] = [];
  private enemies: Placement[] = [];
  private views: UnitView[] = [];
  /** During placement: the player's views, in the order of `team`. */
  private mine: UnitView[] = [];
  private zones: Phaser.GameObjects.Zone[] = [];
  private battle: Battle | null = null;
  private acc = 0;
  /** The battle's own time as the view shows it, in seconds. Runs faster at 2x. */
  private clock = 0;
  private speed = 1;
  private fx!: Effects;
  private numbers!: Numbers;
  private shots: Phaser.GameObjects.Image[] = [];
  private shotIds: number[] = [];
  private callouts: Phaser.GameObjects.Text[] = [];
  private calloutAt: number[] = [];
  private tileHints: Phaser.GameObjects.Graphics | null = null;
  private dropMark!: Phaser.GameObjects.Graphics;
  private fightButton!: Button;
  private speedButton!: Button;
  private hint!: Phaser.GameObjects.Text;
  private debug = false;
  private debugG!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private endAt = -1;

  constructor() {
    super('Battle');
  }

  init(data: BattleConfig): void {
    const asked = Number(new URLSearchParams(window.location.search).get('seed'));
    this.seed = data.seed ?? (Number.isFinite(asked) && asked > 0 ? Math.floor(asked) : (Date.now() % 1000000) + 1);
    this.team = (data.team ?? defaultFormation(SKIRMISH_ROSTER, (u) => UNITS[u].range <= 1.5)).map((p) => ({ ...p }));
    this.enemies = (data.enemies ?? randomEnemyTeam(this.seed, SKIRMISH_ROSTER)).map((p) => ({ ...p }));
    this.phase = 'loading';
    this.views = [];
    this.mine = [];
    this.zones = [];
    this.shots = [];
    this.shotIds = [];
    this.callouts = [];
    this.calloutAt = [];
    this.battle = null;
    this.acc = 0;
    this.clock = 0;
    this.endAt = -1;
    this.tileHints = null;
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(GRASS.dark);
    this.speed = (this.registry.get('speed') as number | undefined) ?? 1;

    this.buildBoard();
    this.fx = new Effects(this);
    this.numbers = new Numbers(this);
    this.dropMark = this.add.graphics().setDepth(20);
    this.debugG = this.add.graphics().setDepth(8500).setVisible(false);
    this.debugText = label(this, 12, H - 12, '', { size: 14, weight: 600, align: 'left' }).setOrigin(0, 1).setDepth(8501).setVisible(false);

    for (let i = 0; i < 6; i++) {
      this.callouts.push(label(this, 0, 0, '', { size: 18, color: HOLY.fill }).setDepth(7200).setVisible(false));
      this.calloutAt.push(-1);
    }

    this.buildHud();
    this.input.keyboard?.on('keydown-D', () => this.toggleDebug());

    // The parts of the units in this battle, cut and packed onto the sheet.
    const atlas = sheet(this.game, getManifest());
    const wanted = [
      ...this.team.map((p) => ({ team: 'blue', unit: p.unit })),
      ...this.enemies.map((p) => ({ team: 'red', unit: p.unit })),
    ];
    void atlas.ensure(this, wanted).then(() => this.startPlacement());
  }

  // ------------------------------------------------------------ the board

  private buildBoard(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const frame = (row + col) % 2 === 0 ? 'board/meadow-tile-a' : 'board/meadow-tile-b';
        this.add.image(BOARD_X + col * TILE_W, BOARD_Y + row * TILE_H, SHEET, frame).setScale(0.5).setDepth(1);
      }
    }
    // A few things standing round the board, never on it, so the units stay the loudest thing on screen.
    const props: Array<[string, number, number, number, boolean]> = [
      ['bush', 72, 246, 1, false],
      ['rock', 92, 452, 1, false],
      ['stump', 64, 628, 0.9, false],
      ['bush', 1208, 320, 1.05, true],
      ['rock', 1204, 540, 0.9, true],
      ['bush', 236, 128, 0.8, true],
      ['rock', 452, 112, 0.7, false],
      ['stump', 1030, 124, 0.8, true],
      ['bush', 806, 106, 0.72, false],
      ['bush', 1176, 676, 0.9, false],
      ['rock', 312, 690, 0.75, true],
    ];
    for (const [name, x, y, scale, flip] of props) {
      this.add.image(x, y, SHEET, `board/${name}`).setScale(0.5 * scale).setFlipX(flip).setDepth(y);
    }
  }

  private buildHud(): void {
    this.speedButton = new Button(this, W - 70, 46, `${this.speed}x`, () => this.toggleSpeed(), {
      width: 92, height: 56, size: 26, mat: BONE, color: OUTLINE,
    }).setDepth(8000);
    this.speedButton.root.list.forEach((o) => {
      if (o instanceof Phaser.GameObjects.Text) o.setStroke(HIGHLIGHT, 0);
    });

    label(this, 24, 34, 'Skirmish', { size: 30, align: 'left' }).setDepth(8000);
    label(this, 24, 66, `seed ${this.seed}`, { ...INFO_STYLE, align: 'left', color: GRASS.light, stroke: null }).setDepth(8000);

    this.fightButton = new Button(this, W / 2, 662, 'FIGHT', () => this.startFight(), { width: 280, height: 72, size: 38 })
      .setDepth(8000)
      .setVisible(false);
    this.hint = label(this, W / 2, 612, 'Drag your units to arrange them', { ...INFO_STYLE, color: HIGHLIGHT })
      .setDepth(8000)
      .setVisible(false);
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    this.registry.set('speed', this.speed);
    this.speedButton.setText(`${this.speed}x`);
  }

  private toggleDebug(): void {
    this.debug = !this.debug;
    this.debugG.setVisible(this.debug).clear();
    this.debugText.setVisible(this.debug);
  }

  // ------------------------------------------------------------ placement

  private makeView(p: Placement, team: 'blue' | 'red', n: number): UnitView {
    const def = UNITS[p.unit];
    const accent = accentOf(def.projectile?.kind);
    const view = new UnitView(
      this,
      p.unit,
      team,
      getManifest().units[p.unit],
      hex(CLOTH[team].fill),
      accent ? hex(accent.light) : null,
      hash32(this.seed * 31 + n * 7 + (team === 'red' ? 1000 : 0)),
    );
    view.x = tileScreenX(p.col);
    view.y = tileScreenY(p.row);
    view.stride = def.speed / 70;
    return view;
  }

  private startPlacement(): void {
    this.phase = 'placement';
    this.mine = this.team.map((p, i) => this.makeView(p, 'blue', i));
    const theirs = this.enemies.map((p, i) => this.makeView(p, 'red', i));
    this.views = [...this.mine, ...theirs];

    // The player's half, marked while they arrange it.
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(hex(HIGHLIGHT), 0.16);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < HALF_COLS; col++) {
        g.fillRoundedRect(BOARD_X + col * TILE_W + 6, BOARD_Y + row * TILE_H + 6, TILE_W - 12, TILE_H - 12, 10);
      }
    }
    this.tileHints = g;
    this.tweens.add({ targets: g, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.mine.forEach((view, i) => {
      const zone = this.add.zone(view.x, view.y - 50, 100, 130).setInteractive({ draggable: true, useHandCursor: true });
      zone.setDepth(7500);
      this.zones.push(zone);
      zone.on('dragstart', () => {
        view.lift = 14;
      });
      zone.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
        view.x = Phaser.Math.Clamp(x, 40, W - 40);
        view.y = Phaser.Math.Clamp(y + 50, 120, H - 20);
        zone.setPosition(view.x, view.y - 50);
        this.markDrop(view.x, view.y - 10);
      });
      zone.on('dragend', () => {
        view.lift = 0;
        this.dropMark.clear();
        this.drop(i, view.x, view.y - 10);
      });
    });

    this.fightButton.setVisible(true);
    this.hint.setVisible(true);
  }

  private markDrop(x: number, y: number): void {
    const g = this.dropMark;
    g.clear();
    const t = tileAt(x, y);
    if (!t) return;
    const ok = isPlayerTile(t.col, t.row);
    g.lineStyle(5, hex(ok ? HIGHLIGHT : CLOTH.red.fill), 0.95);
    g.strokeRoundedRect(BOARD_X + t.col * TILE_W + 5, BOARD_Y + t.row * TILE_H + 5, TILE_W - 10, TILE_H - 10, 12);
  }

  /** A unit let go over a tile: it goes there, and whoever stood there takes its old place. */
  private drop(index: number, x: number, y: number): void {
    const t = tileAt(x, y);
    const me = this.team[index];
    if (t && isPlayerTile(t.col, t.row)) {
      const other = this.team.findIndex((p, i) => i !== index && p.col === t.col && p.row === t.row);
      if (other >= 0) {
        this.team[other].col = me.col;
        this.team[other].row = me.row;
        this.settle(other);
      }
      me.col = t.col;
      me.row = t.row;
    }
    this.settle(index);
  }

  /** Glides a unit to the tile it belongs on. */
  private settle(index: number): void {
    const view = this.mine[index];
    const zone = this.zones[index];
    const p = this.team[index];
    this.tweens.add({
      targets: view,
      x: tileScreenX(p.col),
      y: tileScreenY(p.row),
      duration: 160,
      ease: 'Cubic.easeOut',
      onUpdate: () => zone.setPosition(view.x, view.y - 50),
      onComplete: () => zone.setPosition(view.x, view.y - 50),
    });
  }

  // ------------------------------------------------------------ the fight

  private startFight(): void {
    if (this.phase !== 'placement') return;
    this.phase = 'fighting';
    this.tweens.killAll();
    for (const z of this.zones) z.destroy();
    this.zones = [];
    this.tileHints?.destroy();
    this.tileHints = null;
    this.dropMark.clear();
    this.fightButton.setVisible(false);
    this.hint.setVisible(false);

    const battle = new Battle({ seed: this.seed, defs: UNITS, teams: [this.team, this.enemies] });
    // The simulation numbers units turn about; put the views in its order.
    const byTeam = [this.mine, this.views.slice(this.mine.length)];
    const next = [0, 0];
    const ordered: UnitView[] = [];
    for (const u of battle.units) ordered.push(byTeam[u.team][next[u.team]++]);
    this.views = ordered;
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].x = tileScreenX(Math.floor(battle.units[i].x / TILE));
      ordered[i].y = tileScreenY(Math.floor(battle.units[i].y / TILE));
    }
    for (const v of ordered) v.setBarsVisible(true);
    this.battle = battle;
    this.acc = 0;
    ads().gameplayStart();
  }

  override update(_time: number, deltaMs: number): void {
    // A long frame (a tab coming back) must not become a burst of steps.
    const dt = (Math.min(deltaMs, 100) / 1000) * this.speed;
    this.clock += dt;
    const battle = this.battle;

    if (battle && this.phase === 'fighting') {
      this.acc += dt;
      while (this.acc >= DT && !battle.ended) {
        battle.step();
        this.acc -= DT;
        for (let i = 0; i < battle.eventCount; i++) this.onEvent(battle, battle.events[i]);
      }
      if (battle.ended && this.endAt < 0) {
        this.endAt = this.clock + 1.1;
        ads().gameplayStop();
      }
      if (this.endAt >= 0 && this.clock >= this.endAt) this.showResult(battle.winner);
    }

    if (battle) {
      const a = battle.ended ? 1 : Math.min(1, this.acc / DT);
      const units = battle.units;
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const v = this.views[i];
        if (u.alive) {
          v.x = screenX(u.prevX + (u.x - u.prevX) * a);
          v.y = screenY(u.prevY + (u.y - u.prevY) * a);
          v.facing = u.facing;
          v.moving = u.moving;
          v.health = u.hp / u.maxHp;
        } else {
          v.health = 0;
        }
      }
      this.syncShots(battle, a);
    }

    for (let i = 0; i < this.views.length; i++) this.views[i].update(this.clock, dt);
    this.fx.update(dt);
    this.numbers.update(dt);
    this.updateCallouts();
    if (this.debug) this.drawDebug();
  }

  private onEvent(battle: Battle, e: BattleEvent): void {
    const now = this.clock;
    switch (e.type) {
      case 'attackStart': {
        this.views[e.unit].attack(now, e.amount, e.kind !== 'attack' && e.kind !== 'heal');
        break;
      }
      case 'impact': {
        const u = battle.units[e.unit];
        const v = this.views[e.unit];
        if (e.kind === 'heal' || u.def.projectile) break;
        // A blade's arc, in front of whoever swung it.
        const big = e.kind !== 'attack';
        this.fx.spawn('fx/slash', v.x + v.facing * 34 * UNIT_SCALE, v.y - 62 * UNIT_SCALE, {
          dur: 0.2, from: big ? 1.1 : 0.85, to: big ? 1.6 : 1.15, alpha: 0.95, hold: 0.25,
          flipX: v.facing < 0, tint: hex(HIGHLIGHT), depth: v.y + 2,
        });
        if (UNITS[u.def.id]?.skill?.id === e.kind && u.def.skill?.kind === 'cleave') {
          this.fx.spawn('fx/ring', v.x, v.y - 8, {
            dur: 0.35, from: 0.3, to: ((u.def.skill.area ?? 1.2) * TILE) / 60, flat: Y_SCALE, alpha: 0.8, hold: 0.3,
            tint: hex(HIGHLIGHT), depth: 30,
          });
        }
        break;
      }
      case 'projectileHit': {
        const accent = accentOf(e.kind);
        const x = screenX(e.x);
        const y = screenY(e.y);
        if (accent) {
          let radius = 0;
          for (let i = 0; i < battle.shots.length; i++) if (battle.shots[i].id === e.id) radius = battle.shots[i].splashR;
          if (radius > 0) {
            this.fx.spawn('fx/ring', x, y - 6, {
              dur: 0.4, from: 0.25, to: radius / 60, flat: Y_SCALE, alpha: 0.85, hold: 0.35, tint: hex(accent.light), depth: 30,
            });
          }
          this.fx.spawn('fx/spark', x, y - 52 * UNIT_SCALE, {
            dur: 0.24, from: 0.4, to: 1.15, hold: 0.4, tint: hex(accent.light), rotation: (e.id % 6) * 0.5,
          });
        } else {
          this.fx.spawn('fx/spark', x, y - 52 * UNIT_SCALE, { dur: 0.16, from: 0.3, to: 0.7, hold: 0.4, tint: hex(HIGHLIGHT), rotation: (e.id % 6) * 0.5 });
        }
        break;
      }
      case 'damage': {
        const t = this.views[e.target];
        const from = e.unit >= 0 ? this.views[e.unit].x : t.x - t.facing;
        t.hit(now, from);
        const status = e.kind === 'burn' || e.kind === 'poison';
        const skill = !status && e.kind !== 'attack' && e.kind !== 'splash';
        let color = t.team === 'blue' ? hex(CLOTH.red.fill) : hex(HIGHLIGHT);
        if (e.kind === 'burn') color = hex(FIRE.fill);
        else if (e.kind === 'poison') color = hex(VENOM.fill);
        else if (skill && t.team === 'red') color = hex(HOLY.fill);
        this.numbers.show(t.x, t.y - t.height * 0.78, String(e.amount), color, skill ? 34 : status ? 20 : 26);
        if (e.unit >= 0 && !battle.units[e.unit].def.projectile && !status) {
          this.fx.spawn('fx/spark', t.x - Math.sign(t.x - from) * 10, t.y - 56 * UNIT_SCALE, {
            dur: 0.16, from: 0.35, to: skill ? 1.1 : 0.8, hold: 0.4, tint: hex(HIGHLIGHT), rotation: (battle.tick % 7) * 0.45,
          });
        }
        break;
      }
      case 'heal': {
        const t = this.views[e.target];
        this.numbers.show(t.x, t.y - t.height * 0.78, `+${e.amount}`, hex(VENOM.light), 26);
        for (let i = 0; i < 3; i++) {
          this.fx.spawn('fx/sparkle', t.x + (i - 1) * 22, t.y - 30 - i * 14, {
            dur: 0.6, delay: i * 0.07, vy: -70, from: 0.3, to: 0.7, hold: 0.5, tint: hex(HOLY.light), spin: 2,
          });
        }
        break;
      }
      case 'death': {
        const v = this.views[e.unit];
        v.die(now);
        // Dust where it lands, when it lands.
        const back = -v.facing;
        for (let i = 0; i < 3; i++) {
          this.fx.spawn('fx/dust', v.x + back * (40 + i * 22) * UNIT_SCALE, v.y - 4, {
            dur: 0.5, delay: v.landsAt - now, vx: back * (30 + i * 26), vy: -26 - i * 8, from: 0.35, to: 0.8 + i * 0.12, hold: 0.3,
            alpha: 0.9, depth: v.y + 3,
          });
        }
        for (let i = 0; i < 4; i++) {
          this.fx.spawn('fx/chip', v.x, v.y - 50, {
            dur: 0.55, vx: (i - 1.5) * 90, vy: -190 - (i % 2) * 60, gravity: 700, spin: 9 * (i % 2 === 0 ? 1 : -1), hold: 0.7,
          });
        }
        break;
      }
      case 'skill': {
        const v = this.views[e.unit];
        const skill = battle.units[e.unit].def.skill;
        if (skill) this.callout(v.x, v.y - v.height - 24, skill.name);
        break;
      }
      case 'battleEnd': {
        for (let i = 0; i < battle.units.length; i++) {
          if (battle.units[i].alive && battle.units[i].team === e.amount) this.views[i].cheering = true;
        }
        break;
      }
      default:
        break;
    }
  }

  private callout(x: number, y: number, text: string): void {
    let slot = 0;
    for (let i = 0; i < this.callouts.length; i++) {
      if (this.calloutAt[i] < 0) {
        slot = i;
        break;
      }
      if (this.calloutAt[i] < this.calloutAt[slot]) slot = i;
    }
    const t = this.callouts[slot];
    t.setText(text).setPosition(Phaser.Math.Clamp(x, 90, W - 90), y).setVisible(true).setAlpha(1).setScale(1);
    this.calloutAt[slot] = this.clock;
  }

  private updateCallouts(): void {
    for (let i = 0; i < this.callouts.length; i++) {
      const at = this.calloutAt[i];
      if (at < 0) continue;
      const k = (this.clock - at) / 1.1;
      const t = this.callouts[i];
      if (k >= 1) {
        t.setVisible(false);
        this.calloutAt[i] = -1;
        continue;
      }
      t.setScale(k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : 1.1 - Math.min(1, (k - 0.12) / 0.15) * 0.1);
      t.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
  }

  /** Shots are drawn from the simulation's own list: one sprite to each of its slots. */
  private syncShots(battle: Battle, a: number): void {
    const shots = battle.shots;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      let img = this.shots[i];
      if (!img) {
        img = this.add.image(0, 0, SHEET, 'fx/arrow').setVisible(false);
        this.shots[i] = img;
        this.shotIds[i] = -1;
      }
      if (!s.active) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      if (this.shotIds[i] !== s.id) {
        this.shotIds[i] = s.id;
        img.setTexture(SHEET, getManifest().fx[s.kind] ? `fx/${s.kind}` : 'fx/arrow');
        img.setScale(0.5 * (s.splashR > 150 ? 1.5 : 1));
      }
      const x = s.prevX + (s.x - s.prevX) * a;
      const y = s.prevY + (s.y - s.prevY) * a;
      // It leaves from the height of what shot it and comes down to chest height, with a little rise between.
      const gone = Math.hypot(x - s.fromX, y - s.fromY);
      const left = Math.hypot(s.tx - x, s.ty - y);
      const k = gone + left > 0.001 ? gone / (gone + left) : 1;
      const src = this.views[s.src];
      const h0 = src.muzzleHeight();
      const h1 = 56 * UNIT_SCALE;
      const arc = s.kind === 'arrow' ? 16 : 6;
      const height = h0 + (h1 - h0) * k + arc * Math.sin(k * Math.PI);
      const px = screenX(x) + src.muzzleReach() * (1 - k);
      const py = screenY(y) - height;
      // It points the way it is going: from where it was drawn last to where it is now.
      if (img.visible) {
        const dx = px - img.x;
        const dy = py - img.y;
        if (dx * dx + dy * dy > 0.01) img.rotation = Math.atan2(dy, dx);
      } else {
        img.rotation = Math.atan2(screenY(s.ty) - h1 - py, screenX(s.tx) - px);
        img.setVisible(true);
      }
      img.x = px;
      img.y = py;
      img.depth = screenY(y) + 1;
    }
  }

  // ------------------------------------------------------------ the result

  private showResult(winner: number): void {
    if (this.phase === 'result') return;
    this.phase = 'result';
    const won = winner === 0;
    const title = won ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW';

    // The banner goes above the board and the button below it: whoever is
    // left standing stays in view, and the winners are cheering.
    const banner = this.add.container(W / 2, 88).setDepth(9000);
    const g = this.add.graphics();
    const mat = won ? GOLD : winner === 1 ? CLOTH.red : IRON;
    // The tails of the ribbon, then the ribbon over them.
    slab(g, -300, -24, 110, 64, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, 190, -24, 110, 64, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, -235, -48, 470, 100, mat, 20, 10);
    banner.add(g);
    banner.add(label(this, 0, -5, title, { size: 60, strokeWidth: 10 }));
    banner.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    const again = new Button(this, W / 2, 680, 'PLAY AGAIN', () => this.playAgain(), { width: 300, height: 72, size: 34 }).setDepth(9000);
    again.root.setAlpha(0);
    this.tweens.add({ targets: again.root, alpha: 1, y: 662, duration: 300, delay: 350 });
  }

  private playAgain(): void {
    const next = (hash32(this.seed) % 999983) + 1;
    // The address keeps up with the seed, so that any battle can be shared or replayed.
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(next));
    window.history.replaceState(null, '', url);
    const team = this.team.map((p) => ({ ...p }));
    void ads()
      .interstitial()
      .then(() => this.scene.restart({ seed: next, team } satisfies BattleConfig));
  }

  // ------------------------------------------------------------ debug

  private drawDebug(): void {
    const g = this.debugG;
    g.clear();
    g.lineStyle(1.5, 0xffffff, 0.5);
    for (let col = 0; col <= COLS; col++) g.lineBetween(BOARD_X + col * TILE_W, BOARD_Y, BOARD_X + col * TILE_W, BOARD_Y + BOARD_PX_H);
    for (let row = 0; row <= ROWS; row++) g.lineBetween(BOARD_X, BOARD_Y + row * TILE_H, BOARD_X + BOARD_PX_W, BOARD_Y + row * TILE_H);
    const battle = this.battle;
    let alive = 0;
    if (battle) {
      for (let i = 0; i < battle.units.length; i++) {
        const u: SimUnit = battle.units[i];
        if (!u.alive) continue;
        alive++;
        const v = this.views[i];
        g.lineStyle(1.5, u.team === 0 ? hex(CLOTH.blue.fill) : hex(CLOTH.red.fill), 0.9);
        g.strokeEllipse(v.x, v.y, u.rangePx * 2, u.rangePx * 2 * Y_SCALE);
        g.lineStyle(1, 0xffffff, 0.6);
        g.strokeEllipse(v.x, v.y, u.radiusPx * 2, u.radiusPx * 2 * Y_SCALE);
        if (u.target >= 0 && battle.units[u.target].alive) {
          const t = this.views[u.target];
          g.lineStyle(2, u.team === 0 ? hex(CLOTH.blue.fill) : hex(CLOTH.red.fill), 0.8);
          g.lineBetween(v.x, v.y, t.x, t.y);
        }
      }
    } else {
      for (const p of [...this.team, ...this.enemies]) {
        const def = UNITS[p.unit];
        g.lineStyle(1.5, 0xffffff, 0.7);
        g.strokeEllipse(tileScreenX(p.col), tileScreenY(p.row), def.range * TILE * 2, def.range * TILE * 2 * Y_SCALE);
      }
    }
    const atlas = sheet(this.game, getManifest());
    this.debugText.setText(
      `${Math.round(this.game.loop.actualFps)} fps   seed ${this.seed}   ${this.phase}` +
        (battle ? `   t ${battle.time.toFixed(2)} s   tick ${battle.tick}   alive ${alive}` : '') +
        `   sheet: ${atlas.usage()}`,
    );
  }
}
