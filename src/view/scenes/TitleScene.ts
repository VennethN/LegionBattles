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
import { BONE, BUSH, FIRE, GOLD, HOLY, IRON, OUTLINE, RUBY, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, HEROES, MOVES, bossWave, byId, weaponOf, type Feat, type HeroDef } from '../../game/data';
import { bandSize } from '../../game/run';
import { giftShort, masteryLevel, nextLevel, routeSays, slotsOf, trackRows } from '../../game/hold';
import type { SaveData } from '../../game/state';
import { featShare, isOpen, bandFor, setBand } from '../../game/state';
import { comeIn, setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, resumeRun, save, startDaily, startRun } from '../session';
import { dailyOf, dailyTaken, met, vowsOpen } from '../../game/hold';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { HERO_LIGHT, LANTERN } from '../light/hours';
import { LIGHT_NAMES, lightMode, nextLightMode, setLightMode } from '../light/setting';
import { HOLD_PLACES } from '../icons';
import { ArenaScene } from './ArenaScene';

const DARK: Material = { fill: '#3b2a1c', shade: '#2a1a10' };

/** What opens a hero, as a line a player reads. A boss is not named: nobody has met it yet. */
export function featText(feat: Feat): string {
  switch (feat.kind) {
    case 'wave':
      return `Reach wave ${feat.wave}`;
    case 'boss':
      return `Beat the wave ${bossWave(feat.boss)} boss`;
    case 'coins':
      return `Collect ${feat.coins} coins in one run`;
    case 'kills':
      return `Defeat ${feat.kills} enemies in total`;
    case 'runs':
      return feat.runs === 1 ? 'Finish 1 run' : `Finish ${feat.runs} runs`;
  }
}

/** The same, in two or three words for a small card. */
function featShort(feat: Feat): string {
  switch (feat.kind) {
    case 'wave':
      return `WAVE\n${feat.wave}`;
    case 'boss':
      return `BOSS\nWAVE ${bossWave(feat.boss)}`;
    case 'coins':
      return `${feat.coins}\nCOINS`;
    case 'kills':
      return `${feat.kills}\nKILLS`;
    case 'runs':
      return feat.runs === 1 ? '1\nRUN' : `${feat.runs}\nRUNS`;
  }
}

/** Where a hero's mastery stands and what the next level is, in one line: the reason to play them again. */
function masteryLine(s: SaveData, hero: string): string {
  const lv = masteryLevel(s, hero);
  const next = nextLevel(s, hero);
  const row = trackRows(s, hero)[lv];
  if (!next || !row) return `MASTERY ${lv}: FULL`;
  const what = row.gifts.length > 1 ? 'a choice of two' : giftShort(row.gifts[0].gift);
  return `MASTERY ${lv}: next level, ${what}, in ${next.left} mastery`;
}

/** The color the dusk lays over what stands in the Hold away from the fire. */
const DUSK = 0x6f6a9c;

export class TitleScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private settings = false;
  private chosen = HEROES[0].id;

  constructor() {
    super('Title');
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#241c2c');
    this.settings = false;
    ArenaScene.applySound();
    const s = save();
    this.chosen = isOpen(s, s.last) ? s.last : HEROES[0].id;
    this.root = this.add.container(0, 0);
    music.play('meadow', 'calm');
    this.draw();
    comeIn(this);
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
    const sh = tall ? Math.max(170, Math.min(400, H - sy - 110 - (2 * chTall + 8) - 88 - 84 - 30 - (s.run ? 58 : 'Hold' in this.scene.manager.keys ? 60 : 0))) : H - sy - 14;
    // The Hold is a place: the meadow at dusk, the gate the runs go out by, a fire, and whoever is chosen standing
    // by it with those who go along. It was a flat green page with a dark panel on it, which a reviewer took for
    // a settings menu.
    const ground = this.add.image(W / 2, H / 2, 'hold:ground').setTint(DUSK);
    ground.setScale(Math.max(W / ground.width, H / ground.height) * 1.02);
    this.root.addAt(ground, 0);
    // Dark toward the top and the far side, where the words are: they are read against it.
    this.root.addAt(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(W, H).setTint(0x140e1c).setAlpha(tall ? 0.5 : 0.1, 0.62, tall ? 0.74 : 0.3, 0.74), 1);
    const figX = tall ? sx + 110 : sx + sw / 2;
    const feet = sy + sh - (tall ? 24 : 96);
    const tallest = tall ? sh - 44 : 236;
    // The gate, behind them, in the dusk.
    const gate = put(this.add.image(figX - (tall ? 10 : 16), feet - 10, CARDS, portraitFrame('blue', HOLD_PLACES[0]))).setTint(DUSK);
    gate.setScale(Math.min((tallest * 1.24) / (gate.frame.height || 1), (tall ? 250 : sw + 30) / (gate.frame.width || 1)));
    // The fire: its light on the ground and on the air, and flames that stand and waver.
    const fx0 = figX + (tall ? 78 : 92);
    const fy0 = feet + 8;
    const lit = HERO_LIGHT[hero.id] ?? LANTERN;
    put(this.add.image(fx0 - 30, feet - 4, SHEET, 'fx/glow')).setTint(hex(FIRE.fill)).setAlpha(0.5).setScale(tall ? 3.4 : 4.6, tall ? 1.3 : 1.7).setBlendMode(Phaser.BlendModes.ADD);
    if (open) put(this.add.image(figX, feet - 80, SHEET, 'fx/glow')).setTint(lit).setAlpha(0.3).setScale((tall ? 4 : 5.6) / 2).setBlendMode(Phaser.BlendModes.ADD);
    // Their shadow, thrown away from the fire.
    put(this.add.image(figX - 36, feet + 4, SHEET, 'fx/glow')).setTint(0x0c0a16).setAlpha(0.75).setScale(tall ? 2.4 : 3.2, 0.5);
    const fig = put(this.add.image(figX, feet, CARDS, portraitFrame('blue', hero.unit)));
    fig.setScale(Math.min(tallest / (fig.frame.height || 1), (tall ? 190 : sw - 30) / (fig.frame.width || 1)));
    if (!open) fig.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.9);
    else this.tweens.add({ targets: fig, scaleY: fig.scaleY * 1.025, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Who goes along stands at the fire with them.
    if (open) {
      bandFor(s, hero.id).filter((id) => id).forEach((id, i) => {
        const who = byId(COMPANIONS, id);
        const img = put(this.add.image(fx0 + 36 + i * 44, feet + 14 + i * 6, CARDS, portraitFrame('blue', who.unit))).setFlipX(true);
        img.setScale(Math.min((tallest * 0.42) / (img.frame.height || 1), 84 / (img.frame.width || 1)));
        this.tweens.add({ targets: img, scaleY: img.scaleY * 1.03, duration: 900 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    }
    put(this.add.image(fx0, fy0 + 2, SHEET, 'fx/disc')).setTint(0x1c1410).setScale(0.5, 0.2);
    for (let i = 0; i < 3; i++) {
      const flame = put(this.add.image(fx0 + (i - 1) * 7, fy0 - 2, SHEET, 'fx/flame')).setOrigin(0.5, 0.9).setTint(i === 1 ? 0xffe9a8 : hex(FIRE.fill)).setBlendMode(Phaser.BlendModes.ADD);
      const size = (i === 1 ? 0.5 : 0.36) * (tall ? 0.85 : 1);
      flame.setScale(size, size * 1.2);
      this.tweens.add({ targets: flame, scaleY: size * 1.55, scaleX: size * 0.86, duration: 170 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Who they are. On a wide screen it is beside the stage, on a tall one inside it and under it.
    const tx = tall ? sx + 222 : sx + sw + 18;
    const tw = tall ? W - tx - 26 : W - tx - 16;
    // On a wide screen the top of the column is a bar of its own (renown, the Hold, the cog): the words start under it.
    const barred = !tall && 'Hold' in this.scene.manager.keys;
    let ty = tall ? sy + 16 : barred ? 64 : 18;
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
        say(`PASSIVE: ${hero.quirkName.toUpperCase()}  ${hero.says}`, 15, BONE.fill, 6, x, w);
        say(`SKILL: ${move.name.toUpperCase()}  ${move.says}`, 15, HOLY.fill, 6, x, w);
        say(`WEAPON: ${wdef.name}${best > 0 ? `     BEST: WAVE ${best}` : ''}`, 15, BONE.shade, 6, x, w);
        say(masteryLine(s, hero.id), 15, GOLD.fill, 6, x, w);
      } else {
        say(`PASSIVE: ${hero.quirkName.toUpperCase()}  ${hero.says}`, 15, BONE.fill, 8);
        say(`SKILL: ${move.name.toUpperCase()}  ${move.says}`, 15, HOLY.fill, 8);
        say(`WEAPON: ${wdef.name}${best > 0 ? `     BEST: WAVE ${best}` : ''}`, 15, BONE.shade, 8);
        say(masteryLine(s, hero.id), 15, GOLD.fill, 8);
      }
    } else {
      // Not opened: dark, with what opens them and how near that is, and nothing else.
      say('???', tall ? 24 : 30, BONE.shade, 6);
      say(hero.unlock ? `LOCKED. Unlock: ${featText(hero.unlock)}.` : 'LOCKED', 17, BONE.fill, 8);
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
      const on = new Button(this, tall ? W / 2 : rx + cw2 / 2, tall ? by - playH / 2 - 8 - 25 : by, `CONTINUE: ${name}, WAVE ${kept.wave}`, () => this.carryOn(), { width: cw2, height: 50, size: 16, mat: GOLD });
      this.root.add(on.root);
      if (tall) floor -= 58;
    }

    // The day's run and the vows, when there is no run waiting: a card for the one run a day that is the same for
    // everyone, and the vows sworn for the next run, which open after a first win.
    if (!kept && 'Hold' in this.scene.manager.keys) {
      const date = new Date().toISOString().slice(0, 10);
      const d = dailyOf(date);
      const taken = dailyTaken(s, date);
      const vowsCan = vowsOpen(s).length > 0;
      const w2 = tall ? rw : Math.min(380, rw - bw - 10);
      const vw = vowsCan ? (tall ? (w2 - 8) * 0.4 : 130) : 0;
      const dw = w2 - vw - (vowsCan ? 8 : 0);
      const y2 = tall ? by - playH / 2 - 8 - 28 : by;
      const hero2 = byId(HEROES, d.hero);
      // Who has not been met is a surprise, said in words: "??? + ???" read as broken.
      const today = met(s, 'hero', hero2.id) ? `DAILY RUN: ${hero2.short.toUpperCase()}` : 'DAILY RUN: SURPRISE HERO';
      const daily = new Button(this, rx + dw / 2, y2, taken ? `DAILY RUN: WAVE ${s.daily?.wave ?? 0}` : today, () => {
        if (!startDaily(date)) return;
        this.scene.start('Arena');
      }, { width: dw, height: 52, size: 15, mat: taken ? IRON : GOLD });
      daily.setEnabled(!taken);
      this.root.add(daily.root);
      if (vowsCan) {
        const vows = new Button(this, rx + dw + 8 + vw / 2, y2, s.vows.length > 0 ? `VOWS: ${s.vows.length}` : 'VOWS', () => this.scene.start('Hold', { tab: 'VOWS' }), { width: vw, height: 52, size: 16, mat: s.vows.length > 0 ? RUBY : IRON });
        this.root.add(vows.root);
      }
      if (tall) floor -= 60;
    }

    // The band: a card for each place, with whoever goes in it. A press goes round those who are open.
    const places = open ? bandSize(hero.id, slotsOf(s)) : 0;
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
          card.add(label(this, -cwid / 2 + 14, 10, routeSays(COMPANIONS[0]), { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3 }));
        } else {
          if (who) {
            const img = this.add.image(-cwid / 2 + 34, bandH / 2 - 10, CARDS, portraitFrame('blue', who.unit));
            img.setScale(Math.min(48 / (img.frame.height || 1), 52 / (img.frame.width || 1)));
            card.add(img);
          }
          card.add(label(this, -cwid / 2 + (who ? 66 : 16), -12, who ? who.name : 'None', { size: 17, align: 'left' }));
          card.add(label(this, -cwid / 2 + (who ? 66 : 16), 10, who ? who.quirkName : 'Choose a companion', { size: 15, align: 'left', color: who ? HOLY.fill : BONE.shade, strokeWidth: 3 }));
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
      put(label(this, rx + 2, y - bandH / 2 - 12, places > 1 ? 'COMPANIONS' : 'COMPANION', { size: 15, align: 'left', color: BONE.fill, strokeWidth: 3 }));
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
      if (!isOpenHero) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.55);
      card.add(img);
      if (isOpenHero) card.add(label(this, 0, ch / 2 - 14, h.short, { size: 15, color: OUTLINE, stroke: null }));
      else {
        // Dark and unnamed, with the deed that opens them and nothing else.
        card.add(label(this, 0, -ch / 2 + 14, '???', { size: 15, color: BONE.shade, stroke: null }));
        if (h.unlock) card.add(label(this, 0, ch / 2 - 22, featShort(h.unlock), { size: 15, color: BONE.fill, strokeWidth: 3 }).setLineSpacing(-3));
      }
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.chosen = h.id;
        sfx.play('click', 0.6);
        this.draw();
      });
      this.root.add(card);
    });

    // What is kept between runs: a button opens the Hold, where each hero's mastery and the band are.
    // Renown is gone: what a player keeps is each hero's mastery, said on the Hold's HEROES tab.
    const board = 'Hold' in this.scene.manager.keys;
    if (board) {
      const hold = new Button(this, tall ? W - 86 : W - 38 - 34 - 74, tall ? 80 : 36, 'THE HOLD', () => this.scene.start('Hold'), { width: 148, height: 44, size: 17, mat: GOLD });
      this.root.add(hold.root);
    }

    // One small cog in a corner, and behind it what a player sets once: the sound, and how much of the light is made.
    const cx = tall ? 38 : W - 38;
    const cog = this.add.container(cx, 36);
    cog.add(slabImage(this, -22, -22, 44, 44, IRON, 12, 5));
    cog.add(this.add.image(0, -2, SHEET, 'icon/cog').setScale(0.3));
    cog.setSize(44, 44).setInteractive({ useHandCursor: true });
    cog.on('pointerup', () => {
      this.settings = !this.settings;
      sfx.play('click', 0.6);
      this.draw();
    });
    this.root.add(cog);
    if (this.settings) {
      const pw = 236;
      const px = tall ? 16 : W - 16 - pw;
      const py = 66;
      put(slabImage(this, px, py, pw, 128, BONE, 14, 6)).setInteractive();
      const sound = new Button(this, px + pw / 2, py + 36, `SOUND: ${s.sound ? 'ON' : 'OFF'}`, () => {
        s.sound = !s.sound;
        s.music = s.sound;
        commit();
        ArenaScene.applySound();
        this.draw();
      }, { width: pw - 28, height: 44, size: 17, mat: IRON });
      this.root.add(sound.root);
      const light = new Button(this, px + pw / 2, py + 90, `LIGHT: ${LIGHT_NAMES[lightMode()]}`, () => {
        setLightMode(nextLightMode(lightMode()), true);
        light.setText(`LIGHT: ${LIGHT_NAMES[lightMode()]}`);
      }, { width: pw - 28, height: 44, size: 17, mat: IRON });
      this.root.add(light.root);
    }
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
