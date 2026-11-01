import { effectiveCost, planPayment, wildCoverage } from '@/game/engine';
import type { GameState, ParkCard, Player, Resource } from '@/game/types';
import { COST_RESOURCES } from '@/game/types';

export interface CostLine {
  r: Resource;
  need: number;
  have: number;
  /** Covered by matching tokens, by wildcards, or not at all. */
  status: 'have' | 'wild' | 'short';
}

/**
 * Each resource a park asks for against what the player holds, and whether
 * wildcards close the gap — the same check on the tablet's shop and on the
 * buyer's phone.
 */
export function costCheck(state: GameState, player: Player, park: ParkCard): CostLine[] {
  const cost = effectiveCost(player, park, state);
  const covered = planPayment(player, cost, wildCoverage(state)) !== null;
  return COST_RESOURCES.filter((r) => cost[r] > 0).map((r) => {
    const need = cost[r];
    const have = player.resources[r] ?? 0;
    return { r, need, have, status: have >= need ? 'have' : covered ? 'wild' : 'short' };
  });
}
