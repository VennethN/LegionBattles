// The main screen: the board, with battles that start by themselves.
//
// The game plays like an idle game. BATTLE counts down and presses itself;
// a first win moves on to the next stage, a win again stays, a loss steps
// back one (game/campaign.ts says which). The player steps in to arrange the
// team by dragging, and to open UNITS, PACKS or the map, each of which opens
// over the board.
//
// The screen has two faces. Between battles it is the menu: every way into
// the other screens is on it. While a battle is fought and its result is
// up, those are put away and only what belongs to the battle stays: STOP,
// AUTO and the speed. By the owner's word of 24 November 2026: "when battle
// is going on / All the other menu ui dissapears (apart from auto) / So
// theres an active game state".
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
import { UNITS, isStructure } from '../../data/units';
import { COUNTDOWN, afterBattle, settle, teamChanged } from '../../game/campaign';
import { cardOf } from '../../game/cards';
import { playtimeLeft, rewardsWaiting } from '../../game/rewards';
import { raidOpen } from '../../game/tutorial';
import {
  finishStage, packsHeld, payOf, stageCleared, stageEnemies, stageInput, stageSeed, structuresIn, structuresSize, teamSize, tidyTeam, unitsIn,
  type StageResult,
} from '../../game/rules';
import type { Fielded } from '../../game/state';
import { ads } from '../../platform/ads';
import { GROUND } from '../../art/board';
import { FIELD_WINDOW, WINDOW_RECT, setupCamera } from '../app';
import { BoardView } from '../BoardView';
import { today } from '../clock';
import { H, RES, W, hex } from '../config';
import { BOARD_PX_H, BOARD_PX_W, BOARD_X, BOARD_Y } from '../layout';
import { warmPicture } from '../Scenes';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { CoinPill, CountChip, LevelPill, OVERLAY_CLOSED, OVERLAY_SWAP, RewardsPill, TEAM_CHANGED } from '../ui/chrome';
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
  private unitsRect = { x: 0, y: 0, w: 0, h: 0 };
  private structuresRect = { x: 0, y: 0, w: 0, h: 0 };
  /** Set when the team was changed on the screen of cards while that was open. */
  private teamTouched = false;
  /** The camera that shows the player's half of the field beside the screen of cards. */
  private side: Phaser.Cameras.Scene2D.Camera | null = null;
  private hall!: Button;
  private raids!: Button;
  private gear!: Button;
  private gearRect = { x: 0, y: 0, w: 0, h: 0 };
  private battleButton!: Button;
  private autoButton!: Button;
  private speedButton!: Button;
  private unitsButton!: Button;
  private builtButton!: Button;
  private packsButton!: Button;
  /** How many are fielded of how many may be, on the corners of UNITS and STRUCTURES, and how many packs wait on PACKS. */
  private unitsChip!: CountChip;
  private builtChip!: CountChip;
  private packsChip!: CountChip;
  /** Which of the menus are on show, as one number: so that they are touched only when that changes. */
  private hudKey = -1;
  /** The banner of the world on show, and which world that is: it is made again only for another. */
  private banner: Phaser.GameObjects.Container | null = null;
  private bannerOf = -1;
  /** When the result came up, and whether the next stage is already on its way under it. */
  private afterFrom = 0;
  private leaving = false;
  /** Counts the results shown: what one of them still has to bring in is dropped if another has come. */
  private toastId = 0;
  private top: Phaser.GameObjects.GameObject[] = [];
  /** The line under the stage's plate. It is put away while a battle is fought: the back row's plates stand there. */
  private info: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Text> = [];
  private toast: Phaser.GameObjects.GameObject[] = [];
  private note!: Phaser.GameObjects.Text;

  constructor() {
    super('Main');
  }

  /** `quick` is for coming here from a battle won at the end of a land: nothing fades, the next one is simply there. */
  private quick = false;

  init(data?: { quick?: boolean }): void {
    this.state = 'loading';
    this.count = -1;
    this.shownCount = -2;
    this.overlay = null;
    this.top = [];
    this.toast = [];
    this.arrival = 0;
    this.shade = null;
    this.side = null;
    this.teamTouched = false;
    this.hudKey = -1;
    this.banner = null;
    this.bannerOf = -1;
    this.leaving = false;
    this.quick = !!data?.quick;
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
      // A tap on one of the player's own opens its card on the screen it is on.
      onTapOwn: (p) => {
        const card = (p as Fielded).card;
        if (this.overlay || this.state !== 'ready' || card === undefined) return;
        this.pressUnits(isStructure(p.unit) ? 'structures' : 'units', `c${card}`);
      },
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
    this.hall = hall;
    this.hallRect = hall.rect;
    this.raids = plain(new Button(this, 128, 90, '   RAIDS', () => this.open('Hall', { kind: 'raid' }), { width: 216, height: 44, size: 17, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.raids.root.add(this.add.image(-78, -3, SHEET, 'icon/banner').setScale(0.26));
    this.raids.setVisible(raidOpen(s));
    this.buildBottom();
    this.note = label(this, W / 2, 612, '', { size: 18, weight: 600, color: HIGHLIGHT }).setDepth(8000);

    this.guide = new Guide(this, 'Main', () => this.refreshBottom());
    this.guide.mark('battle', () => this.battleButton.rect);
    this.guide.mark('packs', () => this.packsButton.rect);
    this.guide.mark('units', () => this.unitsRect);
    this.guide.mark('structures', () => this.structuresRect);
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
      this.cover(true);
    };
    this.game.events.on(OVERLAY_SWAP, swapped);
    // The team was changed on the screen of cards: the half of the field beside it shows that at once.
    const teamChanged = (): void => {
      if (this.overlay !== 'Team') return;
      this.teamTouched = true;
      this.arrive(COUNTDOWN.changed);
    };
    this.game.events.on(TEAM_CHANGED, teamChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(OVERLAY_CLOSED, closed);
      this.game.events.off(OVERLAY_SWAP, swapped);
      this.game.events.off(TEAM_CHANGED, teamChanged);
    });
    this.input.keyboard?.on('keydown-D', () => this.board.toggleDebug());

    // A press anywhere on a result goes on from it. One that lands on a button is that button's: AUTO and the speed still take theirs.
    this.input.on('pointerup', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.pressOn();
    });

    if (!this.quick) this.cameras.main.fadeIn(220);
    this.arrive(this.quick ? COUNTDOWN.next : COUNTDOWN.first);
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

    // The banner is the same for every stage of a world: it is made once for each.
    if (!this.banner || this.bannerOf !== world.index) {
      this.banner?.destroy();
      this.banner = worldBanner(this, 640, 22, world).setDepth(8000);
      this.bannerOf = world.index;
      this.banner.setInteractive({ useHandCursor: true });
      this.banner.on('pointerup', () => this.openMap());
    }
    const banner = this.banner;

    const plate = new Button(this, 640, 64, `   STAGE ${stageNumber(this.at)}`, () => this.openMap(), {
      width: 250, height: 46, size: 25, mat: stage.def.kind === 'normal' ? GOLD : stage.def.kind === 'boss' ? CLOTH.red : ARCANE,
    }).setDepth(8000);
    add(plate.root);
    // What kind of stage it is, as the mark on its plate: a flag, a banner for a miniboss, a crown for a boss.
    const mark = stage.def.kind === 'boss' ? 'icon/crown' : stage.def.kind === 'miniboss' ? 'icon/banner' : 'icon/flag';
    plate.root.add(this.add.image(-92, -3, SHEET, mark).setScale(0.32));

    // One line under it: its name, what a win pays, and what its enemies stand at. It is kept close under the
    // plate and short: the plates of whoever stands in the back row come up just beneath it.
    const small = { size: 15, weight: 600 as const, color: HIGHLIGHT, strokeWidth: 4, align: 'left' as const };
    const y = 100;
    const name = add(label(this, 0, y, stage.def.name, { ...small, weight: 700 }).setDepth(8000));
    const coin = add(this.add.image(0, y, SHEET, 'icon/coin').setScale(0.28).setDepth(8000));
    const pay = add(label(this, 0, y, String(payOf(s, this.at, first)), small).setDepth(8000));
    const badge = add(gradeBadge(this, 0, y, stage.grade, 18).setDepth(8000));
    const level = add(label(this, 0, y, `level ${stage.level}`, small).setDepth(8000));
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
    // What was just made is put away again if the screen of cards is open beside the field.
    this.hudKey = -1;
    this.hud();
  }

  /** The map of the world's stages. It is one of the menus, and is not opened in the middle of a battle. */
  private openMap(): void {
    if (this.state === 'fighting' || this.state === 'after') return;
    this.open('Map');
  }

  // ------------------------------------------------------------ the bottom

  private buildBottom(): void {
    const y = 664;
    // The cards, in two screens of their own: who fights, and what is built. By the owner's word of
    // 24 November 2026: "make structures its own button".
    const units = plain(new Button(this, 95, y, '   UNITS', () => this.pressUnits('units'), { width: 146, height: 62, size: 20, mat: BONE, color: OUTLINE })).setDepth(8000);
    units.root.add(this.add.image(-48, -3, SHEET, 'icon/team').setScale(0.32));
    this.unitsButton = units;
    this.unitsRect = units.rect;
    const built = plain(new Button(this, 262, y, '    STRUCTURES', () => this.pressUnits('structures'), { width: 176, height: 62, size: 18, mat: BONE, color: OUTLINE })).setDepth(8000);
    built.root.add(this.add.image(-66, -3, SHEET, 'icon/tower').setScale(0.32));
    this.builtButton = built;
    this.structuresRect = built.rect;
    this.packsButton = plain(new Button(this, 431, y, '   PACKS', () => this.open('Shop'), { width: 146, height: 62, size: 20, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.packsButton.root.add(this.add.image(-48, -3, SHEET, 'icon/pack').setScale(0.32));
    // On the corner of each: how many stand of how many may, and how many packs wait. The owner, of the main
    // screen: "Make it also so it shows a unit count and structure count limit".
    this.unitsChip = new CountChip(this, 146, 636);
    this.builtChip = new CountChip(this, 328, 636);
    this.packsChip = new CountChip(this, 494, 636);

    this.battleButton = new Button(this, 644, y, 'BATTLE', () => this.pressBattle(), { width: 264, height: 74, size: 34 }).setDepth(8000);
    this.autoButton = new Button(this, 916, y, '', () => this.toggleAuto(), { width: 170, height: 62, size: 22 }).setDepth(8000);
    this.speedButton = plain(new Button(this, 1062, y, `${this.speed}x`, () => this.toggleSpeed(), { width: 96, height: 62, size: 26, mat: BONE, color: OUTLINE })).setDepth(8000);
    // The settings: sound and music, how the game is drawn, and every tutorial to view again.
    const gear = plain(new Button(this, 1168, y, '', () => this.open('Settings'), { width: 62, height: 58, mat: BONE }).setDepth(8000));
    gear.root.add(this.add.image(0, -3, SHEET, 'icon/gear').setScale(0.44));
    this.gear = gear;
    this.gearRect = gear.rect;
  }

  /** The buttons as they now stand: what BATTLE says, whether AUTO is lit, how many are fielded and how many packs wait. */
  private refreshBottom(): void {
    const s = save();
    this.autoButton.setText(s.auto ? 'AUTO ON' : 'AUTO OFF').setMaterial(s.auto ? VENOM : IRON);
    const empty = s.team.length === 0;
    if (this.state === 'fighting') this.battleButton.setText('STOP').setMaterial(CLOTH.red).setEnabled(true);
    // A result is gone on from by pressing it, or this: it does not have to be waited for.
    else if (this.state === 'after') this.battleButton.setText('CONTINUE').setMaterial(GOLD).setEnabled(true);
    else {
      const n = this.count >= 0 && !this.waits() ? Math.ceil(this.count) : -1;
      this.shownCount = n;
      this.battleButton.setText(n >= 0 ? `BATTLE  ${n}` : 'BATTLE').setMaterial(GOLD).setEnabled(this.state === 'ready' && !empty);
    }
    // The tutorial's bubble stands where the note does, so the note waits for it.
    const quiet = this.state !== 'ready' || !!this.guide.step;
    this.note.setText(empty ? 'Your team is empty. Press UNITS and put someone in it.' : quiet ? '' : 'Drag your units to arrange them. Tap anyone to see who they are.');

    // A count is lit when it asks for something: a place that is free, with a card that could stand in it.
    const units = unitsIn(s.team);
    const built = structuresIn(s.team);
    const spare = (structures: boolean): boolean => s.cards.some((c) => isStructure(c.unit) === structures && !s.team.some((p) => p.card === c.id));
    this.unitsChip.set(`${units}/${teamSize(s)}`, units < teamSize(s) && spare(false));
    this.builtChip.set(`${built}/${structuresSize(s)}`, built < structuresSize(s) && spare(true));
    const held = packsHeld(s);
    this.packsChip.set(held > 0 ? String(Math.min(99, held)) : '', true);
    this.hud();
  }

  /**
   * Shows the menus or puts them away. They are away while a battle is
   * fought and while its result is up; and beside the screen of cards, where
   * the field is seen through a camera of its own, whatever of this screen
   * would lie in that camera's sight is away too: the stage's plate and
   * banner, the raids' button, the counts. It is asked whenever anything
   * may have changed, and does something only when something has.
   */
  private hud(): void {
    const drawer = this.overlay === 'Team';
    const menus = this.state !== 'fighting' && this.state !== 'after';
    const raid = raidOpen(save());
    const key = (menus ? 1 : 0) | (drawer ? 2 : 0) | (raid ? 4 : 0);
    if (key === this.hudKey) return;
    this.hudKey = key;
    for (const b of [this.unitsButton, this.builtButton, this.packsButton, this.gear, this.hall]) b.setVisible(menus);
    this.raids.setVisible(menus && raid && !drawer);
    this.level.setVisible(menus);
    this.rewards.setVisible(menus);
    for (const c of [this.unitsChip, this.builtChip, this.packsChip]) c.setVisible(menus && !drawer);
    for (const o of this.top) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(!drawer);
    this.banner?.setVisible(!drawer);
    // The line under the plate is for between battles: in one, the back row's plates stand where it does.
    for (const o of this.info) o.setVisible(menus && !drawer);
  }

  /** True while the count must not run: something is open over the board, or there is no one to fight. */
  private waits(): boolean {
    return !!this.overlay || save().team.length === 0 || this.guide.holds || this.board.loading || this.board.dragging;
  }

  private keyOf(): string {
    return save().team.map((p) => `${p.card}@${p.col},${p.row}`).join(' ');
  }

  // ------------------------------------------------------------ the run of battles

  /**
   * Stands the stage on show on the board, and starts the count if battles
   * start by themselves. Coming from a battle's result (`after`), the
   * result stays up until the stage stands, and goes in that same moment:
   * the owner asked for "NO DELAY from the victory screen gone and the next
   * level loaded", and the stage's art was brought in while the result was
   * read (bringNext).
   */
  private arrive(seconds: number, after = false): void {
    const token = ++this.arrival;
    const s = save();
    tidyTeam(s);
    this.count = -1;
    this.teamKey = this.keyOf();
    if (!after) {
      this.state = 'loading';
      this.clearToast();
      this.refreshTop();
      this.refreshBottom();
    }
    void this.board
      .show(s.team, stageEnemies(this.at), stageSeed(s, this.at), [], stageAt(this.at).field)
      .then(() => {
        if (token !== this.arrival) return;
        this.leaving = false;
        this.state = 'ready';
        if (after) {
          this.clearToast();
          this.refreshTop();
        }
        this.board.setPlacement(true);
        // Everyone's plate is up before the fight: what they stand at, and the health they start with.
        this.board.preview(stageInput(s, this.at));
        if (this.side) this.board.hideEnemiesFrom(this.side);
        this.count = s.auto && seconds >= 0 ? seconds : -1;
        this.guide.refresh({ covered: !!this.overlay, busy: false });
        this.refreshBottom();
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
    const boss = won && stageAt(this.at).def.kind === 'boss' && !stageCleared(s, this.at);
    const result = finishStage(s, this.at, won);
    this.next = afterBattle(s, this.at, result);
    commit();
    this.state = 'after';
    this.leaving = false;
    // Long enough to be read: longer when a card made a level, and longer again when the win opened something.
    // It does not have to be waited for: a press goes on at once.
    const news = result.moreTeam > 0 || result.moreStructures > 0 || result.opened.length > 0 || result.finished || result.playerLevels > 0;
    this.afterFrom = this.time.now;
    this.afterUntil = this.time.now + 2500 + (result.levelUps.length > 0 ? 500 : 0) + (news ? 1300 : 0);
    this.showResult(winner, result);
    // The coins and the level changed. The rest of the top is made again when the next stage stands.
    this.coins.refresh();
    this.level.refresh();
    this.refreshBottom();
    this.guide.refresh({ busy: true });
    // A boss's first fall is the portal's to cheer as well.
    if (boss) ads().happy();
    // And while the result is read, the next stage's art comes in: once the result's own things have had their moment.
    const token = this.toastId;
    this.time.delayedCall(700, () => {
      if (token === this.toastId && this.state === 'after') this.bringNext();
    });
  }

  /** Brings in whatever the next battle needs that is not here yet, so that it stands the moment it is asked for. */
  private bringNext(): void {
    const s = save();
    if (landOf(this.next) !== landOf(this.at)) {
      // Another land: its painted ground and its tiles are asked for now, to be at hand when the screen is made again.
      const ground = landOf(this.next).ground;
      const field = stageAt(this.next).field;
      warmPicture('board', ground);
      warmPicture('tiles', `${ground}-${field.cols}x${field.rows}`);
    }
    void this.board.prepare(s.team, stageEnemies(this.next));
  }

  /** A press on the result, or on CONTINUE: on to the next battle now. */
  private pressOn(): void {
    // A press that was meant for the battle that has just ended is not one for its result.
    if (this.state !== 'after' || this.overlay || this.time.now < this.afterFrom + 350) return;
    this.afterUntil = 0;
  }

  /** On to wherever the next battle is: the same board, or another land's. */
  private proceed(): void {
    if (this.leaving) return;
    this.leaving = true;
    if (landOf(this.next) !== landOf(this.at)) {
      this.scene.restart({ quick: true });
      return;
    }
    this.at = this.next;
    this.arrive(COUNTDOWN.next, true);
  }

  override update(time: number, deltaMs: number): void {
    this.board.debugNote = `${this.state}${this.overlay ? ` under ${this.overlay}` : ''}`;
    this.board.update(deltaMs, this.speed);
    // A reward comes ready as the minutes pass: the count on its button keeps up.
    const day = today();
    this.rewards.refresh(rewardsWaiting(save(), day), playtimeLeft(save(), day));
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
    else if (this.state === 'after') this.pressOn();
    else if (this.state === 'fighting') {
      // STOP calls the battle off, and that is all it does. It used to open UNITS as well; the owner, of
      // 24 November 2026: "why every time i stop a battle it opens the unit screen".
      this.stop();
    }
  }

  private pressUnits(side: 'units' | 'structures', selected?: string): void {
    if (this.state === 'fighting') this.stop();
    this.open('Team', selected ? { side, selected } : { side });
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
    const drawer = on && this.overlay === 'Team';
    // Beside the screen of cards the player's half of the field stays live: its units can be dragged there.
    // Presses are taken away a moment after the press that opened the screen, not in the middle of it:
    // a tutorial that asked for that press hears it let go, and steps on. Taken away at once, it never did.
    if (!on || drawer) this.input.enabled = true;
    else this.time.delayedCall(0, () => {
      if (this.overlay && this.overlay !== 'Team') this.input.enabled = false;
    });
    this.cameras.main.setVisible(!drawer);
    if (drawer && !this.side) {
      const r = FIELD_WINDOW;
      // The player's half and a little round it, with room over the back row for heads and plates.
      const zoom = r.w / (BOARD_PX_W / 2 + 36);
      this.side = this.cameras.add(r.x * RES, r.y * RES, r.w * RES, r.h * RES).setZoom(zoom * RES);
      this.side.centerOn(BOARD_X + BOARD_PX_W / 4 - 6, BOARD_Y + BOARD_PX_H / 2 - 48);
      this.side.setBackgroundColor(GROUND[landOf(this.at).ground].around);
      this.board.hideEnemiesFrom(this.side);
    }
    this.side?.setVisible(drawer);
    if (!this.shade) {
      const r = WINDOW_RECT;
      const g = this.add.graphics().setDepth(9500);
      g.fillStyle(hex(OUTLINE), 0.5).fillRect(-40, -40, W + 80, H + 80);
      // The window's frame: the dark line, and a pale one outside it so that it stands off a dark field.
      g.lineStyle(4, hex(BONE.fill), 0.9).strokeRoundedRect(r.x - 11, r.y - 11, r.w + 22, r.h + 22, 12);
      g.lineStyle(10, hex(OUTLINE), 1).strokeRoundedRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 6);
      this.shade = g;
    }
    this.shade.setVisible(on && !drawer);
    // The line under the board is for the field alone.
    this.note.setVisible(!on);
    this.hud();
  }

  private onOverlayClosed(key: string): void {
    if (this.overlay !== key) return;
    this.overlay = null;
    this.cover(false);
    const s = save();
    tidyTeam(s);
    this.coins.refresh();
    this.level.refresh();
    const changed = this.keyOf() !== this.teamKey || this.teamTouched;
    this.teamTouched = false;
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
    // Whatever of a result had not come in yet never does.
    this.toastId++;
    for (const o of this.toast) o.destroy();
    this.toast = [];
  }

  /**
   * Who won, over the board for a moment, and then, in the order the owner
   * asked for them ("more clear what items did you get / then which unit
   * leveled up"): what was won, as pictures of the things; the cards that
   * made a level, as the units they are; the player's own level; and
   * whatever the win opened. The next battle does not wait for a press, and
   * a press does not have to wait for it: the owner, of the victory screen,
   * "Make it clickable".
   *
   * Each part is made at the moment it comes in, not all of it at once.
   * Made at once it was a dozen pieces of text and as many drawings in the
   * frame the battle ended in, which is the frame a slow phone stalled on.
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

    /** Makes a group of things when its moment comes, and brings it in with a small jump. */
    const id = this.toastId;
    const pop = (make: () => Phaser.GameObjects.GameObject[], delay: number, sound?: () => void): void => {
      this.time.delayedCall(delay, () => {
        if (id !== this.toastId) return;
        const root = add(this.add.container(0, 12, make()).setDepth(9001).setAlpha(0));
        sound?.();
        this.tweens.add({ targets: root, alpha: 1, y: 0, duration: 220, ease: 'Back.easeOut' });
      });
    };

    // 1. What was won, a tile to each thing.
    let y = top + 84;
    let x = cx - lootW / 2;
    let wait = 260;
    for (const l of loot) {
      const lx = x;
      const ly = y;
      const sound = l.sound;
      pop(() => {
        const mid = lx + l.w / 2;
        const tile = this.add.graphics();
        slab(tile, lx, ly, l.w, lootH - 14, BONE, 14, 6);
        const big = label(this, mid, ly + 82, l.big, { size: 22, color: l.color ?? HIGHLIGHT, strokeWidth: 6 });
        const small = label(this, mid, ly + 106, l.small, { size: l.small.length > 14 ? 11 : 13, weight: 600, color: OUTLINE, stroke: null });
        return [tile, ...l.draw(mid, ly + 36), big, small];
      }, wait, sound ? () => sfx.play(sound, 0.8) : undefined);
      x += l.w + 10;
      wait += 130;
    }
    y += lootH;

    // 2. Who made a level: the unit itself, on its tier's color, and the level it is at now.
    if (ups.length > 0) {
      wait += 120;
      const ty = y;
      pop(() => [label(this, cx, ty + 8, r.levelUps.length > ups.length ? `LEVEL UP, AND ${r.levelUps.length - ups.length} MORE` : 'LEVEL UP', { size: 17, color: VENOM.light, strokeWidth: 5 })], wait, () => sfx.play('levelUp'));
      let ux = cx - (ups.length * 104 - 10) / 2;
      for (const up of ups) {
        const at = ux;
        wait += 90;
        pop(() => {
          const def = UNITS[up.unit];
          const tile = this.add.graphics();
          slab(tile, at, ty + 24, 94, 92, RARITY_MAT[def.rarity], 12, 5);
          tile.fillStyle(hex(HIGHLIGHT), 0.35).fillRoundedRect(at + 6, ty + 30, 82, 56, 8);
          const pic = portrait(this, at + 47, ty + 86, def.id, 'blue', 54);
          if (pic.displayWidth > 78) pic.setScale((pic.scaleX * 78) / pic.displayWidth);
          const to = label(this, at + 47, ty + 100, `Lv ${up.to}`, { size: 17, strokeWidth: 5 });
          // An arrow that points up, beside the level: it rose.
          const arrow = this.add.image(at + 80, ty + 40, SHEET, 'icon/arrow').setScale(0.22).setAngle(-90).setTint(hex(VENOM.light));
          return [tile, pic, to, arrow];
        }, wait);
        ux += 104;
      }
      y += upsH;
    }

    // 3. The player's own level: a bar that fills by what the battle taught.
    {
      wait += 140;
      const by = y;
      pop(() => {
        const p = save().player;
        const need = playerXpToNext(p.level);
        const bw = 300;
        const bx = cx - bw / 2 + 40;
        const bar = this.add.graphics();
        bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(bx - 4, by + 8, bw + 8, 22, 10);
        bar.fillStyle(hex(IRON.fill), 1).fillRoundedRect(bx, by + 12, bw, 14, 6);
        const share = p.level >= PLAYER_MAX_LEVEL ? 1 : Math.min(1, p.xp / need);
        if (share > 0.02) bar.fillStyle(hex(HOLY.fill), 1).fillRoundedRect(bx, by + 12, bw * share, 14, 6);
        const name = label(this, bx - 14, by + 18, `YOUR LEVEL ${p.level}`, { size: 16, align: 'right', strokeWidth: 5 });
        const got = label(this, bx + bw + 12, by + 18, `+${r.playerXp}`, { size: 16, align: 'left', color: HOLY.fill, strokeWidth: 5 });
        return [bar, name, got];
      }, wait, r.playerLevels > 0 ? () => sfx.play('levelUp', 1, 1.25) : undefined);
      y += barH;
    }

    // 4. And whatever else it changed, a line each.
    news.forEach((n, i) => {
      const ny = y + 8 + i * lineH;
      pop(() => [label(this, cx, ny, n.text, { size: crowded ? 17 : 20, color: n.color, strokeWidth: crowded ? 5 : 6 })], wait + 160 + i * 110);
    });

    // Under it all, once there has been time to see it: it need not be waited for.
    pop(() => {
      const hint = label(this, cx, top + tall + 22, 'TAP TO CONTINUE', { size: 15, color: HIGHLIGHT, strokeWidth: 5 });
      this.tweens.add({ targets: hint, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
      return [hint];
    }, 650);
  }
}
