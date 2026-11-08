import { describe, expect, it } from 'vitest';
import { EXPANSION_PARKS, PARKS } from '@/game/data/parks';
import { isDrawnPokemon } from '@/art/pokemon';
import { parkVisitor } from './ParkPoster';

describe('the Pokémon visiting each park', () => {
  const cards = [...PARKS, ...EXPANSION_PARKS];

  it('is one the pawns can draw, the same every time for a park', () => {
    for (const park of cards) {
      const visitor = parkVisitor(park);
      expect(isDrawnPokemon(visitor), park.id).toBe(true);
      expect(parkVisitor(park)).toBe(visitor);
    }
  });

  it('suits the park and varies across parks of a kind', () => {
    const watery = cards.filter((p) => p.tags[0] === 'water').map(parkVisitor);
    expect(watery.every((v) => ['Squirtle', 'Psyduck', 'Poliwag', 'Marill', 'Piplup', 'Mudkip', 'Slowpoke'].includes(v))).toBe(true);
    expect(new Set(cards.map(parkVisitor)).size).toBeGreaterThan(8);
  });
});
