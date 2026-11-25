import { describe, expect, it } from 'vitest';
import { BARS, Music, SLOTS, THEMES, chordOf, hertz, midiOf, notesOf, type Mood } from '../src/audio/music';
import { Sfx } from '../src/audio/sfx';
import { LAND_NAMES } from '../src/game/data';
import { Bank, INSTRUMENTS } from '../src/audio/bank';
import { fakeAudio, fakeBank, sampled, type FakeAudio } from './audio';

/** A band with a stand-in for the browser's audio under it. */
function band(): { f: FakeAudio; sfx: Sfx; music: Music } {
  const f = fakeAudio();
  const sfx = new Sfx(() => f.ctx);
  return { f, sfx, music: new Music(() => sfx.out) };
}

/** Lets time pass a frame at a time, as the game does. */
function run(f: FakeAudio, music: Music, seconds: number): void {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) {
    f.clock.t += 1 / 60;
    music.update();
  }
}

describe('the themes', () => {
  it('there is one for every kind of land', () => {
    for (const land of Object.keys(LAND_NAMES)) expect(THEMES[land], land).toBeDefined();
  });

  it('each is sixteen bars of eight slots, with a chord under every bar', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      expect(theme.chords.length, id).toBe(BARS);
      expect(theme.tune.length, id).toBe(BARS);
      expect(notesOf(theme).length, id).toBe(BARS * SLOTS);
      expect(theme.scale.length, id).toBe(7);
      expect(theme.drums.length % SLOTS, id).toBe(0);
      for (const d of theme.drums) expect('ksth.', `${id}: drum "${d}"`).toContain(d);
    }
  });

  it('the tune agrees with the chords: what lands on a strong beat is a note of the chord under it', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      const notes = notesOf(theme);
      notes.forEach((note, slot) => {
        if (!note) return;
        const bar = Math.floor(slot / SLOTS);
        const beat = slot % SLOTS;
        const n = theme.scale.length;
        const inChord = chordOf(theme, bar).some((step) => ((step - note.step) % n + n) % n === 0);
        // The first and third beats of the bar, and any note held for half a bar or more.
        if (beat === 0 || beat === 4 || note.slots >= 4) expect(inChord, `${id}, bar ${bar + 1}, slot ${beat + 1}: step ${note.step}`).toBe(true);
        // No note is held past the end of its bar.
        expect(beat + note.slots, `${id}, bar ${bar + 1}`).toBeLessThanOrEqual(SLOTS);
      });
    }
  });

  it('comes home: the last bar is the first chord with the root over it, and the first half ends on the first chord or the fifth', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      const n = theme.scale.length;
      // The middle of the theme may rest on the fifth's chord, which asks for the second half; the end may not.
      expect([theme.chords[0], theme.chords[0] + 4], `${id}, bar ${BARS / 2}`).toContain(theme.chords[BARS / 2 - 1]);
      expect(theme.chords[BARS - 1], id).toBe(theme.chords[0]);
      const end = notesOf(theme).slice((BARS - 1) * SLOTS).find((note) => !!note);
      expect(end, id).toBeDefined();
      expect(((end!.step % n) + n) % n, id).toBe(0);
    }
  });

  it('stays where a tune can be heard: not too low for a phone, not too high to bear', () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      for (const note of notesOf(theme)) {
        if (!note) continue;
        const hz = hertz(midiOf(theme, note.step));
        expect(hz, `${id}: step ${note.step}`).toBeGreaterThan(160);
        expect(hz, `${id}: step ${note.step}`).toBeLessThan(1400);
      }
    }
    // Steps past the scale's end are in the octaves above and below.
    const t = THEMES.meadow;
    expect(midiOf(t, 7)).toBe(midiOf(t, 0) + 12);
    expect(midiOf(t, -1)).toBe(midiOf(t, 6) - 12);
    expect(hertz(69)).toBeCloseTo(440, 6);
  });
});

describe('the band', () => {
  it('plays nothing until the page has been touched, and nothing until it is given a theme', () => {
    const { f, sfx, music } = band();
    music.play('meadow', 'calm');
    run(f, music, 2);
    expect(f.made.osc).toBe(0);
    sfx.unlock();
    const silent = band();
    silent.sfx.unlock();
    run(silent.f, silent.music, 2);
    expect(silent.f.made.osc).toBe(0);
    run(f, music, 2);
    expect(f.made.osc).toBeGreaterThan(0);
    expect(music.playing).toBe('meadow');
  });

  it('writes every note down ahead of the clock, and none twice', () => {
    for (const land of Object.keys(THEMES)) {
      const { f, sfx, music } = band();
      sfx.unlock();
      music.play(land, 'calm');
      // Twice round the theme. The stand-in fails on a note that is asked to have sounded already.
      const theme = THEMES[land];
      const length = (BARS * SLOTS * 30) / theme.bpm;
      run(f, music, length * 2 + 1);
      // The tune's notes are among what was made, as many as the tune has, each time round.
      const tune = notesOf(theme).filter((n) => !!n).length;
      expect(f.made.osc, land).toBeGreaterThan(tune * 2);
      for (const p of f.pitches) {
        expect(p, land).toBeGreaterThan(30);
        expect(p, land).toBeLessThan(8000);
      }
      // Nothing rings on for more than a few seconds after it starts.
      expect(Math.max(...f.ends) - f.clock.t, land).toBeLessThan(5);
    }
  });

  it('a battle is the same bars with more in them', () => {
    const made = (mood: Mood): number => {
      const { f, sfx, music } = band();
      sfx.unlock();
      music.play('desert', mood);
      run(f, music, 12);
      return f.made.osc + f.made.noise;
    };
    expect(made('battle')).toBeGreaterThan(made('calm') * 1.5);
  });

  it('changes mood without starting over, and starts over for another land', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('meadow', 'calm');
    run(f, music, 5);
    const slot = (music as unknown as { slot: number }).slot;
    expect(slot).toBeGreaterThan(8);
    music.play('meadow', 'battle');
    expect((music as unknown as { slot: number }).slot).toBe(slot);
    music.play('snow', 'battle');
    expect((music as unknown as { slot: number }).slot).toBe(0);
    expect(music.playing).toBe('snow');
    music.stop();
    const before = f.made.osc;
    run(f, music, 3);
    expect(f.made.osc).toBe(before);
    expect(music.playing).toBeNull();
  });

  it('after a sleep it goes on from now, and does not play what it missed all at once', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('meadow', 'battle');
    run(f, music, 3);
    // The tab was hidden for a minute.
    f.clock.t += 60;
    const before = f.made.osc + f.made.noise;
    music.update();
    expect(f.made.osc + f.made.noise - before).toBeLessThan(30);
  });

  it('makes no note while it cannot be heard, and comes in on time when it can again', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('meadow', 'battle');
    run(f, music, 2);
    const before = f.made.osc + f.made.noise;
    expect(before).toBeGreaterThan(0);
    // The music turned to nothing in the settings.
    sfx.setVolumes(0.8, 0);
    run(f, music, 5);
    expect(f.made.osc + f.made.noise).toBe(before);
    // All sound off.
    sfx.setVolumes(0.8, 0.5);
    sfx.enabled = false;
    run(f, music, 5);
    expect(f.made.osc + f.made.noise).toBe(before);
    // On again: it goes on from now, with nothing asked to have sounded already (the stand-in fails on that).
    sfx.enabled = true;
    run(f, music, 2);
    expect(f.made.osc + f.made.noise).toBeGreaterThan(before);
  });

  it('turns down for a fanfare and is not thrown by one it cannot make', () => {
    const { f, sfx, music } = band();
    // Before anything plays there is nothing to turn down.
    expect(() => music.duck(1.5)).not.toThrow();
    sfx.unlock();
    music.play('snow', 'calm');
    run(f, music, 1);
    expect(() => music.duck(1.5)).not.toThrow();
    run(f, music, 3);
    expect(f.made.osc).toBeGreaterThan(0);
  });
});

describe('the band on recorded instruments', () => {
  /** A band whose bank is there. */
  function recorded(bank: Bank = fakeBank()): { f: FakeAudio; sfx: Sfx; music: Music } {
    const f = fakeAudio();
    const sfx = new Sfx(() => f.ctx, bank);
    return { f, sfx, music: new Music(() => sfx.out) };
  }

  it('plays every theme in both moods from the bank, with no oscillator', () => {
    for (const land of Object.keys(THEMES)) {
      for (const mood of ['calm', 'battle'] as Mood[]) {
        const { f, sfx, music } = recorded();
        sfx.unlock();
        music.play(land, mood);
        run(f, music, 50);
        expect(f.made.osc, `${land}, ${mood}`).toBe(0);
        const heard = sampled(f);
        expect(heard.length, `${land}, ${mood}`).toBeGreaterThan(100);
        // The cellos hold the chord and the bass is plucked under it, whatever the land.
        expect(heard.some((n) => n.startsWith('cello-')), land).toBe(true);
        expect(heard.some((n) => n.startsWith('bass-')), land).toBe(true);
      }
    }
  });

  it('each land has its own instrument for the tune, and its own drums in a battle', () => {
    const tune = { meadow: 'flute-', desert: 'oboe-', snow: 'harp-' } as Record<string, string>;
    const heardIn = (land: string, mood: Mood): string[] => {
      const { f, sfx, music } = recorded();
      sfx.unlock();
      music.play(land, mood);
      run(f, music, 20);
      return sampled(f);
    };
    const drums = new Set<string>();
    // The three themes written so far: the other lands play one of them.
    for (const land of Object.keys(tune)) {
      const theme = THEMES[land];
      const calm = heardIn(land, 'calm');
      expect(calm.some((n) => n.startsWith(tune[land])), land).toBe(true);
      const kit = Object.values(theme.kit).map(([name]) => name);
      for (const d of kit) expect(calm, `${land}: no ${d} while calm`).not.toContain(d);
      const battle = heardIn(land, 'battle');
      for (const d of kit) expect(battle, `${land}: ${d} in a battle`).toContain(d);
      // Every letter of its drums has something to be struck on.
      for (const letter of theme.drums) if (letter !== '.') expect(theme.kit[letter], `${land}: drum "${letter}"`).toBeDefined();
      drums.add(kit.join());
      // A battle has more in it than the calm has.
      expect(battle.length, land).toBeGreaterThan(calm.length);
    }
    expect(drums.size).toBe(Object.keys(tune).length);
    expect(new Set(Object.values(THEMES)).size).toBe(Object.keys(tune).length);
  });

  it('no note is played far from where its instrument was recorded', () => {
    for (const land of Object.keys(THEMES)) {
      for (const mood of ['calm', 'battle'] as Mood[]) {
        const { f, sfx, music } = recorded();
        sfx.unlock();
        music.play(land, mood);
        run(f, music, 50);
        for (const src of f.sources) {
          const name = (src.buffer as { sample?: string }).sample ?? '';
          const pitched = Object.keys(INSTRUMENTS).some((i) => name.startsWith(`${i}-`));
          // A fifth up at the most, for the bass under a chord; a fourth down.
          if (pitched) {
            expect(src.playbackRate.value, `${land}, ${mood}: ${name}`).toBeLessThanOrEqual(Math.pow(2, 7 / 12) + 1e-9);
            expect(src.playbackRate.value, `${land}, ${mood}: ${name}`).toBeGreaterThanOrEqual(Math.pow(2, -5 / 12) - 1e-9);
          } else expect(src.playbackRate.value, name).toBe(1);
        }
      }
    }
  });

  it('waits for a bank that is on its way, and starts on the beat when it is in', () => {
    const bank = fakeBank();
    bank.state = 'loading';
    const { f, sfx, music } = recorded(bank);
    sfx.unlock();
    music.play('meadow', 'calm');
    run(f, music, 3);
    expect(f.sources.length + f.made.osc).toBe(0);
    bank.state = 'ready';
    run(f, music, 1);
    expect(f.made.osc).toBe(0);
    expect(sampled(f).length).toBeGreaterThan(0);
    // Nothing of the three seconds it waited is played late.
    for (const src of f.sources) expect(src.at).toBeGreaterThan(f.clock.t - 1.1);
  });

  it('a device whose bank failed gets the theme from oscillators', () => {
    const bank = new Bank();
    bank.state = 'failed';
    const { f, sfx, music } = recorded(bank);
    sfx.unlock();
    music.play('snow', 'battle');
    run(f, music, 5);
    expect(f.made.osc).toBeGreaterThan(0);
    expect(sampled(f)).toEqual([]);
  });
});
