import type { GameState } from './types';
import { clone } from './engine/primitives';

/**
 * What a redacted view dropped, so the board can still show counts for cards it
 * is no longer allowed to name.
 */
export interface RedactedInfo {
  /** Cards left in the park deck, whose order the view no longer carries. */
  parkDeckCount: number;
  /** Parks each seat has reserved, for the seats whose cards are hidden. */
  reservedCount: number[];
  /** Seats whose whole sheet — resources, kit, parks — this view leaves out. */
  hiddenSheets: boolean[];
  /** The seat this view belongs to, or null for the table's view. */
  seat: number | null;
}

/** A game state with another player's secrets taken out of it. */
export type GameView = GameState & { redacted: RedactedInfo };

/** Stand-in for a bonus card you are not allowed to read. */
export const HIDDEN_BONUS = 'hidden';

export interface ViewPolicy {
  /**
   * Seats whose sheet this viewer may not read at all. Resources are public in
   * the published game, but at this table a person's sheet lives on their own
   * phone, and the table chooses whether the others may look.
   */
  hideSheets?: readonly number[];
  /** Seats whose reserved parks this viewer may read, besides its own. */
  revealReserved?: readonly number[];
}

/**
 * Builds the state a single device is allowed to see.
 *
 * Always out: the park deck's order, the RNG cursor that would predict it, the
 * other seats' bonus cards and the parks they have reserved. The counts stay,
 * because the board has to keep showing "59 in the deck" and "Ada holds 2
 * reservations". Once the game is over the scoreboard reveals everything, so
 * only the deck is still withheld.
 *
 * `seat` is the player this view is for; `null` builds the table's view, which
 * holds no bonus cards at all.
 */
export function viewFor(state: GameState, seat: number | null, policy: ViewPolicy = {}): GameView {
  const view = clone(state) as GameView;
  const over = state.phase === 'game-over';
  const hide = new Set(over ? [] : (policy.hideSheets ?? []).filter((s) => s !== seat));
  const reveal = new Set(policy.revealReserved ?? []);

  view.redacted = {
    parkDeckCount: state.parkDeck.length,
    reservedCount: state.players.map((p) => p.reserved.length),
    hiddenSheets: state.players.map((p) => hide.has(p.index)),
    seat,
  };

  view.parkDeck = [];
  view.gearDeck = [];
  view.bottleDeck = [];
  view.rng = 0;
  // Seasons to come stay face down: their cards, and the advanced sites still to join.
  view.seasonDeck = state.seasonDeck.filter((card) => card.season <= state.season);
  view.advancedOrder = state.advancedOrder.slice(0, state.season);

  for (const player of view.players) {
    if (over || player.index === seat) continue;
    player.bonusCards = player.bonusCards.map(() => HIDDEN_BONUS);
    if (!reveal.has(player.index)) player.reserved = [];
    if (hide.has(player.index)) {
      player.resources = {};
      player.waterThisTurn = 0;
      player.bottles = [];
      player.campfires = 0;
      player.photos = 0;
      player.gear = [];
      player.parks = [];
      player.claimedInSeason = [];
      player.reserved = [];
    }
  }

  return view;
}

/** Cards left in the park deck, whether the state is a full one or a view. */
export function parkDeckLeft(state: GameState): number {
  const redacted = (state as GameView).redacted;
  return redacted ? redacted.parkDeckCount : state.parkDeck.length;
}

/** How many parks a seat has reserved, counting the ones a view cannot name. */
export function reservedCount(state: GameState, seat: number): number {
  const redacted = (state as GameView).redacted;
  return redacted ? redacted.reservedCount[seat] : state.players[seat].reserved.length;
}

/** True when this view leaves a seat's sheet out entirely. */
export function sheetHidden(state: GameState, seat: number): boolean {
  return (state as GameView).redacted?.hiddenSheets[seat] ?? false;
}
