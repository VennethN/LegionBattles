import Phaser from 'phaser';

class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create(): void {
    this.add.text(640, 360, 'Legion Battles', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#1b2a17',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot],
});
