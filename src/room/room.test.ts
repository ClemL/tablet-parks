import { describe, expect, it } from 'vitest';
import { aiAction } from '@/game/ai';
import { legalMoves } from '@/game/engine';
import { BONUS_CARDS } from '@/game/data/bonuses';
import { HIDDEN_BONUS } from '@/game/view';
import type { GameAction, GameState } from '@/game/types';
import {
  PACE_MS,
  RoomError,
  UNDO_MS,
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
  playForPhone,
  renameSeat,
  revealsNothing,
  seatTags,
  setAvatar,
  setFlasks,
  hydrateRoom,
  seatView,
  startGame,
  tableView,
  undoLast,
  type Room,
} from './room';
import { POKEMON, hikerNames, isPokemon, pickPokemon } from './names';

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

  it('keeps the deck-gear house rule off unless the tablet turns it on', () => {
    expect(normalizeSettings(undefined).houseRules.deckGear).toBe(false);
    expect(normalizeSettings({ houseRules: { deckGear: 'yes' } as never }).houseRules.deckGear).toBe(false);
    const room = newRoom('ABCDE', normalizeSettings({ seats: 2, houseRules: { blindReserve: true, rangerFirst: false, deckGear: true, startReserve: false, chainParks: false, shortGame: false, lastHiker: true } }), DB, T0, 3);
    startGame(room, T0);
    expect(room.state!.houseRules.deckGear).toBe(true);
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

  it('names a phone that joins without a name after a Pokémon nobody else is using', () => {
    const room = lobby(4);
    joinSeat(room, 0, 'a', '');
    joinSeat(room, 1, 'b', '   ');
    joinSeat(room, 2, 'c', 'Kris');
    const [first, second] = [room.seats[0].name, room.seats[1].name];
    expect(isPokemon(first)).toBe(true);
    expect(isPokemon(second)).toBe(true);
    expect(first).not.toBe(second);
    startGame(room, T0);
    const names = room.state!.players.map((p) => p.name);
    expect(names.slice(0, 3)).toEqual([first, second, 'Kris']);
    // The computer filling the last seat never wears a name a person already has.
    expect(new Set(names).size).toBe(4);
  });

  it('keeps the stock computer names for the computers', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(['Pikachu', 'Eevee', 'Vulpix', 'Snorlax']).not.toContain(pickPokemon(seed, 0, []));
    }
  });

  it('skips a Pokémon somebody typed for themselves', () => {
    const pick = pickPokemon(7, 0, []);
    expect(pickPokemon(7, 0, [pick.toUpperCase()])).not.toBe(pick);
  });

  it('gives a person who blanks their name on the tablet a Pokémon, not "Player n"', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    renameSeat(room, 0, '');
    expect(isPokemon(room.seats[0].name)).toBe(true);
  });

  it('names every seat\'s hikers after its Pokémon, one ♂ and one ♀', () => {
    const room = lobby(3);
    joinSeat(room, 0, 'a', '');
    joinSeat(room, 1, 'b', 'Kris');
    startGame(room, T0);
    const seats = tableView(room, T0, []).seats;
    const name = seats[0].name;
    expect(seats[0].avatar).toBe(name);
    expect([...seats[0].hikers].sort()).toEqual([`${name} ♀`, `${name} ♂`]);
    // A typed name keeps the person's name but still dresses the pawn, and the hikers, as a Pokémon.
    expect(seats[1].name).toBe('Kris');
    expect([...seats[1].hikers].sort()).toEqual([`${seats[1].avatar} ♀`, `${seats[1].avatar} ♂`]);
    // The computer wears the Pokémon it is named after.
    expect(seats[2].avatar).toBe(seats[2].name);
    // Which hiker is which is fixed for the game, not re-rolled on every view.
    expect(seatView(room, 0, T0 + 5000).seats[0].hikers).toEqual(seats[0].hikers);
  });

  it('mixes which hiker is ♂ across seats and games', () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, seed) => hikerNames('Mew', seed, 0)[0]));
    expect(firsts).toEqual(new Set(['Mew ♂', 'Mew ♀']));
    expect(POKEMON).toHaveLength(20);
    expect(hikerNames('Kris', 1, 0)).toEqual(['Hiker 1', 'Hiker 2']);
  });

  it('gives each person a Pokémon pawn on joining, none worn twice', () => {
    for (let seed = 0; seed < 60; seed++) {
      const room = lobby(5, seed);
      joinSeat(room, 0, 'a', 'Kris');
      joinSeat(room, 1, 'b', 'Srini');
      joinSeat(room, 2, 'c', '');
      startGame(room, T0);
      const avatars = tableView(room, T0, []).seats.map((s) => s.avatar);
      expect(avatars.every((a) => a !== null && isPokemon(a))).toBe(true);
      expect(new Set(avatars).size).toBe(5);
      // People are not handed a computer's stock Pokémon, so the computers can wear their own names.
      for (const seat of [3, 4]) expect(room.seats[seat].avatar).toBe(room.seats[seat].name);
    }
  });

  it('dresses a person who types a Pokémon name as that Pokémon', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'psyduck');
    expect(room.seats[0].avatar).toBe('Psyduck');
    renameSeat(room, 0, 'Mudkip');
    expect(room.seats[0].avatar).toBe('Mudkip');
  });

  it('trades a pawn for any Pokémon nobody else wears, and refuses the rest', () => {
    const room = lobby(3);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Psyduck');
    expect(() => setAvatar(room, 0, 'Psyduck')).toThrow(/already Psyduck/);
    expect(() => setAvatar(room, 0, 'Agumon')).toThrow(RoomError);
    expect(() => setAvatar(room, 0, { name: 'Mew' })).toThrow(RoomError);
    setAvatar(room, 0, 'mew');
    expect(room.seats[0].avatar).toBe('Mew');
    // A typed name stays put when the pawn changes.
    expect(room.seats[0].name).toBe('Kris');
    // A name that was the old Pokémon's follows the pawn, in the game too.
    startGame(room, T0);
    setAvatar(room, 1, 'Mudkip');
    expect(room.seats[1].name).toBe('Mudkip');
    expect(room.state!.players[1].name).toBe('Mudkip');
    expect(seatView(room, 1, T0).seats[1].hikers.every((h) => h.startsWith('Mudkip '))).toBe(true);
  });

  it('frees a person\'s Pokémon when they leave the lobby', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Mew');
    leaveSeat(room, 0);
    expect(room.seats[0].avatar).toBeUndefined();
    expect(tableView(room, T0, []).seats[0].avatar).toBeNull();
  });

  it('gives a game saved before pawns wore Pokémon one per seat', () => {
    const room = lobby(3);
    joinSeat(room, 0, 'a', 'Kris');
    startGame(room, T0);
    for (const record of room.seats) delete record.avatar;
    const back = hydrateRoom(JSON.parse(JSON.stringify(room)) as Room);
    const avatars = back.seats.map((s) => s.avatar);
    expect(avatars.every((a) => a && isPokemon(a))).toBe(true);
    expect(new Set(avatars).size).toBe(3);
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

  it('ends a short game after summer, scored as usual', () => {
    expect(normalizeSettings(undefined).houseRules.shortGame).toBe(false);
    const room = newRoom('ABCDE', normalizeSettings({ seats: 3, houseRules: { shortGame: true } as never }), DB, T0, 9);
    startGame(room, T0);
    const { room: done } = playOut(room);
    expect(done.phase).toBe('over');
    expect(done.state!.phase).toBe('game-over');
    expect(done.state!.season).toBe(2);
    expect(done.state!.finalScores).toHaveLength(3);
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

  it('sends every device Tauros’s walks, which name only public park-row slots', () => {
    const room = newRoom('ABCDE', normalizeSettings({ seats: 3 }), DB, T0, 5);
    joinSeat(room, 0, 'a', 'Kris');
    startGame(room, T0);
    let now = T0;
    for (let i = 0; i < 4000 && !room.state!.log.some((e) => e.event === 'tauros-walk') && room.phase === 'playing'; i++) {
      const state = room.state!;
      const actor = actorOf(state);
      if (state.phase === 'season-end') nextSeason(room, now);
      else if (actor !== null && state.players[actor].isHuman) playFor(room, actor, humanChoice(state, actor), now);
      else drain(room, (now += 2000));
    }
    const walks = room.state!.log.filter((e) => e.event === 'tauros-walk');
    expect(walks.length).toBeGreaterThan(0);
    for (const view of [tableView(room, now, []).game!, seatView(room, 0, now).game!, seatView(room, 1, now).game!]) {
      expect(view.log.filter((e) => e.event === 'tauros-walk')).toEqual(walks);
    }
    // Only the two slots and the text: nothing about the deck that refilled the row.
    expect(Object.keys(walks[0].walk!).sort()).toEqual(['from', 'to']);
  });

  it('counts the gear deck for every device without naming a card in it', () => {
    const room = midGame();
    const state = room.state!;
    for (const view of [tableView(room, T0, []), seatView(room, 0, T0), seatView(room, 2, T0)]) {
      expect(view.game!.gearDeck).toEqual([]);
      expect(view.game!.redacted.gearDeckCount).toBe(state.gearDeck.length);
      const json = JSON.stringify(view);
      const seen = new Set([...state.gearRow, ...state.players.flatMap((p) => p.gear)].map((g) => g.id));
      for (const card of state.gearDeck.filter((g) => !seen.has(g.id))) {
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

describe('taking a tap back', () => {
  /** Two seats, a person in seat 0 on the clock, and a move that draws nothing. */
  function ready(): { room: Room; move: GameAction } {
    const room = lobby(2);
    joinSeat(room, 0, 'phone', 'Kris');
    startGame(room, T0);
    expect(actorOf(room.state!)).toBe(0);
    const option = legalMoves(room.state!).find((m) => !m.useCampfire && room.state!.trail[m.to] !== 'adv-talk')!;
    return { room, move: { type: 'move', ...option } };
  }

  it('takes a person’s move back, with the computer steps played since', () => {
    const { room, move } = ready();
    const before = JSON.stringify(room.state);
    playFor(room, 0, move, T0);
    expect(tableView(room, T0 + 1, []).undo).toMatchObject({ seat: 0, until: T0 + UNDO_MS });
    drain(room, T0 + 3000);

    undoLast(room, T0 + 4000);
    expect(JSON.stringify(room.state)).toBe(before);
    expect(actorOf(room.state!)).toBe(0);
    expect(room.cpuDueAt).toBe(0);
    expect(tableView(room, T0 + 4001, []).undo).toBeNull();
    // Once is all: the record went with it.
    expect(() => undoLast(room, T0 + 4002)).toThrow(/Too late/);
  });

  it('refuses once the window has passed', () => {
    const { room, move } = ready();
    playFor(room, 0, move, T0);
    expect(tableView(room, T0 + UNDO_MS + 1, []).undo).toBeNull();
    expect(() => undoLast(room, T0 + UNDO_MS + 1)).toThrow(/Too late/);
  });

  it('refuses once a card has come to light', () => {
    const { room } = ready();
    const state = room.state!;
    state.players[0].resources = { sun: 9, water: 9, forest: 9, mountain: 9, wild: 9 };
    const end = state.trail.length - 1;
    playFor(room, 0, { type: 'move', hikerId: 'p0h0', to: end }, T0);
    expect(room.undo).not.toBeNull();
    const deck = room.state!.parkDeck.length;
    playFor(room, 0, { type: 'trail-end', option: 'claim-park', parkId: room.state!.parkRow[0].id }, T0 + 10);
    // The row refilled from the deck: the next park is on show.
    expect(room.state!.parkDeck.length).toBe(deck - 1);
    expect(tableView(room, T0 + 20, []).undo).toBeNull();
    expect(() => undoLast(room, T0 + 20)).toThrow(/Too late/);
  });

  it('lets a seat arm its own flasks at any time, and checks they are its own', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    expect(() => setFlasks(room, 0, [])).toThrow(/not running/);
    startGame(room, T0);
    const mine = room.state!.players[0].bottles.map((b) => b.id);
    const theirs = room.state!.players[1].bottles.map((b) => b.id);
    setFlasks(room, 0, mine);
    expect(room.state!.players[0].flaskOrder).toEqual(mine);
    expect(() => setFlasks(room, 0, theirs)).toThrow(/not your flasks/);
    expect(() => setFlasks(room, 0, [...mine, ...mine])).toThrow(RoomError);
    expect(() => setFlasks(room, 0, 'all')).toThrow(RoomError);
    setFlasks(room, 0, []);
    expect(room.state!.players[0].flaskOrder).toEqual([]);
  });

  it('keeps a phone’s armed flasks through a take-back on the tablet', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const seat = actorOf(room.state!)!;
    const move = legalMoves(room.state!)[0];
    playFor(room, seat, { type: 'move', ...move }, T0);
    const other = 1 - seat;
    const ids = room.state!.players[other].bottles.map((b) => b.id);
    setFlasks(room, other, ids);
    if (room.undo) {
      undoLast(room, T0 + 100);
      expect(room.state!.players[other].flaskOrder).toEqual(ids);
    }
  });

  it('never shows another person’s armed flasks to a phone the table keeps out', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    setFlasks(room, 1, room.state!.players[1].bottles.map((b) => b.id));
    room.state!.players[1].flasksUsed = 3;
    const view = seatView(room, 0, T0);
    expect(view.game!.players[1].flaskOrder).toEqual([]);
    expect(view.game!.players[1].flasksUsed).toBe(0);
    expect(JSON.stringify(view.game!.players[1])).not.toContain(room.state!.players[1].bottles[0].id);
    // Srini's own phone sees them.
    expect(seatView(room, 1, T0).game!.players[1].flaskOrder).toHaveLength(1);
  });

  it('turns the starting-reserve rule on only when asked, and keeps each dealt park secret', () => {
    expect(normalizeSettings(undefined).houseRules.startReserve).toBe(false);
    expect(normalizeSettings({ houseRules: { startReserve: 'yes' } as never }).houseRules.startReserve).toBe(false);
    const room = newRoom('ABCDE', normalizeSettings({ seats: 2, houseRules: { ...normalizeSettings(undefined).houseRules, startReserve: true } }), DB, T0, 5);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const [kris, srini] = room.state!.players.map((p) => p.reserved[0]);
    expect(kris).toBeDefined();
    const krisView = seatView(room, 0, T0);
    expect(krisView.game!.players[0].reserved.map((p) => p.id)).toEqual([kris.id]);
    expect(JSON.stringify(krisView)).not.toContain(srini.id);
    expect(krisView.game!.redacted.reservedCount).toEqual([1, 1]);
    const tablet = tableView(room, T0, []);
    expect(JSON.stringify(tablet)).not.toContain(room.state!.players[1 - actorOf(room.state!)!].reserved[0].id);
  });

  it('turns chain park visits on only when asked, and lets a phone visit one park after another', () => {
    expect(normalizeSettings(undefined).houseRules.chainParks).toBe(false);
    expect(normalizeSettings({ houseRules: { chainParks: 1 } as never }).houseRules.chainParks).toBe(false);
    // No Wildlife, so no bison trade comes between one visit and the next.
    const settings = normalizeSettings({
      seats: 2,
      expansions: { nightfall: false, wildlife: false },
      houseRules: { ...normalizeSettings(undefined).houseRules, chainParks: true },
    });
    const room = newRoom('ABCDE', settings, DB, T0, 7);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const seat = actorOf(room.state!)!;
    room.state!.players[seat].resources = { sun: 0, water: 0, forest: 0, mountain: 0, wild: 30 };
    room.state!.pending = { player: seat, hikerId: room.state!.players[seat].hikers[0].id, siteIndex: room.state!.trail.length - 1, kind: 'trail-end' };
    playForPhone(room, seat, { type: 'trail-end', option: 'claim-park', parkId: room.state!.parkRow[0].id }, T0);
    expect(room.state!.pending).toMatchObject({ kind: 'trail-end', chain: true });
    playForPhone(room, seat, { type: 'trail-end', option: 'claim-park', parkId: room.state!.parkRow[1].id }, T0);
    expect(room.state!.players[seat].parks).toHaveLength(2);
    // A reserve mid-chain is refused as a move that changes nothing.
    expect(() => playForPhone(room, seat, { type: 'trail-end', option: 'reserve-park', parkId: room.state!.parkRow[0].id }, T0)).toThrow(/not allowed/);
    playForPhone(room, seat, { type: 'trail-end', option: 'skip' }, T0);
    expect(room.state!.pending?.kind).not.toBe('trail-end');
  });

  it('dresses the table in Pokémon unless it is turned off, and lets it and the diorama stops change mid-game', () => {
    expect(normalizeSettings(undefined).pokemon).toBe(true);
    expect(normalizeSettings({ pokemon: 'yes' } as never).pokemon).toBe(false);
    expect(normalizeSettings({ pokemon: false }).pokemon).toBe(false);
    // A table saved when the setting only dressed REI keeps what it chose.
    expect(normalizeSettings({ pokemonGear: false } as never).pokemon).toBe(false);
    expect(normalizeSettings({ pokemonGear: true } as never).pokemon).toBe(true);
    expect(normalizeSettings(undefined).diorama).toBe(false);
    expect(normalizeSettings({ diorama: 1 } as never).diorama).toBe(false);
    const room = lobby(2);
    startGame(room, T0);
    changeSettings(room, { pokemon: false, diorama: true, seats: 5 });
    expect(room.settings.pokemon).toBe(false);
    expect(room.settings.diorama).toBe(true);
    expect(room.settings.seats).toBe(2);
  });

  it('counts a gear row dealt afresh as a revealed card, even with the deck the same size', () => {
    const room = lobby(2);
    startGame(room, T0);
    const before = room.state!;
    const after = structuredClone(before);
    // What the Outfitter Camp does: the row goes under the deck and three new cards come up.
    after.gearDeck.push(...after.gearRow);
    after.gearRow = after.gearDeck.splice(0, after.gearRow.length);
    expect(after.gearDeck).toHaveLength(before.gearDeck.length);
    expect(revealsNothing(before, after)).toBe(false);
    expect(revealsNothing(before, structuredClone(before))).toBe(true);
  });

  it('forgets the take-back when a seat changes hands', () => {
    const { room, move } = ready();
    playFor(room, 0, move, T0);
    joinSeat(room, 1, 'other', 'Srini');
    expect(() => undoLast(room, T0 + 10)).toThrow(/Too late/);
  });

  it('never sends the snapshot to a device, only who may undo and what', () => {
    const room = newRoom('ABCDE', normalizeSettings({ seats: 3 }), DB, T0, 42);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const seat = actorOf(room.state!)!;
    const option = legalMoves(room.state!).find((m) => !m.useCampfire && room.state!.trail[m.to] !== 'adv-talk')!;
    playFor(room, seat, { type: 'move', ...option }, T0);
    const other = seat === 0 ? 1 : 0;

    const table = tableView(room, T0 + 1, []);
    expect(Object.keys(table.undo!).sort()).toEqual(['label', 'seat', 'until']);
    expect(table.undo!.label).toMatch(/moved to/);
    const json = [JSON.stringify(table), JSON.stringify(seatView(room, other, T0 + 1))];
    for (const id of room.state!.players[seat].bonusCards) {
      for (const sent of json) expect(sent).not.toContain(`"${id}"`);
    }
    for (const sent of json) expect(sent).not.toContain('"undo":{"seat":' + seat + ',"at"');
  });
});

describe('a phone at a park decision', () => {
  /** Two people; whoever is on the clock walks a hiker to the Trail End from the tablet. */
  function atTrailEnd(): { room: Room; seat: number; other: number } {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const seat = actorOf(room.state!)!;
    const hiker = room.state!.players[seat].hikers[0].id;
    playFor(room, seat, { type: 'move', hikerId: hiker, to: room.state!.trail.length - 1 }, T0);
    expect(room.state!.pending).toMatchObject({ player: seat, kind: 'trail-end' });
    return { room, seat, other: 1 - seat };
  }

  it('answers its own seat’s park decision', () => {
    const { room, seat } = atTrailEnd();
    playForPhone(room, seat, { type: 'trail-end', option: 'skip' }, T0 + 10);
    expect(room.state!.pending).toBeNull();
  });

  it('never walks a hiker, and never answers for another seat', () => {
    const { room, seat, other } = atTrailEnd();
    const move = { type: 'move', hikerId: room.state!.players[seat].hikers[1].id, to: 1 } as GameAction;
    expect(() => playForPhone(room, seat, move, T0 + 10)).toThrow(/park decisions only/);
    expect(() => playForPhone(room, other, { type: 'trail-end', option: 'skip' }, T0 + 10)).toThrow(/not your decision/);
    // The wrong kind of park decision for where the hiker stands is refused too.
    expect(() => playForPhone(room, seat, { type: 'park-or-gear', option: 'skip' }, T0 + 10)).toThrow(/not your decision/);
    expect(room.state!.pending?.kind).toBe('trail-end');
  });

  it('buys the top of the gear deck from the phone when the house rule is on', () => {
    const room = newRoom('ABCDE', normalizeSettings({ seats: 2, houseRules: { blindReserve: true, rangerFirst: false, deckGear: true, startReserve: false, chainParks: false, shortGame: false, lastHiker: true } }), DB, T0, 42);
    joinSeat(room, 0, 'a', 'Kris');
    joinSeat(room, 1, 'b', 'Srini');
    startGame(room, T0);
    const seat = actorOf(room.state!)!;
    room.state!.players[seat].resources.sun = 4;
    const top = room.state!.gearDeck[0];
    playFor(room, seat, { type: 'move', hikerId: room.state!.players[seat].hikers[0].id, to: room.state!.trail.length - 1 }, T0);
    playForPhone(room, seat, { type: 'trail-end', option: 'buy-top-gear' }, T0 + 10);
    expect(room.state!.players[seat].gear.map((g) => g.id)).toEqual([top.id]);
  });

  it('has nothing to answer while its player is walking', () => {
    const room = lobby(2);
    joinSeat(room, 0, 'a', 'Kris');
    startGame(room, T0);
    expect(actorOf(room.state!)).toBe(0);
    expect(() => playForPhone(room, 0, { type: 'trail-end', option: 'skip' }, T0)).toThrow(/not your decision/);
  });
});
