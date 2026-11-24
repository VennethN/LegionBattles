// A tutorial on the screen: a shade over everything but what the step
// points at, a ring round that, and a bubble that says what to do.
//
// Which step is up is not kept here. A screen marks its buttons by name and
// calls refresh() whenever something changes; the step is worked out from
// the save (game/tutorial.ts) and drawn, or cleared if there is none.
//
// A step of a tour that asks for a press is moved on from here: the press
// goes through the shade to whatever is under it, and when it is let go the
// tour steps on. Every screen's guide is told, and looks again a moment
// later, when whatever the press opened or shut has settled.

import Phaser from 'phaser';
import { BONE, GOLD, HIGHLIGHT, OUTLINE } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { advanceTour, markSeen, skipTutorial, tutorialStep, type GuideContext, type GuideScene, type Step } from '../../game/tutorial';
import { today } from '../clock';
import type { SaveData } from '../../game/state';
import { H, W, hex } from '../config';
import { commit, save } from '../session';
import { Button, label, plain, slab } from './widgets';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the tours stand, as one line: to tell whether looking at the step moved anything. */
function tourKey(s: SaveData): string {
  const t = s.tutorial.tour;
  return `${t ? `${t.id}:${t.step}` : ''}/${s.tutorial.seen.length}`;
}

const DEPTH = 9600;
/** How far the hole in the shade stands off what it is round. */
const PAD = 8;
/** The name of the event the game sends when a tour steps on, for every screen's guide to look again. */
const TOUR_MOVED = 'tour-moved';

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
  /** The step whose hole a press went down in, and the hole: the tour moves on when it is let go there. */
  private armed: { id: string; hole: Rect } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    name: GuideScene,
    /** Called when the step on show changes or goes, so that the screen can catch up. */
    private readonly onChange: () => void = () => {},
  ) {
    this.ctx = { scene: name };
    const inside = (p: Phaser.Input.Pointer, r: Rect): boolean => p.worldX >= r.x && p.worldX <= r.x + r.w && p.worldY >= r.y && p.worldY <= r.y + r.h;
    const down = (p: Phaser.Input.Pointer): void => {
      const step = this.step;
      const r = this.rect;
      this.armed = null;
      if (!step?.press || !r) return;
      const hole = { x: r.x - PAD, y: r.y - PAD, w: r.w + PAD * 2, h: r.h + PAD * 2 };
      if (inside(p, hole)) this.armed = { id: step.id, hole };
    };
    const up = (p: Phaser.Input.Pointer): void => {
      const armed = this.armed;
      this.armed = null;
      if (!armed || !inside(p, armed.hole)) return;
      const s = save();
      const t = s.tutorial.tour;
      // Only if the tour still stands at the step that was pressed: shutting a screen may have moved it on already.
      if (!t || `${t.id}:${t.step}` !== armed.id) return;
      advanceTour(s);
      commit();
      scene.game.events.emit(TOUR_MOVED);
    };
    // Whatever the press opened, turned or shut is in place a moment later: then this looks again.
    const moved = (): void => {
      scene.time.delayedCall(40, () => {
        this.refresh();
        this.onChange();
      });
    };
    scene.input.on('pointerdown', down);
    scene.input.on('pointerup', up);
    scene.game.events.on(TOUR_MOVED, moved);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', down);
      scene.input.off('pointerup', up);
      scene.game.events.off(TOUR_MOVED, moved);
    });
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
    this.ctx.day = today();
    const s = save();
    const before = tourKey(s);
    let step = tutorialStep(s, this.ctx);
    let rect = step ? (this.marks.get(step.target)?.() ?? null) : null;
    // A step of a tour that points at something this screen does not have is passed over: a pack that is not sold has no button to buy it.
    for (let i = 0; step?.tour && !rect && i < 12; i++) {
      advanceTour(s);
      step = tutorialStep(s, this.ctx);
      rect = step ? (this.marks.get(step.target)?.() ?? null) : null;
    }
    // Looking can move a tour: one that is due starts, one whose screen was shut steps on or back. That is kept.
    if (tourKey(s) !== before) commit();
    // A step whose target is not on the screen yet still holds the battles, but draws nothing.
    this.holds = !!step && step.holds;
    this.step = step && rect ? step : null;
    this.rect = this.step ? rect : null;
    const key = this.step && rect ? `${this.step.id}:${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.w)},${Math.round(rect.h)}` : '';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.clear();
    if (this.step && rect) {
      this.draw(this.step, rect);
      sfx.play('pop', 0.7);
    }
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
    const hole = { x: r.x - PAD, y: r.y - PAD, w: r.w + PAD * 2, h: r.h + PAD * 2 };

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
    // A tour says how far along it is.
    const count = step.tour && step.of ? `${step.n} of ${step.of}` : '';
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
    if (count) this.add(label(scene, bx + bw - 124, by + bh - 31, count, { size: 14, weight: 600, align: 'right', color: OUTLINE, stroke: null }).setDepth(DEPTH + 4));
    if (step.ok) {
      const ok = new Button(scene, bx + 110, by + bh - 40, step.button ?? 'GOT IT', () => {
        const s = save();
        // A note of a tour moves the tour on; a note of the first tutorial is marked as read.
        if (step.tour) advanceTour(s);
        else markSeen(s, step.id);
        commit();
        this.refresh();
        this.onChange();
      }, { width: 180, height: 56, size: 24 }).setDepth(DEPTH + 4);
      this.add(ok.root);
    }
  }
}
