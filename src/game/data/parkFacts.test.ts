import { describe, expect, it } from 'vitest';
import { EXPANSION_PARKS, PARKS } from './parks';
import { PARK_FACTS } from './parkFacts';

describe('park facts', () => {
  const cards = [...PARKS, ...EXPANSION_PARKS];

  it('tells something about every park on the cards, and nothing about parks not on them', () => {
    for (const park of cards) expect(PARK_FACTS[park.id], park.id).toBeDefined();
    expect(Object.keys(PARK_FACTS).sort()).toEqual(cards.map((p) => p.id).sort());
  });

  it('places each park in the state its card names, and dates it sensibly', () => {
    for (const park of cards) {
      const fact = PARK_FACTS[park.id];
      expect(fact.states, park.id).toContain(park.state);
      expect(fact.year, park.id).toBeGreaterThanOrEqual(1872);
      expect(fact.year, park.id).toBeLessThanOrEqual(2026);
      if (fact.since) expect(fact.since.year, park.id).toBeLessThan(fact.year);
      expect(fact.fact.length, park.id).toBeLessThan(280);
    }
  });
});
