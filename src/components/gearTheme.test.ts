import { describe, expect, it } from 'vitest';
import { GEAR } from '@/game/data/gear';
import { POKEMON } from '@/room/names';
import { GEAR_POKEMON, gearName, gearPokemon } from './gearTheme';

describe('Pokémon gear at REI', () => {
  it('gives every gear card an owner the pawns can draw, and a name that says whose it is', () => {
    for (const card of GEAR) {
      const theme = GEAR_POKEMON[card.id];
      expect(theme, card.id).toBeDefined();
      expect(POKEMON).toContain(theme.pokemon);
      expect(theme.name.startsWith(`${theme.pokemon}’s `)).toBe(true);
    }
    expect(Object.keys(GEAR_POKEMON).sort()).toEqual(GEAR.map((g) => g.id).sort());
  });

  it('keeps the plain names when the table turns the theme off, and falls back to Ditto', () => {
    const filter = GEAR.find((g) => g.id === 'filter')!;
    expect(gearName(filter, true)).toBe('Squirtle’s Water Filter');
    expect(gearName(filter, false)).toBe('Water Filter');
    expect(gearPokemon({ id: 'something-new' })).toBe('Ditto');
    expect(gearName({ id: 'something-new', name: 'Compass' }, true)).toBe('Ditto’s Compass');
  });
});
