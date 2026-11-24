// node scripts/listen.mjs [url]
//
// Writes the game's music and a battle's worth of its effects to sound
// files, so that they can be listened to without playing, and measures how
// loud each is. Nothing here is a recording: the page's own music and
// effects (src/audio) are played into an offline audio context, as fast as
// the machine can go, and what comes out is saved as WAV.
//
// The files go to build/listen (OUT=... for somewhere else), which is not
// kept in the repository. It needs the dev server running (npm run dev):
// the page loads the game's own modules from it.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'build/listen';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(base);

/**
 * Plays a land's theme in a mood for some seconds, with or without a
 * battle's effects over it, and gives back the sound and how loud it was.
 */
const render = (what) => page.evaluate(async ({ land, mood, seconds, fight, musicVolume, effectsVolume }) => {
  const { Music } = await import('/src/audio/music.ts');
  const { Sfx } = await import('/src/audio/sfx.ts');
  const rate = 44100;
  const off = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  // The game asks the context what time it is. An offline one says zero until it is rendered, so the time is told here.
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
  const sfx = new Sfx(() => ctx);
  sfx.unlock();
  sfx.setVolumes(effectsVolume, musicVolume);
  const music = new Music(() => sfx.out);
  if (land) music.play(land, mood);
  // A battle as a crowded one sounds: blows, shots and skills from a dozen units, by a fixed pattern.
  const battle = ['slash', 'hit', 'shoot', 'thud', 'hit', 'slash', 'cast', 'hit', 'blast', 'heal', 'hit', 'shoot', 'thud', 'skill', 'bigHit', 'status', 'slash', 'hit', 'death'];
  let made = 0;
  let asked = 0;
  for (let frame = 0; frame < seconds * 60; frame++) {
    t = frame / 60;
    music.update();
    if (fight && t > 1) {
      // Three or four sounds asked for in a frame, most frames: more than a real fight asks.
      const n = frame % 3 === 0 ? 4 : frame % 3 === 1 ? 2 : 0;
      for (let i = 0; i < n; i++) {
        const before = t;
        sfx.play(battle[(frame * 7 + i * 5) % battle.length], 0.9, 0.9 + ((frame + i) % 5) * 0.05);
        asked++;
        void before;
      }
    }
    if (fight && frame === Math.floor((seconds - 3) * 60)) sfx.play('victory');
  }
  void made;
  const buffer = await off.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let over = 0;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]);
    if (v > peak) peak = v;
    if (v >= 1) over++;
    sum += data[i] * data[i];
  }
  // The loudest second, as well as the whole.
  let loudest = 0;
  for (let s = 0; s + rate <= data.length; s += rate) {
    let q = 0;
    for (let i = s; i < s + rate; i++) q += data[i] * data[i];
    loudest = Math.max(loudest, Math.sqrt(q / rate));
  }
  const db = (x) => (x > 0 ? Math.round(200 * Math.log10(x)) / 10 : -Infinity);
  // 16-bit WAV, as text the script outside can write to a file.
  const bytes = new Uint8Array(44 + data.length * 2);
  const view = new DataView(bytes.buffer);
  const put = (at, text) => { for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); put(8, 'WAVE'); put(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { wav: btoa(text), peak: db(peak), rms: db(Math.sqrt(sum / data.length)), loudest: db(loudest), clipped: over, asked };
}, what);

const lands = { meadow: 'thornwood', desert: 'sunscar', snow: 'frostholt' };
const rows = [];
const save = async (name, what) => {
  const r = await render({ musicVolume: 0.5, effectsVolume: 0.8, fight: false, ...what });
  fs.writeFileSync(`${out}/${name}.wav`, Buffer.from(r.wav, 'base64'));
  rows.push({ name, peak: r.peak, rms: r.rms, loudest: r.loudest, clipped: r.clipped });
  return r;
};
for (const [land, name] of Object.entries(lands)) {
  // Once round the theme calm, and half of it in a battle with nothing over it.
  await save(`${name}-calm`, { land, mood: 'calm', seconds: 48 });
  await save(`${name}-battle`, { land, mood: 'battle', seconds: 26 });
}
// A crowded fight over its music, as the game mixes them at the volumes a new player has; and the same with no music.
await save('battle-mix', { land: 'meadow', mood: 'battle', seconds: 20, fight: true });
await save('effects-only', { land: null, mood: 'calm', seconds: 12, fight: true });
// Everything at its loudest: both volumes all the way up.
await save('battle-mix-loudest', { land: 'desert', mood: 'battle', seconds: 20, fight: true, musicVolume: 1, effectsVolume: 1 });

console.log('decibels below full scale: the peak, the whole, and the loudest second; and samples at full scale');
for (const r of rows) console.log(`${r.name.padEnd(22)} peak ${String(r.peak).padStart(6)}  whole ${String(r.rms).padStart(6)}  loudest second ${String(r.loudest).padStart(6)}  clipped ${r.clipped}`);
await browser.close();
