// The cards that come up over everything: what the legion earned while the
// game was shut, the settings, and the question a rebirth asks. A card
// dims what is under it and takes every press until it is put away; the
// fight goes on behind it.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HOLY, LINEN, OUTLINE, VENOM } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { fmt, span } from '../../game/format';
import { laurelsFor, rebirth, type Away } from '../../game/rules';
import { setupCamera } from '../app';
import { SHEET } from '../art/Sheet';
import { ART_SCALE, hex, view } from '../config';
import { battle, commit, save, startOver } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label, plain } from '../ui/widgets';

const INV_ART = 1 / ART_SCALE;

export type ModalKind = 'away' | 'settings' | 'rebirth';

export class ModalScene extends Phaser.Scene {
  private kind: ModalKind = 'settings';
  private earned: Away | null = null;

  constructor() {
    super('Modal');
  }

  init(data: { kind: ModalKind; earned?: Away }): void {
    this.kind = data.kind;
    this.earned = data.earned ?? null;
  }

  create(): void {
    setupCamera(this);
    this.scene.bringToTop();
    // What is under the card is dimmed, and a press on it goes nowhere.
    const veil = this.add.image(view.w / 2, view.h / 2, SHEET, 'fx/solid').setTint(hex(OUTLINE)).setAlpha(0.72).setDisplaySize(view.w + 4, view.h + 4);
    veil.setInteractive();
    if (this.kind === 'away') this.away();
    else if (this.kind === 'rebirth') this.rebirth();
    else this.settings();
  }

  private card(h: number): { x: number; y: number; w: number; h: number } {
    const w = Math.min(520, view.w - 36);
    const x = (view.w - w) / 2;
    const y = Math.max(16, (view.h - h) / 2);
    slabImage(this, x, y, w, h, BONE, 20, 8);
    return { x, y, w, h };
  }

  private dark(text: string, x: number, y: number, size: number, wrap?: number): Phaser.GameObjects.Text {
    return label(this, x, y, text, { size, weight: 600, color: OUTLINE, stroke: null, wrap });
  }

  private close(): void {
    this.scene.stop();
  }

  private away(): void {
    const e = this.earned as Away;
    const c = this.card(330);
    const cx = c.x + c.w / 2;
    this.add.image(cx, c.y + 54, SHEET, 'icon/moon').setScale(1.3 * INV_ART);
    label(this, cx, c.y + 110, 'WHILE YOU WERE AWAY', { size: 24, color: OUTLINE, stroke: null });
    this.dark(`The legion fought on for ${span(e.seconds)}${e.capped ? ', which is as long as it can alone. A Supply Tent keeps it going longer.' : '.'}`, cx, c.y + 156, 16, c.w - 60);
    const gold = label(this, cx + 16, c.y + 214, `+${fmt(e.gold)}`, { size: 40, color: HOLY.fill, strokeWidth: 7 });
    this.add.image(cx - gold.width / 2 - 14, c.y + 214, SHEET, 'icon/coin').setScale(0.9 * INV_ART);
    new Button(this, cx, c.y + c.h - 50, 'COLLECT', () => {
      sfx.play('claim');
      this.close();
    }, { width: 240, height: 60, size: 26 });
    sfx.play('coin', 0.8);
  }

  private rebirth(): void {
    const s = save();
    const n = laurelsFor(s.run.top);
    const c = this.card(310);
    const cx = c.x + c.w / 2;
    this.add.image(cx, c.y + 50, SHEET, 'icon/laurel').setScale(1.2 * INV_ART);
    label(this, cx, c.y + 102, 'MUSTER AGAIN?', { size: 26, color: OUTLINE, stroke: null });
    this.dark(`The road, its gold, your heroes' levels and the camp are given up. You keep your honors and feats, and win ${n} ${n === 1 ? 'laurel' : 'laurels'}.`, cx, c.y + 160, 16, c.w - 60);
    plain(new Button(this, cx - 118, c.y + c.h - 50, 'NOT YET', () => this.close(), { width: 200, height: 60, size: 22, mat: LINEN, color: OUTLINE }));
    new Button(this, cx + 118, c.y + c.h - 50, `REBIRTH  +${n}`, () => {
      if (rebirth(s) > 0) {
        battle().reset();
        commit();
        sfx.play('victory');
        this.game.events.emit('reborn');
      }
      this.close();
    }, { width: 220, height: 60, size: 22, mat: VENOM });
  }

  private settings(): void {
    const s = save();
    const c = this.card(470);
    const cx = c.x + c.w / 2;
    label(this, cx, c.y + 38, 'SETTINGS', { size: 26, color: OUTLINE, stroke: null });
    const apply = (): void => {
      sfx.enabled = s.settings.sound;
      sfx.setVolumes(s.settings.effects / 10, s.settings.music / 10);
      commit();
    };
    const left = c.x + 34;
    const right = c.x + c.w - 34;
    let y = c.y + 98;
    const row = (name: string): number => {
      label(this, left, y, name, { size: 19, align: 'left', color: OUTLINE, stroke: null });
      const at = y;
      y += 62;
      return at;
    };
    // The sound, on or off.
    const soundY = row('SOUND');
    const sound = plain(new Button(this, right - 60, soundY, '', () => {
      s.settings.sound = !s.settings.sound;
      sound.setText(s.settings.sound ? 'ON' : 'OFF');
      apply();
      if (s.settings.sound) music.update();
    }, { width: 120, height: 48, size: 20, mat: BONE, color: OUTLINE }));
    sound.setText(s.settings.sound ? 'ON' : 'OFF');
    // The music and the effects, each from 0 to 10.
    for (const which of ['music', 'effects'] as const) {
      const vy = row(which === 'music' ? 'MUSIC' : 'EFFECTS');
      const value = label(this, right - 84, vy, String(s.settings[which]), { size: 22, color: OUTLINE, stroke: null });
      const step = (by: number): void => {
        s.settings[which] = Math.max(0, Math.min(10, s.settings[which] + by));
        value.setText(String(s.settings[which]));
        apply();
        if (which === 'effects') sfx.play('coin', 0.8);
      };
      plain(new Button(this, right - 144, vy, '-', () => step(-1), { width: 52, height: 48, size: 26, mat: LINEN, color: OUTLINE }));
      plain(new Button(this, right - 24, vy, '+', () => step(1), { width: 52, height: 48, size: 26, mat: LINEN, color: OUTLINE }));
    }
    // The screen's shaking when something big falls.
    const shakeY = row('SCREEN SHAKE');
    const shake = plain(new Button(this, right - 60, shakeY, '', () => {
      s.settings.shake = !s.settings.shake;
      shake.setText(s.settings.shake ? 'ON' : 'OFF');
      commit();
    }, { width: 120, height: 48, size: 20, mat: BONE, color: OUTLINE }));
    shake.setText(s.settings.shake ? 'ON' : 'OFF');

    // Starting over is asked twice, as it cannot be taken back.
    let sure = false;
    const over = new Button(this, cx - 118, c.y + c.h - 52, 'START OVER', () => {
      if (!sure) {
        sure = true;
        over.setText('SURE? AGAIN');
        return;
      }
      startOver();
      this.game.events.emit('reborn');
      this.close();
    }, { width: 210, height: 56, size: 20, mat: CLOTH.red });
    new Button(this, cx + 118, c.y + c.h - 52, 'CLOSE', () => this.close(), { width: 210, height: 56, size: 22, mat: GOLD });
  }
}
