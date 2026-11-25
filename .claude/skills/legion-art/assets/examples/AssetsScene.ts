// A scene that shows nothing and is never put away. Its loader is the one
// pictures are brought in with once the game is running (a figure when it
// is hired or met, a land's ground when the legion comes to it): the
// screens themselves are made again whenever the window changes shape, and
// a loader that is put away in the middle of its work never says it is
// done.

import Phaser from 'phaser';
import { ASSETS } from '../StageView';

export class AssetsScene extends Phaser.Scene {
  constructor() {
    super(ASSETS);
  }
}
