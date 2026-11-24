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
import { ARCANE, BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { packById } from '../../data/packs';
import { WORLDS, landOf, stageAt, worldOf } from '../../data/stages';
import { UNITS } from '../../data/units';
import { COUNTDOWN, afterBattle, settle, teamChanged } from '../../game/campaign';
import { cardOf } from '../../game/cards';
import { cleared, finishStage, packsHeld, stageEnemies, stageInput, stagePay, stageSeed, teamSize, tidyTeam, type StageResult } from '../../game/rules';
import type { Fielded } from '../../game/state';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { BoardView } from '../BoardView';
import { W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { CoinPill, OVERLAY_CLOSED, OVERLAY_SWAP, soundButton } from '../ui/chrome';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
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
  }

  create(): void {
    setupCamera(this);
    // It may have been hidden under a screen when it was last shut down.
    this.scene.setVisible(true);
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
    // The way to the dungeons and the raids, which are off the line of stages.
    const hall = plain(new Button(this, 128, 36, '   DUNGEONS', () => this.open('Hall'), { width: 216, height: 50, size: 19, mat: BONE, color: OUTLINE })).setDepth(8000);
    hall.root.add(this.add.image(-78, -3, SHEET, 'icon/crown').setScale(0.3));
    plain(new Button(this, 128, 88, 'AND RAIDS', () => this.open('Hall'), { width: 150, height: 38, size: 15, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.buildBottom();
    this.note = label(this, W / 2, 612, '', { size: 18, weight: 600, color: HIGHLIGHT }).setDepth(8000);

    this.guide = new Guide(this, 'Main', () => this.refreshBottom());
    this.guide.mark('battle', () => this.battleButton.rect);
    this.guide.mark('packs', () => this.packsButton.rect);
    this.guide.mark('units', () => ({ x: 22, y: 633, w: 196, h: 62 }));
    this.guide.mark('stages', () => this.plate);

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
    const first = this.at >= cleared(s);

    const banner = add(worldBanner(this, 640, 22, world).setDepth(8000));
    banner.setInteractive({ useHandCursor: true });
    banner.on('pointerup', () => this.open('Map'));

    const plate = new Button(this, 640, 64, `   STAGE ${this.at + 1}`, () => this.open('Map'), {
      width: 250, height: 46, size: 25, mat: stage.def.kind === 'normal' ? GOLD : stage.def.kind === 'boss' ? CLOTH.red : ARCANE,
    }).setDepth(8000);
    add(plate.root);
    // What kind of stage it is, as the mark on its plate: a flag, a banner for a miniboss, a crown for a boss.
    const mark = stage.def.kind === 'boss' ? 'icon/crown' : stage.def.kind === 'miniboss' ? 'icon/banner' : 'icon/flag';
    plate.root.add(this.add.image(-92, -3, SHEET, mark).setScale(0.32));

    // One line under it: its name, what a win pays, and what its enemies stand at.
    const small = { size: 16, weight: 600 as const, color: HIGHLIGHT, strokeWidth: 4, align: 'left' as const };
    const y = 104;
    const name = add(label(this, 0, y, stage.def.name, { ...small, weight: 700 }).setDepth(8000));
    const coin = add(this.add.image(0, y, SHEET, 'icon/coin').setScale(0.28).setDepth(8000));
    const pay = add(label(this, 0, y, String(stagePay(this.at, first)), small).setDepth(8000));
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
  }

  // ------------------------------------------------------------ the bottom

  private buildBottom(): void {
    const s = save();
    const y = 664;
    const units = plain(new Button(this, 120, y, '   UNITS', () => this.pressUnits(), { width: 196, height: 62, size: 24, mat: BONE, color: OUTLINE })).setDepth(8000);
    units.root.add(this.add.image(-62, -3, SHEET, 'icon/team').setScale(0.36));
    this.packsButton = plain(new Button(this, 328, y, '   PACKS', () => this.open('Shop'), { width: 196, height: 62, size: 24, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.packsButton.root.add(this.add.image(-62, -3, SHEET, 'icon/pack').setScale(0.36));

    this.battleButton = new Button(this, 640, y, 'BATTLE', () => this.pressBattle(), { width: 300, height: 74, size: 34 }).setDepth(8000);
    this.autoButton = new Button(this, 916, y, '', () => this.toggleAuto(), { width: 170, height: 62, size: 22 }).setDepth(8000);
    this.speedButton = plain(new Button(this, 1062, y, `${this.speed}x`, () => this.toggleSpeed(), { width: 96, height: 62, size: 26, mat: BONE, color: OUTLINE })).setDepth(8000);
    soundButton(this, 1168, y, s.sound).root.setScale(1.2);
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
      .show(s.team, stageEnemies(this.at), stageSeed(s, this.at))
      .then(() => {
        if (token !== this.arrival) return;
        this.state = 'ready';
        this.board.setPlacement(true);
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
    const result = finishStage(s, this.at, won);
    this.next = afterBattle(s, this.at, result);
    commit();
    this.state = 'after';
    const news = result.moreTeam > 0 || result.reached >= 0 || result.finished;
    this.afterUntil = this.time.now + (news ? 3600 : 2300);
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
      // STOP calls the battle off and opens UNITS, so that the team can be changed.
      this.stop();
      this.open('Team');
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

  private open(key: string): void {
    if (this.overlay) return;
    this.overlay = key;
    this.scene.launch(key);
    // What is covered is not drawn: a screen of cards costs enough frames by itself.
    this.scene.setVisible(false);
    this.guide.refresh({ covered: true });
    this.refreshBottom();
  }

  private onOverlayClosed(key: string): void {
    if (this.overlay !== key) return;
    this.overlay = null;
    this.scene.setVisible(true);
    const s = save();
    tidyTeam(s);
    this.coins.refresh();
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

  /** Who won, and what it paid, over the board for a moment. The next battle does not wait for a press. */
  private showResult(winner: number, r: StageResult): void {
    this.clearToast();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.toast.push(o);
      return o;
    };
    const won = winner === 0;
    sfx.play(won ? 'victory' : 'defeat');
    if (r.coins > 0) this.time.delayedCall(300, () => sfx.play('coin'));
    if (r.levelUps.length > 0) this.time.delayedCall(560, () => sfx.play('levelUp'));

    const banner = add(this.add.container(W / 2, 250).setDepth(9000));
    const g = this.add.graphics();
    const mat = won ? GOLD : winner === 1 ? CLOTH.red : IRON;
    slab(g, -250, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, 150, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, -190, -38, 380, 80, mat, 18, 8);
    banner.add(g);
    banner.add(label(this, 0, -4, won ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW', { size: 46, strokeWidth: 8 }));
    banner.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    interface Row {
      icon?: [string, string, number];
      text: string;
      color?: string;
    }
    const rows: Row[] = [];
    if (r.coins > 0) rows.push({ icon: [SHEET, 'icon/coin', 0.4], text: `+${r.coins}`, color: GOLD.fill });
    rows.push({ icon: [SHEET, 'icon/star', 0.36], text: `+${r.xp} experience each` });
    const drops = new Map<string, number>();
    for (const id of r.packs) drops.set(id, (drops.get(id) ?? 0) + 1);
    for (const [id, n] of drops) rows.push({ icon: [CARDS, `pack/${id.split('@')[0]}`, 0.15], text: `${packById(id).name}${n > 1 ? ` x${n}` : ''}` });
    if (r.levelUps.length > 0) {
      const names = r.levelUps.slice(0, 2).map((l) => `${UNITS[l.unit].name} level ${l.to}`);
      if (r.levelUps.length > 2) names.push(`and ${r.levelUps.length - 2} more`);
      rows.push({ text: names.join(', '), color: VENOM.light });
    }
    if (r.moreTeam > 0) rows.push({ text: `Your team has room for ${teamSize(save())} now`, color: ARCANE.light });
    if (r.reached >= 0) rows.push({ text: `World ${r.reached + 1} is open: ${WORLDS[r.reached].name}`, color: ARCANE.light });
    if (r.finished) rows.push({ text: 'That was the last stage of all. Well fought.', color: ARCANE.light });
    if (!won && this.next < this.at) rows.push({ text: 'Back one stage, to grow stronger' });

    rows.forEach((row, i) => {
      const y = 322 + i * 34;
      const t = add(label(this, W / 2, y, row.text, { size: 22, color: row.color ?? HIGHLIGHT, strokeWidth: 6 }).setDepth(9001).setAlpha(0));
      const things: Phaser.GameObjects.GameObject[] = [t];
      if (row.icon) {
        const icon = add(this.add.image(0, y, row.icon[0], row.icon[1]).setScale(row.icon[2]).setDepth(9001).setAlpha(0));
        const total = icon.displayWidth + 10 + t.width;
        icon.x = W / 2 - total / 2 + icon.displayWidth / 2;
        t.setOrigin(0, 0.5).setX(W / 2 - total / 2 + icon.displayWidth + 10);
        things.push(icon);
      }
      this.tweens.add({ targets: things, alpha: 1, duration: 200, delay: 220 + i * 90 });
    });
  }
}
