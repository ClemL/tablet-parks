import { CPU_SEATS } from '@/game/engine';

/**
 * Well-known first-generation Pokémon, handed out to people who join without
 * typing a name. The computers' stock names are in here too, so a person who
 * takes a seat over from Pikachu still counts as wearing a Pokémon name.
 */
export const POKEMON: readonly string[] = [
  'Bulbasaur',
  'Charmander',
  'Squirtle',
  'Pikachu',
  'Eevee',
  'Charizard',
  'Snorlax',
  'Jigglypuff',
  'Meowth',
  'Psyduck',
  'Gengar',
  'Mewtwo',
  'Mew',
  'Gyarados',
  'Lapras',
  'Dragonite',
  'Machamp',
  'Alakazam',
  'Vaporeon',
  'Jolteon',
  'Flareon',
  'Blastoise',
  'Venusaur',
  'Arcanine',
  'Vulpix',
  'Slowpoke',
  'Magikarp',
  'Onix',
  'Cubone',
  'Ditto',
  'Clefairy',
  'Raichu',
  'Butterfree',
  'Growlithe',
  'Scyther',
  'Articuno',
  'Zapdos',
  'Moltres',
];

const STOCK = new Set(CPU_SEATS.map((c) => c.name.toLowerCase()));
const KNOWN = new Set(POKEMON.map((n) => n.toLowerCase()));

export function isPokemon(name: string): boolean {
  return KNOWN.has(name.trim().toLowerCase());
}

/** A cheap integer mix, so each seat's picks look unrelated without exposing the seed itself. */
function mix(seed: number, salt: number): number {
  let h = Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b9)) >>> 0, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * A Pokémon name nobody at the table is using. The computers' stock names are
 * left for the computers, so an unnamed person never collides with the CPU
 * that later fills an open seat.
 */
export function pickPokemon(seed: number, seat: number, taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.trim().toLowerCase()));
  const pool = POKEMON.filter((n) => !STOCK.has(n.toLowerCase()));
  const start = mix(seed, seat) % pool.length;
  for (let step = 0; step < pool.length; step++) {
    const name = pool[(start + step) % pool.length];
    if (!used.has(name.toLowerCase())) return name;
  }
  return pool[start];
}

/**
 * What a seat calls its two hikers. A Pokémon gets one ♂ and one ♀ — which is
 * which is the seed's call — so the pair stays tellable apart; anyone else
 * keeps Hiker 1 and Hiker 2.
 */
export function hikerNames(name: string, seed: number, seat: number): [string, string] {
  if (!isPokemon(name)) return ['Hiker 1', 'Hiker 2'];
  const male = `${name.trim()} ♂`;
  const female = `${name.trim()} ♀`;
  return mix(seed, seat + 101) & 1 ? [female, male] : [male, female];
}
