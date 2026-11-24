import { describe, expect, it } from 'vitest';
import { CROWD, SOUNDS, Sfx, type SoundName } from '../src/audio/sfx';
import { fakeAudio } from './audio';

const fake = fakeAudio;

describe('sound effects', () => {
  it('make no sound before the player has touched the page, or when muted', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
    s.unlock();
    s.enabled = false;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
  });

  it('every sound can be made, is short, and is not silent', () => {
    for (const name of Object.keys(SOUNDS) as SoundName[]) {
      const f = fake();
      const s = new Sfx(() => f.ctx);
      s.unlock();
      s.play(name);
      expect(f.made.osc + f.made.noise, name).toBeGreaterThan(0);
      // Nothing rings on for more than two seconds.
      expect(Math.max(...f.ends) - f.clock.t, name).toBeLessThan(2);
    }
  });

  it('a burst of the same sound in one moment is one sound', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    for (let i = 0; i < 12; i++) s.play('hit');
    const once = f.made.osc + f.made.noise;
    expect(once).toBe(2);
    f.clock.t += 0.2;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(once * 2);
  });

  it('a device with no audio leaves the game silent, not broken', () => {
    const s = new Sfx(() => null);
    s.unlock();
    expect(() => s.play('victory')).not.toThrow();
    const broken = new Sfx(() => { throw new Error('no audio'); });
    expect(() => broken.unlock()).not.toThrow();
    expect(() => broken.play('click')).not.toThrow();
  });

  it('a rarer card has a longer flourish', () => {
    const len = (name: SoundName): number => {
      const f = fake();
      const s = new Sfx(() => f.ctx);
      s.unlock();
      s.play(name);
      return Math.max(...f.ends) - f.clock.t;
    };
    expect(len('reveal4')).toBeGreaterThan(len('reveal2'));
    expect(len('reveal2')).toBeGreaterThan(len('reveal0'));
  });

  it('has a volume of its own, and none at all when it is turned to nothing', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    s.setVolumes(0, 1);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
    s.setVolumes(0.5, 0);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBeGreaterThan(0);
    // The music has somewhere to play once the page has been touched, whatever the effects are set to;
    // and nowhere while there is nothing to hear of it, so that no note is made for no one.
    expect(s.out).toBeNull();
    s.setVolumes(0, 0.5);
    expect(s.out).not.toBeNull();
    s.enabled = false;
    expect(s.out).toBeNull();
    expect(new Sfx(() => f.ctx).out).toBeNull();
  });

  it('a fight of many is not a roar: the small sounds of a battle are dropped when the air is full', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    // Every sound there is, all in the same moment.
    const names = Object.keys(SOUNDS) as SoundName[];
    let begun = 0;
    for (const name of names) {
      const before = f.made.osc + f.made.noise;
      s.play(name);
      if (f.made.osc + f.made.noise > before) begun++;
      else expect(SOUNDS[name], name).toHaveProperty('crowd', true);
    }
    // Some were dropped, and only ones that can be: what matters is always heard.
    expect(begun).toBeLessThan(names.length);
    expect(begun).toBeGreaterThanOrEqual(CROWD);
    // A moment later the air is clear again.
    f.clock.t += 0.5;
    const before = f.made.osc + f.made.noise;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBeGreaterThan(before);
  });

  it('a sound that repeats is never quite the same pitch twice running', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    const heard: number[] = [];
    for (let i = 0; i < 6; i++) {
      f.clock.t += 0.5;
      const from = f.pitches.length;
      s.play('hit');
      heard.push(f.pitches[from]);
    }
    for (let i = 1; i < heard.length; i++) expect(heard[i], `the ${i + 1}th`).not.toBe(heard[i - 1]);
    // And never far from what it is.
    const base = SOUNDS.hit.tones[0].from;
    for (const h of heard) expect(Math.abs(h / base - 1)).toBeLessThan(0.1);
  });

  it('goes quiet while the page is hidden, and does not wake itself', () => {
    const f = fake();
    let slept = 0;
    let woke = 0;
    f.ctx.suspend = () => { slept++; f.ctx.state = 'suspended'; };
    f.ctx.resume = () => { woke++; f.ctx.state = 'running'; };
    const s = new Sfx(() => f.ctx);
    s.unlock();
    s.sleep(true);
    expect(slept).toBe(1);
    // A touch on a hidden page does not start it again.
    s.unlock();
    expect(woke).toBe(0);
    s.sleep(false);
    expect(woke).toBe(1);
  });
});
