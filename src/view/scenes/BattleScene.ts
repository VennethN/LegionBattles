// A skirmish: four units against four at random from a seed. The player
// arranges theirs, presses FIGHT, watches it, and is told who won. The same
// seed and the same placement always give the same battle, which is what
// `?seed=123` in the address is for.
//
// The game proper is the main screen (MainScene). This is the battle by
// itself, with nothing won or lost by it.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { SKIRMISH_ROSTER, UNITS, isFrontline } from '../../data/units';
import { ads } from '../../platform/ads';
import { hash32 } from '../../sim/rng';
import { defaultFormation, randomEnemyTeam } from '../../sim/setup';
import type { Placement } from '../../sim/types';
import { setupCamera } from '../app';
import { BoardView } from '../BoardView';
import { W } from '../config';
import { commit, save } from '../session';
import { soundButton } from '../ui/chrome';
import { Button, label, plain, slab } from '../ui/widgets';

export interface BattleConfig {
  seed?: number;
  /** The player's units and where they stand. The usual four in the usual places if left out. */
  team?: Placement[];
  /** The enemy. Four at random from the seed if left out. */
  enemies?: Placement[];
}

type Phase = 'loading' | 'placement' | 'fighting' | 'result';

export class BattleScene extends Phaser.Scene {
  private seed = 1;
  private phase: Phase = 'loading';
  private team: Placement[] = [];
  private enemies: Placement[] = [];
  private board!: BoardView;
  private speed = 1;
  private fightButton!: Button;
  private speedButton!: Button;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  /** The battle on the board, for the scripts that walk the game. */
  get battle(): BoardView['battle'] {
    return this.board.battle;
  }

  init(data: BattleConfig): void {
    const asked = Number(new URLSearchParams(window.location.search).get('seed'));
    this.seed = data.seed ?? (Number.isFinite(asked) && asked > 0 ? Math.floor(asked) : (Date.now() % 1000000) + 1);
    this.team = (data.team ?? defaultFormation(SKIRMISH_ROSTER, isFrontline)).map((p) => ({ ...p }));
    this.enemies = (data.enemies ?? randomEnemyTeam(this.seed, SKIRMISH_ROSTER)).map((p) => ({ ...p }));
    this.phase = 'loading';
  }

  create(): void {
    setupCamera(this);
    this.speed = save().speed;
    this.board = new BoardView(this, 'meadow', { onEnd: (winner) => this.showResult(winner) });

    label(this, 24, 34, 'Skirmish', { size: 30, align: 'left' }).setDepth(8000);
    label(this, 24, 66, `seed ${this.seed}`, { size: 18, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 }).setDepth(8000);

    this.speedButton = plain(new Button(this, W - 70, 46, `${this.speed}x`, () => this.toggleSpeed(), {
      width: 92, height: 56, size: 26, mat: BONE, color: OUTLINE,
    })).setDepth(8000);
    plain(new Button(this, W - 190, 46, 'BACK', () => this.leave(), { width: 120, height: 56, size: 22, mat: BONE, color: OUTLINE })).setDepth(8000);
    soundButton(this, W - 290, 46, save().sound).root.setScale(1.15);

    this.fightButton = new Button(this, W / 2, 662, 'FIGHT', () => this.startFight(), { width: 280, height: 72, size: 38 })
      .setDepth(8000)
      .setVisible(false);
    this.hint = label(this, W / 2, 612, 'Drag your units to arrange them', { size: 18, weight: 600, color: HIGHLIGHT })
      .setDepth(8000)
      .setVisible(false);
    this.input.keyboard?.on('keydown-D', () => this.board.toggleDebug());

    void this.board.show(this.team, this.enemies, this.seed).then(() => {
      this.phase = 'placement';
      this.board.setPlacement(true);
      this.fightButton.setVisible(true);
      this.hint.setVisible(true);
    });
  }

  private toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    save().speed = this.speed;
    commit();
    this.speedButton.setText(`${this.speed}x`);
  }

  /** Back to the game. */
  private leave(): void {
    if (this.phase === 'fighting') ads().gameplayStop();
    // The address goes back to the game's own, so that a reload does not come back here.
    const url = new URL(window.location.href);
    url.searchParams.delete('seed');
    window.history.replaceState(null, '', url);
    this.scene.start('Main');
  }

  private startFight(): void {
    if (this.phase !== 'placement') return;
    this.phase = 'fighting';
    this.fightButton.setVisible(false);
    this.hint.setVisible(false);
    this.board.start({ seed: this.seed, defs: UNITS, teams: [this.team, this.enemies] });
    ads().gameplayStart();
  }

  override update(_time: number, deltaMs: number): void {
    this.board.debugNote = this.phase;
    this.board.update(deltaMs, this.speed);
  }

  private showResult(winner: number): void {
    if (this.phase === 'result') return;
    this.phase = 'result';
    ads().gameplayStop();
    const won = winner === 0;
    const title = won ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW';
    sfx.play(won ? 'victory' : 'defeat');

    // The banner goes above the board and the button below it: whoever is
    // left standing stays in view, and the winners are cheering.
    const banner = this.add.container(W / 2, 88).setDepth(9000);
    const g = this.add.graphics();
    const mat = won ? GOLD : winner === 1 ? CLOTH.red : IRON;
    // The tails of the ribbon, then the ribbon over them.
    slab(g, -300, -24, 110, 64, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, 190, -24, 110, 64, { fill: mat.shade, shade: mat.shade }, 10, 0);
    slab(g, -235, -48, 470, 100, mat, 20, 10);
    banner.add(g);
    banner.add(label(this, 0, -5, title, { size: 60, strokeWidth: 10 }));
    banner.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    const again = new Button(this, W / 2, 680, 'PLAY AGAIN', () => this.playAgain(), { width: 300, height: 72, size: 34 }).setDepth(9000);
    again.root.setAlpha(0);
    this.tweens.add({ targets: again.root, alpha: 1, y: 662, duration: 300, delay: 350 });
  }

  private playAgain(): void {
    const next = (hash32(this.seed) % 999983) + 1;
    // The address keeps up with the seed, so that any battle can be shared or replayed.
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(next));
    window.history.replaceState(null, '', url);
    const team = this.team.map((p) => ({ ...p }));
    void ads()
      .interstitial()
      .then(() => this.scene.restart({ seed: next, team } satisfies BattleConfig));
  }
}
