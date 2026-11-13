import { describe, expect, it } from 'vitest';
import { SITES, WILDLIFE_SITES } from '@/game/data/sites';
import type { SiteKind } from '@/game/types';
import { siteRim } from './siteRim';

describe('a trail stop’s rim', () => {
  it('wears what the stop pays', () => {
    expect(siteRim('valley')).toBe('water');
    expect(siteRim('basin')).toBe('sun');
    expect(siteRim('forest')).toBe('forest');
    expect(siteRim('mountain')).toBe('mountain');
    // One of each: the first the site names.
    expect(siteRim('waterfall')).toBe('water');
  });

  it('marks the ends, the advanced stops and the Wildlife ones apart', () => {
    expect(siteRim('trailhead')).toBe('trail');
    expect(siteRim('trail-end')).toBe('end');
    expect(siteRim('adv-park')).toBe('advanced');
    for (const kind of WILDLIFE_SITES) expect(siteRim(kind)).toBe('wildlife');
    expect(siteRim('camera')).toBe('camera');
  });

  it('gives every site a rim', () => {
    for (const kind of Object.keys(SITES) as SiteKind[]) expect(siteRim(kind)).toMatch(/^[a-z]+$/);
  });
});
