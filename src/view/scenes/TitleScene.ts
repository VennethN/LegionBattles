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
import { COMPANIONS, HEROES, MOVES, byId, weaponOf, type Feat, type HeroDef } from '../../game/data';
import { bandSize } from '../../game/run';
import { featShare, isOpen, bandFor, setBand } from '../../game/state';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { weaponIcon } from '../icons';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, resumeRun, save, startRun } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
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
    case 'runs':
      return feat.runs === 1 ? 'Finish a run' : `Finish ${feat.runs} runs`;
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
      card.add(label(this, 0, ch / 2 - 24, open ? h.short : '???', { size: 17, color: open ? OUTLINE : BONE.shade, stroke: null }));
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
    const textW = tall ? pw - 100 : pw - bw - 150;
    if (open) {
      const wdef = weaponOf(hero.weapon);
      // Their own weapon, inside the panel: a weapon's picture turns about its hand, two thirds of the way down it.
      const wimg = put(this.add.image(px + 44, py + 88, SHEET, weaponIcon(hero.weapon)));
      wimg.setScale(150 / wimg.frame.height);
      put(label(this, px + 84, py + 24, hero.name, { size: 22, align: 'left' }));
      // Who they are, plainly: their epithet and their weapon, their quirk, and their move. A fuller telling is still to be made.
      const said = put(label(this, px + 84, py + 42, `${hero.epithet[0].toUpperCase()}${hero.epithet.slice(1)}, with ${wdef.name}.\n${hero.quirkName}: ${hero.says}`, { size: 15, align: 'left', color: BONE.fill, wrap: textW, strokeWidth: 3 })).setOrigin(0, 0);
      put(label(this, px + 84, said.y + said.height + 4, `Move: ${byId(MOVES, hero.move).name}`, { size: 15, align: 'left', color: HOLY.fill, wrap: textW, strokeWidth: 3 })).setOrigin(0, 0);
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
      const name = byId(HEROES, kept.hero).short;
      const on = new Button(this, bx, by - 64, `CARRY ON: ${name}, WAVE ${kept.wave}`, () => this.carryOn(), { width: bw, height: 50, size: 16, mat: GOLD });
      this.root.add(on.root);
    }
    // Who goes with them: a button for each place in the band, which goes round those who are open. Plain for now.
    const places = open ? bandSize(hero.id, s.places) : 0;
    const goes = bandFor(s, hero.id);
    for (let i = 0; i < places; i++) {
      const who = goes[i] ? byId(COMPANIONS, goes[i]).name.toUpperCase() : 'NOBODY';
      const n = tall ? places : 1;
      const cwid = tall ? (pw - 28 - (n - 1) * 8) / n : lw;
      const x = tall ? px + 14 + cwid / 2 + i * (cwid + 8) : 16 + lw / 2;
      const y = tall ? by - 62 - (kept ? 58 : 0) : 190 + i * 54;
      if (s.friends.length === 0) {
        // Nobody has been met yet: what is not open is dark, and what opens it is said.
        if (i === 0) put(label(this, x, y, `WITH ???\n${featText(COMPANIONS[0].unlock)}`, { size: 15, color: BONE.shade, strokeWidth: 3 }));
        continue;
      }
      this.root.add(new Button(this, x, y, `WITH ${who}`, () => {
        // The next of those who are open and in no other place; after the last, nobody.
        const free = s.friends.filter((id) => !goes.includes(id) || id === goes[i]);
        const at = free.indexOf(goes[i] ?? '');
        setBand(s, i, free[at + 1] ?? '');
        commit();
        sfx.play('click', 0.6);
        this.draw();
      }, { width: cwid, height: 46, size: 16, mat: IRON }).root);
    }
    if (!tall && places > 0 && s.friends.length > 0) put(label(this, 16 + lw / 2, 150, 'COMPANIONS', { size: 15, color: BONE.fill, strokeWidth: 3 }));

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
    // How much of the field's light is made, beside it: the same choice the pause panel gives.
    const light = new Button(this, tall ? view.w - 134 : 134, tall ? 36 : view.h - 40, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
      setLightMode(nextLightMode(lightMode()), true);
      light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
    }, { width: 130, height: 44, size: 15, mat: IRON });
    this.root.add(light.root);
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
