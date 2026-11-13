import { SITES, WILDLIFE_SITES } from '@/game/data/sites';
import type { Resource, SiteKind } from '@/game/types';

/*
 * The colour of a trail stop's enamel rim. A stop that pays out wears the
 * colour of what it pays, so a player can find the water or the trees on the
 * trail from across the table; the rest wear the colour of what kind of stop
 * they are. The colours are tokens (`--rim-*` in tokens.css), each measured
 * against the lettering that runs round it.
 */

export type Rim = Exclude<Resource, 'wild'> | 'trail' | 'end' | 'camera' | 'advanced' | 'wildlife';

export function siteRim(kind: SiteKind): Rim {
  if (kind === 'trailhead') return 'trail';
  if (kind === 'trail-end') return 'end';
  if (WILDLIFE_SITES.includes(kind)) return 'wildlife';
  const def = SITES[kind];
  if (def.tier === 'advanced') return 'advanced';
  // The resource it pays most of; a tie goes to the one the site names first.
  const paid = Object.entries(def.gain ?? {})
    .filter(([r, n]) => r !== 'wild' && (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  return paid ? (paid[0] as Rim) : 'camera';
}
