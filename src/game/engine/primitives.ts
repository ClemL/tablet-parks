import type { GameState, LogEntry, Player, Resource, ResourceBag } from '../types';
import { RESOURCES } from '../types';

/** Small shared helpers: bags of resources, logging and spending. */

export function bag(b: ResourceBag): Required<ResourceBag> {
  return {
    sun: b.sun ?? 0,
    water: b.water ?? 0,
    forest: b.forest ?? 0,
    mountain: b.mountain ?? 0,
    wild: b.wild ?? 0,
  };
}

export function bagTotal(b: ResourceBag): number {
  return RESOURCES.reduce((sum, r) => sum + (b[r] ?? 0), 0);
}

export function tokenCount(player: Player): number {
  return bagTotal(player.resources);
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Resource names as they read in the log. */
export function label(r: Resource): string {
  return r === 'forest' ? 'tree' : r === 'wild' ? 'wildcard' : r;
}

export function spend(player: Player, resource: Resource, count = 1): boolean {
  if ((player.resources[resource] ?? 0) < count) return false;
  player.resources[resource] = (player.resources[resource] ?? 0) - count;
  return true;
}

export function log(
  state: GameState,
  player: number,
  text: string,
  extra: { delta?: ResourceBag; event?: LogEntry['event']; walk?: LogEntry['walk'] } = {},
): void {
  const last = state.log[state.log.length - 1];
  const id = (last?.id ?? state.log.length) + 1;
  const delta = extra.delta && RESOURCES.some((r) => (extra.delta![r] ?? 0) !== 0) ? extra.delta : undefined;
  state.log.push({
    id,
    season: state.season,
    player,
    text,
    ...(delta ? { delta } : {}),
    ...(extra.event ? { event: extra.event } : {}),
    ...(extra.walk ? { walk: extra.walk } : {}),
  });
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}

/** What a player's pack changed by since `before`, leaving out the resources that did not move. */
export function packDelta(before: ResourceBag, player: Player): ResourceBag {
  const delta: ResourceBag = {};
  for (const r of RESOURCES) {
    const n = (player.resources[r] ?? 0) - (before[r] ?? 0);
    if (n !== 0) delta[r] = n;
  }
  return delta;
}
