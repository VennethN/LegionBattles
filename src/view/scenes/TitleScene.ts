// The Hold: the place the runs go out from. Whoever is chosen stands big in
// their own light with who they are beside them; everyone else is a row to
// pick from; the band's places hold who goes along; and PLAY is the way in.
// What is kept between runs (renown, and what it opens) will be shown here
// too when it is built.
//
// A hero who is not open yet is a dark shape with no name: what opens them
// is said, and nothing else about them.

import Phaser from 'phaser';
import { LOGO_H, LOGO_W } from '../../art/logoSize';
import { BONE, BUSH, GOLD, HOLY, IRON, OUTLINE, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, HEROES, MOVES, byId, weaponOf, type Feat, type HeroDef } from '../../game/data';
import { bandSize } from '../../game/run';
import { featShare, isOpen, bandFor, setBand } from '../../game/state';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, resumeRun, save, startRun } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { HERO_LIGHT, LANTERN } from '../light/hours';
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
    const W = view.w;
    const H = view.h;
    const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.root.add(o);
      return o;
    };
    const hero = byId(HEROES, this.chosen) as HeroDef;
    const open = isOpen(s, hero.id);
    // How much room a tall screen has to spare over the least it can be: what is drawn grows into it.
    const k = Math.max(0, Math.min(1, (H - 860) / 300));

    // The logo. It is wide and low, and has the top of the screen (or of its column) to itself.
    const lw = tall ? 230 + 70 * k : Math.min(270, W * 0.27);
    const lh = (lw * LOGO_H) / LOGO_W;
    const col = tall ? W - 28 : lw + 16;
    put(this.add.image(tall ? W / 2 : 14 + col / 2, 12 + lh / 2, 'logo')).setDisplaySize(lw, lh);

    // The stage: whoever is chosen, big, in their own light.
    const sx = 14;
    const sy = 12 + lh + 8;
    const sw = col;
    // On a tall screen the stage takes what the rest leaves, up to a height past which it would only be empty.
    const chTall = 84 + 66 * k;
    const sh = tall ? Math.max(170, Math.min(400, H - sy - 110 - (2 * chTall + 8) - 88 - 84 - 30 - (s.run ? 58 : 0))) : H - sy - 14;
    put(slabImage(this, sx, sy, sw, sh, DARK, 16, 6));
    const figX = tall ? sx + 110 : sx + sw / 2;
    const feet = sy + sh - (tall ? 24 : 110);
    const lit = HERO_LIGHT[hero.id] ?? LANTERN;
    if (open) put(this.add.image(figX, feet - 70, SHEET, 'fx/glow')).setTint(lit).setAlpha(0.55).setScale((tall ? 4.2 : 6.4) / 2);
    put(this.add.image(figX, feet + 2, SHEET, 'fx/disc')).setTint(hex(OUTLINE)).setAlpha(0.5).setScale(tall ? 1.1 : 1.5, tall ? 0.3 : 0.4);
    const fig = put(this.add.image(figX, feet, CARDS, portraitFrame('blue', hero.unit)));
    fig.setScale(Math.min((tall ? sh - 36 : 250) / (fig.frame.height || 1), (tall ? 190 : sw - 30) / (fig.frame.width || 1)));
    if (!open) fig.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.9);
    else this.tweens.add({ targets: fig, scaleY: fig.scaleY * 1.025, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Who they are. On a wide screen it is beside the stage, on a tall one inside it and under it.
    const tx = tall ? sx + 222 : sx + sw + 18;
    const tw = tall ? W - tx - 26 : W - tx - 16;
    let ty = tall ? sy + 16 : 18;
    const say = (text: string, size: number, color: string, gap = 6, x = tx, w = tw): void => {
      const t = put(label(this, x, ty, text, { size, align: 'left', color, wrap: w, strokeWidth: size > 20 ? 5 : 3 })).setOrigin(0, 0);
      ty += t.height + gap;
    };
    if (open) {
      const wdef = weaponOf(hero.weapon);
      const move = byId(MOVES, hero.move);
      say(hero.name, tall ? 24 : 30, BONE.fill, 0);
      say(hero.epithet[0].toUpperCase() + hero.epithet.slice(1), 18, HOLY.fill, 6);
      say(hero.who, 15, BONE.fill, 4);
      say(`"${hero.line}"`, 15, BONE.shade, tall ? 4 : 12);
      const best = s.best[hero.id] ?? 0;
      if (tall) {
        // Under the stage, the full width: there is no room beside a figure for a paragraph.
        ty = sy + sh + 10;
        const x = sx + 6;
        const w = W - 40;
        say(`${hero.quirkName.toUpperCase()}  ${hero.says}`, 15, BONE.fill, 6, x, w);
        say(`${move.name.toUpperCase()}  ${move.says}`, 15, HOLY.fill, 6, x, w);
        say(`Carries ${wdef.name}.${best > 0 ? ` Best: wave ${best}.` : ''}`, 15, BONE.shade, 6, x, w);
      } else {
        say(`${hero.quirkName.toUpperCase()}  ${hero.says}`, 15, BONE.fill, 8);
        say(`${move.name.toUpperCase()}  ${move.says}`, 15, HOLY.fill, 8);
        say(`Carries ${wdef.name}.${best > 0 ? ` Best: wave ${best}.` : ''}`, 15, BONE.shade, 8);
      }
    } else {
      // Not opened: dark, with what opens them and how near that is, and nothing else.
      say('???', tall ? 24 : 30, BONE.shade, 6);
      say(hero.unlock ? featText(hero.unlock) : '', 17, BONE.fill, 8);
      if (hero.unlock) {
        const share = featShare(s, hero.unlock);
        const g = put(this.add.graphics());
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(tx, ty, Math.min(220, tw), 12, 5);
        if (share > 0) g.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(tx + 3, ty + 3, Math.max(4, (Math.min(220, tw) - 6) * share), 6, 3);
        ty += 20;
      }
      if (tall) ty = sy + sh + 10;
    }

    // What is left of the screen, from the bottom up: the way in, who goes along, and everyone there is to choose.
    const rx = tall ? 14 : tx;
    const rw = tall ? W - 28 : tw;
    const playH = 62;
    const by = H - 14 - playH / 2;
    const kept = s.run;
    const bw = tall ? rw : Math.min(260, rw * 0.42);
    const play = new Button(this, tall ? W / 2 : rx + rw - bw / 2, by, 'PLAY', () => this.play(hero.id), { width: bw, height: playH, size: 30, mat: BUSH });
    play.setEnabled(open);
    this.root.add(play.root);
    let floor = by - playH / 2 - 8;
    if (kept) {
      // A run was left in its camp: it can be taken up where it was.
      const name = byId(HEROES, kept.hero).short;
      const cw2 = tall ? rw : Math.min(300, rw - bw - 10);
      const on = new Button(this, tall ? W / 2 : rx + cw2 / 2, tall ? by - playH / 2 - 8 - 25 : by, `CARRY ON: ${name}, WAVE ${kept.wave}`, () => this.carryOn(), { width: cw2, height: 50, size: 16, mat: GOLD });
      this.root.add(on.root);
      if (tall) floor -= 58;
    }

    // The band: a card for each place, with whoever goes in it. A press goes round those who are open.
    const places = open ? bandSize(hero.id, s.places) : 0;
    const goes = bandFor(s, hero.id);
    const bandH = 62;
    if (places > 0) {
      const n = Math.max(places, tall ? 2 : 1);
      const cwid = Math.min(230, (rw - (n - 1) * 8) / n);
      const y = floor - bandH / 2;
      for (let i = 0; i < places; i++) {
        const x = rx + cwid / 2 + i * (cwid + 8);
        const card = this.add.container(x, y);
        const who = goes[i] ? byId(COMPANIONS, goes[i]) : null;
        const none = s.friends.length === 0;
        card.add(slabImage(this, -cwid / 2, -bandH / 2, cwid, bandH, none ? DARK : IRON, 12, 5));
        if (none) {
          // Nobody has been met yet: dark, and what opens the first of them is said.
          card.add(label(this, -cwid / 2 + 14, -12, '???', { size: 17, align: 'left', color: BONE.shade }));
          card.add(label(this, -cwid / 2 + 14, 10, featText(COMPANIONS[0].unlock), { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3 }));
        } else {
          if (who) {
            const img = this.add.image(-cwid / 2 + 34, bandH / 2 - 10, CARDS, portraitFrame('blue', who.unit));
            img.setScale(Math.min(48 / (img.frame.height || 1), 52 / (img.frame.width || 1)));
            card.add(img);
          }
          card.add(label(this, -cwid / 2 + (who ? 66 : 16), -12, who ? who.name : 'Nobody', { size: 17, align: 'left' }));
          card.add(label(this, -cwid / 2 + (who ? 66 : 16), 10, who ? who.quirkName : 'Press to choose', { size: 15, align: 'left', color: who ? HOLY.fill : BONE.shade, strokeWidth: 3 }));
          card.setSize(cwid, bandH).setInteractive({ useHandCursor: true });
          card.on('pointerup', () => {
            // The next of those who are open and in no other place; after the last, nobody.
            const free = s.friends.filter((id) => !goes.includes(id) || id === goes[i]);
            const at = free.indexOf(goes[i] ?? '');
            setBand(s, i, free[at + 1] ?? '');
            commit();
            sfx.play('click', 0.6);
            this.draw();
          });
        }
        this.root.add(card);
      }
      put(label(this, rx + 2, y - bandH / 2 - 12, 'GOES WITH THEM', { size: 15, align: 'left', color: BONE.fill, strokeWidth: 3 }));
      floor = y - bandH / 2 - 26;
    }

    // Everyone: one row where it fits, two where it does not. The unopened are dark and unnamed.
    const gap = 8;
    const one = (rw - 9 * gap) / 10;
    const cols = one >= 58 ? 10 : 5;
    const rows = HEROES.length / cols;
    const cw = (rw - (cols - 1) * gap) / cols;
    const ch = Math.max(74, Math.min(tall ? chTall : 104, (floor - ty - 8 - (rows - 1) * gap) / rows));
    const top = floor - rows * ch - (rows - 1) * gap;
    HEROES.forEach((h, i) => {
      const x = rx + (i % cols) * (cw + gap);
      const y = top + Math.floor(i / cols) * (ch + gap);
      const isOpenHero = isOpen(s, h.id);
      const card = this.add.container(x + cw / 2, y + ch / 2);
      card.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, this.chosen === h.id ? HOLY : isOpenHero ? BONE : DARK, 12, 5));
      const img = this.add.image(0, ch / 2 - 26, CARDS, portraitFrame('blue', h.unit));
      img.setScale(Math.min((ch - 34) / (img.frame.height || 1), (cw - 8) / (img.frame.width || 1)));
      if (!isOpenHero) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.9);
      card.add(img);
      card.add(label(this, 0, ch / 2 - 14, isOpenHero ? h.short : '???', { size: 15, color: isOpenHero ? OUTLINE : BONE.shade, stroke: null }));
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.chosen = h.id;
        sfx.play('click', 0.6);
        this.draw();
      });
      this.root.add(card);
    });

    // The way into the Hold: what is kept between runs. Plain, and out of the way of the rest, until the Hold has its screens.
    this.root.add(new Button(this, tall ? W / 2 : W - 250, 36, 'THE HOLD', () => this.scene.start('Hold'), { width: 130, height: 40, size: 16, mat: GOLD }).root);

    // Sound and how much of the light is made, small, in the top corners.
    const mute = this.add.container(tall ? 38 : W - 38, 36);
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
    const light = new Button(this, tall ? W - 76 : W - 132, 36, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
      setLightMode(nextLightMode(lightMode()), true);
      light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
    }, { width: 126, height: 44, size: 15, mat: IRON });
    this.root.add(light.root);
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
