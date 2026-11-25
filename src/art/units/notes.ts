// What each unit is for, beside its drawing: the set it belongs to, the part
// it plays, and how it is told from every other. A game reads this to pick
// units for a land or a list; the roster sheet groups by it; and writing a
// unit's line here is the first step of drawing it: if the line cannot be
// written, the unit has no silhouette yet.
//
// A unit made from a recipe (figure.ts) writes its own line as it is made.
// The first cast was drawn before recipes were, so its lines are at the foot
// of this file.

/** The part a unit was drawn to play. A game may use it otherwise. */
export type UnitRole = 'melee' | 'ranged' | 'caster' | 'support' | 'captain' | 'boss' | 'beast' | 'mounted' | 'engine' | 'building' | 'trap';

export interface UnitNote {
  /** The set it was drawn for: a land, a people, a trade. */
  set: string;
  role: UnitRole;
  /** Read it by: its head, what it holds, what else. */
  read: string;
}

export const UNIT_NOTES: Record<string, UnitNote> = {};

/** Writes a unit's line. Twice for one unit is a mistake in the art, and stops the build. */
export function note(id: string, set: string, role: UnitRole, read: string): void {
  if (UNIT_NOTES[id]) throw new Error(`art: two units are called "${id}"`);
  UNIT_NOTES[id] = { set, role, read };
}

// The first cast: the units Legion Battles began with.
const FIRST: readonly [string, string, UnitRole, string][] = [
  ['militia', 'Crownlands', 'melee', 'the wide brim of a kettle hat, a long spear held level'],
  ['archer', 'Crownlands', 'ranged', 'a deep hood with its point at the back, a bow held out, a quiver'],
  ['knight', 'Crownlands', 'melee', 'a round closed helm with a plume, a big round shield, a short sword'],
  ['cleric', 'Crownlands', 'support', 'a round cowl with a veil, a wide mantle, a censer on its chain, a book'],
  ['berserker', 'Crownlands', 'melee', 'two great horns, fur over the shoulders, an axe as long as it is tall'],
  ['mage', 'Crownlands', 'caster', 'a tall hood bent at its point, a long robe, a staff with a glowing orb'],
  ['paladin', 'Crownlands', 'captain', 'wings on the helm, a kite shield, a cape, a hammer'],
  ['herald', 'Crownlands', 'support', 'a gold helm, a long horn raised with a cloth hung from it'],
  ['cutpurse', 'Thornwood Raiders', 'melee', 'a wrapped head with its knot trailing, a knife in each hand'],
  ['poacher', 'Thornwood Raiders', 'ranged', 'a broad hat over a scarf, a crossbow held out level'],
  ['bruiser', 'Thornwood Raiders', 'melee', 'a sack over its head with the corners up, a club over its shoulder'],
  ['hexer', 'Thornwood Raiders', 'caster', 'antlers over a wooden mask, a carved post with a green charm'],
  ['ringleader', 'Thornwood Raiders', 'support', 'a leather hood, a long coat, a lantern swung on a crook'],
  ['warlord', 'Thornwood Raiders', 'boss', 'a crown on a black helm, a cape, a sword as long as it is tall'],
  ['lancer', 'Sandsworn', 'melee', 'a great turban, a long lance with a pennant, a sash behind'],
  ['javelineer', 'Sandsworn', 'ranged', 'a spike on the helm with cloth hung from it, a javelin held up to throw'],
  ['ballista', 'Sandsworn', 'engine', 'two wheels, a great bow on a beam, a pennant'],
  ['pyromancer', 'Sandsworn', 'caster', 'a hood cut into flames, a staff with a bowl of fire on it'],
  ['drummer', 'Sandsworn', 'support', 'a pale turban, a great drum slung in front, a beater raised over it'],
  ['colossus', 'Sandsworn', 'boss', 'a golem of sandstone under a crust of pale sand, a sun sign in its chest'],
  ['huscarl', 'Frostbound', 'melee', 'a banded helm with mail hung from it, fur, a great round shield, a bearded axe'],
  ['harpooner', 'Frostbound', 'ranged', 'a ruff of fur round a dark hood, a barbed harpoon, a coil of rope'],
  ['icegolem', 'Frostbound', 'melee', 'a golem of blue ice under snow, shards on its shoulders'],
  ['frostwitch', 'Frostbound', 'caster', 'a broad hat with a bent point, a crystal as big as her head'],
  ['skald', 'Frostbound', 'support', 'a fur hood in its side\'s color, a great curved horn held up to it'],
  ['jarl', 'Frostbound', 'boss', 'ram\'s horns curled beside a crowned helm, a cape, a hammer with a head like an anvil'],
  ['beekeeper', 'Faithful', 'ranged', 'a wide straw hat with a veil to the shoulders, a hive carried on one hand'],
  ['gravedigger', 'Faithful', 'melee', 'a hood with a long tail down the back, a shovel carried like an axe'],
  ['bellringer', 'Faithful', 'support', 'a three-cornered hat, a short cape, a great bell swung from one hand'],
  ['blacksmith', 'Faithful', 'melee', 'a flat mask of plate, an apron, a hammer, a billet glowing in its tongs'],
  ['lamplighter', 'Faithful', 'caster', 'a hat as tall as its head, a long coat, a pole with a flame at its tip'],
  ['honorguard', 'Faithful', 'captain', 'a crest from brow to nape, a mantle, a halberd taller than it is'],
  ['palisade', 'Crownlands', 'building', 'a wall of pointed stakes bound together, a ribbon on one'],
  ['watchtower', 'Crownlands', 'building', 'a timber tower with a walled top, one slit, a roof in its side\'s color'],
  ['barracks', 'Crownlands', 'building', 'a hall of stone with one door, a roof in its side\'s color, a shield over the door'],
  ['warbanner', 'Crownlands', 'building', 'a great banner hung from a crossbar on a stone foot'],
  ['spiketrap', 'Crownlands', 'trap', 'an iron plate with its spikes up'],
  ['beartrap', 'Crownlands', 'trap', 'a toothed iron ring on a chain, a plate in its middle'],
  ['lookout', 'Thornwood Raiders', 'building', 'a crow\'s nest on one pole, a ladder up it'],
  ['raidertent', 'Thornwood Raiders', 'building', 'a patched tent, its flap open on the dark'],
  ['bramblesnare', 'Thornwood Raiders', 'trap', 'a ring of thorn wound on the ground'],
  ['sunobelisk', 'Sandsworn', 'building', 'a pillar of sandstone with fire held over it'],
  ['wartent', 'Sandsworn', 'building', 'a round striped pavilion with a gold finial'],
  ['firepit', 'Sandsworn', 'trap', 'a pit of coals ringed with stones'],
  ['frostspire', 'Frostbound', 'building', 'shards of ice standing as one spire, cold held over them'],
  ['longhouse', 'Frostbound', 'building', 'a low hall under a steep roof heavy with snow, its beams crossed at the peak'],
  ['frostrune', 'Frostbound', 'trap', 'a slab of ice with a sign cut in it'],
];
for (const [id, set, role, read] of FIRST) note(id, set, role, read);
