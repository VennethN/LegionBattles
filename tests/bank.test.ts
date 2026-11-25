import { describe, expect, it } from 'vitest';
import { Bank, INSTRUMENTS, leadOf, nearest, parse, type BufferLike, type Instrument } from '../src/audio/bank';
import { MOMENTS, Music, PIECES, stepsOf, type Moment } from '../src/audio/music';
import { SOUNDS, Sfx, type Hit } from '../src/audio/sfx';
import { bankFile, fakeAudio, fakeBank } from './audio';

/** A decoded sound of some length, silent for `lead` seconds and then not. */
function sound(lead: number, seconds = 0.5): BufferLike {
  const rate = 1000;
  const data = new Float32Array(Math.floor(seconds * rate));
  for (let i = Math.floor(lead * rate); i < data.length; i++) data[i] = 0.5;
  return { sampleRate: rate, length: data.length, getChannelData: () => data };
}

describe('the bank of recorded sounds', () => {
  it('its file is a list of sounds, each with a name of its own and the bytes of an MP3', () => {
    const parts = parse(bankFile());
    expect(parts.length).toBeGreaterThan(40);
    expect(new Set(parts.map((p) => p.name)).size).toBe(parts.length);
    for (const p of parts) {
      const head = new Uint8Array(p.data, 0, 2);
      // An MP3 frame starts with eleven bits set.
      expect(head[0] === 0xff && (head[1] & 0xe0) === 0xe0, p.name).toBe(true);
    }
  });

  it('is small: the whole game has five megabytes, and this is a tenth of them', () => {
    expect(bankFile().byteLength).toBeLessThan(500 * 1024);
  });

  it('has every note each instrument is said to be recorded at', () => {
    const names = new Set(parse(bankFile()).map((p) => p.name));
    for (const [instrument, notes] of Object.entries(INSTRUMENTS)) {
      for (const n of notes) expect(names.has(`${instrument}-${n}`), `${instrument}-${n}`).toBe(true);
    }
  });

  it('holds nothing that is never played, and everything that is', () => {
    const bank = fakeBank();
    const asked = new Set<string>();
    const get = bank.get.bind(bank);
    bank.get = (name) => {
      asked.add(name);
      return get(name);
    };
    // Every effect once, every piece once round at each of its steps, and every moment.
    for (const recipe of Object.values(SOUNDS)) for (const h of (recipe as { hits?: Hit[] }).hits ?? []) asked.add(h.s);
    for (const [id, piece] of Object.entries(PIECES)) {
      for (let step = 0; step < stepsOf(piece); step++) {
        const f = fakeAudio();
        const sfx = new Sfx(() => f.ctx, bank);
        sfx.unlock();
        const music = new Music(() => sfx.out);
        music.play(id, step);
        for (let i = 0; i < 90 * 60; i++) {
          f.clock.t += 1 / 60;
          music.update();
        }
        for (const what of Object.keys(MOMENTS) as Moment[]) {
          music.play(id, step);
          music.moment(what);
        }
      }
    }
    const held = bank.names().sort();
    expect([...asked].sort()).toEqual(held);
  });

  it('finds the recorded note nearest to a pitch, and how fast to play it', () => {
    expect(nearest('flute', 72)).toEqual({ name: 'flute-72', rate: 1 });
    const up = nearest('flute', 74);
    expect(up.name).toBe('flute-72');
    expect(up.rate).toBeCloseTo(Math.pow(2, 2 / 12), 6);
    const down = nearest('harp', 50);
    expect(down.name).toBe('harp-52');
    expect(down.rate).toBeLessThan(1);
    // An octave is twice as fast.
    expect(nearest('horn', 69).rate).toBeCloseTo(2, 6);
    for (const instrument of Object.keys(INSTRUMENTS) as Instrument[]) expect(nearest(instrument, 60).name.startsWith(instrument)).toBe(true);
  });

  it('skips the silence an MP3 comes back with at its start', () => {
    expect(leadOf(sound(0))).toBe(0);
    expect(leadOf(sound(0.03))).toBeCloseTo(0.029, 3);
    // A sound that never starts is played from its beginning.
    expect(leadOf(sound(1, 0.5))).toBe(0);
  });

  it('is read whole, keeps the file\'s order, and is ready only when every sound is in', async () => {
    const bank = new Bank();
    expect(bank.state).toBe('empty');
    const sizes: number[] = [];
    const filling = bank.fill(bankFile(), async (mp3) => {
      sizes.push(mp3.byteLength);
      return sound(0.02);
    });
    expect(bank.state).toBe('loading');
    await filling;
    expect(bank.state).toBe('ready');
    const parts = parse(bankFile());
    expect(sizes).toEqual(parts.map((p) => p.data.byteLength));
    expect(bank.names()).toEqual(parts.map((p) => p.name));
    expect(bank.get('ui-click')?.lead).toBeCloseTo(0.019, 3);
  });

  it('a file that is not a bank, or a sound that cannot be read, leaves no bank at all', async () => {
    expect(() => parse(new ArrayBuffer(4))).toThrow();
    expect(() => parse(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer)).toThrow();
    const junk = new Bank();
    await junk.fill(new ArrayBuffer(64), async () => sound(0));
    expect(junk.state).toBe('failed');
    const broken = new Bank();
    let n = 0;
    await broken.fill(bankFile(), async () => {
      if (++n === 5) throw new Error('cannot read');
      return sound(0);
    });
    expect(broken.state).toBe('failed');
    expect(broken.names()).toEqual([]);
  });
});
