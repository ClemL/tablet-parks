import { PARKS } from '@/game/data/parks';
import type { LogEntry, ParkCard, ResourceBag } from '@/game/types';
import { RESOURCES } from '@/game/types';

/*
 * How a season went for each player, read from the public log alone: the
 * tablet's view hides a player's sheet between their turns, but every visit,
 * photo and token gained was announced to the table as it happened, so this
 * tells nobody anything they could not have read on the board.
 */

export interface SeasonRecap {
  player: number;
  visited: ParkCard[];
  collected: ResourceBag;
  photos: number;
}

const BY_NAME = new Map(PARKS.map((park) => [park.name, park]));

export function seasonRecap(log: readonly LogEntry[], season: number, players: number): SeasonRecap[] {
  const rows: SeasonRecap[] = Array.from({ length: players }, (_, player) => ({ player, visited: [], collected: {}, photos: 0 }));
  for (const entry of log) {
    if (entry.season !== season || entry.player < 0 || entry.player >= players) continue;
    const row = rows[entry.player];
    const visit = /^visited (.+) for \d+ VP/.exec(entry.text);
    const park = visit ? BY_NAME.get(visit[1]) : undefined;
    if (park) row.visited.push(park);
    if (entry.text.startsWith('took a photo')) row.photos += 1;
    for (const r of RESOURCES) {
      const n = entry.delta?.[r] ?? 0;
      if (n > 0) row.collected[r] = (row.collected[r] ?? 0) + n;
    }
  }
  return rows;
}
