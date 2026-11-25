// The parts by name, as recipes ask for them: every head with how high it
// stands, every weapon with how it is used and where its far end is. A new
// part is drawn in the kit and given its line here.

import {
  ARCANE, BONE, CLOTH, FIRE, FROST, GOLD, HOLY, IRON, LEATHER, LINEN, RUBY, STEEL, STONE, VENOM, WOOD, type Accent, type Material,
} from '../kit/palette';
import {
  antlerMask, beater, bow, brazierStaff, brimHat, buckler, cape, censer, club, cowl, crestedHelm, crookLantern, crossbow, crownedHelm, crystalWand, dagger,
  faceWrap, flameHood, forgeMask, furHood, greatAxe, greatHammer, greatsword, halberd, handAxe, handbell, hood, hornedHelm, jarlHelm, javelin, kettleHelm,
  kiteShield, lampPole, nockedArrow, orbStaff, plume, pointedHood, quiver, ropeCoil, roundHelm, roundShield, sackHood, shovel, spangenhelm, spear,
  spikeHelm, stovepipe, sword, tailHood, totemStaff, tricorn, trumpet, turban, veilHat, warHorn, warhammer, wingedHelm, witchHat, book, drum,
} from '../kit/parts';
import {
  STRAW, antlerCrown, anvilHelm, bandana, barbute, beret, bicorne, boilerHelm, bucketHelm, bullHelm, capirote, cavalierHat, coif, crownCowl, crystalHelm, plumedHelm,
  featherCap, furCap, gearHelm, greatHelm, hounskull, jesterCap, maskHood, miningHelm, mitre, morion, mournVeil, mushroomCap, nemes, peltHood, raggedHood,
  sallet, shellHelm, strawCone, stumpHelm, sunDiscHelm, tailHelm, tallCrown, toque, towerHelm, wreathHood,
} from '../kit/heads';
import {
  anchor, arquebus, bomb, boomerang, boulder, branchStaff, broom, candelabra, cleaver, crook, crosier, cutlass, fishingRod, flail, flask, glaive, greatKey,
  hourglassStaff, khopesh, ladle, lantern, longbow, lute, mace, mallet, moonStaff, morningstar, net, oar, orbHand, pick, quarterstaff, rapier, rollingPin,
  runeTablet, saw, sceptre, scythe, shears, shellStaff, sickle, sling, sporeStaff, standard, sunStaff, tome, torch, trident, wand, whip, wrench,
} from '../kit/arms';
import {
  backBanner, backpack, barkShield, basket, boiler, furCloak, hawk, heater, hideShield, hookHand, javelins, keg, mug, pavise, potLid, sack, scroll, shellShield,
  slungShield, spikeShield, tornCape, towerShield,
} from '../kit/gear';
import type { Pt } from '../kit/path';
import type { PartSpec } from '../kit/unit';
import { clothOf, extra, off, type Arm, type Cloth, type Head } from './figure';

// ------------------------------------------------------------ heads

export const H = {
  round: (mat: Material = STEEL): Head => ({ top: 48, draw: (d) => roundHelm(d, mat) }),
  horned: (mat: Material = STEEL, horn: Material = BONE): Head => ({ top: 28, draw: (d) => hornedHelm(d, mat, horn) }),
  hood: (cloth: Cloth = 'team', tip = 10): Head => ({ top: 48, draw: (d, team) => hood(d, clothOf(cloth, team), tip) }),
  pointedHood: (cloth: Cloth = 'team'): Head => ({ top: 14, draw: (d, team) => pointedHood(d, clothOf(cloth, team)) }),
  cowl: (cloth: Cloth = 'team', trim: Material = GOLD, veil: Material = LINEN): Head => ({ top: 46, draw: (d, team) => cowl(d, clothOf(cloth, team), trim, veil) }),
  kettle: (mat: Material = STEEL, coif: Material = IRON): Head => ({ top: 46, draw: (d) => kettleHelm(d, mat, coif) }),
  winged: (mat: Material = STEEL, wing: Material = BONE): Head => ({ top: 24, draw: (d) => wingedHelm(d, mat, wing) }),
  wrap: (cloth: Cloth = 'team'): Head => ({ top: 48, draw: (d, team) => faceWrap(d, clothOf(cloth, team)) }),
  brim: (hat: Material = LEATHER, scarf: Cloth = 'team', band: Material = GOLD): Head => ({ top: 45, draw: (d, team) => brimHat(d, hat, clothOf(scarf, team), band) }),
  sack: (mat: Material = LINEN, rope: Material = WOOD): Head => ({ top: 30, draw: (d) => sackHood(d, mat, rope) }),
  antlerMask: (cloth: Cloth = 'team', glow: Accent = ARCANE): Head => ({ top: 22, draw: (d, team) => antlerMask(d, clothOf(cloth, team), glow) }),
  crowned: (mat: Material = IRON, crown: Material = GOLD): Head => ({ top: 32, draw: (d) => crownedHelm(d, mat, crown) }),
  turban: (cloth: Cloth = 'team', veil: Material = LINEN): Head => ({ top: 38, draw: (d, team) => turban(d, clothOf(cloth, team), veil) }),
  spike: (cloth: Cloth = 'team', mat: Material = STEEL): Head => ({ top: 22, draw: (d, team) => spikeHelm(d, clothOf(cloth, team), mat) }),
  flame: (cloth: Cloth = 'team', glow: Accent = FIRE): Head => ({ top: 18, draw: (d, team) => flameHood(d, clothOf(cloth, team), glow) }),
  spangen: (mat: Material = STEEL, mail: Material = IRON): Head => ({ top: 40, draw: (d) => spangenhelm(d, mat, mail) }),
  furHood: (cloth: Cloth = 'team', fur: Material = BONE): Head => ({ top: 44, draw: (d, team) => furHood(d, clothOf(cloth, team), fur) }),
  witch: (cloth: Cloth = 'team', band: Material = GOLD, scarf: Material = LINEN): Head => ({ top: 12, draw: (d, team) => witchHat(d, clothOf(cloth, team), band, scarf) }),
  jarl: (mat: Material = IRON, horn: Material = BONE, crown: Material = GOLD): Head => ({ top: 34, draw: (d) => jarlHelm(d, mat, horn, crown) }),
  stovepipe: (hat: Material, scarf: Cloth = 'team', band: Material = GOLD): Head => ({ top: 20, draw: (d, team) => stovepipe(d, hat, clothOf(scarf, team), band) }),
  veilHat: (hat: Material, veil: Material = LINEN, band: Material = LEATHER): Head => ({ top: 46, draw: (d) => veilHat(d, hat, veil, band) }),
  tricorn: (hat: Material, scarf: Cloth = 'team', trim: Material = GOLD): Head => ({ top: 38, draw: (d, team) => tricorn(d, hat, clothOf(scarf, team), trim) }),
  crested: (crest: Cloth = 'team', mat: Material = STEEL, trim: Material = GOLD): Head => ({ top: 14, draw: (d, team) => crestedHelm(d, clothOf(crest, team), mat, trim) }),
  forgeMask: (mat: Material = IRON, strap: Material = LEATHER): Head => ({ top: 52, draw: (d) => forgeMask(d, mat, strap) }),
  tailHood: (cloth: Cloth = 'team'): Head => ({ top: 46, draw: (d, team) => tailHood(d, clothOf(cloth, team)) }),

  // kit/heads.ts
  sallet: (mat: Material = STEEL): Head => ({ top: 48, draw: (d) => sallet(d, mat) }),
  barbute: (mat: Material = STEEL): Head => ({ top: 34, draw: (d) => barbute(d, mat) }),
  greatHelm: (mat: Material = STEEL, trim: Material = GOLD): Head => ({ top: 50, draw: (d) => greatHelm(d, mat, trim) }),
  hounskull: (mat: Material = STEEL): Head => ({ top: 46, draw: (d) => hounskull(d, mat) }),
  morion: (scarf: Cloth = 'team', mat: Material = STEEL): Head => ({ top: 32, draw: (d, team) => morion(d, clothOf(scarf, team), mat) }),
  tailHelm: (hair: Cloth = 'team', mat: Material = STEEL, guard: Material = LEATHER): Head => ({ top: 24, draw: (d, team) => tailHelm(d, clothOf(hair, team), mat, guard) }),
  bull: (mat: Material = IRON, horn: Material = BONE): Head => ({ top: 34, draw: (d) => bullHelm(d, mat, horn) }),
  tower: (mat?: Material): Head => ({ top: 34, draw: (d) => towerHelm(d, mat) }),
  anvil: (mat: Material = IRON, trim: Material = GOLD): Head => ({ top: 42, draw: (d) => anvilHelm(d, mat, trim) }),
  gear: (mat: Material, wheel: Material = GOLD): Head => ({ top: 28, draw: (d) => gearHelm(d, mat, wheel) }),
  boiler: (mat: Material, pipe: Material = IRON): Head => ({ top: 22, draw: (d) => boilerHelm(d, mat, pipe) }),
  mining: (cloth: Cloth = 'team', mat: Material = IRON, glow: Accent = FIRE): Head => ({ top: 28, draw: (d, team) => miningHelm(d, clothOf(cloth, team), mat, glow) }),
  shell: (shell: Material = BONE): Head => ({ top: 22, draw: (d) => shellHelm(d, shell) }),
  bucket: (mat: Material = WOOD, hoop: Material = IRON): Head => ({ top: 34, draw: (d) => bucketHelm(d, mat, hoop) }),
  stump: (bark: Material = WOOD, leaf?: Material): Head => ({ top: 14, draw: (d) => stumpHelm(d, bark, leaf) }),
  pelt: (fur: Material, round = false): Head => ({ top: round ? 38 : 32, draw: (d) => peltHood(d, fur, round) }),
  ragged: (cloth: Cloth = 'team'): Head => ({ top: 50, draw: (d, team) => raggedHood(d, clothOf(cloth, team)) }),
  capirote: (cloth: Cloth = 'team'): Head => ({ top: 2, draw: (d, team) => capirote(d, clothOf(cloth, team)) }),
  maskHood: (cloth: Cloth = 'team', mask: Material = BONE): Head => ({ top: 50, draw: (d, team) => maskHood(d, clothOf(cloth, team), mask) }),
  mournVeil: (veil: Cloth = 'team', circlet: Material = GOLD, stone?: Material): Head => ({ top: 48, draw: (d, team) => mournVeil(d, clothOf(veil, team), circlet, stone) }),
  wreath: (cloth: Cloth = 'team', leaf?: Material): Head => ({ top: 44, draw: (d, team) => wreathHood(d, clothOf(cloth, team), leaf) }),
  bandana: (cap: Cloth = 'team', scarf: Cloth = LINEN): Head => ({ top: 47, draw: (d, team) => bandana(d, clothOf(cap, team), clothOf(scarf, team)) }),
  nemes: (cloth: Cloth = 'team', band: Material = GOLD, veil: Material = LINEN): Head => ({ top: 44, draw: (d, team) => nemes(d, clothOf(cloth, team), band, veil) }),
  strawCone: (scarf: Cloth = 'team', hat: Material = STRAW): Head => ({ top: 36, draw: (d, team) => strawCone(d, clothOf(scarf, team), hat) }),
  mushroom: (cap: Material, scarf: Cloth = LINEN, spot: Material = BONE): Head => ({ top: 29, draw: (d, team) => mushroomCap(d, cap, clothOf(scarf, team), spot) }),
  bicorne: (hat: Material, scarf: Cloth = 'team', trim: Material = GOLD): Head => ({ top: 35, draw: (d, team) => bicorne(d, hat, clothOf(scarf, team), trim) }),
  cavalier: (hat: Material, feather: Cloth = 'team', scarf: Cloth = LINEN, band: Material = GOLD): Head => ({
    top: 26, draw: (d, team) => cavalierHat(d, hat, clothOf(feather, team), clothOf(scarf, team), band),
  }),
  beret: (cap: Cloth = 'team', scarf: Cloth = LINEN, band: Material = GOLD): Head => ({ top: 38, draw: (d, team) => beret(d, clothOf(cap, team), clothOf(scarf, team), band) }),
  toque: (scarf: Cloth = 'team', mat: Material = BONE): Head => ({ top: 14, draw: (d, team) => toque(d, clothOf(scarf, team), mat) }),
  featherCap: (cap: Cloth = 'team', scarf: Cloth = LINEN, feather: Material = BONE): Head => ({ top: 20, draw: (d, team) => featherCap(d, clothOf(cap, team), clothOf(scarf, team), feather) }),
  furCap: (fur: Material, scarf: Cloth = 'team'): Head => ({ top: 40, draw: (d, team) => furCap(d, fur, clothOf(scarf, team)) }),
  jester: (a: Cloth = 'team', b: Material = GOLD, scarf: Cloth = LINEN): Head => ({ top: 28, draw: (d, team) => jesterCap(d, clothOf(a, team), b, clothOf(scarf, team)) }),
  plumed: (feather: Cloth = 'team', mat: Material = STEEL, trim: Material = GOLD): Head => ({ top: 6, draw: (d, team) => plumedHelm(d, clothOf(feather, team), mat, trim) }),
  antlerCrown: (cowl: Cloth = 'team', antler: Material = BONE, leaf?: Material, veil: Material = LINEN): Head => ({
    top: 6, draw: (d, team) => antlerCrown(d, clothOf(cowl, team), antler, leaf, veil),
  }),
  tallCrown: (veil: Cloth = 'team', crown: Material = GOLD, stone?: Material): Head => ({ top: 16, draw: (d, team) => tallCrown(d, clothOf(veil, team), crown, stone) }),
  sunDisc: (mat: Material = GOLD, disc: Material = GOLD): Head => ({ top: 12, draw: (d) => sunDiscHelm(d, mat, disc) }),
  mitre: (cloth: Cloth = 'team', scarf: Cloth = LINEN, trim: Material = GOLD): Head => ({ top: 8, draw: (d, team) => mitre(d, clothOf(cloth, team), clothOf(scarf, team), trim) }),
  crownCowl: (cloth: Cloth = 'team', crown: Material = GOLD, veil: Material = LINEN): Head => ({ top: 30, draw: (d, team) => crownCowl(d, clothOf(cloth, team), crown, veil) }),
  coif: (mail: Material = IRON, band: Material = STEEL): Head => ({ top: 50, draw: (d) => coif(d, mail, band) }),
  crystal: (glow: Accent = FROST, mat: Material = IRON): Head => ({ top: 8, draw: (d) => crystalHelm(d, glow, mat) }),
};

// ------------------------------------------------------------ what the main hand holds

export const W = {
  sword: (len = 60, hand: Material = LEATHER): Arm => ({ style: 'slash', tip: [0, -len], draw: (d, g) => sword(d, g, len, hand) }),
  greatsword: (len = 96, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [0, -len], draw: (d, g) => greatsword(d, g, len, hand) }),
  greatAxe: (len = 78, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [22, -len + 10], draw: (d, g) => greatAxe(d, g, len, hand) }),
  handAxe: (len = 52, hand: Material = LEATHER): Arm => ({ style: 'slash', tip: [18, -len + 8], draw: (d, g) => handAxe(d, g, len, hand) }),
  warhammer: (len = 56, hand: Material = LEATHER): Arm => ({ style: 'slash', tip: [0, -len - 6], draw: (d, g) => warhammer(d, g, len, hand) }),
  greatHammer: (len = 80, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [0, -len - 6], draw: (d, g) => greatHammer(d, g, len, hand) }),
  club: (len = 74, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [0, -len], draw: (d, g) => club(d, g, len, hand) }),
  dagger: (len = 34, hand: Material = LEATHER): Arm => ({ style: 'thrust', tip: [0, -len], draw: (d, g) => dagger(d, g, len, hand) }),
  spear: (len = 78, pennant: Cloth | null = null, hand: Material = LEATHER): Arm => ({
    style: 'thrust', tip: [0, -len - 28], draw: (d, g, team) => spear(d, g, len, hand, pennant ? clothOf(pennant, team) : null),
  }),
  halberd: (len = 90, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [0, -len - 30], draw: (d, g, team) => halberd(d, g, CLOTH[team], len, hand) }),
  javelin: (len = 46, barbed = false, hand: Material = LEATHER): Arm => ({ style: 'throw', tip: [0, -len - 22], draw: (d, g) => javelin(d, g, len, hand, barbed) }),
  bow: (hand: Material = LEATHER): Arm => ({ style: 'bow', tip: [16, 0], draw: (d, g) => bow(d, g, hand) }),
  crossbow: (hand: Material = LEATHER): Arm => ({ style: 'shoot', tip: [0, -54], draw: (d, g) => crossbow(d, g, hand) }),
  orbStaff: (glow: Accent = ARCANE, len = 74, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [0, -len - 10], draw: (d, g) => orbStaff(d, g, glow, len, hand) }),
  brazierStaff: (glow: Accent = FIRE, len = 70, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [0, -len - 20], draw: (d, g) => brazierStaff(d, g, glow, len, hand) }),
  totemStaff: (glow: Accent, len = 70, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [0, -len - 16], draw: (d, g) => totemStaff(d, g, glow, len, hand) }),
  crystalWand: (glow: Accent, len = 50, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [0, -len - 18], draw: (d, g) => crystalWand(d, g, glow, len, hand) }),
  censer: (glow: Accent, drop = 24, hand: Material = LEATHER): Arm => ({ style: 'swing', tip: [0, drop + 12], draw: (d, g) => censer(d, g, glow, drop, hand) }),
  crookLantern: (glow: Accent = FIRE, len = 66, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [22, -len + 20], draw: (d, g) => crookLantern(d, g, glow, len, hand) }),
  lampPole: (glow: Accent = FIRE, len = 84, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [5, -len - 16], draw: (d, g) => lampPole(d, g, glow, len, hand) }),
  trumpet: (len = 60, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [0, -len - 15], draw: (d, g, team) => trumpet(d, g, CLOTH[team], len, hand) }),
  warHorn: (len = 46, hand: Material = LEATHER): Arm => ({ style: 'cast', tip: [28, -len - 13], draw: (d, g) => warHorn(d, g, len, hand) }),
  beater: (len = 30, hand: Material = LEATHER): Arm => ({ style: 'slash', tip: [0, -len - 5], draw: (d, g) => beater(d, g, len, hand) }),
  shovel: (len = 68, hand: Material = LEATHER): Arm => ({ style: 'chop', tip: [0, -len - 30], draw: (d, g) => shovel(d, g, len, hand) }),
  handbell: (drop = 8, hand: Material = LEATHER): Arm => ({ style: 'swing', tip: [0, drop + 40], draw: (d, g) => handbell(d, g, drop, hand) }),

  // kit/arms.ts
  mace: (len = 48, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 8], draw: (d, g) => mace(d, g, len, hand) }),
  morningstar: (len = 52, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 10], draw: (d, g) => morningstar(d, g, len, hand) }),
  flail: (len = 34, hand?: Material): Arm => ({ style: 'slash', tip: [22, -len - 34], draw: (d, g) => flail(d, g, len, hand) }),
  cutlass: (len = 54, hand?: Material): Arm => ({ style: 'slash', tip: [-12, -len], draw: (d, g) => cutlass(d, g, len, hand) }),
  khopesh: (len = 54, mat: Material = GOLD, hand?: Material): Arm => ({ style: 'slash', tip: [16, -len], draw: (d, g) => khopesh(d, g, len, hand, mat) }),
  rapier: (len = 72, hand?: Material): Arm => ({ style: 'thrust', tip: [0, -len], draw: (d, g) => rapier(d, g, len, hand) }),
  cleaver: (len = 42, hand?: Material): Arm => ({ style: 'slash', tip: [10, -len], draw: (d, g) => cleaver(d, g, len, hand) }),
  sickle: (len = 22, hand?: Material): Arm => ({ style: 'slash', tip: [20, -len - 24], draw: (d, g) => sickle(d, g, len, hand) }),
  pick: (len = 58, two = false, hand?: Material): Arm => ({ style: 'chop', tip: [22, -len + 4], draw: (d, g) => pick(d, g, len, two, hand) }),
  torch: (glow: Accent = FIRE, len = 38, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 18], draw: (d, g) => torch(d, g, glow, len, hand) }),
  whip: (hand?: Material): Arm => ({ style: 'slash', tip: [36, -30], draw: (d, g) => whip(d, g, hand) }),
  wrench: (len = 46, mat: Material = IRON, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 8], draw: (d, g) => wrench(d, g, len, hand, mat) }),
  greatKey: (len = 56, mat: Material = GOLD, hand?: Material): Arm => ({ style: 'slash', tip: [10, -len + 8], draw: (d, g) => greatKey(d, g, len, hand, mat) }),
  ladle: (len = 46, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len], draw: (d, g) => ladle(d, g, len, hand) }),
  rollingPin: (hand?: Material): Arm => ({ style: 'slash', tip: [0, -44], draw: (d, g) => rollingPin(d, g, hand) }),
  shears: (len = 46, hand?: Material): Arm => ({ style: 'thrust', tip: [0, -len], draw: (d, g) => shears(d, g, len, hand) }),
  saw: (len = 54, hand?: Material): Arm => ({ style: 'slash', tip: [4, -len], draw: (d, g) => saw(d, g, len, hand) }),
  mallet: (len = 46, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 6], draw: (d, g) => mallet(d, g, len, hand) }),
  crook: (len = 78, mat: Material = WOOD, hand?: Material): Arm => ({ style: 'slash', tip: [12, -len - 16], draw: (d, g) => crook(d, g, len, hand, mat) }),
  fishingRod: (len = 84, hand?: Material): Arm => ({ style: 'slash', tip: [26, -len + 42], draw: (d, g) => fishingRod(d, g, len, hand) }),
  trident: (len = 76, mat: Material = STEEL, hand?: Material): Arm => ({ style: 'thrust', tip: [0, -len - 30], draw: (d, g) => trident(d, g, len, mat, hand) }),
  scythe: (len = 84, hand?: Material): Arm => ({ style: 'chop', tip: [40, -len], draw: (d, g) => scythe(d, g, len, hand) }),
  glaive: (len = 78, hand?: Material): Arm => ({ style: 'chop', tip: [6, -len - 44], draw: (d, g) => glaive(d, g, len, hand) }),
  anchor: (len = 62, hand?: Material): Arm => ({ style: 'chop', tip: [0, -len - 12], draw: (d, g) => anchor(d, g, len, hand) }),
  oar: (len = 78, hand?: Material): Arm => ({ style: 'chop', tip: [0, -len - 40], draw: (d, g) => oar(d, g, len, hand) }),
  broom: (len = 70, hand?: Material): Arm => ({ style: 'slash', tip: [0, -len - 34], draw: (d, g) => broom(d, g, len, hand) }),
  quarterstaff: (len = 70, hand?: Material): Arm => ({ style: 'chop', tip: [0, -len], draw: (d, g) => quarterstaff(d, g, len, hand) }),
  standard: (len = 92, hand?: Material, mark: Material = GOLD): Arm => ({ style: 'cast', tip: [0, -len - 14], draw: (d, g, team) => standard(d, g, CLOTH[team], len, hand, mark) }),
  longbow: (hand?: Material): Arm => ({ style: 'bow', tip: [16, 0], draw: (d, g) => longbow(d, g, hand) }),
  arquebus: (len = 62, hand?: Material): Arm => ({ style: 'shoot', tip: [0, -len], draw: (d, g) => arquebus(d, g, len, hand) }),
  sling: (hand?: Material): Arm => ({ style: 'throw', tip: [11, -44], draw: (d, g) => sling(d, g, hand) }),
  bomb: (glow: Accent = FIRE, r = 12, hand?: Material): Arm => ({ style: 'throw', tip: [0, -r - 2], draw: (d, g) => bomb(d, g, glow, r, hand) }),
  flask: (glow: Accent = VENOM, hand?: Material): Arm => ({ style: 'throw', tip: [0, -18], draw: (d, g) => flask(d, g, glow, hand) }),
  net: (hand?: Material): Arm => ({ style: 'throw', tip: [0, -30], draw: (d, g) => net(d, g, hand) }),
  boulder: (mat: Material = STONE, r = 19, hand?: Material): Arm => ({ style: 'throw', tip: [0, -r - 4], draw: (d, g) => boulder(d, g, mat, r, hand) }),
  boomerang: (hand?: Material): Arm => ({ style: 'throw', tip: [14, -36], draw: (d, g) => boomerang(d, g, hand) }),
  throwingAxe: (len = 44, hand?: Material): Arm => ({ style: 'throw', tip: [16, -len + 8], draw: (d, g) => handAxe(d, g, len, hand) }),
  tome: (glow: Accent = ARCANE, cover: Cloth = 'team', hand?: Material): Arm => ({ style: 'cast', tip: [0, -30], draw: (d, g, team) => tome(d, g, clothOf(cover, team), glow, hand) }),
  sceptre: (stone: Material = RUBY, len = 44, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 12], draw: (d, g) => sceptre(d, g, stone, len, hand) }),
  crosier: (stone: Material = RUBY, len = 78, hand?: Material): Arm => ({ style: 'cast', tip: [13, -len - 12], draw: (d, g) => crosier(d, g, stone, len, hand) }),
  sunStaff: (glow: Accent = HOLY, len = 70, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 14], draw: (d, g) => sunStaff(d, g, glow, len, hand) }),
  moonStaff: (glow: Accent = FROST, len = 70, hand?: Material): Arm => ({ style: 'cast', tip: [8, -len - 17], draw: (d, g) => moonStaff(d, g, glow, len, hand) }),
  shellStaff: (glow: Accent = FROST, len = 68, hand?: Material): Arm => ({ style: 'cast', tip: [2, -len - 16], draw: (d, g) => shellStaff(d, g, glow, len, hand) }),
  branchStaff: (glow: Accent = VENOM, len = 68, leaf?: Material, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 20], draw: (d, g) => branchStaff(d, g, glow, len, leaf, hand) }),
  sporeStaff: (glow: Accent = VENOM, cap: Material = RUBY, len = 66, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 18], draw: (d, g) => sporeStaff(d, g, glow, cap, len, hand) }),
  hourglassStaff: (glow: Accent = ARCANE, len = 66, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 18], draw: (d, g) => hourglassStaff(d, g, glow, len, hand) }),
  candelabra: (glow: Accent = FIRE, len = 40, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 34], draw: (d, g) => candelabra(d, g, glow, len, hand) }),
  wand: (glow: Accent = ARCANE, len = 34, hand?: Material): Arm => ({ style: 'cast', tip: [0, -len - 8], draw: (d, g) => wand(d, g, glow, len, hand) }),
  orbHand: (glow: Accent = ARCANE, r = 11, hand?: Material): Arm => ({ style: 'cast', tip: [0, -24], draw: (d, g) => orbHand(d, g, glow, r, hand) }),
  runeTablet: (glow: Accent = HOLY, hand?: Material): Arm => ({ style: 'cast', tip: [0, -28], draw: (d, g) => runeTablet(d, g, glow, hand) }),
  lute: (hand?: Material): Arm => ({ style: 'cast', tip: [0, -30], draw: (d, g) => lute(d, g, hand) }),
  lantern: (glow: Accent = FIRE, hand?: Material): Arm => ({ style: 'swing', tip: [0, 24], draw: (d, g) => lantern(d, g, glow, hand) }),
};

// ------------------------------------------------------------ what the other hand holds

export const O = {
  buckler: (at: Pt, r = 16, mat: Material = STEEL): PartSpec => off(at, (d, x, y) => buckler(d, x, y, r, mat), 'shield'),
  roundShield: (at: Pt, r = 25): PartSpec => off(at, (d, x, y) => roundShield(d, x, y, r), 'shield'),
  kite: (at: Pt, mat: Material = STEEL, trim: Material = GOLD): PartSpec => off(at, (d, x, y) => kiteShield(d, x, y, mat, trim), 'shield'),
  book: (at: Pt, cover: Cloth = 'team'): PartSpec => off(at, (d, x, y, team) => book(d, x, y, clothOf(cover, team)), 'book'),
  rope: (at: Pt): PartSpec => off(at, (d, x, y) => ropeCoil(d, x, y + 14), 'rope'),
  drum: (at: Pt, r = 22): PartSpec => off(at, (d, x, y, team) => drum(d, x, y, CLOTH[team], r), 'drum'),
  /** The hand that draws a bow, with an arrow across it. It goes over the bow. */
  arrow: (at: Pt = [118, 128]): PartSpec => off(at, (d, x, y) => nockedArrow(d, x, y), 'draw-hand'),
  /** A second blade, held back and low. */
  knife: (at: Pt = [74, 134], len = 32): PartSpec => off(at, (d, x, y) => dagger(d, { hand: [x, y], angle: -118 }, len), 'knife-back'),

  // kit/gear.ts
  tower: (at: Pt = [74, 138], mat: Material = STEEL, trim: Material = GOLD): PartSpec => off(at, (d, x, y) => towerShield(d, x, y, mat, trim), 'shield'),
  pavise: (at: Pt = [74, 138], mat: Material = WOOD): PartSpec => off(at, (d, x, y) => pavise(d, x, y, mat), 'shield'),
  heater: (at: Pt = [74, 140], mat: Material = STEEL, trim: Material = GOLD): PartSpec => off(at, (d, x, y) => heater(d, x, y, mat, trim), 'shield'),
  spike: (at: Pt = [78, 140], r = 22, mat: Material = IRON): PartSpec => off(at, (d, x, y) => spikeShield(d, x, y, r, mat), 'shield'),
  hide: (at: Pt = [76, 138], mat: Material = BONE, band: Material = LEATHER): PartSpec => off(at, (d, x, y) => hideShield(d, x, y, mat, band), 'shield'),
  shell: (at: Pt = [76, 140], mat?: Material): PartSpec => off(at, (d, x, y) => shellShield(d, x, y, mat), 'shield'),
  bark: (at: Pt = [76, 138], mat: Material = WOOD, leaf?: Material): PartSpec => off(at, (d, x, y) => barkShield(d, x, y, mat, leaf), 'shield'),
  potLid: (at: Pt = [80, 138], mat: Material = IRON): PartSpec => off(at, (d, x, y) => potLid(d, x, y, mat), 'lid'),
  hawk: (at: Pt = [74, 128], feather: Material = STONE): PartSpec => off(at, (d, x, y) => hawk(d, x, y, feather), 'hawk'),
  keg: (at: Pt = [76, 144]): PartSpec => off(at, (d, x, y) => keg(d, x, y), 'keg'),
  sack: (at: Pt = [70, 124], mat: Material = LINEN): PartSpec => off(at, (d, x, y) => sack(d, x, y, mat), 'sack'),
  scroll: (at: Pt = [76, 136], tie: Cloth = 'team'): PartSpec => off(at, (d, x, y, team) => scroll(d, x, y, clothOf(tie, team)), 'scroll'),
  mug: (at: Pt = [78, 132]): PartSpec => off(at, (d, x, y) => mug(d, x, y), 'mug'),
  hook: (at: Pt = [76, 138]): PartSpec => off(at, (d, x, y) => hookHand(d, x, y), 'hook'),
  /** Anything the main hand could hold, held in the other: a second sword, a lantern, a torch. */
  held: (arm: Arm, at: Pt, angle: number, name = 'off'): PartSpec => off(at, (d, x, y, team) => arm.draw(d, { hand: [x, y], angle }, team), name),
};

// ------------------------------------------------------------ what is on the back and on the head

export const X = {
  cape: (cloth: Cloth = 'team', sway = 0.6): PartSpec => extra('cape', [94, 106], (d, team) => cape(d, clothOf(cloth, team)), sway),
  quiver: (): PartSpec => extra('quiver', [74, 150], (d) => quiver(d), 0.5),
  plume: (cloth: Cloth = 'team', base: Pt = [99, 54]): PartSpec => extra('plume', base, (d, team) => plume(d, clothOf(cloth, team), base), 1, 'head'),

  // kit/gear.ts
  banner: (cloth: Cloth = 'team', mark: Material = GOLD): PartSpec => extra('banner', [72, 128], (d, team) => backBanner(d, clothOf(cloth, team), mark), 0.8),
  pack: (mat: Material = LEATHER, roll: Material = LINEN): PartSpec => extra('pack', [70, 112], (d) => backpack(d, mat, roll), 0.3),
  boiler: (mat: Material, pipe: Material = IRON): PartSpec => extra('boiler', [70, 112], (d) => boiler(d, mat, pipe), 0.2),
  basket: (load?: Material): PartSpec => extra('basket', [70, 112], (d) => basket(d, load), 0.3),
  slung: (mat: Material = WOOD, rim: Material = IRON): PartSpec => extra('slung', [78, 112], (d) => slungShield(d, mat, rim), 0.3),
  javelins: (): PartSpec => extra('javelins', [70, 124], (d) => javelins(d), 0.4),
  furCloak: (fur: Material): PartSpec => extra('cloak', [94, 106], (d) => furCloak(d, fur), 0.5),
  tornCape: (cloth: Cloth = 'team'): PartSpec => extra('cape', [94, 106], (d, team) => tornCape(d, clothOf(cloth, team)), 0.7),
};

// ------------------------------------------------------------ how things are usually held

/** Where the hand is and how far the thing leans, for the usual ways of holding one. */
export const HOLD = {
  /** A weapon for one hand, forward and up. */
  one: [128, 134, 28],
  /** A heavy thing in two hands, low. */
  low: [122, 142, 24],
  /** A spear, levelled. */
  level: [116, 138, 76],
  /** A staff, upright at the side. */
  staff: [130, 138, 7],
  /** Something held up to throw or to show. */
  up: [128, 112, 20],
  bow: [134, 128, 0],
  gun: [120, 131, 86],
  /** A tall pole, leaning a little forward. */
  tall: [128, 138, 12],
} as const satisfies Record<string, readonly [number, number, number]>;
