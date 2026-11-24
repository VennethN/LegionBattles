// A run of a dungeon, or a raid: a place off the line of stages, with a
// board of its own.
//
// In a dungeon the bottom of the screen is the camp: the roster's cards
// with the health each has left, FIGHT and LEAVE. Nothing heals between
// floors, so the choice at each floor is who to send in: pressing a card
// puts it on the board or rests it. A floor lost ends the run, and only the
// last floor pays.
//
// A raid is one battle, fought with the team as it stands on the line. Its
// lord calls up more of his own while he stands. It can be fought again as
// often as the player likes, and every win pays.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { TIER_MARKS, dungeonById, raidById, type DungeonDef, type RaidDef } from '../../data/expeditions';
import { LANDS } from '../../data/lands';
import { packById } from '../../data/packs';
import { UNITS } from '../../data/units';
import { cardOf } from '../../game/cards';
import {
  afterFloor, canGoOn, fielded, finishRaid, floorEnemies, floorInput, raidEnemies, raidInput, startRun, tierField, tierStage, toggleFielded, unitsOf,
  type Prize, type RosterCard, type Run,
} from '../../game/expeditions';
import { teamSize, tidyTeam, unitsIn, type LevelUp } from '../../game/rules';
import type { Fielded } from '../../game/state';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { BoardView } from '../BoardView';
import { W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { CoinPill } from '../ui/chrome';
import { LAND_MAT, RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { portrait } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';

export interface VentureData {
  kind: 'dungeon' | 'raid';
  id: string;
  tier: number;
}

type State = 'loading' | 'camp' | 'fighting' | 'after' | 'done';

export class VentureScene extends Phaser.Scene {
  private dungeon: DungeonDef | null = null;
  private raid: RaidDef | null = null;
  private tier = 0;
  private run: Run | null = null;
  private board!: BoardView;
  private state: State = 'loading';
  private speed = 1;
  private coins!: CoinPill;
  private fightButton!: Button;
  private leaveButton!: Button;
  private speedButton!: Button;
  private sure = false;
  private head: Phaser.GameObjects.GameObject[] = [];
  private camp: Phaser.GameObjects.GameObject[] = [];
  private toast: Phaser.GameObjects.GameObject[] = [];
  private arrival = 0;

  constructor() {
    super('Venture');
  }

  init(data: VentureData): void {
    this.tier = data.tier;
    this.dungeon = data.kind === 'dungeon' ? dungeonById(data.id) : null;
    this.raid = data.kind === 'raid' ? raidById(data.id) : null;
    this.run = null;
    this.state = 'loading';
    this.sure = false;
    this.head = [];
    this.camp = [];
    this.toast = [];
  }

  private get place(): DungeonDef | RaidDef {
    return (this.dungeon ?? this.raid) as DungeonDef | RaidDef;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    tidyTeam(s);
    this.speed = s.speed;
    const place = this.place;
    const at = tierStage(place.land, this.tier);
    this.board = new BoardView(this, LANDS[place.land].ground, {
      onEnd: (winner) => this.onEnd(winner),
      // The player's units show their card's level and grade, the enemy's what the tier stands at.
      standingOf: (p, team) =>
        team === 'blue'
          ? cardOf(save(), (p as Fielded).card)
          : { level: at.level + (this.dungeon ? 1 : 2), grade: at.grade },
    });
    this.coins = new CoinPill(this, s);

    const y = 664;
    this.leaveButton = plain(new Button(this, 92, y, 'LEAVE', () => this.pressLeave(), { width: 140, height: 62, size: 22, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.fightButton = new Button(this, W - 190, y, 'FIGHT', () => this.fight(), { width: 190, height: 70, size: 30 }).setDepth(8000);
    this.speedButton = plain(new Button(this, W - 52, y, `${this.speed}x`, () => {
      this.speed = this.speed === 1 ? 2 : 1;
      save().speed = this.speed;
      commit();
      this.speedButton.setText(`${this.speed}x`);
    }, { width: 76, height: 62, size: 24, mat: BONE, color: OUTLINE })).setDepth(8000);
    this.input.keyboard?.on('keydown-D', () => this.board.toggleDebug());

    if (this.dungeon) this.run = startRun(s, this.dungeon, this.tier);
    if (this.dungeon && !this.run) {
      // The tier is shut, or there is no team: there is nothing to do here.
      this.scene.start('Main');
      return;
    }
    this.cameras.main.fadeIn(220);
    this.arrive();
  }

  // ------------------------------------------------------------ what is on show

  private drawHead(): void {
    for (const o of this.head) o.destroy();
    this.head = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.head.push(o);
      return o;
    };
    const place = this.place;
    const title = `${place.name.toUpperCase()}  ·  ${TIER_MARKS[this.tier].toUpperCase()}`;
    const text = add(label(this, W / 2, 26, title, { size: 22, strokeWidth: 6 }).setDepth(8001));
    const g = add(this.add.graphics().setDepth(8000));
    slab(g, W / 2 - text.width / 2 - 24, 4, text.width + 48, 46, LAND_MAT[LANDS[place.land].ground], 12, 5);
    let line = 'The lord calls up more of his own while he stands.';
    if (this.dungeon && this.run) {
      const f = Math.min(this.run.floor, this.dungeon.floors.length - 1);
      line = `Floor ${f + 1} of ${this.dungeon.floors.length}  ·  ${this.dungeon.floors[f].name}`;
    }
    const sub = add(label(this, W / 2, 70, line, { size: 18, weight: 600, color: HIGHLIGHT, strokeWidth: 5 }).setDepth(8000));
    // During a fight the line is put away: the back row's plates stand there.
    sub.setVisible(this.state !== 'fighting');
  }

  /** The camp: a card to each of the roster with the health it has left. Pressing one sends it in or rests it. */
  private drawCamp(): void {
    for (const o of this.camp) o.destroy();
    this.camp = [];
    const run = this.run;
    if (!run) return;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.camp.push(o);
      return o;
    };
    const s = save();
    const n = run.roster.length;
    const pitch = Math.min(88, 800 / n);
    const x0 = 196 + pitch / 2;
    const y = 664;
    run.roster.forEach((r: RosterCard, i) => {
      const x = x0 + i * pitch;
      const card = cardOf(s, r.card);
      const def = UNITS[r.unit];
      const fallen = r.hp <= 0;
      const root = add(this.add.container(x, y).setDepth(8000));
      const g = this.add.graphics();
      // On the board: a blue rim. Resting: bone. Fallen: iron.
      if (r.fielded && !fallen) g.fillStyle(hex(CLOTH.blue.fill), 1).fillRoundedRect(-pitch / 2 + 1, -44, pitch - 2, 92, 12);
      slab(g, -pitch / 2 + 5, -40, pitch - 10, 84, fallen ? IRON : RARITY_MAT[def.rarity], 9, 4);
      root.add(g);
      const pic = portrait(this, 0, 22, r.unit, 'blue', 50, false);
      if (fallen) pic.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.7);
      root.add(pic);
      if (card) {
        root.add(gradeBadge(this, -pitch / 2 + 18, -30, card.grade, 13));
        root.add(label(this, pitch / 2 - 9, -30, String(card.level), { size: 12, align: 'right', strokeWidth: 3 }));
      }
      // Its health: what it has left of all it has.
      const bw = pitch - 22;
      const bar = this.add.graphics();
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(-bw / 2 - 2, 28, bw + 4, 11, 4);
      bar.fillStyle(hex(IRON.shade), 1).fillRoundedRect(-bw / 2, 30, bw, 7, 3);
      if (r.hp > 0.02) bar.fillStyle(hex(r.hp > 0.5 ? VENOM.fill : r.hp > 0.25 ? GOLD.fill : CLOTH.red.fill), 1).fillRoundedRect(-bw / 2, 30, bw * r.hp, 7, 3);
      root.add(bar);
      if (fallen || this.state !== 'camp') return;
      root.setSize(pitch - 6, 92);
      root.setInteractive({ useHandCursor: true });
      root.on('pointerup', () => {
        if (this.state !== 'camp' || !toggleFielded(save(), run, r.card)) return;
        sfx.play('place');
        this.arrive();
      });
    });
    const on = unitsIn(fielded(run));
    add(label(this, x0 + ((n - 1) * pitch) / 2, 606, `${on} of ${teamSize(s)} sent in. Press a card to send it in or rest it. Nothing heals here.`, { size: 15, weight: 600, color: HIGHLIGHT, strokeWidth: 4 }).setDepth(8000));
  }

  private refreshButtons(): void {
    const camp = this.state === 'camp';
    const can = this.run ? fielded(this.run).length > 0 : save().team.length > 0;
    this.fightButton.setText(this.raid ? 'BATTLE' : 'FIGHT').setEnabled(camp && can).setVisible(this.state !== 'done');
    this.leaveButton.setText(this.sure ? 'SURE?' : 'LEAVE').setMaterial(this.sure ? CLOTH.red : BONE).setEnabled(this.state !== 'fighting');
  }

  // ------------------------------------------------------------ the run

  /** Stands whoever is sent in, and the enemy of the floor or the raid, on the board. */
  private arrive(): void {
    const token = ++this.arrival;
    const s = save();
    this.state = 'loading';
    this.clearToast();
    let team: Array<{ unit: string; col: number; row: number }> = s.team;
    let foes = this.raid ? raidEnemies(this.raid, this.tier) : [];
    let seed = 1;
    if (this.dungeon && this.run) {
      team = fielded(this.run);
      foes = floorEnemies(this.dungeon, this.tier, this.run.floor);
      seed = floorInput(s, this.run, this.dungeon).seed;
    } else if (this.raid) seed = raidInput(s, this.raid, this.tier).seed;
    this.drawHead();
    this.drawCamp();
    this.refreshButtons();
    void this.board.show(team, foes, seed, unitsOf(this.place), tierField(this.place.land, this.tier)).then(() => {
      if (token !== this.arrival) return;
      this.state = 'camp';
      this.board.setPlacement(true);
      this.drawCamp();
      this.refreshButtons();
    });
  }

  private fight(): void {
    const s = save();
    if (this.state !== 'camp' || this.board.loading) return;
    const input = this.dungeon && this.run ? floorInput(s, this.run, this.dungeon) : this.raid ? raidInput(s, this.raid, this.tier) : null;
    if (!input || input.teams[0].length === 0) return;
    this.state = 'fighting';
    this.sure = false;
    commit();
    this.board.start(input);
    ads().gameplayStart();
    this.drawHead();
    this.drawCamp();
    this.refreshButtons();
  }

  private onEnd(winner: number): void {
    ads().gameplayStop();
    const s = save();
    const won = winner === 0;
    this.state = 'after';
    let ended = false;
    if (this.dungeon && this.run) {
      // What each card that fought has left, in the order it was sent in.
      const mine = (this.board.battle?.units ?? []).filter((u) => u.team === 0 && u.calledBy < 0);
      const left = mine.map((u) => (u.alive ? u.hp / u.maxHp : 0));
      const r = afterFloor(s, this.run, this.dungeon, won, left);
      commit();
      const more = canGoOn(this.run);
      this.showResult(won ? (r.prize ? 'DUNGEON CLEARED' : 'FLOOR CLEARED') : 'DEFEATED', won, r.xp, r.levelUps, r.prize, !won ? 'The run is over. Only the last floor pays.' : !r.over && !more ? 'No one is left standing to go on.' : '');
      ended = r.over || !more;
      if (!ended) this.time.delayedCall(2200, () => this.arrive());
    } else if (this.raid) {
      const r = finishRaid(s, this.raid, this.tier, won);
      commit();
      this.showResult(won ? 'RAID WON' : 'DEFEATED', won, r.xp, r.levelUps, r.prize, won ? '' : 'Only a win pays. He can be fought again.');
      // A raid can be fought again as often as the player likes.
      this.time.delayedCall(won ? 3400 : 2400, () => this.arrive());
    }
    this.coins.refresh();
    if (ended) this.state = 'done';
    this.drawCamp();
    this.refreshButtons();
    // The run is over: nothing is left but to go back to the line.
    if (ended) new Button(this, W - 150, 664, 'BACK', () => this.scene.start('Main'), { width: 220, height: 70, size: 28 }).setDepth(8000);
  }

  private pressLeave(): void {
    if (this.state === 'fighting') return;
    // A run in the middle is given up by leaving, so it asks once. A raid, and a run that is over, just go.
    const asks = !!this.run && !this.run.over && (this.run.floor > 0 || this.run.fought > 0);
    if (asks && !this.sure) {
      this.sure = true;
      this.refreshButtons();
      return;
    }
    this.scene.start('Main');
  }

  override update(_time: number, deltaMs: number): void {
    this.board.debugNote = this.state;
    this.board.update(deltaMs, this.speed);
  }

  // ------------------------------------------------------------ what a battle came to

  private clearToast(): void {
    for (const o of this.toast) o.destroy();
    this.toast = [];
  }

  private showResult(title: string, won: boolean, xp: number, ups: LevelUp[], prize: Prize | null, note: string): void {
    this.clearToast();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.toast.push(o);
      return o;
    };
    sfx.play(won ? 'victory' : 'defeat');
    if (prize) this.time.delayedCall(300, () => sfx.play('coin'));
    const banner = add(this.add.container(W / 2, 250).setDepth(9000));
    const g = this.add.graphics();
    const mat = won ? GOLD : CLOTH.red;
    const text = label(this, 0, -4, title, { size: 44, strokeWidth: 8 });
    const bw = Math.max(380, text.width + 70);
    slab(g, -bw / 2 - 60, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, bw / 2 - 40, -18, 100, 52, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, -bw / 2, -38, bw, 80, mat, 18, 8);
    banner.add(g);
    banner.add(text);
    banner.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    const rows: Array<{ icon?: [string, string, number]; text: string; color?: string }> = [];
    if (prize) {
      rows.push({ icon: [SHEET, 'icon/coin', 0.4], text: `+${prize.coins}`, color: GOLD.fill });
      rows.push({ icon: [CARDS, `pack/${prize.packs[0].split('@')[0]}`, 0.15], text: `${packById(prize.packs[0]).name} x${prize.packs.length}` });
      if (prize.first && this.tier + 1 < TIER_MARKS.length) rows.push({ text: `${TIER_MARKS[this.tier + 1]} is open here`, color: VENOM.light });
    }
    rows.push({ icon: [SHEET, 'icon/star', 0.36], text: `+${xp} experience each` });
    if (ups.length > 0) {
      const names = ups.slice(0, 2).map((l) => `${UNITS[l.unit].name} level ${l.to}`);
      if (ups.length > 2) names.push(`and ${ups.length - 2} more`);
      rows.push({ text: names.join(', '), color: VENOM.light });
    }
    if (note) rows.push({ text: note });
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
