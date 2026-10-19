import { describe, expect, it } from 'vitest';
import { aiAction } from '@/game/ai';
import { legalMoves } from '@/game/engine';
import { BONUS_CARDS } from '@/game/data/bonuses';
import { HIDDEN_BONUS } from '@/game/view';
import type { GameAction, GameState } from '@/game/types';
import {
  PACE_MS,
  RoomError,
  actorOf,
  changeSettings,
  cleanName,
  drain,
  freeSeat,
  joinSeat,
  leaveSeat,
  newRoom,
  nextSeason,
  normalizeSettings,
  playFor,
  seatTags,
  seatView,
  startGame,
  tableView,
  type Room,
} from './room';

const DB = { source: 'memory' as const, label: 'test', expires: null };
const T0 = 1_000_000;

function lobby(seats = 4, seed = 42): Room {
  return newRoom('ABCDE', normalizeSettings({ seats }), DB, T0, seed);
}

/** What a person would do: ask the AI, as if the seat were a computer's. */
function humanChoice(state: GameState, seat: number): GameAction {
  const asCpu = structuredClone(state);
  asCpu.players[seat].isHuman = false;
  asCpu.players[seat].personality = 'collector';
  const action = aiAction(asCpu);
  if (!action) throw new Error('no choice');
  return action;
}

/**
 * Plays a room to the end on a simulated clock: the computers through drain,
 * the people through the tablet, the seasons turned by the tablet.
 */
function playOut(room: Room, start = T0): { room: Room; now: number } {
  let now = start;
  for (let guard = 0; guard < 20_000 && room.phase === 'playing'; guard++) {
    const state = room.state!;
    if (state.phase === 'season-end' && room.seats.some((s) => s.kind === 'human')) {
      nextSeason(room, now);
      continue;
    }
    const actor = actorOf(state);
    if (actor !== null && state.players[actor].isHuman) {
      playFor(room, actor, humanChoice(state, actor), now);
      continue;
    }
    now += 250;
    drain(room, now);
  }
  return { room, now };
}

describe('settings', () => {
  it('clamps the seat count and keeps only known values', () => {
    expect(normalizeSettings({ seats: 9 }).seats).toBe(5);
    expect(normalizeSettings({ seats: 1 }).seats).toBe(2);
    expect(normalizeSettings({ seats: Number.NaN }).seats).toBe(4);
    const odd = normalizeSettings({ pace: 'ludicrous' as never, peek: 'everything' as never });
    expect(odd.pace).toBe('normal');
    expect(odd.peek).toBe('cpu');
  });

  it('defaults to four seats, both expansions, and phones that only peek at the computers', () => {
    const settings = normalizeSettings(undefined);
    expect(settings.seats).toBe(4);
    expect(settings.expansions).toEqual({ nightfall: true, wildlife: true });
    expect(settings.peek).toBe('cpu');
  });

  it('grows and shrinks the lobby, but never out from under a seated person', () => {
    const room = lobby(4);
    changeSettings(room, { seats: 5 });
    expect(room.seats).toHaveLength(5);
    joinSeat(room, 4, 'phone', 'Kris');
    expect(() => changeSettings(room, { seats: 4 })).toThrow(RoomError);
    leaveSeat(room, 4);
    changeSettings(room, { seats: 3 });
    expect(room.seats).toHaveLength(3);
  });

  it('only lets the pace and the peek rule change once the game is dealt', () => {
    const room = lobby(4);
    startGame(room, T0);
    changeSettings(room, { seats: 2, pace: 'brisk', peek: 'all', expansions: { nightfall: false, wildlife: false } });
    expect(room.seats).toHaveLength(4);
    expect(room.settings.pace).toBe('brisk');
    expect(room.settings.peek).toBe('all');
    expect(room.settings.expansions.nightfall).toBe(true);
  });

  it('cleans names typed on a phone', () => {
    expect(cleanName('  <b>Kris</b>\n ')).toBe('bKris/b');
    expect(cleanName('a'.repeat(40))).toHaveLength(16);
  });
});

describe('seats', () => {
  it('fills every open seat with a differently named computer at the deal', () => {
    const room = lobby(4);
    joinSeat(room, 0, 'phone-0', 'Srini');
    joinSeat(room, 2, 'phone-2', 'Teja');
    startGame(room, T0);
    expect(room.seats.map((s) => s.kind)).toEqual(['human', 'cpu', 'human', 'cpu']);
    const names = room.state!.players.map((p) => p.name);
    expect(names[0]).toBe('Srini');
    expect(names[2]).toBe('Teja');
    expect(new Set(names).size).toBe(4);
    expect(room.state!.players[1].isHuman).toBe(false);
    expect(room.state!.players[1].personality).toBeDefined();
    expect(room.state!.players[0].isHuman).toBe(true);
  });

  it('lets a second scan take a seat over from the first phone', () => {
    const room = lobby(2);
    joinSeat(room, 1, 'first', 'Kris');
    joinSeat(room, 1, 'second', '');
    expect(room.seats[1].device).toBe('second');
    // An empty name on the second phone keeps the one already there.
    expect(room.seats[1].name).toBe('Kris');
  });

  it('hands a computer seat to a phone mid-game, and back again', () => {
    const room = lobby(3);
    startGame(room, T0);
    expect(room.seats[1].kind).toBe('cpu');
    joinSeat(room, 1, 'late', 'Parth');
    expect(room.state!.players[1].isHuman).toBe(true);
    expect(room.state!.players[1].name).toBe('Parth');

    freeSeat(room, 1, T0 + 10);
    expect(room.seats[1].kind).toBe('cpu');
    expect(room.state!.players[1].isHuman).toBe(false);
  });

  it('keeps a seat human when its phone leaves mid-game: the tablet still plays it', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'p', 'James');
    startGame(room, T0);
    leaveSeat(room, 0);
    expect(room.seats[0].kind).toBe('human');
    expect(room.seats[0].device).toBeNull();
  });

  it('gives every pawn a distinct tag', () => {
    expect(seatTags(['Kris', 'Srini', 'Steven', 'Sherman'])).toEqual(['K', 'SR', 'ST', 'SH']);
    expect(seatTags(['Ann', 'Ann'])).toEqual(['A1', 'A2']);
    expect(seatTags(['', '🙂'])).toEqual(['?1', '?2']);
  });
});

describe('the computer on the clock', () => {
  it('waits a beat before each move, and plays nothing early', () => {
    const room = lobby(2);
    startGame(room, T0);
    expect(room.seats.every((s) => s.kind === 'cpu')).toBe(true);
    const pace = PACE_MS.normal;
    expect(room.cpuDueAt).toBe(T0 + pace);

    expect(drain(room, T0 + pace - 1)).toBe(false);
    expect(room.state!.log).toHaveLength(1);
    expect(drain(room, T0 + pace)).toBe(true);
    expect(room.state!.log.length).toBeGreaterThan(1);
  });

  it('catches up on every step that came due while nobody was looking', () => {
    const room = lobby(2);
    startGame(room, T0);
    drain(room, T0 + PACE_MS.normal);
    const after = room.state!.log.length;
    const fresh = lobby(2);
    startGame(fresh, T0);
    drain(fresh, T0 + PACE_MS.normal * 6);
    expect(fresh.state!.log.length).toBeGreaterThan(after);
  });

  it('stops for a person, and starts again once they have moved', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'phone', 'Thanh');
    startGame(room, T0);
    expect(actorOf(room.state!)).toBe(0);
    expect(room.cpuDueAt).toBe(0);
    expect(drain(room, T0 + 60_000)).toBe(false);

    const move = legalMoves(room.state!)[0];
    playFor(room, 0, { type: 'move', ...move }, T0 + 5);
    // Unless the move opened a decision, the computer is now due.
    if (actorOf(room.state!) === 1) expect(room.cpuDueAt).toBeGreaterThan(T0 + 5);
  });

  it('plays a table of computers through all four seasons on its own', () => {
    const room = lobby(4, 7);
    startGame(room, T0);
    const { room: done } = playOut(room);
    expect(done.phase).toBe('over');
    expect(done.state!.phase).toBe('game-over');
    expect(done.state!.season).toBe(4);
    expect(done.state!.finalScores).toHaveLength(4);
    expect(done.cpuDueAt).toBe(0);
  });

  it('finishes mixed tables of every size, with the tablet playing the people', () => {
    for (const seats of [2, 3, 4, 5]) {
      for (const seed of [1, 2, 3]) {
        const room = lobby(seats, seed * 97 + seats);
        joinSeat(room, 0, 'a', 'Kris');
        if (seats > 2) joinSeat(room, 2, 'b', 'Srini');
        startGame(room, T0);
        const { room: done } = playOut(room);
        expect(done.phase, `${seats} seats, seed ${seed}`).toBe('over');
        const scores = done.state!.finalScores!;
        expect(scores).toHaveLength(seats);
        expect(scores.every((s) => Number.isFinite(s.total))).toBe(true);
      }
    }
  });
});

describe('moves from the tablet', () => {
  function seated(): Room {
    const room = lobby(3);
    joinSeat(room, 0, 'phone', 'Kris');
    startGame(room, T0);
    return room;
  }

  it('refuses a move for a seat that is not on the clock', () => {
    const room = seated();
    const move = legalMoves(room.state!)[0];
    expect(() => playFor(room, 1, { type: 'move', ...move }, T0)).toThrow(/not that seat/);
  });

  it('refuses to play for a computer seat', () => {
    const room = lobby(2);
    startGame(room, T0);
    const move = legalMoves(room.state!)[0];
    expect(() => playFor(room, 0, { type: 'move', ...move }, T0)).toThrow(/computer/);
  });

  it('refuses an illegal move rather than silently doing nothing', () => {
    const room = seated();
    expect(() => playFor(room, 0, { type: 'move', hikerId: 'p0h0', to: 0 }, T0)).toThrow(/not allowed/);
    expect(() => playFor(room, 0, { type: 'move', hikerId: 'p1h0', to: 2 }, T0)).toThrow(/not allowed/);
    expect(() => playFor(room, 0, { type: 'end-season' }, T0)).toThrow(/not allowed/);
    expect(() => playFor(room, 0, { type: 'drop-table' } as unknown as GameAction, T0)).toThrow(/Not a move/);
  });

  it('turns the season only at the season break', () => {
    const room = seated();
    expect(() => nextSeason(room, T0)).toThrow(/still running/);
  });
});

describe('what each device is sent', () => {
  /** A game part-way through, with a person in seats 0 and 2 and computers in 1 and 3. */
  function midGame(peek: 'cpu' | 'all' = 'cpu'): Room {
    const room = newRoom('ABCDE', normalizeSettings({ seats: 4, peek }), DB, T0, 11);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 2, 'b', 'Srini');
    startGame(room, T0);
    let now = T0;
    for (let i = 0; i < 400 && room.state!.season < 2; i++) {
      const actor = actorOf(room.state!);
      if (room.state!.phase === 'season-end') nextSeason(room, now);
      else if (actor !== null && room.state!.players[actor].isHuman) playFor(room, actor, humanChoice(room.state!, actor), now);
      else drain(room, (now += 2000));
    }
    expect(room.state!.season).toBe(2);
    return room;
  }

  const bonusIds = (room: Room, seat: number) => room.state!.players[seat].bonusCards;

  it('gives the tablet nobody’s bonus cards, the deck order or the seed', () => {
    const room = midGame();
    const view = tableView(room, T0, []);
    const json = JSON.stringify(view);
    for (const player of room.state!.players) {
      for (const id of player.bonusCards) expect(json).not.toContain(`"${id}"`);
    }
    expect(view.game!.players.every((p) => p.bonusCards.every((c) => c === HIDDEN_BONUS))).toBe(true);
    expect(view.game!.parkDeck).toEqual([]);
    expect(view.game!.rng).toBe(0);
    expect(json).not.toContain('"seed"');
  });

  it('shows a phone its own bonus cards and nobody else’s', () => {
    const room = midGame();
    for (const seat of [0, 2]) {
      const json = JSON.stringify(seatView(room, seat, T0));
      for (const id of bonusIds(room, seat)) expect(json).toContain(`"${id}"`);
      for (const other of [0, 1, 2, 3].filter((s) => s !== seat)) {
        for (const id of bonusIds(room, other)) {
          if (!bonusIds(room, seat).includes(id)) expect(json).not.toContain(`"${id}"`);
        }
      }
    }
    // Sanity: the ids really are bonus card ids.
    expect(BONUS_CARDS.some((b) => b.id === bonusIds(room, 0)[0])).toBe(true);
  });

  it('lets a phone open the computers’ sheets but not another person’s', () => {
    const room = midGame('cpu');
    const view = seatView(room, 0, T0);
    const redacted = view.game!.redacted;
    expect(redacted.hiddenSheets).toEqual([false, false, true, false]);
    expect(view.game!.players[2].resources).toEqual({});
    expect(view.game!.players[2].parks).toEqual([]);
    expect(view.game!.players[1].resources).toEqual(room.state!.players[1].resources);
    expect(view.game!.players[0].resources).toEqual(room.state!.players[0].resources);
  });

  it('opens every sheet when the table allows it', () => {
    const room = midGame('all');
    const view = seatView(room, 0, T0);
    expect(view.game!.redacted.hiddenSheets).toEqual([false, false, false, false]);
    expect(view.game!.players[2].resources).toEqual(room.state!.players[2].resources);
    // Still not their bonus cards.
    expect(view.game!.players[2].bonusCards.every((c) => c === HIDDEN_BONUS)).toBe(true);
  });

  it('gives the tablet the sheet of the person acting, and only theirs', () => {
    const room = midGame('cpu');
    const actor = actorOf(room.state!)!;
    const view = tableView(room, T0, []);
    for (const seat of [0, 2]) {
      expect(view.game!.redacted.hiddenSheets[seat]).toBe(seat !== actor);
    }
    expect(view.game!.redacted.hiddenSheets[1]).toBe(false);
  });

  it('shows the tablet a person’s reserved parks only while they stand at a park decision', () => {
    const room = midGame('cpu');
    const state = room.state!;
    state.players[0].reserved = [state.parkDeck[0]];
    state.current = 0;
    state.pending = { player: 0, hikerId: 'p0h0', siteIndex: state.trail.length - 1, kind: 'trail-end' };
    expect(tableView(room, T0, []).game!.players[0].reserved).toHaveLength(1);
    state.pending = { player: 0, hikerId: 'p0h0', siteIndex: 1, kind: 'camera' };
    expect(tableView(room, T0, []).game!.players[0].reserved).toEqual([]);
    expect(tableView(room, T0, []).game!.redacted.reservedCount[0]).toBe(1);
  });

  it('reveals everything at the final scoring, except the deck', () => {
    const room = lobby(3, 5);
    joinSeat(room, 0, 'a', 'Kris');
    startGame(room, T0);
    playOut(room);
    const view = seatView(room, 0, T0);
    for (const player of room.state!.players) {
      expect(view.game!.players[player.index].bonusCards).toEqual(player.bonusCards);
    }
    expect(view.game!.parkDeck).toEqual([]);
  });

  it('keeps the seasons to come face down', () => {
    const room = midGame();
    const state = room.state!;
    for (const view of [tableView(room, T0, []), seatView(room, 0, T0)]) {
      expect(view.game!.seasonDeck.every((card) => card.season <= state.season)).toBe(true);
      expect(view.game!.advancedOrder).toEqual(state.advancedOrder.slice(0, state.season));
      const json = JSON.stringify(view);
      for (const card of state.seasonDeck.filter((c) => c.season > state.season)) {
        expect(json).not.toContain(`"${card.id}"`);
      }
    }
  });

  it('tells the tablet when a computer is the one thinking', () => {
    const room = lobby(2);
    startGame(room, T0);
    expect(tableView(room, T0, []).cpuThinking).toBe(true);
  });
});
