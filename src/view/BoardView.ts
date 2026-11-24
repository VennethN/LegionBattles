// The board and what happens on it: the tiles, the units standing on them,
// a battle played out, its shots, effects, numbers and sounds. The main
// screen and the skirmish both show their battles through this.
//
// It decides nothing about a fight. It steps the simulation on a fixed
// clock, reads the events each step gives, and animates them.

import Phaser from 'phaser';
import { GROUND, type Ground } from '../art/board';
import { gradePlate } from '../art/grades';
import { ARCANE, BONE, CLOTH, FIRE, FROST, HIGHLIGHT, HOLY, OUTLINE, VENOM, type Accent } from '../art/kit/palette';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { UNITS } from '../data/units';
import { GRADES, RARITY } from '../game/rarity';
import { Battle, type SimUnit } from '../sim/battle';
import { DT, TILE } from '../sim/constants';
import { FIRST_FIELD, isPlayerTile, seatTeam, writtenTile, type Field } from '../sim/field';
import { hash32 } from '../sim/rng';
import { STATUS_IDS } from '../sim/status';
import type { BattleEvent, BattleInput, Placement } from '../sim/types';
import { getManifest } from './app';
import { H, W, hex } from './config';
import { Effects } from './Effects';
import { BOARD_PX_H, BOARD_PX_W, BOARD_X, BOARD_Y, FieldLayout, Y_SCALE } from './layout';
import { Numbers } from './Numbers';
import { scenePicture } from './Scenes';
import { SHEET, sheet } from './Sheet';
import { RARITY_MAT, STATUS_COLOR } from './ui/colors';
import { label, slab } from './ui/widgets';
import { UnitView } from './UnitView';

const ACCENTS: Record<string, Accent> = { arcane: ARCANE, fire: FIRE, frost: FROST, holy: HOLY, venom: VENOM };
const STATUS_TINTS: number[] = STATUS_IDS.map((id) => STATUS_COLOR[id]);

/** The magic color of what a unit shoots, if it shoots magic. */
function accentOf(kind: string | undefined): Accent | null {
  if (!kind || !kind.startsWith('orb-')) return null;
  return ACCENTS[kind.slice(4)] ?? null;
}

export interface BoardHooks {
  /** A battle has been fought to its end. Called once, a moment after, when the last blow has been seen. */
  onEnd?: (winner: number) => void;
  /** The player put one of their units on another tile. The team's placements are already changed. */
  onPlaced?: () => void;
  /**
   * A unit's level and grade, for the chips beside its health bar: a card's
   * for the player's, the stage's for the enemy's. Left out, or undefined
   * for a unit, and that unit has no chips.
   */
  standingOf?: (p: Placement, team: 'blue' | 'red') => { level: number; grade: number } | undefined;
}

export class BoardView {
  battle: Battle | null = null;
  /** The battle's own time as the board shows it, in seconds. Runs faster at 2x. */
  clock = 0;
  /** True from the moment units are asked for until they stand on the board. */
  loading = false;

  /**
   * The player's team, as the scene keeps it: its tiles written as the first
   * field's are (sim/field.ts), so that a formation is one thing on every
   * field. `seats` is where each stands on the field on show.
   */
  private team: Placement[] = [];
  private seats: Array<[number, number]> = [];
  private enemies: Placement[] = [];
  /** The field on show, on the screen. */
  private lay = new FieldLayout(FIRST_FIELD);
  /** The picture of the field's tiles, over the painted ground, and which it is. */
  private tiles: Phaser.GameObjects.Image | null = null;
  private tilesKey = '';
  private seed = 1;
  private views: UnitView[] = [];
  /** The player's views, in the order of `team`. */
  /** True while the player holds one of their units in the air. A battle must not start under it. */
  dragging = false;
  private mine: UnitView[] = [];
  private zones: Phaser.GameObjects.Zone[] = [];
  private acc = 0;
  private endAt = -1;
  private told = false;
  private readonly fx: Effects;
  private readonly numbers: Numbers;
  private shots: Phaser.GameObjects.Image[] = [];
  private shotIds: number[] = [];
  private callouts: Phaser.GameObjects.Text[] = [];
  private calloutAt: number[] = [];
  private tileHints: Phaser.GameObjects.Graphics;
  private hintTween: Phaser.Tweens.Tween | null = null;
  private dropMark: Phaser.GameObjects.Graphics;
  private pipIds: number[] = [0, 0, 0, 0];
  /** When each unit next gives off a mote of the status it is under, by its place in the battle. */
  private motes: number[] = [];
  private debug = false;
  private debugG: Phaser.GameObjects.Graphics;
  private debugText: Phaser.GameObjects.Text;
  private shown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly ground: Ground,
    private readonly hooks: BoardHooks = {},
  ) {
    // The ground is one painted picture with the board in it and the land's scenery round about
    // (art/backdrop.ts). Until it has loaded, the land's own color stands in for it.
    scene.cameras.main.setBackgroundColor(GROUND[ground].around);
    scenePicture(scene, 'board', ground);
    // A board that is gone holds nothing of the sheet's any more.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.offWipe?.());
    // A tap on anyone on the field, the enemy's or the player's own, says who they are.
    let downX = 0;
    let downY = 0;
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      downX = p.worldX;
      downY = p.worldY;
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const had = this.tipFor;
      this.hideTip();
      // A drag is not a tap.
      if (Math.abs(p.worldX - downX) > 12 || Math.abs(p.worldY - downY) > 12) return;
      const v = this.viewAt(p.worldX, p.worldY);
      if (v && v !== had) this.showTip(v);
    });

    this.fx = new Effects(scene);
    this.numbers = new Numbers(scene);
    this.dropMark = scene.add.graphics().setDepth(20);
    // The player's half, marked while they may arrange it. Drawn when a field is shown.
    this.tileHints = scene.add.graphics().setDepth(2).setVisible(false);
    this.debugG = scene.add.graphics().setDepth(8500).setVisible(false);
    this.debugText = label(scene, 12, H - 4, '', { size: 13, weight: 600, align: 'left' }).setOrigin(0, 1).setDepth(8501).setVisible(false);
    for (let i = 0; i < 6; i++) {
      this.callouts.push(label(scene, 0, 0, '', { size: 18, color: HOLY.fill }).setDepth(7200).setVisible(false));
      this.calloutAt.push(-1);
    }
  }

  // ------------------------------------------------------------ standing

  /** True while a battle is being fought. */
  get fighting(): boolean {
    return !!this.battle && !this.told;
  }

  /** The player's half of the board on the screen, for the tutorial to point at. */
  static myHalf(): { x: number; y: number; w: number; h: number } {
    return { x: BOARD_X, y: BOARD_Y - 60, w: BOARD_PX_W / 2, h: BOARD_PX_H + 60 };
  }

  /** The field on show. */
  get field(): Field {
    return this.lay.field;
  }

  /** Lays the board out for a field: its tiles' picture, the marks on the player's half, and how big things are drawn. */
  private layOut(field: Field): void {
    const key = `${this.ground}-${field.cols}x${field.rows}`;
    if (key === this.tilesKey) return;
    this.tilesKey = key;
    this.lay = new FieldLayout(field);
    this.fx.zoom = this.lay.zoom;
    this.numbers.zoom = this.lay.zoom;
    const { tileW, tileH, zoom } = this.lay;
    this.tileHints.clear();
    this.tileHints.fillStyle(hex(HIGHLIGHT), 0.16);
    for (let row = 0; row < this.lay.rows; row++) {
      for (let col = 0; col < this.lay.half; col++) {
        this.tileHints.fillRoundedRect(BOARD_X + col * tileW + 6 * zoom, BOARD_Y + row * tileH + 6 * zoom, tileW - 12 * zoom, tileH - 12 * zoom, 10 * zoom);
      }
    }
    // The tiles are a picture of their own, one to a field, laid over the ground's slab (art/backdrop.ts).
    this.tiles?.destroy();
    this.tiles = null;
    scenePicture(this.scene, 'tiles', key, 1, { x: BOARD_X, y: BOARD_Y, w: BOARD_PX_W, h: BOARD_PX_H }, (img) => {
      // Another field may have been asked for while this one's picture loaded.
      if (this.tilesKey === key) this.tiles = img;
      else img.destroy();
    });
  }

  /**
   * Stands these teams on their tiles, loading the art of any unit that is
   * new to the sheet. Whatever stood there before is gone, and a battle that
   * was on is called off. `team` is kept, not copied: dragging a unit changes it.
   * Its tiles are written as the first field's are; the enemy's are tiles of
   * `field`, the field the battle will be fought on.
   */
  show(team: Placement[], enemies: Placement[], seed: number, more: readonly string[] = [], field: Field = FIRST_FIELD): Promise<void> {
    const mine = ++this.shown;
    this.loading = true;
    this.layOut(field);
    this.team = team;
    this.seats = seatTeam(team, field);
    this.enemies = enemies;
    this.seed = seed;
    const atlas = sheet(this.scene.game, getManifest());
    // Whoever may be called up in the middle of the battle, by a barracks or by a boss: their art has to be there when they come.
    const called = (side: readonly Placement[], color: string): Array<{ team: string; unit: string }> => {
      const out: Array<{ team: string; unit: string }> = [];
      for (const p of side) {
        const unit = p.summons?.unit ?? UNITS[p.unit]?.summons?.unit;
        if (unit) out.push({ team: color, unit });
      }
      return out;
    };
    const wanted = [
      ...team.map((p) => ({ team: 'blue', unit: p.unit })),
      ...enemies.map((p) => ({ team: 'red', unit: p.unit })),
      ...called(team, 'blue'),
      ...called(enemies, 'red'),
      ...more.map((unit) => ({ team: 'red', unit })),
    ];
    // If the sheet has to make room, the units standing here go first: they are drawn from it.
    this.offWipe?.();
    this.offWipe = atlas.onWipe(() => this.clearUnits());
    return atlas.ensure(this.scene, wanted).then(() => {
      // Asked again while this was loading: the later asking has it.
      if (mine !== this.shown) return;
      // A field stood up and not yet fought on: the land's theme, calm. A battle called off comes back to it here.
      music.play(this.ground, 'calm');
      this.clearUnits();
      // The team may have been arranged while its art loaded.
      this.seats = seatTeam(team, field);
      this.mine = team.map((p, i) => this.makeView(p, 'blue', i, this.seats[i][0], this.seats[i][1]));
      const theirs = enemies.map((p, i) => this.makeView(p, 'red', i, p.col, p.row));
      this.views = [...this.mine, ...theirs];
      this.loading = false;
    });
  }

  /**
   * Holds this list as the team on show, if it is the same team in the same
   * places: whoever keeps the team may have made a new list of it, and a
   * drag is written into the list held here.
   */
  holdTeam(team: Placement[]): void {
    if (team.length !== this.team.length) return;
    for (let i = 0; i < team.length; i++) {
      if (team[i].unit !== this.team[i].unit || team[i].col !== this.team[i].col || team[i].row !== this.team[i].row) return;
    }
    this.team = team;
  }

  private makeView(p: Placement, team: 'blue' | 'red', n: number, col: number, row: number): UnitView {
    const def = UNITS[p.unit];
    const accent = accentOf(def.projectile?.kind);
    const at = this.hooks.standingOf?.(p, team);
    const view = new UnitView(
      this.scene,
      p.unit,
      team,
      getManifest().units[p.unit],
      hex(CLOTH[team].fill),
      accent ? hex(accent.light) : null,
      hash32(this.seed * 31 + n * 7 + (team === 'red' ? 1000 : 0)),
      (def.scale ?? 1) * (p.scale ?? 1),
      at === undefined
        ? null
        : {
            level: at.level,
            color: hex(RARITY_MAT[def.rarity].fill),
            grade: GRADES[Math.max(0, Math.min(GRADES.length - 1, at.grade))],
            gradeColor: hex(gradePlate(at.grade).fill),
          },
      def.trap ? 'trap' : def.still ? 'building' : 'unit',
      this.lay.zoom,
    );
    view.standing = at === undefined ? null : { level: at.level, grade: at.grade };
    view.x = this.lay.tileX(col);
    view.y = this.lay.tileY(row);
    view.stride = def.speed / 70;
    return view;
  }

  private offWipe: (() => void) | null = null;

  // ------------------------------------------------------------ who is that

  private tip: Phaser.GameObjects.GameObject[] = [];
  private tipFor: UnitView | null = null;
  private tipUntil = -1;

  /** Whoever stands under a point of the screen: the one nearest the front, if they overlap. */
  private viewAt(x: number, y: number): UnitView | null {
    let best: UnitView | null = null;
    for (const v of this.views) {
      if (!v || v.health <= 0) continue;
      const half = Math.max(30, v.height * 0.4);
      if (Math.abs(x - v.x) > half || y > v.y + 10 || y < v.y - v.height - 6) continue;
      if (!best || v.y > best.y) best = v;
    }
    return best;
  }

  private hideTip(): void {
    for (const o of this.tip) o.destroy();
    this.tip = [];
    this.tipFor = null;
    this.tipUntil = -1;
  }

  /**
   * The card a tap on a unit shows, beside it: its name on its tier's color,
   * what it stands at, its numbers if a battle is on, what it does, and its
   * skill. By the owner's word of 24 November 2026: "can i click over to the
   * enemy unit and it will show info about it on a tooltip?".
   */
  private showTip(v: UnitView): void {
    const def = UNITS[v.unitId];
    if (!def) return;
    const scene = this.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.tip.push(o);
      return o;
    };
    const w = 320;
    const pad = 14;
    const dark = { color: OUTLINE, stroke: null as null, align: 'left' as const };
    const texts: Phaser.GameObjects.Text[] = [];
    const line = (text: string, size: number, weight: 600 | 700 = 600): void => {
      texts.push(add(label(scene, 0, 0, text, { size, weight, wrap: w - pad * 2, ...dark }).setOrigin(0, 0).setDepth(8602)));
    };
    const role = def.kind === 'trap' ? 'Trap' : def.kind === 'building' ? 'Building' : def.role[0].toUpperCase() + def.role.slice(1);
    const at = v.standing;
    line(at ? `${RARITY[def.rarity].name} ${role}  ·  Level ${at.level}  ·  Grade ${GRADES[Math.max(0, Math.min(GRADES.length - 1, at.grade))]}` : `${RARITY[def.rarity].name} ${role}`, 14, 700);
    // What it has now, while a battle is on: the battle's own numbers, with everything that changes them counted.
    const i = this.battle ? this.views.indexOf(v) : -1;
    const u = i >= 0 ? this.battle?.units[i] : undefined;
    if (u && !def.trap) line(`Health ${Math.max(0, Math.round(u.hp))} of ${Math.round(u.maxHp)}${u.damage > 0 ? `  ·  Damage ${Math.round(u.damage)}` : ''}`, 14, 700);
    if (def.text) line(def.text, 14);
    if (def.skill) line(`${def.skill.name}: ${def.skill.text}`, 14);
    let tall = 44;
    for (const t of texts) tall += t.height + 6;
    tall += pad - 6;
    // Beside it, on the side with more room, and wholly on the screen.
    const x = Phaser.Math.Clamp(v.x < W / 2 ? v.x + 50 : v.x - 50 - w, 8, W - w - 8);
    const y = Phaser.Math.Clamp(v.y - v.height * 0.6 - tall / 2, 118, H - 100 - tall);
    const g = add(scene.add.graphics().setDepth(8600));
    slab(g, x, y, w, tall, BONE, 14, 6);
    slab(g, x + 6, y + 6, w - 12, 32, RARITY_MAT[def.rarity], 9, 3);
    add(label(scene, x + pad + 2, y + 21, def.name, { size: 19, align: 'left', strokeWidth: 4 }).setDepth(8602));
    add(label(scene, x + w - pad, y + 21, v.team === 'blue' ? 'YOURS' : 'ENEMY', { size: 12, align: 'right', strokeWidth: 3, color: v.team === 'blue' ? CLOTH.blue.fill : CLOTH.red.fill }).setDepth(8602));
    let ty = y + 46;
    for (const t of texts) {
      t.setPosition(x + pad, ty);
      ty += t.height + 6;
    }
    this.tipFor = v;
    this.tipUntil = this.clock + 7;
    sfx.play('pop', 0.6);
  }

  private clearUnits(): void {
    this.hideTip();
    this.setPlacement(false);
    for (const v of this.views) v.destroy();
    this.views = [];
    this.mine = [];
    this.battle = null;
    this.told = false;
    this.endAt = -1;
    this.acc = 0;
    for (const img of this.shots) img.setVisible(false);
    this.fx.clear();
    this.numbers.clear();
    for (let i = 0; i < this.callouts.length; i++) {
      this.callouts[i].setVisible(false);
      this.calloutAt[i] = -1;
    }
  }

  // ------------------------------------------------------------ placement

  /** Lets the player drag their units about their half, or stops them. */
  setPlacement(on: boolean): void {
    this.dragging = false;
    for (const z of this.zones) z.destroy();
    this.zones = [];
    this.dropMark.clear();
    this.hintTween?.stop();
    this.hintTween = null;
    this.tileHints.setVisible(on).setAlpha(1);
    if (!on) return;
    this.hintTween = this.scene.tweens.add({ targets: this.tileHints, alpha: 0.45, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const z = this.lay.zoom;
    this.mine.forEach((view, i) => {
      const zone = this.scene.add.zone(view.x, view.y - 50 * z, 100 * z, 130 * z).setInteractive({ draggable: true, useHandCursor: true });
      zone.setDepth(7500);
      this.zones.push(zone);
      zone.on('dragstart', () => {
        this.dragging = true;
        view.lift = 14;
        sfx.play('lift');
      });
      zone.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
        view.x = Phaser.Math.Clamp(x, 40, W - 40);
        view.y = Phaser.Math.Clamp(y + 50 * z, 120, H - 20);
        zone.setPosition(view.x, view.y - 50 * z);
        this.markDrop(view.x, view.y - 10 * z);
      });
      zone.on('dragend', () => {
        this.dragging = false;
        view.lift = 0;
        sfx.play('place');
        this.dropMark.clear();
        this.drop(i, view.x, view.y - 10 * z);
      });
    });
  }

  private markDrop(x: number, y: number): void {
    const g = this.dropMark;
    g.clear();
    const t = this.lay.tileAt(x, y);
    if (!t) return;
    const ok = isPlayerTile(t.col, t.row, this.lay.field);
    const { tileW, tileH, zoom } = this.lay;
    g.lineStyle(5, hex(ok ? HIGHLIGHT : CLOTH.red.fill), 0.95);
    g.strokeRoundedRect(BOARD_X + t.col * tileW + 5 * zoom, BOARD_Y + t.row * tileH + 5 * zoom, tileW - 10 * zoom, tileH - 10 * zoom, 12 * zoom);
  }

  /** A unit let go over a tile: it goes there, and whoever stood there takes its old place. */
  private drop(index: number, x: number, y: number): void {
    const t = this.lay.tileAt(x, y);
    const field = this.lay.field;
    const mine = this.seats[index];
    if (t && isPlayerTile(t.col, t.row, field) && (t.col !== mine[0] || t.row !== mine[1])) {
      // What the scene keeps is the tile as the first field would write it, so that the formation is the same on every field.
      const put = (i: number, col: number, row: number): void => {
        this.seats[i] = [col, row];
        const [wc, wr] = writtenTile(field, col, row);
        this.team[i].col = wc;
        this.team[i].row = wr;
      };
      const other = this.seats.findIndex((seat, i) => i !== index && seat[0] === t.col && seat[1] === t.row);
      if (other >= 0) {
        put(other, mine[0], mine[1]);
        this.settle(other);
      }
      put(index, t.col, t.row);
      this.hooks.onPlaced?.();
    }
    this.settle(index);
  }

  /** Glides a unit to the tile it belongs on. */
  private settle(index: number): void {
    const view = this.mine[index];
    const zone = this.zones[index];
    const [col, row] = this.seats[index];
    const up = 50 * this.lay.zoom;
    this.scene.tweens.add({
      targets: view,
      x: this.lay.tileX(col),
      y: this.lay.tileY(row),
      duration: 160,
      ease: 'Cubic.easeOut',
      onUpdate: () => zone?.active && zone.setPosition(view.x, view.y - up),
      onComplete: () => zone?.active && zone.setPosition(view.x, view.y - up),
    });
  }

  // ------------------------------------------------------------ the fight

  /** Starts the battle between the teams on show. `input`'s teams are theirs, with whatever multipliers they fight with. */
  start(input: BattleInput): void {
    if (this.loading || this.battle) return;
    this.setPlacement(false);
    this.scene.tweens.killTweensOf(this.mine);
    const battle = new Battle(input);
    // The simulation numbers units turn about; put the views in its order.
    const byTeam = [this.mine, this.views.slice(this.mine.length)];
    const next = [0, 0];
    const ordered: UnitView[] = [];
    for (const u of battle.units) ordered.push(byTeam[u.team][next[u.team]++]);
    this.views = ordered;
    for (let i = 0; i < ordered.length; i++) {
      ordered[i].x = this.lay.tileX(Math.floor(battle.units[i].x / TILE));
      ordered[i].y = this.lay.tileY(Math.floor(battle.units[i].y / TILE));
      ordered[i].setBarsVisible(true);
    }
    this.battle = battle;
    this.acc = 0;
    this.endAt = -1;
    this.told = false;
    sfx.play('fight');
    // The land's theme goes on, with its drums under it.
    music.play(this.ground, 'battle');
  }

  update(deltaMs: number, speed: number): void {
    // A long frame (a tab coming back) must not become a burst of steps.
    const dt = (Math.min(deltaMs, 100) / 1000) * speed;
    this.clock += dt;
    if (this.tipUntil >= 0 && this.clock >= this.tipUntil) this.hideTip();
    const battle = this.battle;

    if (battle && !this.told) {
      this.acc += dt;
      while (this.acc >= DT && !battle.ended) {
        battle.step();
        this.acc -= DT;
        for (let i = 0; i < battle.eventCount; i++) this.onEvent(battle, battle.events[i]);
      }
      if (battle.ended && this.endAt < 0) this.endAt = this.clock + 1.1;
      if (this.endAt >= 0 && this.clock >= this.endAt) {
        this.told = true;
        // The drums stop, and the music stands back for whatever is played over the result.
        music.play(this.ground, 'calm');
        music.duck(1.8);
        this.hooks.onEnd?.(battle.winner);
      }
    }

    if (battle) {
      const a = battle.ended ? 1 : Math.min(1, this.acc / DT);
      const units = battle.units;
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const v = this.views[i];
        if (!v) continue;
        if (u.alive) {
          v.x = this.lay.screenX(u.prevX + (u.x - u.prevX) * a);
          v.y = this.lay.screenY(u.prevY + (u.y - u.prevY) * a);
          v.facing = u.facing;
          v.moving = u.moving;
          v.health = u.hp / u.maxHp;
          let pips = 0;
          for (let k = 0; k < u.stTicks.length && pips < 4; k++) {
            if (u.stTicks[k] > 0) this.pipIds[pips++] = k;
          }
          v.setStatuses(this.pipIds, pips);
          // While a status is on a unit, motes of its color rise off it: it is seen from across the field.
          if (pips > 0 && this.clock >= (this.motes[i] ?? 0)) {
            this.motes[i] = this.clock + 0.4;
            const k = this.pipIds[(battle.tick >> 3) % pips];
            this.fx.spawn('fx/sparkle', v.x + (((i * 37 + battle.tick) % 40) - 20) * this.lay.zoom, v.y - v.height * 0.35, {
              dur: 0.55, vy: -60, from: 0.22, to: 0.5, hold: 0.4, alpha: 0.95, tint: STATUS_TINTS[k], spin: 3, depth: v.y + 2,
            });
          }
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
    // Everything below is written for the first field. On a bigger one, where it starts is scaled here; how big and fast it is, by the pool.
    const z = this.lay.zoom;
    const unit = this.lay.unit;
    switch (e.type) {
      case 'attackStart': {
        this.views[e.unit].attack(now, e.amount, e.kind !== 'attack' && e.kind !== 'heal');
        break;
      }
      case 'impact': {
        const u = battle.units[e.unit];
        const v = this.views[e.unit];
        // What leaves a hand is heard as it leaves: a string, a throw, a spell.
        if (e.kind === 'heal') break;
        if (u.def.projectile) {
          if (e.target >= 0) sfx.play(accentOf(u.def.projectile.kind) ? 'cast' : 'shoot', 0.8, 0.9 + (e.unit % 5) * 0.05);
          break;
        }
        sfx.play('slash', 0.8, 0.85 + (e.unit % 5) * 0.07);
        // A blade's arc, in front of whoever swung it.
        const big = e.kind !== 'attack';
        const k = v.scale / unit;
        this.fx.spawn('fx/slash', v.x + v.facing * 34 * v.scale, v.y - 62 * v.scale, {
          dur: 0.2, from: (big ? 1.1 : 0.85) * k, to: (big ? 1.6 : 1.15) * k, alpha: 0.95, hold: 0.25,
          flipX: v.facing < 0, tint: hex(HIGHLIGHT), depth: v.y + 2,
        });
        if (u.def.skill?.id === e.kind && u.def.skill.kind === 'cleave') {
          this.fx.spawn('fx/ring', v.x, v.y - 8 * z, {
            dur: 0.35, from: 0.3, to: ((u.def.skill.area ?? 1.2) * TILE) / 60, flat: Y_SCALE, alpha: 0.8, hold: 0.3,
            tint: hex(HIGHLIGHT), depth: 30,
          });
        }
        break;
      }
      case 'projectileHit': {
        const accent = accentOf(e.kind);
        const x = this.lay.screenX(e.x);
        const y = this.lay.screenY(e.y);
        let radius = 0;
        for (let i = 0; i < battle.shots.length; i++) if (battle.shots[i].id === e.id) radius = battle.shots[i].splashR;
        sfx.play(radius > 0 ? 'blast' : 'thud', radius > 120 ? 1 : 0.7, 0.9 + (e.id % 5) * 0.05);
        if (accent) {
          if (radius > 0) {
            this.fx.spawn('fx/ring', x, y - 6 * z, {
              dur: 0.4, from: 0.25, to: radius / 60, flat: Y_SCALE, alpha: 0.85, hold: 0.35, tint: hex(accent.light), depth: 30,
            });
          }
          this.fx.spawn('fx/spark', x, y - 52 * unit, {
            dur: 0.24, from: 0.4, to: 1.15, hold: 0.4, tint: hex(accent.light), rotation: (e.id % 6) * 0.5,
          });
        } else {
          this.fx.spawn('fx/spark', x, y - 52 * unit, { dur: 0.16, from: 0.3, to: 0.7, hold: 0.4, tint: hex(HIGHLIGHT), rotation: (e.id % 6) * 0.5 });
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
        else if (e.kind === 'poison') color = hex(VENOM.shade);
        else if (skill && t.team === 'red') color = hex(HOLY.fill);
        // Harm that goes on (a burn, a poison) is written with a minus, in its status's color, so that it is never taken for mending.
        this.numbers.show(t.x, t.y - t.height * 0.78, status ? `-${e.amount}` : String(e.amount), color, skill ? 34 : status ? 22 : 26);
        if (e.unit >= 0 && !battle.units[e.unit].def.projectile && !status) {
          sfx.play(skill ? 'bigHit' : 'hit', 0.9, 0.85 + (e.target % 5) * 0.07);
          this.fx.spawn('fx/spark', t.x - Math.sign(t.x - from) * 10 * z, t.y - 56 * unit, {
            dur: 0.16, from: 0.35, to: skill ? 1.1 : 0.8, hold: 0.4, tint: hex(HIGHLIGHT), rotation: (battle.tick % 7) * 0.45,
          });
        }
        break;
      }
      case 'heal': {
        const t = this.views[e.target];
        sfx.play('heal', 0.8);
        // Mending is pale gold with a plus. Poison is green, so green is never health coming back.
        this.numbers.show(t.x, t.y - t.height * 0.78, `+${e.amount}`, hex(HOLY.light), 26);
        for (let i = 0; i < 3; i++) {
          this.fx.spawn('fx/sparkle', t.x + (i - 1) * 22 * z, t.y - (30 + i * 14) * z, {
            dur: 0.6, delay: i * 0.07, vy: -70, from: 0.3, to: 0.7, hold: 0.5, tint: hex(HOLY.light), spin: 2,
          });
        }
        break;
      }
      case 'spawn': {
        // Called up in the middle of the battle: it takes its place after every unit that was there.
        const u = battle.units[e.unit];
        const view = this.makeView({ unit: e.kind, col: 0, row: 0, scale: u.scale }, u.team === 0 ? 'blue' : 'red', e.unit, 0, 0);
        view.x = this.lay.screenX(u.x);
        view.y = this.lay.screenY(u.y);
        view.facing = u.facing;
        view.setBarsVisible(true);
        this.views[e.unit] = view;
        sfx.play('spawn', 0.8, u.team === 0 ? 1 : 0.84);
        for (let i = 0; i < 4; i++) {
          this.fx.spawn('fx/dust', view.x + (i - 1.5) * 16 * z, view.y - 4 * z, { dur: 0.45, vx: (i - 1.5) * 50, vy: -30, from: 0.3, to: 0.8, hold: 0.3, alpha: 0.9, depth: view.y + 3 });
        }
        break;
      }
      case 'trap': {
        // A trap goes off: it jumps shut, and its blast is drawn as wide as it reaches.
        const v = this.views[e.unit];
        const trap = battle.units[e.unit].def.trap;
        v.die(now);
        const status = trap?.status?.id;
        const color = status ? STATUS_COLOR[status] ?? hex(HIGHLIGHT) : hex(HIGHLIGHT);
        // The snap of it, and then what it does.
        sfx.play('trap');
        sfx.play(status === 'burn' ? 'blast' : 'bigHit', 1, status ? 0.9 : 0.7);
        this.fx.spawn('fx/ring', v.x, v.y - 6 * z, {
          dur: 0.38, from: 0.25, to: ((trap?.radius ?? 1) * TILE) / 60, flat: Y_SCALE, alpha: 0.9, hold: 0.35, tint: color, depth: 30,
        });
        this.fx.spawn('fx/spark', v.x, v.y - 24 * z, { dur: 0.22, from: 0.5, to: 1.3, hold: 0.4, tint: color, rotation: (e.unit % 6) * 0.5 });
        for (let i = 0; i < 5; i++) {
          this.fx.spawn('fx/chip', v.x, v.y - 14 * z, {
            dur: 0.5, vx: (i - 2) * 80, vy: -200 - (i % 2) * 70, gravity: 760, spin: 9 * (i % 2 === 0 ? 1 : -1), hold: 0.7,
          });
        }
        break;
      }
      case 'death': {
        const v = this.views[e.unit];
        v.die(now);
        if (v.kind === 'building') {
          // A building comes down where it stands: dust to both sides of it, and more of it in the air.
          sfx.play('blast', 0.9, 0.7);
          for (let i = 0; i < 6; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            this.fx.spawn('fx/dust', v.x + side * (14 + i * 9) * z, v.y - 6 * z, {
              dur: 0.6, delay: 0.1 + i * 0.03, vx: side * (40 + i * 14), vy: -30 - i * 6, from: 0.4, to: 1 + i * 0.1, hold: 0.3,
              alpha: 0.9, depth: v.y + 3,
            });
          }
          for (let i = 0; i < 7; i++) {
            this.fx.spawn('fx/chip', v.x + (i - 3) * 8 * z, v.y - (40 + (i % 3) * 22) * z, {
              dur: 0.65, vx: (i - 3) * 70, vy: -170 - (i % 2) * 80, gravity: 700, spin: 8 * (i % 2 === 0 ? 1 : -1), hold: 0.7,
            });
          }
          break;
        }
        sfx.play('death', 1, 0.85 + (e.unit % 4) * 0.1);
        // Dust where it lands, when it lands.
        const back = -v.facing;
        for (let i = 0; i < 3; i++) {
          this.fx.spawn('fx/dust', v.x + back * (40 + i * 22) * unit, v.y - 4 * z, {
            dur: 0.5, delay: v.landsAt - now, vx: back * (30 + i * 26), vy: -26 - i * 8, from: 0.35, to: 0.8 + i * 0.12, hold: 0.3,
            alpha: 0.9, depth: v.y + 3,
          });
        }
        for (let i = 0; i < 4; i++) {
          this.fx.spawn('fx/chip', v.x, v.y - 50 * z, {
            dur: 0.55, vx: (i - 1.5) * 90, vy: -190 - (i % 2) * 60, gravity: 700, spin: 9 * (i % 2 === 0 ? 1 : -1), hold: 0.7,
          });
        }
        break;
      }
      case 'skill': {
        const v = this.views[e.unit];
        const skill = battle.units[e.unit].def.skill;
        sfx.play('skill', 0.9, 0.9 + (e.unit % 4) * 0.08);
        if (skill) this.callout(v.x, v.y - v.height - 24 * z, skill.name);
        break;
      }
      case 'status': {
        const v = this.views[e.unit];
        const color = STATUS_COLOR[e.kind as keyof typeof STATUS_COLOR];
        sfx.play('status');
        if (color !== undefined) {
          // A status lands: two rings in its color close on the unit, and its icon jumps up over it.
          const z = this.lay.zoom;
          this.fx.spawn('fx/ring', v.x, v.y - v.height * 0.45, { dur: 0.36, from: 1.5 * z, to: 0.4 * z, alpha: 1, hold: 0.5, tint: color, depth: v.y + 2 });
          this.fx.spawn('fx/ring', v.x, v.y - v.height * 0.45, { dur: 0.36, delay: 0.1, from: 1.1 * z, to: 0.3 * z, alpha: 0.9, hold: 0.5, tint: color, depth: v.y + 2 });
          this.fx.spawn(`icon/status-${e.kind}`, v.x, v.y - v.height - 26 * z, { dur: 0.8, vy: -34, from: 0.62 * z, to: 0.4 * z, hold: 0.75, depth: 7000 });
        }
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
        img = this.scene.add.image(0, 0, SHEET, 'fx/arrow').setVisible(false);
        this.shots[i] = img;
        this.shotIds[i] = -1;
      }
      if (!s.active) {
        if (img.visible) img.setVisible(false);
        this.shotIds[i] = -1;
        continue;
      }
      const fresh = this.shotIds[i] !== s.id;
      if (fresh) {
        this.shotIds[i] = s.id;
        img.setTexture(SHEET, getManifest().fx[s.kind] ? `fx/${s.kind}` : 'fx/arrow');
        img.setScale(0.5 * (s.splashR > 150 ? 1.5 : 1) * this.lay.zoom);
      }
      const x = s.prevX + (s.x - s.prevX) * a;
      const y = s.prevY + (s.y - s.prevY) * a;
      // It leaves from the height of what shot it and comes down to chest height, with a little rise between.
      const gone = Math.hypot(x - s.fromX, y - s.fromY);
      const left = Math.hypot(s.tx - x, s.ty - y);
      const k = gone + left > 0.001 ? gone / (gone + left) : 1;
      const src = this.views[s.src];
      const h0 = src.muzzleHeight();
      const h1 = 56 * this.lay.unit;
      const arc = (s.kind === 'arrow' || s.kind === 'javelin' ? 16 : 6) * this.lay.zoom;
      const height = h0 + (h1 - h0) * k + arc * Math.sin(k * Math.PI);
      const px = this.lay.screenX(x) + src.muzzleReach() * (1 - k);
      const py = this.lay.screenY(y) - height;
      // It points the way it is going: from where it was drawn last to where it is now.
      if (!fresh && img.visible) {
        const dx = px - img.x;
        const dy = py - img.y;
        if (dx * dx + dy * dy > 0.01) img.rotation = Math.atan2(dy, dx);
      } else {
        img.rotation = Math.atan2(this.lay.screenY(s.ty) - h1 - py, this.lay.screenX(s.tx) - px);
        img.setVisible(true);
      }
      img.x = px;
      img.y = py;
      img.depth = this.lay.screenY(y) + 1;
    }
  }

  // ------------------------------------------------------------ debug

  toggleDebug(): void {
    this.debug = !this.debug;
    this.debugG.setVisible(this.debug).clear();
    this.debugText.setVisible(this.debug);
  }

  /** A line the scene adds to the debug overlay: its own state. */
  debugNote = '';

  private drawDebug(): void {
    const g = this.debugG;
    g.clear();
    g.lineStyle(1.5, 0xffffff, 0.5);
    const lay = this.lay;
    for (let col = 0; col <= lay.cols; col++) g.lineBetween(BOARD_X + col * lay.tileW, BOARD_Y, BOARD_X + col * lay.tileW, BOARD_Y + BOARD_PX_H);
    for (let row = 0; row <= lay.rows; row++) g.lineBetween(BOARD_X, BOARD_Y + row * lay.tileH, BOARD_X + BOARD_PX_W, BOARD_Y + row * lay.tileH);
    const battle = this.battle;
    let alive = 0;
    if (battle) {
      for (let i = 0; i < battle.units.length; i++) {
        const u: SimUnit = battle.units[i];
        if (!u.alive) continue;
        alive++;
        const v = this.views[i];
        g.lineStyle(1.5, u.team === 0 ? hex(CLOTH.blue.fill) : hex(CLOTH.red.fill), 0.9);
        g.strokeEllipse(v.x, v.y, u.rangePx * 2 * lay.zoom, u.rangePx * 2 * Y_SCALE * lay.zoom);
        g.lineStyle(1, 0xffffff, 0.6);
        g.strokeEllipse(v.x, v.y, u.radiusPx * 2 * lay.zoom, u.radiusPx * 2 * Y_SCALE * lay.zoom);
        if (u.target >= 0 && battle.units[u.target].alive) {
          const t = this.views[u.target];
          g.lineStyle(2, u.team === 0 ? hex(CLOTH.blue.fill) : hex(CLOTH.red.fill), 0.8);
          g.lineBetween(v.x, v.y, t.x, t.y);
        }
      }
    } else {
      const stood = [...this.team.map((p, i) => ({ unit: p.unit, col: this.seats[i]?.[0] ?? 0, row: this.seats[i]?.[1] ?? 0 })), ...this.enemies];
      for (const p of stood) {
        const def = UNITS[p.unit];
        g.lineStyle(1.5, 0xffffff, 0.7);
        g.strokeEllipse(lay.tileX(p.col), lay.tileY(p.row), def.range * TILE * 2 * lay.zoom, def.range * TILE * 2 * Y_SCALE * lay.zoom);
      }
    }
    const atlas = sheet(this.scene.game, getManifest());
    this.debugText.setText(
      `${Math.round(this.scene.game.loop.actualFps)} fps   seed ${this.seed}   ${this.debugNote}` +
        (battle ? `   t ${battle.time.toFixed(2)} s   tick ${battle.tick}   alive ${alive}` : '') +
        `   sheet: ${atlas.usage()}`,
    );
  }
}
