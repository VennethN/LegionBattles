// One unit on the board: its parts as sprites, moved every frame by the rig.
//
// Nothing here is frame-by-frame drawing. Every movement is a pose (a set of
// offsets for the parts) blended in and out over time: standing and
// breathing, hopping along, winding up and striking, being hit, falling.
// The blends are worked out from the battle's own clock, so a blow lands on
// the frame the simulation says it lands, at any speed.
//
// Nothing is allocated per frame.

import Phaser from 'phaser';
import type { ManifestUnit } from '../art/manifest';
import { ATTACK_POSES, HIT_POSE, HOP_POSE, LAND_POSE } from '../art/poses';
import { addPose, clearPose, makeXforms, restPose, solve, type PartXform, type Pose } from '../art/rig';
import { OUTLINE } from '../art/kit/palette';
import { ART_SCALE, hex } from './config';
import { DIGITS_KEY } from './Numbers';
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

const BAR_W = 50;
const BAR_H = 7;
/** The chip with a unit's level stands a little taller than the bar it is beside. */
const CHIP_H = 13;
const GRADE_W = 17;

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
  private readonly barBack: Phaser.GameObjects.Image;
  private readonly barLag: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;
  private readonly phase: number;
  private readonly barW: number;
  private readonly pips: Phaser.GameObjects.Image[] = [];
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
  ) {
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
    if (glowColor !== null && weapon >= 0) {
      this.glow = scene.add.image(0, 0, SHEET, 'fx/disc').setScale(0).setTint(glowColor);
      this.root.add(this.glow);
    }

    this.barBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setOrigin(0.5, 0.5);
    this.barLag = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(0xffffff).setOrigin(0, 0.5);
    this.barFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(barColor).setOrigin(0, 0.5);
    this.barW = Math.round(BAR_W * (1 + (size - 1) * 1.6));
    this.barBack.setDisplaySize(this.barW + 6, BAR_H + 6);
    for (let i = 0; i < MAX_PIPS; i++) {
      this.pips.push(scene.add.image(0, 0, SHEET, 'fx/pixel').setDisplaySize(9, 9).setVisible(false));
    }
    if (plate) {
      // Wide enough for the number: one digit or two.
      this.chipW = plate.level >= 10 ? 28 : 19;
      this.chipBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setDisplaySize(this.chipW + 6, CHIP_H + 6);
      this.chipFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(plate.color).setDisplaySize(this.chipW, CHIP_H);
      this.chipText = scene.add.bitmapText(0, 0, DIGITS_KEY, String(plate.level), 15).setOrigin(0.5);
      this.chipText.setLetterSpacing(-13);
      this.gradeBack = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(hex(OUTLINE)).setDisplaySize(GRADE_W + 6, CHIP_H + 6);
      this.gradeFill = scene.add.image(0, 0, SHEET, 'fx/pixel').setTint(plate.gradeColor).setDisplaySize(GRADE_W, CHIP_H);
      this.gradeText = scene.add.bitmapText(0, 0, DIGITS_KEY, plate.grade, 15).setOrigin(0.5);
    }
    this.setBarsVisible(false);

    // Its own rhythm, so that a row of units does not breathe as one.
    this.phase = ((seed * 2654435761) >>> 0) / 4294967296 * 20;
    this.turn = team === 'blue' ? 1 : -1;
    this.facing = this.turn as 1 | -1;
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
    return (180 - this.art.muzzle[1]) * UNIT_SCALE * this.size;
  }
  muzzleReach(): number {
    return (this.art.muzzle[0] - 96) * UNIT_SCALE * this.size * this.facing;
  }

  /** How tall it stands, for what floats over it. */
  get height(): number {
    return (180 - this.art.top) * UNIT_SCALE * this.size;
  }

  /** Its scale on the board, for effects that should match it. */
  get scale(): number {
    return UNIT_SCALE * this.size;
  }

  /**
   * Shows a small square over the health bar for each status in `colors`
   * (the first `count` of them). Called every frame; nothing is allocated.
   */
  setStatuses(colors: readonly number[], count: number): void {
    const n = Math.min(count, MAX_PIPS);
    for (let i = 0; i < n; i++) this.pips[i].setTint(colors[i]);
    this.pipCount = n;
  }

  /** The health bar shows only while there is a fight on. */
  setBarsVisible(on: boolean): void {
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
    this.barsOn = on;
  }

  update(now: number, dt: number): void {
    if (this.gone) return;
    const p = this.pose;
    clearPose(p);
    const t = now + this.phase;

    // Standing: a slow breath, the head a beat behind, what is held swaying.
    const breath = Math.sin(t * 2.7);
    p.bodySy += 0.022 * breath;
    p.bodySx -= 0.014 * breath;
    p.headY += 1.1 * Math.sin(t * 2.7 - 0.7);
    p.headRot += 1.4 * Math.sin(t * 1.6);
    p.weaponRot += 2.6 * Math.sin(t * 2.1 + 1);
    p.offRot += 1.8 * Math.sin(t * 1.9 + 2);
    p.extraRot += 5 * Math.sin(t * 2.3 + 0.5);

    // Walking, and cheering, are small hops.
    const hopping = (this.moving || this.cheering) && this.deadAt < 0;
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
    if (this.actAt >= 0) {
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
        addPose(p, HIT_POSE, k);
        if (this.hitDir > 0) {
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
    if (this.deadAt >= 0) {
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
      const o = this.xf[this.weaponIndex];
      const part = this.art.parts[this.weaponIndex];
      const lx = this.art.muzzle[0] - part.pivot[0];
      const ly = this.art.muzzle[1] - part.pivot[1];
      const c = Math.cos(o.rot * RAD);
      const s = Math.sin(o.rot * RAD);
      this.glow.x = o.x + lx * c - ly * s;
      this.glow.y = o.y + lx * s + ly * c;
      const size = charge * (this.actBig ? 1.5 : 1) * (0.9 + 0.1 * Math.sin(now * 30));
      this.glow.setScale(size * INV_ART * 1.3);
      this.glow.setVisible(charge > 0.02);
    }

    // Turning round is a quick flip through flat, like a card.
    this.turn += (this.facing - this.turn) * Math.min(1, dt * 20);
    const root = this.root;
    root.x = this.x;
    root.y = this.y;
    root.scaleX = this.turn * UNIT_SCALE * this.size;
    root.scaleY = UNIT_SCALE * this.size;
    root.alpha = alpha;
    root.depth = this.y + (this.lift > 0 ? 1000 : 0);

    // The health bar: what is left in the team's color, what was just lost in white behind it.
    if (this.health < this.lagHealth) this.lagHealth = Math.max(this.health, this.lagHealth - dt * 0.6);
    else this.lagHealth = this.health;
    const BAR_W = this.barW;
    const bx = this.x - BAR_W / 2;
    const by = this.y - this.height - 9 - this.lift;
    this.barBack.x = this.x;
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
    this.barBack.alpha = alpha;
    this.barLag.alpha = alpha;
    this.barFill.alpha = alpha;
    if (this.chipBack && this.chipFill && this.chipText) {
      // The chip stands at the bar's left end, touching it, so the two read as one plate.
      const cx = bx - 3 - this.chipW / 2;
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
      const gx = bx + BAR_W + 3 + GRADE_W / 2;
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
      pip.x = this.x - ((this.pipCount - 1) * 12) / 2 + i * 12;
      pip.y = by - 12;
      pip.depth = depth + 0.3;
    }
  }

  destroy(): void {
    this.root.destroy();
    this.barBack.destroy();
    this.barLag.destroy();
    this.barFill.destroy();
    this.chipBack?.destroy();
    this.chipFill?.destroy();
    this.chipText?.destroy();
    this.gradeBack?.destroy();
    this.gradeFill?.destroy();
    this.gradeText?.destroy();
    for (const pip of this.pips) pip.destroy();
  }
}
