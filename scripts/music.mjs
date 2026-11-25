// node scripts/music.mjs [--quick]
//
// Plays the game's music and the sounds that were made for it into files,
// to build/audio, and measures them. Nobody who wrote the music could hear
// it, so this is how it is checked, and how the owner gets something to
// listen to without starting a hunt:
//
//   music-<piece>-<step>.ogg   each piece once round at each of its steps
//   moment-<name>.ogg          each moment alone, in D
//   hunt-<monster>.ogg         a whole hunt in short: the lair, the camp,
//                              the waking, the three steps, a break, the end
//   sound-<name>.ogg           each effect, alone
//   README.txt                 a line for each file, and what was measured
//   notes.txt                  every piece written out in the names of its notes
//
// Nothing here is a recording of a game. The game makes its music as it
// goes from the bank's sounds (src/audio/music.ts). This plays that same
// code into an offline audio context in a headless browser, as fast as the
// machine can go, and saves what comes out.
//
// What is measured for each file: how long it is, how loud (the whole, and
// the quietest and loudest two seconds), whether anything clips, how much
// of its sound is low, where its weight lies (the centroid), how many
// jumps in loudness a second, and for a piece how often its low end comes
// round, in beats of the tempo written: a whole number, if it is in time. With --quick only the pieces' first steps and
// the moments are made.
//
// How the kettledrums' pitch in music.ts (KETTLES) was found: each sound of
// the bank was written out, and the strongest low peak of its spectrum
// read: 143 hertz for `timpani`, 90 for `timpani-low`.
//
// It needs Playwright with its Chromium, esbuild (Vite brings it) and ffmpeg.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'build/audio');
const quick = process.argv.includes('--quick');

const esbuild = require('esbuild');
const { chromium } = require('playwright');

const entry = `
  export { Music, PIECES, MOMENTS, stepsOf, secondsOf, written, plays, cellsOf, notesIn, slotsOf } from './music';
  export { Sfx, SOUNDS } from './sfx';
  export { Bank } from './bank';
`;
const built = await esbuild.build({
  stdin: { contents: entry, resolveDir: path.join(root, 'src/audio'), loader: 'ts' },
  bundle: true,
  format: 'iife',
  globalName: 'Game',
  write: false,
  logLevel: 'silent',
});
const bank = fs.readFileSync(path.join(root, 'public/assets/audio/bank.bin'));
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.setContent('<!doctype html><title>music</title>');
await page.addScriptTag({ content: built.outputFiles[0].text });
await page.evaluate((bank64) => { window.bank64 = bank64; }, bank.toString('base64'));

const RATE = 32000;

/**
 * Plays a list of things to do, each at its second, for so many seconds, and gives back the sound.
 * A thing is { at, play: id, step }, { at, moment }, { at, sound }, or { at, stop: true }.
 */
const render = (script, seconds) => page.evaluate(async ({ script, seconds, rate }) => {
  const { Music, Sfx, Bank } = window.Game;
  const off = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  // The code asks the context what time it is. An offline one says zero until it is rendered, so the time is told here.
  let t = 0;
  const ctx = {
    get currentTime() { return t; },
    sampleRate: rate,
    destination: off.destination,
    state: 'running',
    createGain: () => off.createGain(),
    createOscillator: () => off.createOscillator(),
    createBiquadFilter: () => off.createBiquadFilter(),
    createBufferSource: () => off.createBufferSource(),
    createBuffer: (c, l, r) => off.createBuffer(c, l, r),
    createDynamicsCompressor: () => off.createDynamicsCompressor(),
  };
  if (!window.theBank) {
    const raw = Uint8Array.from(atob(window.bank64), (c) => c.charCodeAt(0));
    const bank = new Bank();
    // Read as a game reads it: at the bank's own rate, by a context that is not the one played into.
    const reader = new OfflineAudioContext(1, 1, 32000);
    await bank.fill(raw.buffer, (mp3) => reader.decodeAudioData(mp3));
    if (bank.state !== 'ready') throw new Error('the bank could not be read');
    window.theBank = bank;
  }
  const sfx = new Sfx(() => ctx, window.theBank);
  sfx.unlock();
  // As loud as a new player has them: the effects at 0.8 and the music at 0.5 of full.
  sfx.setVolumes(0.8, 0.5);
  const music = new Music(() => sfx.out);
  const todo = [...script].sort((a, b) => a.at - b.at);
  for (let frame = 0; frame < seconds * 60; frame++) {
    t = frame / 60;
    while (todo.length && todo[0].at <= t) {
      const d = todo.shift();
      if (d.play) music.play(d.play, d.step ?? 0);
      if (d.moment) music.moment(d.moment);
      if (d.sound) sfx.play(d.sound);
      if (d.stop) music.stop();
    }
    music.update();
  }
  const buffer = await off.startRendering();
  const data = buffer.getChannelData(0);
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}, { script, seconds, rate: RATE });

// ------------------------------------------------------------ measuring

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -120);

/** What can be said of a sound without hearing it. `bpm` is what was written, to look for near. */
function measure(data, bpm, body = 0) {
  let peak = 0;
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
    sum += a * a;
  }
  const rms = Math.sqrt(sum / data.length);
  // The quietest and loudest two seconds.
  const win = RATE * 2;
  let quiet = Infinity;
  let loud = 0;
  // For a piece, only while it plays: what comes after its last note is silence by rights.
  const until = body ? Math.min(data.length, Math.floor(body * RATE)) : data.length;
  for (let i = 0; i + win <= until; i += RATE) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += data[j] * data[j];
    const r = Math.sqrt(s / win);
    quiet = Math.min(quiet, r);
    loud = Math.max(loud, r);
  }
  // Where the sound's weight lies: the spectrum, averaged over the whole.
  const N = 4096;
  const power = new Float64Array(N / 2);
  let frames = 0;
  for (let i = 0; i + N <= data.length; i += N) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let j = 0; j < N; j++) re[j] = data[i + j] * (0.5 - 0.5 * Math.cos((2 * Math.PI * j) / N));
    fft(re, im);
    for (let j = 0; j < N / 2; j++) power[j] += re[j] * re[j] + im[j] * im[j];
    frames++;
  }
  let all = 0;
  let low = 0;
  let high = 0;
  let weighted = 0;
  let strongestLow = 0;
  let strongestLowAt = 0;
  for (let j = 1; j < N / 2; j++) {
    const hz = (j * RATE) / N;
    all += power[j];
    weighted += power[j] * hz;
    if (hz < 200) low += power[j];
    if (hz > 2000) high += power[j];
    if (hz < 300 && power[j] > strongestLow) {
      strongestLow = power[j];
      strongestLowAt = hz;
    }
  }
  // Notes beginning: the loudness in hundredths of a second, and where it jumps.
  const hop = RATE / 100;
  const env = [];
  for (let i = 0; i + hop <= data.length; i += hop) {
    let s = 0;
    for (let j = i; j < i + hop; j++) s += data[j] * data[j];
    env.push(Math.sqrt(s / hop));
  }
  const rise = env.map((e, i) => (i ? Math.max(0, e - env[i - 1]) : 0));
  const mean = rise.reduce((a, b) => a + b, 0) / Math.max(1, rise.length);
  let onsets = 0;
  for (let i = 1; i < rise.length - 1; i++) if (rise[i] > mean * 4 && rise[i] >= rise[i - 1] && rise[i] > rise[i + 1]) onsets++;
  // The beat: how often the low end of the band comes round. Drums, the bass and the kettledrum are what keep time,
  // so the sound under 160 hertz is taken alone, and the time after which its loudness best repeats is looked for.
  let found = 0;
  if (bpm) {
    const k = Math.exp((-2 * Math.PI * 160) / RATE);
    let y = 0;
    const lowEnv = new Float64Array(env.length);
    for (let i = 0, e = 0; i + hop <= data.length; i += hop, e++) {
      let s = 0;
      for (let j = i; j < i + hop; j++) {
        y = y * k + data[j] * (1 - k);
        s += y * y;
      }
      lowEnv[e] = Math.sqrt(s / hop);
    }
    const lowRise = Array.from(lowEnv, (e, i) => (i ? Math.max(0, e - lowEnv[i - 1]) : 0));
    let best = -1;
    // From a third of a beat to two bars and a bit.
    const beat = (60 / bpm) * 100;
    for (let lag = Math.round(beat / 3.2); lag <= Math.round(beat * 8.5) && lag < lowRise.length / 2; lag++) {
      let s = 0;
      for (let i = lag; i < lowRise.length; i++) s += lowRise[i] * lowRise[i - lag];
      s /= lowRise.length - lag;
      if (s > best) {
        best = s;
        found = lag / 100;
      }
    }
  }
  return {
    seconds: data.length / RATE,
    peak,
    rms,
    quiet,
    loud,
    clipped,
    low: all ? low / all : 0,
    high: all ? high / all : 0,
    centroid: all ? weighted / all : 0,
    lowest: strongestLowAt,
    onsets: onsets / (data.length / RATE),
    repeat: found,
  };
}

const tmp = fs.mkdtempSync(path.join(root, 'build/.music-'));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

/** Writes a sound as OGG, small. */
function ogg(name, data) {
  const wav = path.join(tmp, 'a.wav');
  const bytes = Buffer.alloc(44 + data.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + data.length * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(wav, bytes);
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '3', path.join(out, name)]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
}

const lines = [];
const table = [];
async function make(name, says, script, seconds, bpm = 0, body = 0) {
  const b64 = await render(script, seconds);
  const buf = Buffer.from(b64, 'base64');
  const data = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  const m = measure(data, bpm, body);
  ogg(name, data);
  lines.push(`${name}\n    ${says}`);
  table.push({ name, ...m, written: bpm });
  console.log(`${name.padEnd(26)} ${m.seconds.toFixed(1).padStart(6)}s  rms ${db(m.rms).toFixed(1).padStart(6)} dB  quiet ${db(m.quiet).toFixed(1).padStart(6)}  loud ${db(m.loud).toFixed(1).padStart(6)}  peak ${m.peak.toFixed(2)}  clipped ${m.clipped}  low ${(m.low * 100).toFixed(0).padStart(3)}%  centroid ${m.centroid.toFixed(0).padStart(5)} Hz  jumps/s ${m.onsets.toFixed(1)}${bpm ? `  low end repeats every ${m.repeat.toFixed(2)} s = ${(m.repeat / (60 / bpm)).toFixed(2)} beats at the written ${bpm}` : ''}`);
  return m;
}

const { pieces, moments, sounds, notes, ranges } = await page.evaluate(() => {
  const G = window.Game;
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const note = (m) => `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  const ranges = {};
  for (const [id, piece] of Object.entries(G.PIECES)) {
    ranges[id] = [];
    for (let step = 0; step < G.stepsOf(piece); step++) {
      let lo = Infinity;
      let hi = -Infinity;
      let voices = 0;
      let begun = 0;
      for (const voice of piece.voices) {
        if (!G.plays(voice, step)) continue;
        voices++;
        const cells = G.cellsOf(piece, voice);
        cells.forEach((cell, slot) => {
          if (!cell) return;
          begun++;
          if (voice.on === 'drums' || voice.on === 'wind') return;
          for (const m of G.notesIn(piece, voice, Math.floor(slot / G.slotsOf(piece)), cell.text)) {
            lo = Math.min(lo, m);
            hi = Math.max(hi, m);
          }
        });
      }
      ranges[id].push({ lowest: note(lo), highest: note(hi), voices, begun });
    }
  }
  return {
    pieces: Object.fromEntries(Object.entries(G.PIECES).map(([id, p]) => [id, { says: p.says, bpm: p.bpm, seconds: p.bpm.map((_, s) => G.secondsOf(p, s)) }])),
    moments: Object.fromEntries(Object.entries(G.MOMENTS).map(([id, m]) => [id, m.says])),
    sounds: Object.keys(G.SOUNDS),
    notes: Object.keys(G.PIECES).map((id) => G.written(id)).join('\n\n'),
    ranges,
  };
});

const STEP_SAYS = { lair: ['before it wakes', 'while camp is set'] };
for (const [id, p] of Object.entries(pieces)) {
  for (let step = 0; step < p.bpm.length; step++) {
    if (quick && step > 0) continue;
    const what = p.bpm.length === 1 ? '' : STEP_SAYS[id] ? `, ${STEP_SAYS[id][step]}` : `, step ${step + 1} of ${p.bpm.length}`;
    // Once round, and a little for the last notes to ring out.
    await make(`music-${id}-${step + 1}.ogg`, `${p.says}${what ? ` Here${what}.` : ''} Once round.`, [{ at: 0, play: id, step }, { at: p.seconds[step] + 0.3, stop: true }], p.seconds[step] + 3, p.bpm[step], p.seconds[step]);
  }
}
for (const [id, says] of Object.entries(moments)) await make(`moment-${id}.ogg`, says, [{ at: 0.1, moment: id }], id === 'fall' ? 8 : id === 'lost' ? 8.5 : 4);

if (!quick) {
  await make('hunt-gravedigger.ogg', 'A whole hunt of the Gravedigger in two and a half minutes: the lair, the camp, it wakes, the dirge, the march, the stagger breaks, the last part, it falls.', [
    { at: 0, play: 'lair', step: 0 },
    { at: 16, play: 'lair', step: 1 },
    { at: 34, moment: 'wake' },
    { at: 34.9, play: 'sexton', step: 0 },
    { at: 68, play: 'sexton', step: 1 },
    { at: 98, moment: 'break' },
    { at: 104, play: 'sexton', step: 2 },
    { at: 134, moment: 'fall' },
  ], 143);
  await make('hunt-king.ogg', 'A hunt of the Antlered King that is lost, in a minute and a half: the lair, it wakes, the three steps with a break in the second, and the hunter falls.', [
    { at: 0, play: 'lair', step: 0 },
    { at: 12, moment: 'wake' },
    { at: 12.9, play: 'king', step: 0 },
    { at: 32, play: 'king', step: 1 },
    { at: 50, moment: 'break' },
    { at: 56, play: 'king', step: 2 },
    { at: 78, moment: 'lost' },
  ], 88);
  for (const name of sounds) await make(`sound-${name}.ogg`, `The effect "${name}", alone.`, [{ at: 0.05, sound: name }], 3.2);
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

const pad = (s, n) => String(s).padEnd(n);
const readme = [
  'The music of Boss Hunters, played to files by scripts/music.mjs from the game\'s own code (src/audio/music.ts).',
  'Nobody has listened to any of it. What is said of each file below is what was written and what was measured.',
  '',
  ...lines,
  '',
  'What each piece plays at each step (from the written notes):',
  ...Object.entries(ranges).flatMap(([id, steps]) => steps.map((r, i) => `  ${pad(`${id}, step ${i + 1}`, 18)} ${r.voices} voices, ${r.begun} notes begun a round, lowest ${r.lowest}, highest ${r.highest}, ${pieces[id].bpm[i]} beats a minute, ${pieces[id].seconds[i].toFixed(1)} s a round`)),
  '',
  'Measured (loudness in decibels under full scale; "low" is the share of the sound under 200 hertz):',
  `  ${pad('file', 26)} ${pad('seconds', 8)} ${pad('rms', 7)} ${pad('quietest 2s', 12)} ${pad('loudest 2s', 11)} ${pad('peak', 5)} ${pad('clipped', 8)} ${pad('low', 5)} ${pad('centroid', 9)} ${pad('jumps/s', 8)} the low end repeats every (in beats of the written tempo)`,
  ...table.map((m) => `  ${pad(m.name, 26)} ${pad(m.seconds.toFixed(1), 8)} ${pad(db(m.rms).toFixed(1), 7)} ${pad(db(m.quiet).toFixed(1), 12)} ${pad(db(m.loud).toFixed(1), 11)} ${pad(m.peak.toFixed(2), 5)} ${pad(m.clipped, 8)} ${pad(`${(m.low * 100).toFixed(0)}%`, 5)} ${pad(`${m.centroid.toFixed(0)} Hz`, 9)} ${pad(m.onsets.toFixed(1), 8)} ${m.written ? `${m.repeat.toFixed(2)} s (${(m.repeat / (60 / m.written)).toFixed(2)} beats at ${m.written})` : ''}`),
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'README.txt'), readme);
fs.writeFileSync(path.join(out, 'notes.txt'), `${notes}\n\nThe moments, in semitones from the root of whatever is playing:\n${Object.entries(moments).map(([id, says]) => `  ${id}: ${says}`).join('\n')}\n`);
fs.writeFileSync(path.join(out, 'measures.json'), JSON.stringify(table, null, 1));
console.log(`music: ${table.length} files in build/audio`);
