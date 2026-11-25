// The list of heroes: who can be played, how far each has come, and what
// would open the rest. One press on PLAY and the wave begins.
//
// A hero who is not open yet is a dark shape with no name: what opens them
// is said, and nothing else about them.

import Phaser from 'phaser';
import { LOGO_H, LOGO_W } from '../../art/logoSize';
import { BONE, BUSH, GOLD, HOLY, IRON, OUTLINE, RUBY, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { HEROES, WEAPONS, byId, type Feat, type HeroDef } from '../../game/data';
import { featShare, isOpen } from '../../game/state';
import { STAT_INFO, STATS, statText } from '../../game/stats';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { weaponIcon } from '../icons';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, resumeRun, save, startRun } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { ArenaScene } from './ArenaScene';

const DARK: Material = { fill: '#3b2a1c', shade: '#2a1a10' };

/** What opens a hero, as a line a player reads. A boss is not named: nobody has met it yet. */
export function featText(feat: Feat): string {
  switch (feat.kind) {
    case 'wave':
      return `Come through wave ${feat.wave}`;
    case 'boss':
      return feat.boss === 'warlord' ? 'Beat the captain of wave 7' : feat.boss === 'colossus' ? 'Beat the captain of wave 14' : 'Beat the captain of wave 20';
    case 'coins':
      return `Gather ${feat.coins} coins in one run`;
    case 'kills':
      return `Fell ${feat.kills} enemies in all`;
  }
}

export class TitleScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private chosen = HEROES[0].id;

  constructor() {
    super('Title');
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#3f7a5a');
    ArenaScene.applySound();
    const s = save();
    this.chosen = isOpen(s, s.last) ? s.last : HEROES[0].id;
    this.root = this.add.container(0, 0);
    music.play('meadow', 'calm');
    this.draw();
  }

  private draw(): void {
    this.root.removeAll(true);
    const s = save();
    const tall = view.tall;
    const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.root.add(o);
      return o;
    };
    // The logo, small: this is a screen to pass through, not to stop at.
    const lw = tall ? Math.min(300, view.w - 60) : 230;
    const logo = put(this.add.image(tall ? view.w / 2 : 16 + lw / 2, tall ? 70 : 62, 'logo'));
    logo.setDisplaySize(lw, (lw * LOGO_H) / LOGO_W);

    // The heroes.
    const cols = tall ? 3 : 5;
    const gap = 10;
    const areaX = tall ? 14 : 16 + lw + 14;
    const areaW = view.w - areaX - 14;
    const cw = (areaW - (cols - 1) * gap) / cols;
    const rows = Math.ceil(HEROES.length / cols);
    const top = tall ? 150 : 14;
    const below = tall ? 290 : 150;
    const ch = Math.min(tall ? 196 : 200, (view.h - top - below - (rows - 1) * gap) / rows);
    HEROES.forEach((h, i) => {
      const x = areaX + (i % cols) * (cw + gap);
      const y = top + Math.floor(i / cols) * (ch + gap);
      const open = isOpen(s, h.id);
      const card = this.add.container(x + cw / 2, y + ch / 2);
      const picked = this.chosen === h.id;
      card.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, picked ? HOLY : open ? BONE : DARK, 14, 6));
      const img = this.add.image(0, ch / 2 - 44, CARDS, portraitFrame('blue', h.unit));
      img.setScale(Math.min((ch - 62) / (img.frame.height || 1), (cw - 20) / (img.frame.width || 1)));
      if (!open) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.9);
      card.add(img);
      card.add(label(this, 0, ch / 2 - 24, open ? h.name : '???', { size: 17, color: open ? OUTLINE : BONE.shade, stroke: null }));
      if (open) {
        const best = s.best[h.id] ?? 0;
        if (best > 0) card.add(label(this, 0, -ch / 2 + 16, `WAVE ${best}`, { size: 15, color: OUTLINE, stroke: null }));
      } else if (h.unlock) {
        // How far along what opens them is.
        const share = featShare(s, h.unlock);
        const g = this.add.graphics();
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(-cw / 2 + 12, -ch / 2 + 10, cw - 24, 10, 4);
        if (share > 0) g.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(-cw / 2 + 14, -ch / 2 + 12, Math.max(4, (cw - 28) * share), 6, 3);
        card.add(g);
      }
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.chosen = h.id;
        sfx.play('click', 0.6);
        this.draw();
      });
      this.root.add(card);
    });

    // Whoever is chosen: what they are, and the way in.
    const hero = byId(HEROES, this.chosen) as HeroDef;
    const open = isOpen(s, hero.id);
    const py = top + rows * (ch + gap) + 4;
    const ph = view.h - py - 14;
    const px = tall ? 14 : areaX;
    const pw = tall ? view.w - 28 : areaW;
    put(slabImage(this, px, py, pw, ph, DARK, 16, 6));
    const bw = tall ? pw - 28 : 250;
    const bx = tall ? px + pw / 2 : px + pw - bw / 2 - 14;
    const textW = tall ? pw - 28 : pw - bw - 150;
    if (open) {
      const wdef = byId(WEAPONS, hero.weapon);
      // What they carry at the start, inside the panel: a weapon's picture turns about its hand, two thirds of the way down it.
      const wimg = put(this.add.image(px + 44, py + 88, SHEET, weaponIcon(hero.weapon)));
      wimg.setScale(150 / wimg.frame.height);
      put(label(this, px + 84, py + 26, hero.name, { size: 24, align: 'left' }));
      put(label(this, px + 84, py + 54, `Carries the ${wdef.name}. ${hero.says}`, { size: 16, align: 'left', color: BONE.fill, wrap: textW, strokeWidth: 3 })).setOrigin(0, 0);
      const lines = STATS.filter((k) => hero.stats[k]).map((k) => `${statText(k, hero.stats[k] as number)} ${STAT_INFO[k].name}`);
      put(label(this, px + 84, py + (tall ? 104 : 100), lines.join('   '), { size: 15, align: 'left', color: HOLY.fill, wrap: textW, strokeWidth: 3 })).setOrigin(0, 0);
    } else {
      put(label(this, px + 20, py + 28, '???', { size: 24, align: 'left', color: BONE.shade }));
      put(label(this, px + 20, py + 60, hero.unlock ? featText(hero.unlock) : '', { size: 17, align: 'left', color: BONE.fill, strokeWidth: 3 }));
    }
    const by = py + ph - 44;
    const kept = s.run;
    const play = new Button(this, bx, by, 'PLAY', () => this.play(hero.id), { width: bw, height: 62, size: 30, mat: BUSH });
    play.setEnabled(open);
    this.root.add(play.root);
    if (kept) {
      // A run was left in its camp: it can be taken up where it was.
      const name = byId(HEROES, kept.hero).name;
      const on = new Button(this, bx, by - 64, `CARRY ON: ${name}, WAVE ${kept.wave}`, () => this.carryOn(), { width: bw, height: 50, size: 16, mat: GOLD });
      this.root.add(on.root);
    }
    // Sound, small, in a corner.
    const mute = this.add.container(tall ? view.w - 40 : 40, tall ? 36 : view.h - 40);
    mute.add(slabImage(this, -22, -22, 44, 44, IRON, 12, 5));
    mute.add(this.add.image(0, -2, SHEET, s.sound ? 'icon/sound' : 'icon/mute').setScale(0.3));
    mute.setSize(44, 44).setInteractive({ useHandCursor: true });
    mute.on('pointerup', () => {
      s.sound = !s.sound;
      s.music = s.sound;
      commit();
      ArenaScene.applySound();
      this.draw();
    });
    this.root.add(mute);
    void RUBY;
  }

  private play(hero: string): void {
    startRun(hero);
    this.scene.start('Arena');
  }

  private carryOn(): void {
    const run = resumeRun();
    if (!run) return;
    // The field has to be there under the camp: it is stood up as the run's last wave left it, and the camp over it.
    this.scene.start('Arena', { camp: true });
  }
}
