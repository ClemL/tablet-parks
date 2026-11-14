import { describe, expect, it } from 'vitest';
import { PARKS } from '@/game/data/parks';
import type { LogEntry } from '@/game/types';
import { seasonRecap } from './seasonRecap';

const entry = (player: number, text: string, extra: Partial<LogEntry> = {}): LogEntry => ({ season: 1, player, text, ...extra });

describe('the season recap', () => {
  it('reads each player’s visits, photos and gains for the season from the log', () => {
    const park = PARKS[0];
    const log: LogEntry[] = [
      entry(0, `visited ${park.name} for ${park.vp} VP`, { delta: { water: -2 } }),
      entry(0, 'moved to Valley and gained 2 water', { delta: { water: 2 } }),
      entry(1, 'took a photo for 1 sun', { delta: { sun: -1 } }),
      entry(1, 'moved to Ridge and gained 1 mountain', { delta: { mountain: 1 } }),
      // Another season, and the table's own lines, do not count.
      entry(0, 'moved to Woodland and gained 1 tree', { season: 2, delta: { forest: 1 } }),
      entry(-1, 'Season 1 is over.'),
    ];
    const [kris, srini] = seasonRecap(log, 1, 2);
    expect(kris.visited.map((p) => p.id)).toEqual([park.id]);
    expect(kris.collected).toEqual({ water: 2 });
    expect(kris.photos).toBe(0);
    expect(srini.photos).toBe(1);
    expect(srini.collected).toEqual({ mountain: 1 });
  });

  it('gives a player with nothing to show an empty row rather than leaving them out', () => {
    expect(seasonRecap([], 1, 3)).toHaveLength(3);
  });
});
