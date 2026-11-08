import { describe, expect, it } from 'vitest';
import { GEAR } from '@/game/data/gear';
import { hasGearArt } from './gear';

describe('the gear illustrations', () => {
  it('draw every card REI sells, so no card falls back to an emoji', () => {
    for (const card of GEAR) expect(hasGearArt(card.id), card.id).toBe(true);
  });
});
