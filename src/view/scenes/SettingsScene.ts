// The settings. It opens over the field and has two pages. SETTINGS is the
// sound, how the game is drawn, and starting over. HOW TO PLAY lists every
// tutorial there is, to be viewed again: one the player has not come to is
// dark, as everything not yet reached is.
//
// A change is heard or seen at once and kept at once: there is nothing to
// confirm but starting over.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { GRAPHICS, VOLUME_STEPS, type Graphics } from '../../game/state';
import { TOURS, startTour, tourKnown, tourSeen } from '../../game/tutorial';
import { applyGraphics, setupCamera } from '../app';
import { H, W } from '../config';
import { SHEET } from '../Sheet';
import { applySound, commit, reset, save } from '../session';
import { OverlayHead, TABS_Y, closeOverlay, veil } from '../ui/chrome';
import { Guide, type Rect } from '../ui/Guide';
import { Button, label, plain, slab } from '../ui/widgets';

type Page = 'settings' | 'guides';
type Adder = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

export interface SettingsData {
  page?: Page;
}

const GRAPHICS_NAME: Readonly<Record<Graphics, string>> = { auto: 'AUTO', sharp: 'SHARP', fast: 'FAST' };
const GRAPHICS_TEXT: Readonly<Record<Graphics, string>> = {
  auto: 'Best for your device.',
  sharp: 'Sharpest.',
  fast: 'Fastest.',
};

/** The two panels of the first page. */
const LEFT = { x: 40, y: 84, w: 590, h: 540 };
const RIGHT = { x: 650, y: 84, w: 590, h: 540 };

export class SettingsScene extends Phaser.Scene {
  private page: Page = 'settings';
  private head!: OverlayHead;
  private guide!: Guide;
  private body: Phaser.GameObjects.GameObject[] = [];
  private ask: Phaser.GameObjects.GameObject[] = [];
  /** Where the tutorials' tab is, and the first VIEW on their page, for whoever points at them. */
  private firstView: Rect | null = null;

  constructor() {
    super('Settings');
  }

  init(data: SettingsData): void {
    this.page = data.page ?? 'settings';
    this.body = [];
    this.ask = [];
    this.firstView = null;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    this.head = new OverlayHead(this, this.page === 'settings' ? 'Settings' : 'How to play', s, () => commit());
    const tab = (x: number, w: number, text: string, of: Page): Button => {
      const on = this.page === of;
      const b = new Button(this, x, TABS_Y, text, () => {
        if (!on) this.scene.restart({ page: of } satisfies SettingsData);
      }, { width: w, height: 46, size: 18, mat: on ? GOLD : BONE, color: on ? undefined : OUTLINE });
      if (!on) plain(b);
      return b;
    };
    tab(110, 148, 'SETTINGS', 'settings');
    const guides = tab(296, 200, 'HOW TO PLAY', 'guides');
    this.guide = new Guide(this, 'Settings');
    this.guide.mark('tab:guides', () => guides.rect);
    this.guide.mark('view', () => this.firstView);
    this.guide.mark('close', () => this.head.close.rect);
    this.redraw();
    this.guide.refresh();
  }

  private redraw(): void {
    for (const o of this.body) o.destroy();
    this.body = [];
    const add: Adder = (o) => {
      this.body.push(o);
      return o;
    };
    if (this.page === 'settings') this.drawSettings(add);
    else this.drawGuides(add);
  }

  // ------------------------------------------------------------ the settings

  /** A row's name, on the left of a panel. */
  private name(add: Adder, x: number, y: number, text: string, sub = ''): void {
    add(label(this, x, sub ? y - 10 : y, text, { size: 22, align: 'left', color: OUTLINE, stroke: null }));
    if (sub) add(label(this, x, y + 16, sub, { size: 13, weight: 600, align: 'left', color: IRON.shade, stroke: null, wrap: 300 }));
  }

  /** A switch: a button that says how it stands, in green when on. */
  private toggle(add: Adder, x: number, y: number, on: boolean, flip: () => void, words: [string, string] = ['ON', 'OFF']): void {
    const b = new Button(this, x, y, on ? words[0] : words[1], () => {
      flip();
      commit();
      sfx.play('tick');
      this.redraw();
    }, { width: 150, height: 54, size: 22, mat: on ? VENOM : IRON });
    add(b.root);
  }

  /** A volume: ten pips to press, with less and more to either side. */
  private volume(add: Adder, x: number, y: number, value: number, set: (v: number) => void): void {
    const change = (v: number): void => {
      const next = Math.max(0, Math.min(VOLUME_STEPS, v));
      if (next === value) return;
      set(next);
      applySound(save());
      commit();
      sfx.play('tick');
      this.redraw();
    };
    const less = plain(new Button(this, x, y, '-', () => change(value - 1), { width: 50, height: 50, size: 28, mat: BONE, color: OUTLINE }));
    less.setEnabled(value > 0);
    add(less.root);
    const px = x + 40;
    const pitch = 24;
    const g = add(this.add.graphics());
    for (let i = 0; i < VOLUME_STEPS; i++) {
      const lit = i < value;
      slab(g, px + i * pitch, y - 18, 18, 36, lit ? HOLY : { fill: IRON.shade, shade: IRON.shade }, 5, lit ? 3 : 0);
      // A pip is narrow for a finger, so each takes the whole of its column, top to bottom of the row.
      const zone = add(this.add.zone(px + i * pitch + 9, y, pitch, 54).setInteractive({ useHandCursor: true }));
      zone.on('pointerup', () => change(i + 1));
    }
    const more = plain(new Button(this, px + VOLUME_STEPS * pitch + 34, y, '+', () => change(value + 1), { width: 50, height: 50, size: 28, mat: BONE, color: OUTLINE }));
    more.setEnabled(value < VOLUME_STEPS);
    add(more.root);
  }

  private drawSettings(add: Adder): void {
    const s = save();
    const g = add(this.add.graphics());
    for (const r of [LEFT, RIGHT]) slab(g, r.x, r.y, r.w, r.h, BONE, 22, 8);
    const title = (r: Rect, icon: string, text: string): void => {
      slab(g, r.x + 14, r.y + 14, r.w - 28, 58, IRON, 14, 5);
      add(this.add.image(r.x + 48, r.y + 41, SHEET, `icon/${icon}`).setScale(0.46));
      add(label(this, r.x + 80, r.y + 41, text, { size: 24, align: 'left' }));
    };

    // Sound: all of it on or off, and how loud its two halves are.
    title(LEFT, 'note', 'SOUND');
    let y = LEFT.y + 126;
    const lx = LEFT.x + 30;
    const cx = LEFT.x + 220;
    this.name(add, lx, y, 'Sound');
    this.toggle(add, LEFT.x + LEFT.w - 105, y, s.sound, () => {
      s.sound = !s.sound;
      applySound(s);
    });
    y += 96;
    this.name(add, lx, y, 'Music');
    this.volume(add, cx, y, s.settings.music, (v) => {
      s.settings.music = v;
    });
    y += 84;
    this.name(add, lx, y, 'Effects');
    this.volume(add, cx, y, s.settings.effects, (v) => {
      s.settings.effects = v;
    });
    // The game: how it is drawn, whether the screen shakes, and starting over.
    title(RIGHT, 'gear', 'GAME');
    y = RIGHT.y + 126;
    const rx = RIGHT.x + 30;
    const bx = RIGHT.x + RIGHT.w - 105;
    this.name(add, rx, y, 'Graphics', GRAPHICS_TEXT[s.settings.graphics]);
    const mode = plain(new Button(this, bx, y, GRAPHICS_NAME[s.settings.graphics], () => {
      s.settings.graphics = GRAPHICS[(GRAPHICS.indexOf(s.settings.graphics) + 1) % GRAPHICS.length];
      commit();
      sfx.play('tick');
      applyGraphics(this.game, s.settings.graphics);
      this.redraw();
    }, { width: 150, height: 54, size: 22, mat: BONE, color: OUTLINE }));
    add(mode.root);
    y += 96;
    this.name(add, rx, y, 'Screen shake');
    this.toggle(add, bx, y, s.settings.shake, () => {
      s.settings.shake = !s.settings.shake;
    });
    y += 96;
    this.name(add, rx, y, 'Tutorials');
    const how = plain(new Button(this, bx - 20, y, 'HOW TO PLAY', () => this.scene.restart({ page: 'guides' } satisfies SettingsData), { width: 190, height: 54, size: 18, mat: BONE, color: OUTLINE }));
    add(how.root);
    y += 96;
    this.name(add, rx, y, 'Start over', 'Wipes all progress.');
    const over = new Button(this, bx - 20, y, 'START OVER', () => this.askStartOver(), { width: 190, height: 54, size: 18, mat: CLOTH.red });
    add(over.root);
  }

  /** Starting over is asked once more, over everything: it cannot be taken back. */
  private askStartOver(): void {
    if (this.ask.length > 0) return;
    const add: Adder = (o) => {
      this.ask.push(o);
      return o;
    };
    const shut = (): void => {
      for (const o of this.ask) o.destroy();
      this.ask = [];
    };
    add(veil(this, 9000, 0.8));
    const g = add(this.add.graphics().setDepth(9001));
    slab(g, W / 2 - 300, H / 2 - 150, 600, 300, BONE, 22, 8);
    add(label(this, W / 2, H / 2 - 100, 'Start over?', { size: 34 }).setDepth(9002));
    add(label(this, W / 2, H / 2 - 30, 'All your cards, coins and progress will be wiped. This cannot be undone.', {
      size: 17, weight: 600, color: OUTLINE, stroke: null, wrap: 520,
    }).setDepth(9002));
    const keep = new Button(this, W / 2 - 140, H / 2 + 88, 'KEEP PLAYING', () => shut(), { width: 250, height: 60, size: 22 }).setDepth(9002);
    add(keep.root);
    const wipe = new Button(this, W / 2 + 140, H / 2 + 88, 'START OVER', () => {
      const kept = { sound: save().sound, settings: { ...save().settings } };
      const fresh = reset();
      fresh.sound = kept.sound;
      fresh.settings = kept.settings;
      applySound(fresh);
      commit();
      // The field is stood up again from the first stage, and this screen goes with the old one.
      this.scene.stop();
      this.scene.get('Main').scene.restart();
    }, { width: 250, height: 60, size: 22, mat: CLOTH.red }).setDepth(9002);
    add(wipe.root);
  }

  // ------------------------------------------------------------ the tutorials

  private drawGuides(add: Adder): void {
    const s = save();
    this.firstView = null;
    add(label(this, 216, 40, 'View any tutorial again.', {
      size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    }));
    const x = 40;
    const w = W - 80;
    const h = 70;
    TOURS.forEach((tour, i) => {
      const y = 84 + i * (h + 8);
      const known = tourKnown(s, tour);
      const seen = tourSeen(s, tour.id);
      const mat: Material = known ? BONE : IRON;
      const g = add(this.add.graphics());
      slab(g, x, y, w, h, mat, 16, 6);
      slab(g, x + 10, y + 9, 50, 50, known ? (seen ? GOLD : { fill: IRON.fill, shade: IRON.shade }) : { fill: IRON.shade, shade: IRON.shade }, 10, 3);
      add(this.add.image(x + 35, y + 33, SHEET, known ? 'icon/book' : 'icon/lock').setScale(known ? 0.36 : 0.32));
      if (!known) {
        // Not come to yet: nothing is said of it but that it is there.
        add(label(this, x + 78, y + h / 2 - 3, '???', { size: 22, align: 'left' }));
        return;
      }
      add(label(this, x + 78, y + 24, tour.name, { size: 21, align: 'left', color: OUTLINE, stroke: null }));
      add(label(this, x + 78, y + 48, tour.blurb, { size: 14, weight: 600, align: 'left', color: IRON.shade, stroke: null }));
      if (seen) add(this.add.image(x + w - 250, y + h / 2 - 3, SHEET, 'icon/check').setScale(0.34));
      add(label(this, x + w - 228, y + h / 2 - 3, seen ? 'seen' : 'new', { size: 14, weight: 600, align: 'left', color: seen ? IRON.shade : CLOTH.blue.shade, stroke: null }));
      const view = new Button(this, x + w - 96, y + h / 2 - 1, seen ? 'VIEW AGAIN' : 'VIEW', () => {
        // It starts on the field: this screen shuts, and the tour's first step is there.
        if (!startTour(s, tour.id)) return;
        commit();
        closeOverlay(this);
      }, { width: 168, height: 50, size: 17 });
      add(view.root);
      if (!this.firstView) this.firstView = view.rect;
    });
  }
}
