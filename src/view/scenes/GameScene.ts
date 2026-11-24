// The game's one screen: the fight, what is shown over it (the stage, the
// enemy's health, the abilities), and the head and tabs of the lists. The
// lists themselves scroll, so they are a scene of their own with a camera
// cut to their place (ListScene); so are the cards that come up over
// everything (ModalScene).
//
// The screen is laid out for whatever window it has (app.ts, layout), and
// made again when the window changes shape. Nothing is lost by that: the
// save and the fight are the session's, not the screen's.

import Phaser from 'phaser';
import { BONE, CLOTH, FIRE, HOLY, LEATHER, LINEN, OUTLINE, STEEL, VENOM } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { ABILITIES, FEATS, FEAT_SHARE } from '../../game/data';
import { fmt, percent } from '../../game/format';
import {
  ABILITY, abilityOn, abilityOpen, enemiesIn, enemyAt, kindOf, landName, landOf, legionDps, tapDamage,
} from '../../game/rules';
import { ads } from '../../platform/ads';
import { getManifest, layout, setupCamera, type Layout, type Rect } from '../app';
import { SHEET, sheet } from '../art/Sheet';
import { ART_SCALE, hex, view } from '../config';
import { battle, commit, save, takeEarned } from '../session';
import { StageView } from '../StageView';
import { pillImage, slabImage } from '../ui/bake';
import { Button, label, plain } from '../ui/widgets';
import { SHEET_HEIGHT } from './BootScene';

const INV_ART = 1 / ART_SCALE;

/** The tabs of the lists, in the order they stand. */
export const TABS = ['heroes', 'camp', 'rebirth', 'feats'] as const;
export type Tab = (typeof TABS)[number];
const TAB_ICONS: Record<Tab, string> = { heroes: 'icon/helm', camp: 'icon/tent', rebirth: 'icon/laurel', feats: 'icon/trophy' };
const TAB_NAMES: Record<Tab, string> = { heroes: 'HEROES', camp: 'CAMP', rebirth: 'REBIRTH', feats: 'FEATS' };
const BUYS = [1, 10, 25, 0];

/** The names of who is fought, for the bar over them. */
const NAMES: Record<string, string> = {
  cutpurse: 'Cutpurse', poacher: 'Poacher', hexer: 'Hexer', ringleader: 'Ringleader', bruiser: 'Bruiser', warlord: 'The Warlord',
  lancer: 'Lancer', javelineer: 'Javelineer', pyromancer: 'Pyromancer', drummer: 'War Drummer', ballista: 'Ballista', colossus: 'Sandstone Colossus',
  huscarl: 'Huscarl', harpooner: 'Harpooner', frostwitch: 'Frost Witch', skald: 'Skald', icegolem: 'Rime Golem', jarl: 'Jarl of the Rime',
};

interface AbilityButton {
  root: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Image;
  shade: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Image;
  state: string;
}

export class GameScene extends Phaser.Scene {
  private lay!: Layout;
  private stage!: StageView;
  private tab: Tab = 'heroes';

  private plate!: Phaser.GameObjects.Text;
  private emblem!: Phaser.GameObjects.Image;
  private foeName!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Image;
  private hpText!: Phaser.GameObjects.Text;
  private pips!: Phaser.GameObjects.Text;
  private timerBack!: Phaser.GameObjects.Image;
  private timerFill!: Phaser.GameObjects.Image;
  private timerText!: Phaser.GameObjects.Text;
  private barW = 300;
  private gold!: Phaser.GameObjects.Text;
  private coin!: Phaser.GameObjects.Image;
  private dps!: Phaser.GameObjects.Text;
  private buy!: Button;
  private advance!: Button;
  private fightBoss!: Button;
  private readonly abilities: AbilityButton[] = [];
  private tabButtons: Array<{ tab: Tab; back: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image; dot: Phaser.GameObjects.Image }> = [];
  private toasts: Phaser.GameObjects.Container[] = [];
  private waiting: Array<[string, string]> = [];
  private hint: Phaser.GameObjects.Container | null = null;

  private shownGold = -1;
  private shownStage = -1;
  private shownDps = -1;
  private shownHp = -1;
  private shownKills = -1;
  private uiT = 0;
  private saveT = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private playing = false;

  constructor() {
    super('Game');
  }

  init(data?: { tab?: Tab }): void {
    if (data?.tab) this.tab = data.tab;
    this.abilities.length = 0;
    this.tabButtons = [];
    this.toasts = [];
    this.waiting = [];
    this.hint = null;
    this.shownGold = this.shownStage = this.shownDps = this.shownHp = this.shownKills = -1;
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(OUTLINE);
    const s = save();
    this.lay = layout();
    const L = this.lay;
    const art = sheet(this.game, getManifest(), SHEET_HEIGHT);
    this.stage = new StageView(this, L.stage, art, getManifest(), s, battle());
    this.stage.onCoin = () => this.bumpCoin();
    this.stage.onPack = () => this.openPack();

    this.buildHud(L.stage);
    this.buildPanel(L);
    this.stage.purse = { x: this.coin.x, y: this.coin.y };

    // A press on the fight is a blow. Buttons over it take their own presses first.
    const zone = this.add.zone(L.stage.x + L.stage.w / 2, L.stage.y + L.stage.h / 2, L.stage.w, L.stage.h).setInteractive().setDepth(-500);
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.strike(p.worldX, p.worldY));
    // Space and enter strike too, for whoever would rather not wear a mouse out.
    this.input.keyboard?.on('keydown-SPACE', () => this.strike(this.lastTapX || L.stage.x + L.stage.w * 0.7, this.lastTapY || L.stage.y + L.stage.h * 0.5));

    this.applySound();
    music.play(landOf(s.run.stage).ground, 'battle');
    if (battle().packLeft > 0) this.stage.dropPack();

    this.scene.launch('List', { rect: L.list, tab: this.tab });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stage.destroy();
      this.scene.stop('List');
    });
    // The lists say when something was bought, so that the fight shows it.
    this.game.events.off('bought');
    this.game.events.on('bought', () => {
      this.stage.sync();
      this.refresh(true);
    });
    this.game.events.off('reborn');
    this.game.events.on('reborn', () => this.scene.restart({ tab: 'rebirth' }));

    this.refresh(true);
    const earned = takeEarned();
    if (earned) this.scene.launch('Modal', { kind: 'away', earned });
    this.showHints();
    if (!this.playing) {
      this.playing = true;
      ads().gameplayStart();
    }
  }

  // ------------------------------------------------------------ over the fight

  private buildHud(S: Rect): void {
    const cx = S.x + S.w / 2;
    // The stage's plate: the land's emblem, its name, and the stage's number.
    const plateW = Math.min(380, S.w - 150);
    slabImage(this, cx - plateW / 2, S.y + 12, plateW, 42, BONE, 14, 5).setDepth(8000);
    this.emblem = this.add.image(cx - plateW / 2 + 26, S.y + 31, SHEET, 'icon/land-meadow').setScale(0.7 * INV_ART).setDepth(8001);
    this.plate = label(this, cx + 12, S.y + 31, '', { size: plateW < 330 ? 17 : 19, color: OUTLINE, stroke: null }).setDepth(8001);

    // Who is fought, how much of them is left, and how far through the stage the legion is: over the enemy's head.
    const ex = this.stage.enemyX;
    this.barW = this.stage.barHalf * 2;
    const by = S.y + (view.tall ? 96 : 104);
    this.foeName = label(this, ex - this.barW / 2, by - 21, '', { size: 16, align: 'left', strokeWidth: 4 }).setDepth(8001);
    this.pips = label(this, ex + this.barW / 2, by - 21, '', { size: 16, align: 'right', strokeWidth: 4 }).setDepth(8001);
    pillImage(this, ex, by, this.barW, 20, OUTLINE).setDepth(8000);
    this.hpFill = this.add.image(ex - this.barW / 2 + 3, by, SHEET, 'fx/solid').setOrigin(0, 0.5).setTint(hex(CLOTH.red.fill)).setDepth(8001);
    this.hpText = label(this, ex, by - 1, '', { size: 15, strokeWidth: 4 }).setDepth(8002);
    // A captain's and a boss's time, running out.
    const tw = Math.round(this.barW * 0.7);
    this.timerBack = pillImage(this, ex - this.barW / 2 + tw / 2, by + 21, tw, 8, OUTLINE).setDepth(8000);
    this.timerFill = this.add.image(ex - this.barW / 2 + 2, by + 21, SHEET, 'fx/solid').setOrigin(0, 0.5).setTint(hex(HOLY.fill)).setDepth(8001);
    this.timerText = label(this, ex - this.barW / 2 + tw + 8, by + 21, '', { size: 15, align: 'left', strokeWidth: 4, color: HOLY.light }).setDepth(8001);

    // The settings, in the corner.
    const cog = new Button(this, S.x + S.w - 38, S.y + 34, '', () => this.scene.launch('Modal', { kind: 'settings' }), { width: 52, height: 48, mat: BONE }).setDepth(8000);
    cog.root.add(this.add.image(0, -3, SHEET, 'icon/cog').setScale(0.6 * INV_ART));

    // The abilities, along the foot of the fight.
    ABILITIES.forEach((_def, i) => {
      const x = S.x + 44 + i * 70;
      const y = S.y + S.h - 46;
      const root = this.add.container(x, y).setDepth(8000);
      const glow = this.add.image(0, 0, SHEET, 'fx/disc').setTint(hex(HOLY.light)).setScale(1.5 * INV_ART).setAlpha(0);
      const slab = slabImage(this, -29, -29, 58, 58, LINEN, 14, 6);
      const icon = this.add.image(0, -3, SHEET, i === ABILITY.RALLY ? 'icon/horn' : i === ABILITY.VOLLEY ? 'icon/arrows' : 'icon/sack').setScale(0.8 * INV_ART);
      const shade = this.add.image(-27, 27, SHEET, 'fx/solid').setOrigin(0, 1).setTint(hex(OUTLINE)).setAlpha(0.66).setDisplaySize(54, 54);
      const text = label(this, 0, 0, '', { size: 18, strokeWidth: 5 });
      root.add([glow, slab, icon, shade, text]);
      root.setSize(58, 58).setInteractive({ useHandCursor: true });
      root.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.useAbility(i);
      });
      this.abilities.push({ root, icon, shade, text, glow, state: '' });
    });

    // Whether the legion goes on by itself, and the way back to a boss that turned it.
    this.advance = new Button(this, S.x + S.w - 74, S.y + S.h - 44, '', () => this.toggleAdvance(), { width: 124, height: 50, size: 20, mat: VENOM }).setDepth(8000);
    this.fightBoss = new Button(this, S.x + S.w - 74, S.y + S.h - 104, 'FIGHT', () => this.challenge(), { width: 124, height: 54, size: 22, mat: FIRE }).setDepth(8000);
    this.tweens.add({ targets: this.fightBoss.root, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ------------------------------------------------------------ the lists' head and tabs

  private buildPanel(L: Layout): void {
    const P = L.panel;
    // The lists stand on a dark ground of their own, with a pale edge toward the fight.
    this.add.image(P.x + P.w / 2, P.y + P.h / 2, SHEET, 'fx/solid').setTint(hex(OUTLINE)).setDisplaySize(P.w, P.h).setDepth(8900);
    if (view.tall) this.add.image(P.x + P.w / 2, P.y + 2, SHEET, 'fx/solid').setTint(hex(LEATHER.fill)).setDisplaySize(P.w, 5).setDepth(8901);
    else this.add.image(P.x + 2, P.y + P.h / 2, SHEET, 'fx/solid').setTint(hex(LEATHER.fill)).setDisplaySize(5, P.h).setDepth(8901);

    const H = L.head;
    const hy = H.y + H.h / 2 + 2;
    // The purse, and what the legion deals a second.
    this.coin = this.add.image(H.x + 40, hy - 12, SHEET, 'icon/coin').setScale(0.82 * INV_ART).setDepth(8910);
    this.gold = label(this, H.x + 68, hy - 13, '0', { size: 32, align: 'left', color: HOLY.fill, strokeWidth: 6 }).setDepth(8910);
    this.add.image(H.x + 40, hy + 23, SHEET, 'icon/sword').setScale(0.44 * INV_ART).setDepth(8910);
    this.dps = label(this, H.x + 60, hy + 23, '', { size: 16, align: 'left', strokeWidth: 4 }).setDepth(8910);
    // How many levels a press buys.
    this.buy = plain(new Button(this, H.x + H.w - 62, hy, '', () => this.cycleBuy(), { width: 96, height: 50, size: 22, mat: BONE, color: OUTLINE })).setDepth(8910);

    const T = L.tabs;
    const w = (T.w - 16) / TABS.length;
    TABS.forEach((tab, i) => {
      const x = T.x + 8 + w * i + w / 2;
      const y = T.y + T.h / 2;
      const back = slabImage(this, x - w / 2 + 3, y - 23, w - 6, 46, BONE, 12, 5).setDepth(8910);
      const icon = this.add.image(x - w / 2 + 24, y - 2, SHEET, TAB_ICONS[tab]).setScale(0.52 * INV_ART).setDepth(8911);
      const text = label(this, x + 12, y - 2, TAB_NAMES[tab], { size: w < 110 ? 13 : 15, color: OUTLINE, stroke: null }).setDepth(8911);
      const dot = pillImage(this, x + w / 2 - 12, y - 20, 10, 10, CLOTH.red.fill).setDepth(8912).setVisible(false);
      back.setInteractive({ useHandCursor: true });
      back.on('pointerdown', () => {
        if (this.tab === tab) return;
        this.tab = tab;
        sfx.play('click');
        this.scene.stop('List');
        this.scene.launch('List', { rect: L.list, tab });
        this.drawTabs();
      });
      this.tabButtons.push({ tab, back, text, icon, dot });
    });
    this.drawTabs();
  }

  private drawTabs(): void {
    for (const t of this.tabButtons) {
      const on = t.tab === this.tab;
      t.back.setTint(on ? 0xffffff : 0x9a9a9a);
      t.text.setAlpha(on ? 1 : 0.75);
      t.icon.setAlpha(on ? 1 : 0.8);
    }
  }

  // ------------------------------------------------------------ what the player does

  private strike(x: number, y: number): void {
    this.lastTapX = x;
    this.lastTapY = y;
    const b = battle();
    const before = b.count;
    const dealt = b.tap(Date.now());
    // The fight's events of this tick are read in update. A tap between ticks is shown here and now.
    let crit = false;
    for (let i = before; i < b.count; i++) if (b.events[i].kind === 'tap') crit = b.events[i].flag;
    this.stage.tap(x, y, dealt, crit, this.time.now / 1000);
    for (let i = before; i < b.count; i++) if (b.events[i].kind !== 'tap') this.tell(b.events[i].kind, b.events[i].a, b.events[i].b, b.events[i].flag);
    b.count = before;
    if (!save().hints.includes('tap') && save().stats.taps >= 5) {
      save().hints.push('tap');
      this.showHints();
    }
  }

  private useAbility(i: number): void {
    const now = Date.now();
    const b = battle();
    const before = b.count;
    if (!b.use(i, now)) {
      sfx.play('deny', 0.6);
      return;
    }
    sfx.play(i === ABILITY.PLUNDER ? 'coin' : 'skill', 0.9);
    for (let k = before; k < b.count; k++) this.tell(b.events[k].kind, b.events[k].a, b.events[k].b, b.events[k].flag);
    b.count = before;
    this.toast(ABILITIES[i].name.toUpperCase(), i === ABILITY.PLUNDER ? HOLY.fill : FIRE.light);
    this.refresh(true);
  }

  private toggleAdvance(): void {
    battle().setAdvance(!save().settings.advance);
    this.refresh(true);
  }

  private challenge(): void {
    const b = battle();
    b.challenge();
    for (let k = 0; k < b.count; k++) this.tell(b.events[k].kind, b.events[k].a, b.events[k].b, b.events[k].flag);
    b.count = 0;
    this.stage.walkIn(b.wait);
    this.refresh(true);
  }

  private cycleBuy(): void {
    const s = save();
    s.settings.buy = BUYS[(BUYS.indexOf(s.settings.buy) + 1) % BUYS.length];
    this.refresh(true);
    this.game.events.emit('prices');
  }

  private openPack(): void {
    const prize = battle().openPack(Date.now());
    if (!prize) return;
    this.stage.clearPack(true);
    sfx.play('packOpen', 0.9);
    if (prize.kind === 'gold') this.toast(`+${fmt(prize.gold)} GOLD`, HOLY.fill);
    else this.toast(`${prize.kind === 'rally' ? 'RALLY' : 'PLUNDER'} ${prize.seconds}s`, FIRE.light);
    this.refresh(true);
  }

  private applySound(): void {
    const s = save().settings;
    sfx.enabled = s.sound;
    sfx.setVolumes(s.effects / 10, s.music / 10);
  }

  // ------------------------------------------------------------ what the fight says

  private tell(kind: string, a: number, b: number, flag: boolean): void {
    const now = this.time.now / 1000;
    const s = save();
    switch (kind) {
      case 'swing': this.stage.swing(a, now); break;
      case 'hit': this.stage.blow(a, b, now); break;
      case 'shot': this.stage.shot(b, now); break;
      case 'storm': this.stage.storm(b, now); break;
      case 'kill':
        this.stage.down(b, flag, now);
        if (flag) {
          if (s.settings.shake) this.cameras.main.shake(220, 0.006);
          // A boss's fall is a thing a portal may cheer; a captain's is not.
          if (kindOf(s.run.stage - (s.run.kills === 0 ? 1 : 0)) === 'boss') ads().happy();
        }
        break;
      case 'spawn': this.stage.stand(); break;
      case 'stage':
        if (flag) {
          this.stage.land();
          const kindNow = kindOf(a);
          if ((a - 1) % 10 === 0 && a > 1) {
            this.toast(landName(a).toUpperCase(), BONE.fill);
            music.play(landOf(a).ground, 'battle');
          } else if (kindNow === 'boss') this.toast(landOf(a).bossName.toUpperCase(), FIRE.light);
          else if (kindNow === 'captain') this.toast(landOf(a).captainName.toUpperCase(), FIRE.light);
          this.game.events.emit('prices');
        }
        break;
      case 'fail':
        this.stage.failed();
        this.toast('FELL BACK', CLOTH.red.fill);
        break;
      case 'pack': this.stage.dropPack(); break;
      case 'packGone': this.stage.clearPack(false); break;
      case 'feat':
        this.toast(`FEAT: ${FEATS[a].name.toUpperCase()}  +${percent(FEAT_SHARE)}`, HOLY.fill);
        sfx.play('claim', 0.8);
        this.game.events.emit('prices');
        break;
    }
  }

  // ------------------------------------------------------------ what is shown

  private bumpCoin(): void {
    this.coin.setScale(0.98 * INV_ART);
    sfx.play('coin', 0.25, 1 + Math.random() * 0.2);
  }

  /** A line of words that comes up over the fight and goes: a land's name, a boss's, a feat. Three at a time: the rest wait their turn. */
  private toast(text: string, color: string): void {
    if (this.toasts.length >= 3) {
      if (this.waiting.length < 12) this.waiting.push([text, color]);
      return;
    }
    const S = this.lay.stage;
    // Each takes the first line that is free.
    let line = 0;
    while (this.toasts.some((c) => c.getData('line') === line)) line++;
    const y = S.y + (view.tall ? 150 : 168) + line * 36;
    const t = label(this, 0, 0, text, { size: view.tall ? 24 : 28, color, strokeWidth: 7 });
    const c = this.add.container(S.x + S.w / 2, y, [t]).setDepth(8200).setAlpha(0).setScale(0.7).setData('line', line);
    this.toasts.push(c);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, y: y - 24, duration: 350, delay: 1500,
      onComplete: () => {
        this.toasts.splice(this.toasts.indexOf(c), 1);
        c.destroy();
        const next = this.waiting.shift();
        if (next) this.toast(next[0], next[1]);
      },
    });
  }

  /** The first things a new player is shown: that a press strikes, and where a hero is hired. */
  private showHints(): void {
    this.hint?.destroy();
    this.hint = null;
    const s = save();
    if (s.hints.includes('tap') || s.stats.taps >= 5) return;
    const S = this.lay.stage;
    const x = this.stage.enemyX;
    const y = S.y + (view.tall ? 176 : 196);
    const glove = this.add.image(0, 0, SHEET, 'icon/gauntlet').setScale(0.9 * INV_ART).setAngle(160);
    const words = label(this, 0, -44, 'TAP TO STRIKE', { size: 20, strokeWidth: 6, color: HOLY.light });
    this.hint = this.add.container(x, y, [glove, words]).setDepth(8100);
    this.tweens.add({ targets: this.hint, y: y + 22, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private refresh(all = false): void {
    const s = save();
    const b = battle();
    const run = s.run;
    if (all || run.stage !== this.shownStage) {
      this.shownStage = run.stage;
      this.plate.setText(`${landName(run.stage)}  ·  Stage ${run.stage}`);
      this.emblem.setFrame(`icon/land-${landOf(run.stage).ground}`);
    }
    const gold = Math.floor(run.gold);
    if (all || gold !== this.shownGold) {
      this.shownGold = gold;
      this.gold.setText(fmt(gold));
    }
    const dps = legionDps(s);
    if (all || dps !== this.shownDps) {
      this.shownDps = dps;
      this.dps.setText(`${fmt(dps)} a second   ·   ${fmt(tapDamage(s, Date.now()))} a tap`);
    }
    if (all) {
      this.buy.setText(s.settings.buy === 0 ? 'MAX' : `x${s.settings.buy}`);
      this.advance.setText(s.settings.advance ? 'GO ON' : 'HOLD').setMaterial(s.settings.advance ? VENOM : STEEL);
    }
    this.fightBoss.setVisible(run.holding && s.settings.advance);

    // The enemy's bar.
    const kind = kindOf(run.stage);
    const hp = b.phase === 'fight' ? Math.max(0, b.hp) : 0;
    if (all || hp !== this.shownHp) {
      this.shownHp = hp;
      const share = b.maxHp > 0 && b.phase === 'fight' ? Math.max(0, Math.min(1, hp / b.maxHp)) : 0;
      this.hpFill.setDisplaySize(Math.max(0.001, (this.barW - 6) * share), 14);
      this.hpText.setText(b.phase === 'fight' ? fmt(Math.ceil(hp)) : '');
    }
    if (all || run.kills !== this.shownKills) {
      this.shownKills = run.kills;
      const land = landOf(run.stage);
      this.foeName.setText(kind === 'boss' ? land.bossName : kind === 'captain' ? land.captainName : NAMES[enemyAt(run.stage, run.kills)] ?? '');
      this.foeName.setColor(kind === 'troop' ? BONE.fill : FIRE.light);
      this.pips.setText(kind === 'troop' ? `${run.kills + 1}/${enemiesIn(run.stage)}` : '');
    }
    const timed = kind !== 'troop' && b.phase === 'fight';
    this.timerBack.setVisible(timed);
    this.timerFill.setVisible(timed);
    this.timerText.setVisible(timed);
    if (timed) {
      const whole = Math.max(1, b.bossLeft);
      // The bar is of the time the boss was given, which the first reading of it is.
      if (this.bossGiven < b.bossLeft) this.bossGiven = b.bossLeft;
      const share = Math.max(0, Math.min(1, b.bossLeft / this.bossGiven));
      this.timerFill.setDisplaySize(Math.max(0.001, (this.barW * 0.7 - 4) * share), 4).setTint(hex(share < 0.25 ? CLOTH.red.fill : HOLY.fill));
      this.timerText.setText(`${Math.ceil(whole)}s`);
    } else this.bossGiven = 0;

    // The abilities: not yet the player's, ready, running, or resting.
    const now = Date.now();
    ABILITIES.forEach((def, i) => {
      const ui = this.abilities[i];
      const mine = s.abilities[i];
      let state: string;
      let share = 0;
      let text = '';
      if (!abilityOpen(s, i)) {
        state = 'locked';
        share = 1;
        text = `${def.stage}`;
      } else if (abilityOn(s, i, now)) {
        state = 'on';
        text = `${Math.ceil((mine.until - now) / 1000)}`;
      } else if (mine.ready > now) {
        state = 'rest';
        share = Math.min(1, (mine.ready - now) / (def.cooldown * 1000));
        text = `${Math.ceil((mine.ready - now) / 1000)}`;
      } else state = 'ready';
      ui.shade.setDisplaySize(54, Math.max(0.001, 54 * share)).setVisible(share > 0);
      const key = `${state}:${text}`;
      if (key !== ui.state) {
        ui.state = key;
        ui.text.setText(state === 'locked' ? `ST ${text}` : text).setFontSize(state === 'locked' ? 13 : 18);
        ui.text.setColor(state === 'on' ? HOLY.light : BONE.fill);
        ui.icon.setAlpha(state === 'locked' ? 0.35 : 1);
        ui.glow.setAlpha(state === 'on' ? 0.8 : 0);
      }
    });

    // A dot on a tab where there is something to do: laurels to spend, a rebirth worth having.
    for (const t of this.tabButtons) {
      if (t.tab === 'rebirth') t.dot.setVisible(s.laurels > 0 && this.tab !== 'rebirth');
    }
  }

  private bossGiven = 0;

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    const now = this.time.now / 1000;
    const b = battle();
    b.tick(dt, Date.now());
    for (let i = 0; i < b.count; i++) {
      const e = b.events[i];
      this.tell(e.kind, e.a, e.b, e.flag);
    }
    b.count = 0;
    this.stage.update(now, dt);

    // The coin settles back after a bump.
    if (this.coin.scaleX > 0.82 * INV_ART) this.coin.setScale(Math.max(0.82 * INV_ART, this.coin.scaleX - dt * 0.6));

    this.uiT += dt;
    if (this.uiT >= 0.1) {
      this.uiT = 0;
      this.refresh();
    }
    this.saveT += dt;
    if (this.saveT >= 10) {
      this.saveT = 0;
      commit();
    }
  }
}
