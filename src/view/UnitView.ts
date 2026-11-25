// One unit on the board: its parts as sprites, moved every frame by the rig.
//
// Nothing here is frame-by-frame drawing. Every movement is a pose (a set of
// offsets for the parts) blended in and out over time: standing and
// breathing, hopping along, winding up and striking, being hit, falling.
// The blends are worked out from the battle's own clock, so a blow lands on
// the frame the simulation says it lands, at any speed.
//
// Nothing is allocated per frame.

import { STATUS_IDS } from '../sim/status';
import Phaser from 'phaser';
import type { ManifestUnit } from '../art/manifest';
import { ATTACK_POSES, HIT_POSE, HOP_POSE, LAND_POSE } from '../art/poses';
import { FEET_X, FEET_Y, addPose, clearPose, makeXforms, restPose, solve, type PartXform, type Pose } from '../art/rig';
import { HOLY, OUTLINE } from '../art/kit/palette';
import { ART_SCALE, hex } from './config';
import { DIGITS_KEY, PLATE_TEXT } from './Numbers';
import { UNIT_SCALE } from './layout';
import { SHEET, Sheet } from './Sheet';

const RAD = Math.PI / 180;
const INV_ART = 1 / ART_SCALE;

/** Seconds a blow takes to come back to rest after it lands. */
const RECOVER = 0.3;
/** Seconds a hit's flinch lasts, and its white flash. */
const FLINCH = 0.26;
const FLASH = 0.07;
/** Seconds to fall over, to lie there, and to fade. */
const FALL = 0.42;
const LIE = 0.55;
const FADE = 0.45;
/** Seconds a trap takes to snap and be gone. */
const SNAP = 0.34;

/**
 * What kind of thing a view is. A unit breathes, hops along, swings and
 * topples. A building does none of that: only its flag stirs, a shot kicks
 * it a little, and it comes down where it stands. A trap lies flat on the
 * ground under everyone's feet, has no plate, and jumps once as it goes off.
 */
export type ViewKind = 'unit' | 'building' | 'trap';

/** Where a trap is drawn: over the ground and the marks on it, under every unit. */
const TRAP_DEPTH = 3;
/** The ring round a trap: how wide on the screen, and how flat, as the ground is seen from above. */
const MARK_W = 108;
const MARK_FLAT = 0.5;

/**
 * The plate over a unit: its health as a bar with the number on it, its
 * level on a chip at the bar's left and, on the first field, its grade on
 * one at its right. Its figures are never smaller than PLATE_TEXT, on any
 * field: they are read in a frame of 821 by 462 on a portal's page, where
 * the layout is drawn at two thirds of its size. So on a bigger field, where
 * a unit is drawn smaller, the plate is not, and there it has no grade: all
 * three at a size that can be read are half as wide again as a tile of the
 * biggest field, and plates that lapped that far were a row of figures no
 * one could tell apart. The grade is still told there: on the card a tap on
 * the unit shows, and for the enemy on the stage's own line, as all of a
 * stage stand at one grade.
 *
 * It is one row, never two: a column of units is the common thing, and a
 * plate two rows tall hid most of whoever stood in the row above it.
 */
const BAR_W = 54;
/** The bar on a field of smaller tiles: room for four figures and no more. */
const BAR_W_SMALL = 50;
const BAR_H = 18;
/** How far over a unit's head the middle of its bar is: the plate's dark edge just clears the head. */
const PLATE_UP = 11;
/**
 * A chip is as tall as the bar, and wider than its figures by enough of its
 * own color to be seen as a box: one figure, or two. With less, a level, a
 * health and a grade ran together and read as one number.
 */
const CHIP_W = 25;
const CHIP_W_TWO = 35;
/** The dark between a chip and the bar. */
const CHIP_GAP = 6;

/** What the plate over a unit says besides its health. */
export interface UnitPlate {
  level: number;
  /** The color of its tier. */
  color: number;
  /** The letter of its grade, and the color of that grade's plate. */
  grade: string;
  gradeColor: number;
}
const MAX_PIPS = 4;
/** How big a status's icon is over a unit. */
const PIP = 24;
/** The ring under a unit whose skill can be called: how wide on the screen at the least, and how flat, as the ground is seen from above. */
const CALL_RING = 92;
const CALL_FLAT = 0.55;
/** How big the badge over it is: a hand on gold, pointing down at it. */
const CALL_BADGE = 52;
/** The frame of each status's icon, by its place in STATUS_IDS. */
const STATUS_FRAMES: readonly string[] = STATUS_IDS.map((id) => `icon/status-${id}`);

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}
function easeInQuad(t: number): number {
  return t * t;
}
function easeOutBack(t: number): number {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export class UnitView {
  readonly root: Phaser.GameObjects.Container;
  /** Where its feet are on the screen. Set these, then call update. */
  x = 0;
  y = 0;
  facing: 1 | -1 = 1;
  moving = false;
  /** Raised off the ground while it is being dragged. */
  lift = 0;
  /** Hopping on the spot: the winners do, when a battle ends. */
  cheering = false;
  /** 0 to 1. */
  health = 1;
  /** How fast it hops when walking: its speed over the usual. */
  stride = 1;

  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly xf: PartXform[];
  private readonly pose: Pose = restPose();
  private readonly weaponIndex: number;
  private readonly glow: Phaser.GameObjects.Image | null;
  /**
   * The ring round a trap, in its side's color. A trap is low, and whoever
   * stands on the tile in front of it hides it: the ring is wider than they
   * are, and says whose it is.
   */
  private readonly mark: Phaser.GameObjects.Image | null = null;
  private readonly barBack: Phaser.GameObjects.Image;
  private readonly barLag: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;
  private readonly phase: number;
  private readonly barW: number;
  private readonly pips: Phaser.GameObjects.Image[] = [];
  private readonly pipIds: number[] = [];
  private pipCount = 0;
  /** The chip at the left of the health bar: the unit's level on its tier's color. Null if its level is not told. */
  private readonly chipBack: Phaser.GameObjects.Image | null = null;
  private readonly chipFill: Phaser.GameObjects.Image | null = null;
  private readonly chipText: Phaser.GameObjects.BitmapText | null = null;
  private readonly chipW: number = 0;
  /** The chip at the right of it: the letter of its grade on the color of that grade's plate. */
  private readonly gradeBack: Phaser.GameObjects.Image | null = null;
  private readonly gradeFill: Phaser.GameObjects.Image | null = null;
  private readonly gradeText: Phaser.GameObjects.BitmapText | null = null;

  /**
   * The health it has left, as a number: shown on its health bar. The board
   * sets it while a battle is on. Below zero, nothing is shown.
   */
  hp = -1;
  private hpShown = -2;
  private readonly hpText: Phaser.GameObjects.BitmapText;

  /** The level and grade it stands at, if they are told: for the card a tap on it shows. */
  standing: { level: number; grade: number } | null = null;

  private turn: number;
  private hopT = 0;
  private hopBlend = 0;
  private actAt = -1;
  private actWindup = 0.3;
  private actBig = false;
  private hitAt = -1;
  private hitDir = 1;
  private flashOn = false;
  private deadAt = -1;
  private lagHealth = 1;
  private gone = false;
  private barsOn = false;
  /** The way its side faces. A building and a trap never turn from it. */
  private readonly side: 1 | -1;
  /** How big its canvas is drawn: the usual scale, times the zoom of its field. */
  private readonly unit: number;
  private readonly gradeW: number;
  /** How far right of the unit's middle the bar's middle is: the plate as a whole stands over the unit, whatever chips it has. */
  private readonly barShift: number;

  /**
   * What says its skill can be called: a ring of gold under it on a patch
   * of light, a hoop that closes on it as its time runs out, and over it a
   * badge with a hand that points down at it. They are made the first time
   * they are wanted, as only the player's own units ever want them.
   */
  private callRing: Phaser.GameObjects.Image | null = null;
  private callGlow: Phaser.GameObjects.Image | null = null;
  private callClose: Phaser.GameObjects.Image | null = null;
  private callHand: Phaser.GameObjects.Image | null = null;
  private callOn = false;
  private callLeft = 1;
  /** True while the tutorial's own hand is on it: then the badge is away. */
  private callQuiet = false;
  /** Counts down from a call, for the jump a unit gives when it is called. */
  private calledFor = 0;

  constructor(
    scene: Phaser.Scene,
    readonly unitId: string,
    readonly team: 'blue' | 'red',
    private readonly art: ManifestUnit,
    barColor: number,
    glowColor: number | null,
    seed: number,
    /** How much bigger than a usual unit it is drawn: a boss is. */
    private readonly size = 1,
    /** What the chips beside its health bar say: its level on the color of its tier, and its grade on its plate's. */
    plate: UnitPlate | null = null,
    readonly kind: ViewKind = 'unit',
    /** The zoom of the field it stands on: 1 on the first, less on a bigger one, where everything is drawn smaller. */
    zoom = 1,
  ) {
    this.unit = UNIT_SCALE * zoom;
    this.gradeW = CHIP_W;
    this.root = scene.add.container(0, 0);
    this.xf = makeXforms(art.parts.length);
    let weapon = -1;
    art.parts.forEach((part, i) => {
      // The frame knows its own pivot (Sheet sets it), so the sprite turns about the right point.
      const img = scene.add.image(0, 0, SHEET, Sheet.unitFrame(team, unitId, part.name));
      img.setScale(INV_ART);
      this.sprites.push(img);
      this.root.add(img);
      if (part.role === 'weapon') weapon = i;
    });
    this.weaponIndex = weapon;

    // The glow a caster gathers at the tip of what it holds.
    this.glow = null;
    if (glowColor !== null && (weapon >= 0 || kind === 'building')) {
      this.glow = scene.add.image(0, 0, SHEET, 'fx/disc').setScale(0).setTint(glowColor);
      this.root.add(this.glow);
    }

    if (kind === 'trap') {
      this.mark = scene.add.image(0, 0, SHEET, 'fx/ring').setTint(barColor).setDisplaySize(MARK_W * zoom, MARK_W * MARK_FLAT * zoom).setDepth(TRAP_DEPTH - 0.5);
    }

    this.barBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setOrigin(0.5, 0.5);
    this.barLag = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(0xffffff).setOrigin(0, 0.5);
    this.barFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(barColor).setOrigin(0, 0.5);
    this.barW = Math.round((zoom < 1 ? BAR_W_SMALL : BAR_W) * (1 + (size - 1) * 1.6));
    this.barBack.setDisplaySize(this.barW + 6, BAR_H + 6);
    // The health left, in figures, over the bar: the bar says how much of it, this says how much.
    this.hpText = scene.add.bitmapText(0, 0, DIGITS_KEY, '', PLATE_TEXT).setOrigin(0.5).setVisible(false);
    this.hpText.setLetterSpacing(-14);
    for (let i = 0; i < MAX_PIPS; i++) {
      // Each is the icon of a status (art/icons.ts), big enough to be told apart in a fight.
      this.pips.push(scene.add.image(0, 0, SHEET, STATUS_FRAMES[0]).setDisplaySize(PIP, PIP).setVisible(false));
      this.pipIds.push(0);
    }
    let shift = 0;
    if (plate && kind !== 'trap') {
      // Wide enough for the number: one digit or two.
      this.chipW = plate.level >= 10 ? CHIP_W_TWO : CHIP_W;
      shift = (this.chipW + CHIP_GAP) / 2;
      this.chipBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setDisplaySize(this.chipW + 6, BAR_H + 6);
      this.chipFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(plate.color).setDisplaySize(this.chipW, BAR_H);
      // The level is in gold and the health beside it in white: two numbers side by side, told apart by color.
      this.chipText = scene.add.bitmapText(0, 0, DIGITS_KEY, String(plate.level), PLATE_TEXT).setOrigin(0.5).setTint(hex(HOLY.fill));
      this.chipText.setLetterSpacing(-14);
      if (zoom >= 1) {
        // The grade, where the field's tiles are wide enough for it.
        this.gradeBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setDisplaySize(this.gradeW + 6, BAR_H + 6);
        this.gradeFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(plate.gradeColor).setDisplaySize(this.gradeW, BAR_H);
        this.gradeText = scene.add.bitmapText(0, 0, DIGITS_KEY, plate.grade, PLATE_TEXT).setOrigin(0.5);
        shift -= (this.gradeW + CHIP_GAP) / 2;
      }
    }
    this.barShift = shift;
    this.setBarsVisible(false);

    // Its own rhythm, so that a row of units does not breathe as one.
    this.phase = ((seed * 2654435761) >>> 0) / 4294967296 * 20;
    this.side = team === 'blue' ? 1 : -1;
    this.turn = this.side;
    this.facing = this.side;
  }

  /** A blow, a shot or a cast begins and will land in `windup` seconds. */
  attack(now: number, windup: number, big: boolean): void {
    this.actAt = now;
    this.actWindup = Math.max(0.05, windup);
    this.actBig = big;
  }

  /** It was hurt. `fromX` is where the blow came from, on the screen. */
  hit(now: number, fromX: number): void {
    this.hitAt = now;
    const away = this.x >= fromX ? 1 : -1;
    // In the unit's own frame, back is negative: knocked the way the blow was going.
    this.hitDir = away === this.facing ? -1 : 1;
  }

  die(now: number): void {
    if (this.deadAt < 0) this.deadAt = now;
    this.actAt = -1;
    this.moving = false;
  }

  get dead(): boolean {
    return this.deadAt >= 0;
  }

  /** When the falling unit meets the ground, for the dust. */
  get landsAt(): number {
    return this.deadAt + FALL;
  }

  /** The point on the screen where its shots leave from, with `out` filled as [x, height]. */
  muzzleHeight(): number {
    return (180 - this.art.muzzle[1]) * this.unit * this.size;
  }
  muzzleReach(): number {
    return (this.art.muzzle[0] - 96) * this.unit * this.size * this.facing;
  }

  /** How tall it stands, for what floats over it. */
  get height(): number {
    return (180 - this.art.top) * this.unit * this.size;
  }

  /** Its scale on the board, for effects that should match it. */
  get scale(): number {
    return this.unit * this.size;
  }

  /**
   * Shows the icon of each status in `ids` over the health bar (the first
   * `count` of them, each a place in STATUS_IDS). Called every frame; nothing
   * is allocated, and an icon is changed only when the status in its place is.
   */
  setStatuses(ids: readonly number[], count: number): void {
    const n = Math.min(count, MAX_PIPS);
    for (let i = 0; i < n; i++) {
      if (this.pipIds[i] === ids[i]) continue;
      this.pipIds[i] = ids[i];
      this.pips[i].setFrame(STATUS_FRAMES[ids[i]]);
      this.pips[i].setDisplaySize(PIP, PIP);
    }
    this.pipCount = n;
  }

  /** Everything this is drawn with: for a camera that is not to show it. */
  things(): Phaser.GameObjects.GameObject[] {
    const out: Array<Phaser.GameObjects.GameObject | null> = [
      this.root, this.mark, this.barBack, this.barLag, this.barFill, this.hpText, this.chipBack, this.chipFill, this.chipText, this.gradeBack,
      this.gradeFill, this.gradeText, this.callRing, this.callGlow, this.callClose, this.callHand, ...this.pips,
    ];
    return out.filter((o): o is Phaser.GameObjects.GameObject => !!o);
  }

  /**
   * Says whether its skill can be called now, and how much of its time is
   * left before the skill goes off by itself: 1 when it can first be called,
   * 0 when it is ready. The board asks the battle and tells it every frame.
   */
  setCallable(on: boolean, left = 1, quiet = false): void {
    this.callLeft = left;
    if (on === this.callOn && quiet === this.callQuiet) return;
    this.callOn = on;
    this.callQuiet = quiet;
    if (on && !this.callRing) {
      const scene = this.root.scene;
      this.callGlow = scene.add.image(0, 0, SHEET, 'fx/disc').setTint(hex(HOLY.fill));
      this.callRing = scene.add.image(0, 0, SHEET, 'fx/call');
      this.callClose = scene.add.image(0, 0, SHEET, 'fx/hoop');
      this.callHand = scene.add.image(0, 0, SHEET, 'icon/call').setDisplaySize(CALL_BADGE, CALL_BADGE);
    }
    this.callRing?.setVisible(on);
    this.callGlow?.setVisible(on);
    this.callClose?.setVisible(on);
    this.callHand?.setVisible(on && !quiet);
  }

  /** The top of everything that stands over it, its plate included: for a hand that comes down on it from above. */
  get crown(): number {
    return this.y - this.height - PLATE_UP - (BAR_H / 2 + 3);
  }

  /** True while its skill can be called. */
  get callable(): boolean {
    return this.callOn;
  }

  /** The player called its skill: it jumps, so that the press is seen to have landed before the skill is. */
  called(): void {
    this.calledFor = 0.22;
  }

  /** The health bar shows only while there is a fight on. */
  setBarsVisible(on: boolean): void {
    // A trap has no health to show.
    if (this.kind === 'trap') on = false;
    this.barBack.setVisible(on);
    this.barLag.setVisible(on);
    this.barFill.setVisible(on);
    this.chipBack?.setVisible(on);
    this.chipFill?.setVisible(on);
    this.chipText?.setVisible(on);
    this.gradeBack?.setVisible(on);
    this.gradeFill?.setVisible(on);
    this.gradeText?.setVisible(on);
    if (!on) for (let i = 0; i < this.pips.length; i++) this.pips[i].setVisible(false);
    if (!on) this.hpText.setVisible(false);
    this.barsOn = on;
  }

  /**
   * `real` is the time on the wall, in seconds: what says a skill can be
   * called beats to it and not to the battle's clock, which the first
   * tutorial all but stops.
   */
  update(now: number, dt: number, real = now): void {
    if (this.gone) return;
    const p = this.pose;
    clearPose(p);
    const t = now + this.phase;
    const fixed = this.kind !== 'unit';
    if (fixed) this.facing = this.side;

    if (!fixed) {
      // Standing: a slow breath, the head a beat behind, what is held swaying.
      const breath = Math.sin(t * 2.7);
      p.bodySy += 0.022 * breath;
      p.bodySx -= 0.014 * breath;
      p.headY += 1.1 * Math.sin(t * 2.7 - 0.7);
      p.headRot += 1.4 * Math.sin(t * 1.6);
      p.weaponRot += 2.6 * Math.sin(t * 2.1 + 1);
      p.offRot += 1.8 * Math.sin(t * 1.9 + 2);
    }
    // A flag stirs on a building as a plume does on a helm, and harder for the side that has won.
    p.extraRot += (fixed && this.cheering ? 9 : 5) * Math.sin(t * (fixed && this.cheering ? 5 : 2.3) + 0.5);

    // Walking, and cheering, are small hops.
    const hopping = !fixed && (this.moving || this.cheering) && this.deadAt < 0;
    this.hopBlend += ((hopping ? 1 : 0) - this.hopBlend) * Math.min(1, dt * 12);
    if (hopping || this.hopBlend > 0.02) {
      this.hopT += dt * (this.cheering ? 2.4 : 2.9 * this.stride);
      const h = Math.abs(Math.sin(this.hopT * Math.PI));
      addPose(p, HOP_POSE, h * this.hopBlend);
      const land = 1 - h;
      addPose(p, LAND_POSE, land * land * land * land * this.hopBlend);
      if (this.cheering) p.weaponRot -= 30 * h * this.hopBlend;
    } else {
      this.hopT = 0;
    }

    // A blow: back, a held breath, then through, to arrive exactly on time.
    let charge = 0;
    if (this.actAt >= 0 && fixed) {
      // A tower does not lean into a shot. It gathers, and the shot's kick sets it back a little.
      const e = now - this.actAt;
      if (e < this.actWindup) charge = Math.min(1, e / this.actWindup / 0.7);
      else {
        const r = (e - this.actWindup) / RECOVER;
        if (r >= 1) this.actAt = -1;
        else {
          const k = (1 - r) * (1 - r);
          p.bodySy -= 0.05 * k;
          p.bodySx += 0.03 * k;
          charge = Math.max(0, 1 - r * 3);
        }
      }
    } else if (this.actAt >= 0) {
      const poses = ATTACK_POSES[this.art.style];
      const e = now - this.actAt;
      const reach = this.actBig ? 1.3 : 1;
      if (e < this.actWindup) {
        const u = e / this.actWindup;
        if (u < 0.55) addPose(p, poses.windup, easeOutCubic(u / 0.55) * reach);
        else if (u < 0.78) addPose(p, poses.windup, reach * (1 + 0.06 * Math.sin(((u - 0.55) / 0.23) * Math.PI)));
        else {
          const k = easeInQuad((u - 0.78) / 0.22);
          addPose(p, poses.windup, (1 - k) * reach);
          addPose(p, poses.strike, k * reach);
        }
        charge = Math.min(1, u / 0.7);
      } else {
        const r = (e - this.actWindup) / RECOVER;
        if (r >= 1) this.actAt = -1;
        else {
          addPose(p, poses.strike, (1 - easeOutBack(Math.min(1, r * 1.1))) * reach);
          charge = Math.max(0, 1 - r * 3);
        }
      }
    }

    // A hit: knocked back and squashed, and white for a moment.
    let flash = false;
    if (this.hitAt >= 0) {
      const e = now - this.hitAt;
      if (e >= FLINCH) this.hitAt = -1;
      else {
        const k = e < 0.04 ? e / 0.04 : 1 - (e - 0.04) / (FLINCH - 0.04);
        // A wall does not flinch: it shudders.
        if (fixed) p.rootX += 2.4 * Math.sin(e * 95) * k;
        else addPose(p, HIT_POSE, k);
        if (!fixed && this.hitDir > 0) {
          // Struck from behind: the same flinch, the other way.
          p.rootX -= 2 * HIT_POSE.rootX * k;
          p.bodyRot -= 2 * HIT_POSE.bodyRot * k;
          p.headRot -= 2 * HIT_POSE.headRot * k;
        }
        flash = e < FLASH;
      }
    }
    if (flash !== this.flashOn) {
      this.flashOn = flash;
      for (let i = 0; i < this.sprites.length; i++) {
        const s = this.sprites[i];
        if (this.art.parts[i].role === 'shadow') continue;
        if (flash) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        else s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      }
    }

    // Falling: over backwards, a small bounce, a moment on the ground, gone.
    let alpha = 1;
    if (this.deadAt >= 0 && this.kind === 'trap') {
      // Gone off: it jumps shut and is gone.
      const k = (now - this.deadAt) / SNAP;
      if (k >= 1) {
        this.gone = true;
        this.root.setVisible(false);
        this.mark?.setVisible(false);
        return;
      }
      const jump = Math.sin(Math.min(1, k * 2) * Math.PI);
      p.bodySy += 0.9 * jump;
      p.bodySx += 0.25 * jump;
      alpha = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    } else if (this.deadAt >= 0 && this.kind === 'building') {
      // Brought down: it shudders and sinks into its own dust, where it stands.
      const e = now - this.deadAt;
      const k = Math.min(1, e / FALL);
      p.bodySy -= 0.82 * easeInQuad(k);
      p.bodySx += 0.12 * k;
      p.rootX += 2.6 * Math.sin(e * 70) * (1 - k);
      const fade = (e - FALL * 0.6) / FADE;
      if (fade >= 1) {
        this.gone = true;
        this.root.setVisible(false);
        this.setBarsVisible(false);
        return;
      }
      if (fade > 0) alpha = 1 - fade;
    } else if (this.deadAt >= 0) {
      const e = now - this.deadAt;
      const k = Math.min(1, e / FALL);
      let rot = -90 * easeInQuad(k);
      if (e > FALL) {
        const b = Math.min(1, (e - FALL) / 0.22);
        rot += 9 * Math.sin(b * Math.PI) * (1 - b);
      }
      p.rootRot += rot;
      p.rootY += -10 * Math.sin(k * Math.PI);
      p.rootX += -10 * k;
      p.weaponRot += -40 * k;
      p.headRot += -14 * k;
      const fade = (e - FALL - LIE) / FADE;
      if (fade >= 1) {
        this.gone = true;
        this.root.setVisible(false);
        this.setBarsVisible(false);
        return;
      }
      if (fade > 0) alpha = 1 - fade;
    }

    p.rootY -= this.lift;
    if (this.calledFor > 0) {
      // Called: a quick jump, up and back.
      this.calledFor = Math.max(0, this.calledFor - dt);
      const k = Math.sin((1 - this.calledFor / 0.22) * Math.PI);
      p.rootY -= 9 * k;
      p.bodySy += 0.08 * k;
    }

    solve(this.art.parts, p, this.xf);
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const o = this.xf[i];
      s.x = o.x;
      s.y = o.y;
      s.rotation = o.rot * RAD;
      s.scaleX = o.sx * INV_ART;
      s.scaleY = o.sy * INV_ART;
    }

    if (this.glow) {
      if (this.weaponIndex >= 0) {
        const o = this.xf[this.weaponIndex];
        const part = this.art.parts[this.weaponIndex];
        const lx = this.art.muzzle[0] - part.pivot[0];
        const ly = this.art.muzzle[1] - part.pivot[1];
        const c = Math.cos(o.rot * RAD);
        const s = Math.sin(o.rot * RAD);
        this.glow.x = o.x + lx * c - ly * s;
        this.glow.y = o.y + lx * s + ly * c;
      } else {
        // A building holds nothing: what it throws gathers where it leaves from.
        this.glow.x = this.art.muzzle[0] - FEET_X;
        this.glow.y = this.art.muzzle[1] - FEET_Y;
      }
      const size = charge * (this.actBig ? 1.5 : 1) * (0.9 + 0.1 * Math.sin(now * 30));
      this.glow.setScale(size * INV_ART * 1.3);
      this.glow.setVisible(charge > 0.02);
    }

    // Turning round is a quick flip through flat, like a card.
    this.turn += (this.facing - this.turn) * Math.min(1, dt * 20);
    const root = this.root;
    root.x = this.x;
    root.y = this.y;
    root.scaleX = this.turn * this.unit * this.size;
    root.scaleY = this.unit * this.size;
    root.alpha = alpha;
    // A trap lies under everyone's feet: just over the ground, whoever stands in front of it or behind.
    root.depth = this.lift > 0 ? this.y + 1000 : this.kind === 'trap' ? TRAP_DEPTH : this.y;
    if (this.mark) {
      this.mark.x = this.x;
      this.mark.y = this.y - 8 * this.unit - this.lift;
      // It breathes a little, so that it is seen at the edge of whoever hides it; and goes as the trap does.
      this.mark.alpha = alpha * (0.55 + 0.2 * Math.sin(t * 3));
    }

    // The health bar: what is left in the team's color, what was just lost in white behind it.
    if (this.health < this.lagHealth) this.lagHealth = Math.max(this.health, this.lagHealth - dt * 0.6);
    else this.lagHealth = this.health;
    const BAR_W = this.barW;
    const mid = this.x + this.barShift;
    const bx = mid - BAR_W / 2;
    const by = this.y - this.height - PLATE_UP - this.lift;
    // The top of the plate, for what stands over it.
    const plateTop = by - BAR_H / 2 - 3;

    if (this.callOn && this.callRing && this.callGlow && this.callClose && this.callHand && this.deadAt < 0) {
      // A ring of gold under it that beats, a hoop that closes on it as its time runs out, and the badge bobbing over its plate.
      const beat = 0.5 + 0.5 * Math.sin(real * 11);
      const w = Math.max(CALL_RING, this.height * 0.95) * (1 + 0.1 * beat);
      const cy = this.y - 4;
      this.callGlow.setPosition(this.x, cy).setDisplaySize(w * 1.1, w * CALL_FLAT * 1.1);
      this.callGlow.alpha = 0.55 + 0.3 * beat;
      this.callGlow.depth = 4.8;
      this.callRing.setPosition(this.x, cy).setDisplaySize(w, w * CALL_FLAT);
      this.callRing.depth = 5;
      const far = 1.08 + 0.6 * this.callLeft;
      this.callClose.setPosition(this.x, cy).setDisplaySize(w * far, w * CALL_FLAT * far);
      this.callClose.alpha = 0.7;
      this.callClose.depth = 5.1;
      this.callHand.setPosition(this.x, (this.barsOn ? plateTop : this.y - this.height) - CALL_BADGE * 0.5 - 2 - 8 * beat);
      this.callHand.depth = 7100;
    }
    this.barBack.x = mid;
    this.barBack.y = by;
    this.barLag.x = bx;
    this.barLag.y = by;
    this.barFill.x = bx;
    this.barFill.y = by;
    this.barLag.setDisplaySize(Math.max(0.001, BAR_W * this.lagHealth), BAR_H);
    this.barFill.setDisplaySize(Math.max(0.001, BAR_W * this.health), BAR_H);
    const depth = 5000 + this.y;
    this.barBack.depth = depth;
    this.barLag.depth = depth + 0.1;
    this.barFill.depth = depth + 0.2;
    const figures = this.barsOn && this.hp >= 0 && this.deadAt < 0;
    if (this.hpText.visible !== figures) this.hpText.setVisible(figures);
    if (figures) {
      const whole = Math.ceil(this.hp);
      if (whole !== this.hpShown) {
        this.hpShown = whole;
        // Five figures do not fit the bar at a size that can be read: ten thousand and over is said in thousands.
        this.hpText.setText(whole >= 10000 ? `${Math.floor(whole / 1000)}K` : String(whole));
      }
      this.hpText.setPosition(mid, by - 1);
      this.hpText.depth = depth + 0.35;
      this.hpText.alpha = alpha;
    }
    this.barBack.alpha = alpha;
    this.barLag.alpha = alpha;
    this.barFill.alpha = alpha;
    if (this.chipBack && this.chipFill && this.chipText) {
      // The chip stands at the bar's left end, touching it, so the two read as one plate.
      const cx = bx - CHIP_GAP - this.chipW / 2;
      this.chipBack.setPosition(cx, by);
      this.chipFill.setPosition(cx, by);
      this.chipText.setPosition(cx, by - 1);
      this.chipBack.depth = depth;
      this.chipFill.depth = depth + 0.1;
      this.chipText.depth = depth + 0.2;
      this.chipBack.alpha = alpha;
      this.chipFill.alpha = alpha;
      this.chipText.alpha = alpha;
    }
    if (this.gradeBack && this.gradeFill && this.gradeText) {
      // And the grade at the bar's right end, so that the bar stays over the middle of the unit.
      const gx = bx + BAR_W + CHIP_GAP + this.gradeW / 2;
      this.gradeBack.setPosition(gx, by);
      this.gradeFill.setPosition(gx, by);
      this.gradeText.setPosition(gx, by - 1);
      this.gradeBack.depth = depth;
      this.gradeFill.depth = depth + 0.1;
      this.gradeText.depth = depth + 0.2;
      this.gradeBack.alpha = alpha;
      this.gradeFill.alpha = alpha;
      this.gradeText.alpha = alpha;
    }

    for (let i = 0; i < this.pips.length; i++) {
      const pip = this.pips[i];
      const on = this.barsOn && i < this.pipCount && this.deadAt < 0;
      if (pip.visible !== on) pip.setVisible(on);
      if (!on) continue;
      pip.x = this.x - ((this.pipCount - 1) * (PIP + 2)) / 2 + i * (PIP + 2);
      pip.y = plateTop - PIP / 2 - 2;
      pip.depth = depth + 0.3;
    }
  }

  destroy(): void {
    this.root.destroy();
    this.mark?.destroy();
    this.barBack.destroy();
    this.hpText.destroy();
    this.barLag.destroy();
    this.barFill.destroy();
    this.chipBack?.destroy();
    this.chipFill?.destroy();
    this.chipText?.destroy();
    this.gradeBack?.destroy();
    this.gradeFill?.destroy();
    this.gradeText?.destroy();
    this.callRing?.destroy();
    this.callGlow?.destroy();
    this.callClose?.destroy();
    this.callHand?.destroy();
    for (const pip of this.pips) pip.destroy();
  }
}
