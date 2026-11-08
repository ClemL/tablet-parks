import { CPU_SEATS } from '@/game/engine';

/**
 * Twenty well-known first-generation Pokémon, each with a head that takes a
 * ranger's hat. Every seat wears one as its pawn; a person who joins without
 * typing a name is called after theirs. The computers' stock names are in
 * here too, so a computer's pawn is the Pokémon it is named after.
 */
export const POKEMON = [
  'Pikachu',
  'Eevee',
  'Charizard',
  'Snorlax',
  'Bulbasaur',
  'Charmander',
  'Squirtle',
  'Jigglypuff',
  'Meowth',
  'Psyduck',
  'Gengar',
  'Clefairy',
  'Vulpix',
  'Slowpoke',
  'Mew',
  'Mewtwo',
  'Ditto',
  'Growlithe',
  'Dragonite',
  'Diglett',
] as const;

export type Pokemon = (typeof POKEMON)[number];

const STOCK = new Set(CPU_SEATS.map((c) => c.name.toLowerCase()));
const BY_LOWER = new Map<string, Pokemon>(POKEMON.map((n) => [n.toLowerCase(), n]));

/** The Pokémon a name or avatar spells, in its proper case, or null. */
export function asPokemon(name: string | null | undefined): Pokemon | null {
  return BY_LOWER.get(String(name ?? '').trim().toLowerCase()) ?? null;
}

export function isPokemon(name: string): boolean {
  return asPokemon(name) !== null;
}

/** A cheap integer mix, so each seat's picks look unrelated without exposing the seed itself. */
function mix(seed: number, salt: number): number {
  let h = Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function lowered(taken: Iterable<string | null | undefined>): Set<string> {
  return new Set([...taken].flatMap((n) => (n ? [n.trim().toLowerCase()] : [])));
}

/**
 * A Pokémon nobody at the table is using, for a seat's name or pawn. The
 * computers' stock names are left for the computers, so a person never takes
 * the Pokémon a computer filling an open seat would be called. Only when
 * every other one is in use does a stock one come up.
 */
export function pickPokemon(seed: number, seat: number, taken: Iterable<string | null | undefined>): Pokemon {
  const used = lowered(taken);
  const pool = POKEMON.filter((n) => !STOCK.has(n.toLowerCase()));
  const start = mix(seed, seat) % pool.length;
  for (let step = 0; step < pool.length; step++) {
    const name = pool[(start + step) % pool.length];
    if (!used.has(name.toLowerCase())) return name;
  }
  return POKEMON.find((n) => !used.has(n.toLowerCase())) ?? pool[start];
}

/**
 * The next Pokémon after `current` in the list that nobody else wears,
 * wrapping round — what the phone's cycle button hands out. Returns `current`
 * when every other one is taken.
 */
export function nextPokemon(current: string | null, taken: Iterable<string | null | undefined>, step: 1 | -1 = 1): Pokemon | null {
  const used = lowered(taken);
  const at = current ? POKEMON.findIndex((n) => n.toLowerCase() === current.trim().toLowerCase()) : -1;
  for (let i = 1; i <= POKEMON.length; i++) {
    const name = POKEMON[(((at + step * i) % POKEMON.length) + POKEMON.length) % POKEMON.length];
    if (!used.has(name.toLowerCase())) return name;
  }
  return asPokemon(current);
}

/**
 * What a seat calls its two hikers: its Pokémon, one ♂ and one ♀ — which is
 * which is the seed's call — so the pair on the board stays tellable apart.
 * A seat with no Pokémon yet keeps Hiker 1 and Hiker 2.
 */
export function hikerNames(pokemon: string, seed: number, seat: number): [string, string] {
  const name = asPokemon(pokemon);
  if (!name) return ['Hiker 1', 'Hiker 2'];
  const male = `${name} ♂`;
  const female = `${name} ♀`;
  return mix(seed, seat + 101) & 1 ? [female, male] : [male, female];
}
