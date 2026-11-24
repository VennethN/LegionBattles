// The tutorial on the screen: a shade over everything but what the step
// points at, a ring round that, and a bubble that says what to do.
//
// Which step is up is not kept here. A screen marks its buttons by name and
// calls refresh() whenever something changes; the step is worked out from
// the save (game/tutorial.ts) and drawn, or cleared if there is none.

import Phaser from 'phaser';
import { BONE, GOLD, HIGHLIGHT, OUTLINE } from '../../art/kit/palette';
import { markSeen, skipTutorial, tutorialStep, type GuideContext, type GuideScene, type Step } from '../../game/tutorial';
import { H, W, hex } from '../config';
import { commit, save } from '../session';
import { Button, label, plain, slab } from './widgets';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEPTH = 9600;

export class Guide {
  /** Battles wait while this is true. */
  holds = false;
  /** The step on show, for the scripts that walk the tutorial. */
  step: Step | null = null;
  /** Where the step on show points, on the 1280 by 720 layout. */
  rect: Rect | null = null;

  private marks = new Map<string, () => Rect | null>();
  private drawn: Phaser.GameObjects.GameObject[] = [];
  private ctx: GuideContext;
  private shownKey = '';

  constructor(
    private readonly scene: Phaser.Scene,
    name: GuideScene,
    /** Called when the step on show changes or goes, so that the screen can catch up. */
    private readonly onChange: () => void = () => {},
  ) {
    this.ctx = { scene: name };
  }

  /** Names something a step may point at. `rect` is asked each time, as things move. */
  mark(target: string, rect: () => Rect | null): void {
    this.marks.set(target, rect);
  }

  unmark(target: string): void {
    this.marks.delete(target);
  }

  /** Works out the step again and draws it. Call whenever what is on the screen changes. */
  refresh(change: Partial<GuideContext> = {}): void {
    Object.assign(this.ctx, change);
    const s = save();
    const step = tutorialStep(s, this.ctx);
    const rect = step ? (this.marks.get(step.target)?.() ?? null) : null;
    // A step whose target is not on the screen yet still holds the battles, but draws nothing.
    this.holds = !!step && step.holds;
    this.step = step && rect ? step : null;
    this.rect = this.step ? rect : null;
    const key = this.step && rect ? `${this.step.id}:${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)},${Math.round(rect.h)}` : '';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.clear();
    if (this.step && rect) this.draw(this.step, rect);
  }

  private clear(): void {
    for (const o of this.drawn) o.destroy();
    this.drawn = [];
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.drawn.push(o);
    return o;
  }

  private draw(step: Step, r: Rect): void {
    const scene = this.scene;
    const pad = 8;
    const hole = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };

    if (step.blocks) {
      // Four dark sheets round the hole. They swallow presses; the hole lets them through.
      const sheets: Array<[number, number, number, number]> = [
        [0, 0, W, hole.y],
        [0, hole.y + hole.h, W, H - hole.y - hole.h],
        [0, hole.y, hole.x, hole.h],
        [hole.x + hole.w, hole.y, W - hole.x - hole.w, hole.h],
      ];
      for (const [x, y, w, h] of sheets) {
        if (w <= 0 || h <= 0) continue;
        const sheet = this.add(scene.add.rectangle(x + w / 2, y + h / 2, w, h, hex(OUTLINE), 0.6).setDepth(DEPTH));
        sheet.setInteractive();
      }
      // A step with GOT IT points at something to look at, not to press.
      if (step.ok) this.add(scene.add.zone(hole.x + hole.w / 2, hole.y + hole.h / 2, hole.w, hole.h).setDepth(DEPTH).setInteractive());
    }

    const ring = this.add(scene.add.graphics().setDepth(DEPTH + 1));
    ring.lineStyle(5, hex(GOLD.fill), 1).strokeRoundedRect(hole.x, hole.y, hole.w, hole.h, 16);
    ring.lineStyle(2, hex(HIGHLIGHT), 1).strokeRoundedRect(hole.x + 3, hole.y + 3, hole.w - 6, hole.h - 6, 13);
    scene.tweens.add({ targets: ring, alpha: 0.45, duration: 560, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The bubble: above what it points at if that is low on the screen, below it if it is high.
    const bw = 460;
    const text = this.add(label(scene, 0, 0, step.text, { size: 18, weight: 600, color: OUTLINE, stroke: null, align: 'left', wrap: bw - 44 }).setDepth(DEPTH + 3));
    text.setOrigin(0, 0);
    const bh = text.height + (step.ok ? 100 : 76);
    const above = hole.y + hole.h / 2 > H / 2;
    const bx = Phaser.Math.Clamp(hole.x + hole.w / 2 - bw / 2, 16, W - bw - 16);
    const by = Phaser.Math.Clamp(above ? hole.y - bh - 26 : hole.y + hole.h + 26, 16, H - bh - 16);
    const g = this.add(scene.add.graphics().setDepth(DEPTH + 2));
    slab(g, bx, by, bw, bh, BONE, 18, 7);
    // A point from the bubble toward what it is about.
    const tipX = Phaser.Math.Clamp(hole.x + hole.w / 2, bx + 40, bx + bw - 40);
    g.fillStyle(hex(BONE.fill), 1);
    g.lineStyle(4, hex(OUTLINE), 1);
    if (above) {
      g.fillTriangle(tipX - 16, by + bh - 9, tipX + 16, by + bh - 9, tipX, by + bh + 16);
      g.lineBetween(tipX - 16, by + bh - 2, tipX, by + bh + 16);
      g.lineBetween(tipX + 16, by + bh - 2, tipX, by + bh + 16);
    } else {
      g.fillTriangle(tipX - 16, by + 4, tipX + 16, by + 4, tipX, by - 18);
      g.lineBetween(tipX - 16, by + 1, tipX, by - 18);
      g.lineBetween(tipX + 16, by + 1, tipX, by - 18);
    }
    text.setPosition(bx + 22, by + 16);
    // The bubble itself swallows presses, so that it cannot be pressed through.
    this.add(scene.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setDepth(DEPTH + 2).setInteractive());

    const skip = plain(new Button(scene, bx + bw - 62, by + bh - 28, 'SKIP', () => {
      skipTutorial(save());
      commit();
      this.refresh();
      this.onChange();
    }, { width: 96, height: 44, size: 16, mat: BONE, color: OUTLINE })).setDepth(DEPTH + 4);
    this.add(skip.root);
    if (step.ok) {
      const ok = new Button(scene, bx + 110, by + bh - 40, 'GOT IT', () => {
        markSeen(save(), step.id);
        commit();
        this.refresh();
        this.onChange();
      }, { width: 180, height: 56, size: 24 }).setDepth(DEPTH + 4);
      this.add(ok.root);
    }
  }
}
