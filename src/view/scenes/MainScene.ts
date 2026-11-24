// The main screen: the board, with battles that start by themselves.
//
// The game plays like an idle game. BATTLE counts down and presses itself;
// a first win moves on to the next stage, a win again stays, a loss steps
// back one (game/campaign.ts says which). The player steps in to arrange the
// team by dragging, and to open UNITS, PACKS or the map, each of which opens
// over the board.
//
// There is one line of stages, numbered from 1 (data/stages.ts), and the
// top of the screen shows only the one the player is on. Pressing it opens
// the map, where another can be picked.

import Phaser from 'phaser';
import { ARCANE, BONE, CLOTH, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { packById } from '../../data/packs';
import { PLAYER_MAX_LEVEL, playerXpToNext } from '../../data/player';
import { fieldName } from '../../data/fields';
import { DIFFICULTIES } from '../../data/laps';
import { WORLDS, landOf, stageAt, stageNumber, worldOf } from '../../data/stages';
import { UNITS } from '../../data/units';
import { COUNTDOWN, afterBattle, settle, teamChanged } from '../../game/campaign';
import { cardOf } from '../../game/cards';
import { rewardsWaiting } from '../../game/rewards';
import { raidOpen, tourOpens } from '../../game/tutorial';
import { finishStage, packsHeld, payOf, stageCleared, stageEnemies, stageInput, stageSeed, teamSize, tidyTeam, structuresSize, type StageResult } from '../../game/rules';
import type { Fielded } from '../../game/state';
import { ads } from '../../platform/ads';
import { WINDOW_RECT, setupCamera } from '../app';
import { BoardView } from '../BoardView';
import { today } from '../clock';
import { H, W, hex } from '../config';
import { BOARD_PX_H, BOARD_PX_W, BOARD_X, BOARD_Y } from '../layout';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { CoinPill, LevelPill, OVERLAY_CLOSED, OVERLAY_SWAP, RewardsPill } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait } from '../ui/UnitCard';
import { worldBanner } from '../ui/WorldBanner';
import { Button, label, plain, slab } from '../ui/widgets';

type State = 'loading' | 'ready' | 'fighting' | 'after';

export class MainScene extends Phaser.Scene {
  private board!: BoardView;
  private guide!: Guide;
  /** The stage on show, as its place in the line, and the one the battle just fought leads to. */
  private at = 0;
  private next = 0;
  /** The plate at the top, for the tutorial to point at. */
  private plate = { x: 440, y: 6, w: 400, h: 98 };
  private state: State = 'loading';
  /** Seconds until the battle starts by itself. Below zero when it will not. */
  private count = -1;
  private shownCount = -2;
  private afterUntil = 0;
  private arrival = 0;
  private overlay: string | null = null;
  private teamKey = '';
  private speed = 1;
  private coins!: CoinPill;
  private level!: LevelPill;
  private rewards!: RewardsPill;
  /** The shade over the field while a screen is open over it, with the frame of that screen's window. */
  private shade: Phaser.GameObjects.Graphics | null = null;
  private hallRect = { x: 0, y: 0, w: 0, h: 0 };
  private raids!: Button;
  private gearRect = { x: 0, y: 0, w: 0, h: 0 };
  private battleButton!: Button;
  private autoButton!: Button;
  private speedButton!: Button;
  private packsButton!: Button;
  private badge: Phaser.GameObjects.GameObject[] = [];
  private top: Phaser.GameObjects.GameObject[] = [];
  /** The line under the stage's plate. It is put away while a battle is fought: the back row's plates stand there. */
  private info: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Text> = [];
  private toast: Phaser.GameObjects.GameObject[] = [];
  private note!: Phaser.GameObjects.Text;

  constructor() {
    super('Main');
  }

  init(): void {
    this.state = 'loading';
    this.count = -1;
    this.shownCount = -2;
    this.overlay = null;
    this.badge = [];
    this.top = [];
    this.toast = [];
    this.arrival = 0;
    this.shade = null;
  }

  create(): void {
    setupCamera(this);
    // It may have been under a screen when it was last shut down.
    this.input.enabled = true;
    const s = save();
    tidyTeam(s);
    this.at = settle(s);
    this.speed = s.speed;
    this.board = new BoardView(this, landOf(this.at).ground, {
      onEnd: (winner) => this.onEnd(winner),
      onPlaced: () => {
        // Where the team stands is kept, and a change puts the count back.
        commit();
        this.teamKey = this.keyOf();
        if (this.count >= 0) this.count = Math.max(this.count, COUNTDOWN.changed);
      },
      // The player's units show their card's level and grade, the enemy's what the stage stands at.
      standingOf: (p, team) =>
        team === 'blue' ? cardOf(save(), (p as Fielded).card) : stageAt(this.at),
    });
    this.coins = new CoinPill(this, s);
    // The player's own level, under the coins: it opens the skill tree and the upgrades.
    this.level = new LevelPill(this, s, () => this.open('Player'));
    // The rewards, under that: a day of the calendar, and what the time played today has earned.
    this.rewards = new RewardsPill(this, () => this.open('Rewards'));
    // The ways to the dungeons and to the raids, which are off the line of stages. They are two things and
    // have a button each; the raids' is not there until one is open.
    const hall = plain(new Button(this, 128, 36, '   DUNGEONS', () => this.open('Hall', { kind: 'dungeon' }), { width: 216, height: 50, size: 19, mat: BONE, color: OUTLINE })).setDepth(8000);
    hall.root.add(this.add.image(-78, -3, SHEET, 'icon/crown').setScale(0.3));
    this.hallRect = hall.rect;
    this.raids = plain(new Button(this, 128, 90, '   RAIDS', () => this.open('Hall', { kind: 'raid' }), { width: 216, height: 44, size: 17, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.raids.root.add(this.add.image(-78, -3, SHEET, 'icon/banner').setScale(0.26));
    this.raids.setVisible(raidOpen(s));
    this.buildBottom();
    this.note = label(this, W / 2, 612, '', { size: 18, weight: 600, color: HIGHLIGHT }).setDepth(8000);

    this.guide = new Guide(this, 'Main', () => {
      this.refreshBottom();
      this.lead();
    });
    this.guide.mark('battle', () => this.battleButton.rect);
    this.guide.mark('packs', () => this.packsButton.rect);
    this.guide.mark('units', () => ({ x: 22, y: 633, w: 196, h: 62 }));
    this.guide.mark('stages', () => this.plate);
    // What the tours point at: the player's half of the field, the two buttons that pace the battles, and the ways to the other screens.
    this.guide.mark('board', () => ({ x: BOARD_X, y: BOARD_Y, w: BOARD_PX_W / 2, h: BOARD_PX_H }));
    this.guide.mark('auto', () => ({ x: 831, y: 633, w: 279, h: 62 }));
    this.guide.mark('level', () => this.level.rect);
    this.guide.mark('rewards', () => this.rewards.rect);
    this.guide.mark('hall', () => this.hallRect);
    this.guide.mark('raids', () => (raidOpen(save()) ? this.raids.rect : null));
    this.guide.mark('settings', () => this.gearRect);

    const closed = (key: string): void => this.onOverlayClosed(key);
    this.game.events.on(OVERLAY_CLOSED, closed);
    // One screen over the board can give way to another: the units to the index and back.
    const swapped = (from: string, to: string): void => {
      if (this.overlay !== from) return;
      this.overlay = to;
      this.scene.launch(to);
    };
    this.game.events.on(OVERLAY_SWAP, swapped);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(OVERLAY_CLOSED, closed);
      this.game.events.off(OVERLAY_SWAP, swapped);
    });
    this.input.keyboard?.on('keydown-D', () => this.board.toggleDebug());

    this.cameras.main.fadeIn(220);
    this.arrive(COUNTDOWN.first);
  }

  /** The tour that is up, if one is: for the walks (scripts/tours.mjs), which cannot wait for the save to be written. */
  tourUp(): { id: string; step: number } | null {
    return save().tutorial.tour;
  }

  // ------------------------------------------------------------ the top

  /**
   * The stage on show, and only that one: the banner of its world, its
   * number on a plate under that, and a line with its name, what a win pays
   * and what its enemies stand at. Banner and plate open the map of the
   * world's stages.
   */
  private refreshTop(): void {
    for (const o of this.top) o.destroy();
    this.top = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.top.push(o);
      return o;
    };
    const s = save();
    const stage = stageAt(this.at);
    const world = worldOf(this.at);
    const first = !stageCleared(s, this.at);

    const banner = add(worldBanner(this, 640, 22, world).setDepth(8000));
    banner.setInteractive({ useHandCursor: true });
    banner.on('pointerup', () => this.open('Map'));

    const plate = new Button(this, 640, 64, `   STAGE ${stageNumber(this.at)}`, () => this.open('Map'), {
      width: 250, height: 46, size: 25, mat: stage.def.kind === 'normal' ? GOLD : stage.def.kind === 'boss' ? CLOTH.red : ARCANE,
    }).setDepth(8000);
    add(plate.root);
    // What kind of stage it is, as the mark on its plate: a flag, a banner for a miniboss, a crown for a boss.
    const mark = stage.def.kind === 'boss' ? 'icon/crown' : stage.def.kind === 'miniboss' ? 'icon/banner' : 'icon/flag';
    plate.root.add(this.add.image(-92, -3, SHEET, mark).setScale(0.32));

    // One line under it: its name, what a win pays, what its enemies stand at, and how big its field is.
    const small = { size: 16, weight: 600 as const, color: HIGHLIGHT, strokeWidth: 4, align: 'left' as const };
    const y = 104;
    const name = add(label(this, 0, y, stage.def.name, { ...small, weight: 700 }).setDepth(8000));
    const coin = add(this.add.image(0, y, SHEET, 'icon/coin').setScale(0.28).setDepth(8000));
    const pay = add(label(this, 0, y, String(payOf(s, this.at, first)), small).setDepth(8000));
    const badge = add(gradeBadge(this, 0, y, stage.grade, 18).setDepth(8000));
    const level = add(label(this, 0, y, `level ${stage.level}  ·  field ${fieldName(stage.field)}`, small).setDepth(8000));
    const total = name.width + 20 + 24 + pay.width + 24 + 28 + 6 + level.width;
    let x = 640 - total / 2;
    name.setX(x);
    x += name.width + 20;
    coin.setX(x + 10);
    pay.setX(x + 24);
    x += 24 + pay.width + 24;
    badge.setX(x + 11);
    level.setX(x + 33);
    const w = Math.max(banner.width, total) + 20;
    this.plate = { x: 640 - w / 2, y: 2, w, h: 114 };
    this.info = [name, coin, pay, badge, level];
    for (const o of this.info) o.setVisible(this.state !== 'fighting' && this.state !== 'after');

    this.coins.refresh();
    this.level.refresh();
  }

  // ------------------------------------------------------------ the bottom

  private buildBottom(): void {
    const y = 664;
    const units = plain(new Button(this, 120, y, '   UNITS', () => this.pressUnits(), { width: 196, height: 62, size: 24, mat: BONE, color: OUTLINE })).setDepth(8000);
    units.root.add(this.add.image(-62, -3, SHEET, 'icon/team').setScale(0.36));
    this.packsButton = plain(new Button(this, 328, y, '   PACKS', () => this.open('Shop'), { width: 196, height: 62, size: 24, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.packsButton.root.add(this.add.image(-62, -3, SHEET, 'icon/pack').setScale(0.36));

    this.battleButton = new Button(this, 640, y, 'BATTLE', () => this.pressBattle(), { width: 300, height: 74, size: 34 }).setDepth(8000);
    this.autoButton = new Button(this, 916, y, '', () => this.toggleAuto(), { width: 170, height: 62, size: 22 }).setDepth(8000);
    this.speedButton = plain(new Button(this, 1062, y, `${this.speed}x`, () => this.toggleSpeed(), { width: 96, height: 62, size: 26, mat: BONE, color: OUTLINE })).setDepth(8000);
    // The settings: sound and music, how the game is drawn, and every tutorial to view again.
    const gear = plain(new Button(this, 1168, y, '', () => this.open('Settings'), { width: 62, height: 58, mat: BONE }).setDepth(8000));
    gear.root.add(this.add.image(0, -3, SHEET, 'icon/gear').setScale(0.44));
    this.gearRect = gear.rect;
  }

  /** The buttons as they now stand: what BATTLE says, whether AUTO is lit, how many packs wait. */
  private refreshBottom(): void {
    const s = save();
    this.autoButton.setText(s.auto ? 'AUTO ON' : 'AUTO OFF').setMaterial(s.auto ? VENOM : IRON);
    const empty = s.team.length === 0;
    if (this.state === 'fighting') this.battleButton.setText('STOP').setMaterial(CLOTH.red).setEnabled(true);
    else {
      const n = this.count >= 0 && !this.waits() ? Math.ceil(this.count) : -1;
      this.shownCount = n;
      this.battleButton.setText(n >= 0 ? `BATTLE  ${n}` : 'BATTLE').setMaterial(GOLD).setEnabled(this.state === 'ready' && !empty);
    }
    // The tutorial's bubble stands where the note does, so the note waits for it.
    const quiet = this.state !== 'ready' || !!this.guide.step;
    this.note.setText(empty ? 'Your team is empty. Press UNITS and put someone in it.' : quiet ? '' : 'Drag your units to arrange them');

    for (const o of this.badge) o.destroy();
    this.badge = [];
    const held = packsHeld(s);
    if (held > 0) {
      const dot = this.add.graphics().setDepth(8001);
      dot.fillStyle(hex(OUTLINE), 1).fillCircle(416, 638, 17);
      dot.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(416, 638, 13);
      this.badge.push(dot, label(this, 416, 637, String(Math.min(99, held)), { size: 16, strokeWidth: 3 }).setDepth(8002));
    }
  }

  /** True while the count must not run: something is open over the board, or there is no one to fight. */
  private waits(): boolean {
    return !!this.overlay || save().team.length === 0 || this.guide.holds || this.board.loading || this.board.dragging;
  }

  private keyOf(): string {
    return save().team.map((p) => `${p.card}@${p.col},${p.row}`).join(' ');
  }

  // ------------------------------------------------------------ the run of battles

  /** Stands the stage on show on the board, and starts the count if battles start by themselves. */
  private arrive(seconds: number): void {
    const token = ++this.arrival;
    const s = save();
    tidyTeam(s);
    this.state = 'loading';
    this.count = -1;
    this.teamKey = this.keyOf();
    this.clearToast();
    this.refreshTop();
    this.refreshBottom();
    void this.board
      .show(s.team, stageEnemies(this.at), stageSeed(s, this.at), [], stageAt(this.at).field)
      .then(() => {
        if (token !== this.arrival) return;
        this.state = 'ready';
        this.board.setPlacement(true);
        this.count = s.auto && seconds >= 0 ? seconds : -1;
        this.guide.refresh({ covered: !!this.overlay, busy: false });
        this.refreshBottom();
        // A raid may have opened with the last win.
        this.raids.setVisible(raidOpen(s));
        this.lead();
      });
  }

  private fight(): void {
    const s = save();
    if (this.state !== 'ready' || this.board.loading || s.team.length === 0) return;
    this.state = 'fighting';
    this.count = -1;
    commit();
    this.board.start(stageInput(s, this.at));
    for (const o of this.info) o.setVisible(false);
    ads().gameplayStart();
    this.guide.refresh({ busy: true });
    this.refreshBottom();
  }

  private onEnd(winner: number): void {
    ads().gameplayStop();
    const s = save();
    const won = winner === 0;
    const result = finishStage(s, this.at, won);
    this.next = afterBattle(s, this.at, result);
    commit();
    this.state = 'after';
    // Long enough to be read: longer when a card made a level, and longer again when the win opened something.
    const news = result.moreTeam > 0 || result.moreStructures > 0 || result.opened.length > 0 || result.finished || result.playerLevels > 0;
    this.afterUntil = this.time.now + 2500 + (result.levelUps.length > 0 ? 500 : 0) + (news ? 1300 : 0);
    this.showResult(winner, result);
    this.refreshTop();
    this.refreshBottom();
    this.guide.refresh({ busy: true });
  }

  /** On to wherever the next battle is: the same board, or another land's. */
  private proceed(): void {
    if (landOf(this.next) !== landOf(this.at)) {
      this.scene.restart();
      return;
    }
    this.at = this.next;
    this.arrive(COUNTDOWN.next);
  }

  override update(time: number, deltaMs: number): void {
    this.board.debugNote = `${this.state}${this.overlay ? ` under ${this.overlay}` : ''}`;
    this.board.update(deltaMs, this.speed);
    // A reward comes ready as the minutes pass: the count on its button keeps up.
    this.rewards.refresh(rewardsWaiting(save(), today()));
    if (this.state === 'ready' && this.count >= 0 && !this.waits()) {
      // A slow frame counts whole, so that the count keeps to the clock on a slow phone.
      this.count -= Math.min(deltaMs, 250) / 1000;
      if (this.count <= 0) this.fight();
      else if (Math.ceil(this.count) !== this.shownCount) this.refreshBottom();
    } else if (this.state === 'ready' && this.shownCount >= 0 && this.waits()) {
      this.refreshBottom();
    }
    if (this.state === 'after' && time >= this.afterUntil) this.proceed();
  }

  // ------------------------------------------------------------ what the player presses

  private pressBattle(): void {
    if (this.state === 'ready') this.fight();
    else if (this.state === 'fighting') {
      // STOP calls the battle off, and that is all it does. It used to open UNITS as well; the owner, of
      // 24 November 2026: "why every time i stop a battle it opens the unit screen".
      this.stop();
    }
  }

  private pressUnits(): void {
    if (this.state === 'fighting') this.stop();
    this.open('Team');
  }

  /** Calls the battle off. Nothing is paid for it. */
  private stop(): void {
    if (this.state !== 'fighting') return;
    ads().gameplayStop();
    // The count starts again, and waits while UNITS is open over the board.
    this.arrive(COUNTDOWN.changed);
  }

  private toggleAuto(): void {
    const s = save();
    s.auto = !s.auto;
    commit();
    if (this.state === 'ready') this.count = s.auto ? COUNTDOWN.changed : -1;
    this.refreshBottom();
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    save().speed = this.speed;
    commit();
    this.speedButton.setText(`${this.speed}x`);
  }

  /** Opens whatever screen a tutorial asks to be shown by itself: the rewards, straight after the first one. */
  private lead(): void {
    if (this.overlay || this.state === 'fighting') return;
    const key = tourOpens(save());
    if (key) this.open(key);
  }

  private open(key: string, data?: object): void {
    if (this.overlay) return;
    this.overlay = key;
    sfx.play('open');
    this.scene.launch(key, data);
    // The field stays on show round the screen's window, in shade, and nothing on it can be pressed.
    this.cover(true);
    this.guide.refresh({ covered: true });
    this.refreshBottom();
  }

  /**
   * Shades the field and takes its presses away while a screen is open over
   * it, or gives them back. The screen is drawn in a window (view/app.ts,
   * WINDOWED): the shade is what shows round that, and the frame round the
   * window is drawn here, under it.
   */
  private cover(on: boolean): void {
    this.input.enabled = !on;
    if (!this.shade) {
      const r = WINDOW_RECT;
      const g = this.add.graphics().setDepth(9500);
      g.fillStyle(hex(OUTLINE), 0.5).fillRect(-40, -40, W + 80, H + 80);
      // The window's frame: the dark line, and a pale one outside it so that it stands off a dark field.
      g.lineStyle(4, hex(BONE.fill), 0.9).strokeRoundedRect(r.x - 11, r.y - 11, r.w + 22, r.h + 22, 12);
      g.lineStyle(10, hex(OUTLINE), 1).strokeRoundedRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 6);
      this.shade = g;
    }
    this.shade.setVisible(on);
  }

  private onOverlayClosed(key: string): void {
    if (this.overlay !== key) return;
    this.overlay = null;
    this.cover(false);
    const s = save();
    tidyTeam(s);
    this.coins.refresh();
    this.level.refresh();
    const changed = this.keyOf() !== this.teamKey;
    // A changed team goes back to the stage it lost at.
    if (changed && teamChanged(s)) commit();
    if (key === 'Map' || changed) {
      settle(s);
      if (landOf(s.at) !== landOf(this.at)) {
        this.scene.restart();
        return;
      }
      const moved = s.at !== this.at;
      this.at = s.at;
      if (moved || (changed && this.state !== 'fighting')) {
        if (this.state === 'fighting') ads().gameplayStop();
        this.arrive(COUNTDOWN.changed);
        this.guide.refresh({ covered: false });
        return;
      }
    }
    // The same team in the same places may be a new list all the same: the board is given the one that is saved.
    this.board.holdTeam(s.team);
    // Shutting a screen starts the count again.
    if (this.state === 'ready' && s.auto) this.count = Math.max(this.count, COUNTDOWN.changed);
    this.guide.refresh({ covered: false });
    this.refreshTop();
    this.refreshBottom();
  }

  // ------------------------------------------------------------ what a battle came to

  private clearToast(): void {
    for (const o of this.toast) o.destroy();
    this.toast = [];
  }

  /**
   * Who won, over the board for a moment, and then, in the order the owner
   * asked for them ("more clear what items did you get / then which unit
   * leveled up"): what was won, as pictures of the things; the cards that
   * made a level, as the units they are; the player's own level; and
   * whatever the win opened. The next battle does not wait for a press.
   */
  private showResult(winner: number, r: StageResult): void {
    this.clearToast();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.toast.push(o);
      return o;
    };
    const won = winner === 0;
    sfx.play(won ? 'victory' : 'defeat');
    const cx = W / 2;

    // What was won: coins, each kind of pack that dropped, and what the battle taught.
    interface Loot {
      draw: (x: number, y: number) => Phaser.GameObjects.GameObject[];
      big: string;
      small: string;
      color?: string;
      sound?: 'coin' | 'lift';
      w: number;
    }
    const loot: Loot[] = [];
    if (r.coins > 0) {
      loot.push({ draw: (x, y) => [this.add.image(x, y, SHEET, 'icon/coin').setScale(0.62)], big: `+${r.coins}`, small: 'coins', color: GOLD.fill, sound: 'coin', w: 112 });
    }
    const drops = new Map<string, number>();
    for (const id of r.packs) drops.set(id, (drops.get(id) ?? 0) + 1);
    for (const [id, n] of drops) {
      loot.push({
        draw: (x, y) => [this.add.image(x, y, CARDS, `pack/${id.split('@')[0]}`).setScale(0.19)],
        big: n > 1 ? `x${n}` : 'PACK', small: packById(id).name.replace(' Pack', ''), color: HOLY.fill, sound: 'lift', w: 136,
      });
    }
    loot.push({ draw: (x, y) => [this.add.image(x, y, SHEET, 'icon/star').setScale(0.58)], big: `+${r.xp}`, small: 'experience each', w: 136 });

    // How tall it will be, so that it can be stood in the middle of the board.
    const ups = r.levelUps.slice(0, 6);
    const news: Array<{ text: string; color: string }> = [];
    if (r.playerLevels > 0) news.push({ text: r.playerLevels > 1 ? `You are level ${r.playerLevel}: ${r.playerLevels} skill points to spend` : `You are level ${r.playerLevel}: a skill point to spend`, color: HOLY.fill });
    if (r.moreTeam > 0) news.push({ text: `Your team has room for ${teamSize(save())} now`, color: ARCANE.light });
    if (r.moreStructures > 0) {
      const n = structuresSize(save());
      news.push({ text: n === 1 ? 'You have a place for a structure now' : `You have ${n} places for structures now`, color: ARCANE.light });
    }
    // What the win opened: the next land, this land on the next difficulty, or both.
    for (const w of r.opened) {
      const world = WORLDS[w];
      news.push({ text: world.lap === worldOf(this.at).lap ? `${world.name} is open` : `${world.name} is open on ${DIFFICULTIES[world.lap]}`, color: ARCANE.light });
    }
    if (r.field) news.push({ text: `The field is bigger from here: ${fieldName(r.field)}`, color: ARCANE.light });
    if (r.finished) news.push({ text: 'That was the last stage of all. Well fought.', color: ARCANE.light });
    if (!won && this.next < this.at) news.push({ text: 'Back one stage, to grow stronger', color: HIGHLIGHT });
    const lootH = 138;
    const upsH = ups.length > 0 ? 130 : 0;
    const barH = 42;
    // A boss's first fall can say five things at once, with levels made besides: then the lines stand closer, to stay clear of the buttons.
    const crowded = ups.length > 0 && news.length > 3;
    const lineH = crowded ? 23 : 30;
    const tall = 70 + lootH + upsH + barH + news.length * lineH + 12;
    const top = Math.max(108, Math.min(196, 364 - tall / 2));

    // A dark sheet behind it all, so that it reads over any land and any fight.
    const lootW = loot.reduce((n, l) => n + l.w + 10, -10);
    const wide = Math.max(560, lootW + 60, ups.length * 104 + 60);
    const back = add(this.add.graphics().setDepth(8990).setAlpha(0));
    back.fillStyle(hex(OUTLINE), 0.8).fillRoundedRect(cx - wide / 2, top + 30, wide, tall - 26, 22);
    this.tweens.add({ targets: back, alpha: 1, duration: 200 });

    const banner = add(this.add.container(cx, top + 30).setDepth(9000));
    const g = this.add.graphics();
    const mat = won ? GOLD : winner === 1 ? CLOTH.red : IRON;
    slab(g, -250, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, 150, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, -190, -38, 380, 80, mat, 18, 8);
    banner.add(g);
    banner.add(label(this, 0, -4, won ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW', { size: 46, strokeWidth: 8 }));
    banner.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    /** Brings a group of things in with a small jump, after a wait. */
    const pop = (things: Phaser.GameObjects.GameObject[], delay: number, sound?: () => void): void => {
      const root = add(this.add.container(0, 0, things).setDepth(9001).setAlpha(0));
      root.y = 12;
      this.tweens.add({ targets: root, alpha: 1, y: 0, duration: 220, delay, ease: 'Back.easeOut', onStart: sound });
    };

    // 1. What was won, a tile to each thing.
    let y = top + 84;
    let x = cx - lootW / 2;
    let wait = 260;
    for (const l of loot) {
      const mid = x + l.w / 2;
      const tile = this.add.graphics();
      slab(tile, x, y, l.w, lootH - 14, BONE, 14, 6);
      const big = label(this, mid, y + 82, l.big, { size: 22, color: l.color ?? HIGHLIGHT, strokeWidth: 6 });
      const small = label(this, mid, y + 106, l.small, { size: l.small.length > 14 ? 11 : 13, weight: 600, color: OUTLINE, stroke: null });
      const sound = l.sound;
      pop([tile, ...l.draw(mid, y + 36), big, small], wait, sound ? () => sfx.play(sound, 0.8) : undefined);
      x += l.w + 10;
      wait += 130;
    }
    y += lootH;

    // 2. Who made a level: the unit itself, on its tier's color, and the level it is at now.
    if (ups.length > 0) {
      wait += 120;
      const title = label(this, cx, y + 8, r.levelUps.length > ups.length ? `LEVEL UP, AND ${r.levelUps.length - ups.length} MORE` : 'LEVEL UP', { size: 17, color: VENOM.light, strokeWidth: 5 });
      pop([title], wait, () => sfx.play('levelUp'));
      let ux = cx - (ups.length * 104 - 10) / 2;
      for (const up of ups) {
        const def = UNITS[up.unit];
        const tile = this.add.graphics();
        slab(tile, ux, y + 24, 94, 92, RARITY_MAT[def.rarity], 12, 5);
        tile.fillStyle(hex(HIGHLIGHT), 0.35).fillRoundedRect(ux + 6, y + 30, 82, 56, 8);
        const pic = portrait(this, ux + 47, y + 86, def.id, 'blue', 54);
        if (pic.displayWidth > 78) pic.setScale((pic.scaleX * 78) / pic.displayWidth);
        const to = label(this, ux + 47, y + 100, `Lv ${up.to}`, { size: 17, strokeWidth: 5 });
        // An arrow that points up, beside the level: it rose.
        const arrow = this.add.image(ux + 80, y + 40, SHEET, 'icon/arrow').setScale(0.22).setAngle(-90).setTint(hex(VENOM.light));
        wait += 90;
        pop([tile, pic, to, arrow], wait);
        ux += 104;
      }
      y += upsH;
    }

    // 3. The player's own level: a bar that fills by what the battle taught.
    {
      wait += 140;
      const p = save().player;
      const need = playerXpToNext(p.level);
      const bw = 300;
      const bx = cx - bw / 2 + 40;
      const bar = this.add.graphics();
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(bx - 4, y + 8, bw + 8, 22, 10);
      bar.fillStyle(hex(IRON.fill), 1).fillRoundedRect(bx, y + 12, bw, 14, 6);
      const share = p.level >= PLAYER_MAX_LEVEL ? 1 : Math.min(1, p.xp / need);
      if (share > 0.02) bar.fillStyle(hex(HOLY.fill), 1).fillRoundedRect(bx, y + 12, bw * share, 14, 6);
      const name = label(this, bx - 14, y + 18, `YOUR LEVEL ${p.level}`, { size: 16, align: 'right', strokeWidth: 5 });
      const got = label(this, bx + bw + 12, y + 18, `+${r.playerXp}`, { size: 16, align: 'left', color: HOLY.fill, strokeWidth: 5 });
      pop([bar, name, got], wait, r.playerLevels > 0 ? () => sfx.play('levelUp', 1, 1.25) : undefined);
      y += barH;
    }

    // 4. And whatever else it changed, a line each.
    news.forEach((n, i) => {
      const t = label(this, cx, y + 8 + i * lineH, n.text, { size: crowded ? 17 : 20, color: n.color, strokeWidth: crowded ? 5 : 6 });
      pop([t], wait + 160 + i * 110);
    });
  }
}
