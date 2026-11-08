import { aiAction } from '@/game/ai';
import { applyAction, createGame, CPU_SEATS, defaultDiscard, DEFAULT_EXPANSIONS, DEFAULT_HOUSE_RULES, hydrate, legalMoves } from '@/game/engine';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/data/sites';
import { viewFor, type GameView } from '@/game/view';
import { asPokemon, hikerNames, pickPokemon } from './names';
import type { AiPersonality, ExpansionFlags, GameAction, GameState, HouseRules } from '@/game/types';

/**
 * One game round the tablet: the seats, the settings the tablet chose, and the
 * game itself once it is dealt. Pure — no storage, no clock, no crypto — so the
 * whole multiplayer flow can be played out in a unit test.
 */

export type SeatKind = 'open' | 'human' | 'cpu';
export type Edge = 'bottom' | 'left' | 'top' | 'right';
export type Pace = 'relaxed' | 'normal' | 'brisk';
/** Whose sheets a phone may open besides its own. */
export type Peek = 'cpu' | 'all';
export type RoomPhase = 'lobby' | 'playing' | 'over';

export const EDGES: Edge[] = ['bottom', 'left', 'top', 'right'];

export interface SeatRecord {
  kind: SeatKind;
  /** Typed on the tablet before anyone joins, or by the phone that joins. Empty means the default. */
  name: string;
  /** Which side of the tablet the seat's name tag sits on. */
  edge: Edge;
  /**
   * The phone holding this seat. Its link carries the same nonce, and scanning
   * the seat's code again mints a new one, so only the latest phone can read
   * the seat — a second scan cannot quietly look over the first.
   */
  device: string | null;
  personality?: AiPersonality;
  /**
   * The Pokémon the seat's pawn wears, unique at the table. A person gets one
   * when they join and may trade it for any unused one; a computer wears the
   * one it is named after.
   */
  avatar?: string;
}

export interface RoomSettings {
  seats: number;
  expansions: ExpansionFlags;
  houseRules: HouseRules;
  pace: Pace;
  peek: Peek;
  /** REI's goods dressed as Pokémon gear (Squirtle’s Water Filter). Looks only; on unless turned off. */
  pokemonGear: boolean;
}

/** Where the game's database came from, for the tablet to say. Never the credentials. */
export interface DbInfo {
  source: 'start-redis' | 'env' | 'memory';
  /** A fingerprint of the database, not its id: the id alone re-fetches its credentials. */
  label: string;
  /** When an unclaimed start-redis database is deleted, as Upstash reported it. */
  expires: string | null;
}

export interface Room {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  phase: RoomPhase;
  settings: RoomSettings;
  seats: SeatRecord[];
  /** Kept on the server only: it would predict every future draw. */
  seed: number;
  state: GameState | null;
  /** When the computer on the clock may take its next step; 0 when none is. */
  cpuDueAt: number;
  db: DbInfo;
  /** The latest tap on the tablet that can still be taken back. Server-only. */
  undo?: UndoRecord | null;
}

/**
 * How to take back a person's latest action on the tablet: the game as it
 * stood before it. It holds everyone's secrets, so it never leaves the server;
 * a view carries only who may undo, until when, and the public log line.
 */
export interface UndoRecord {
  seat: number;
  at: number;
  label: string;
  state: GameState;
}

/** How long a person has to take back a mis-tap on the tablet. */
export const UNDO_MS = 8000;

export class RoomError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Milliseconds between a computer's moves; a decision after a move takes less. */
export const PACE_MS: Record<Pace, number> = { relaxed: 2400, normal: 1500, brisk: 800 };
const DECISION_SHARE = 0.6;

export const DEFAULT_SETTINGS: RoomSettings = {
  seats: 4,
  expansions: { ...DEFAULT_EXPANSIONS },
  houseRules: { ...DEFAULT_HOUSE_RULES },
  pace: 'normal',
  peek: 'cpu',
  pokemonGear: true,
};

/** Seat colours by index; the stylesheet defines them so a theme can restyle the table. */
export const SEAT_COLORS = ['var(--p0)', 'var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)'];

/** Clockwise from the edge nearest the tablet's own bottom, with a fifth seat doubling up. */
export function defaultEdges(count: number): Edge[] {
  if (count === 2) return ['bottom', 'top'];
  if (count === 3) return ['bottom', 'left', 'top'];
  return ['bottom', 'left', 'top', 'right', 'bottom'].slice(0, count) as Edge[];
}

/** Takes whatever a client sent and keeps only what is allowed, each field defaulting. */
export function normalizeSettings(input: Partial<RoomSettings> | undefined): RoomSettings {
  const seats = Math.round(Number(input?.seats ?? DEFAULT_SETTINGS.seats));
  return {
    seats: Number.isFinite(seats) ? Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, seats)) : DEFAULT_SETTINGS.seats,
    expansions: {
      nightfall: input?.expansions?.nightfall !== false,
      wildlife: input?.expansions?.wildlife !== false,
    },
    houseRules: {
      blindReserve: input?.houseRules?.blindReserve !== false,
      rangerFirst: input?.houseRules?.rangerFirst === true,
      deckGear: input?.houseRules?.deckGear === true,
      startReserve: input?.houseRules?.startReserve === true,
    },
    pace: input?.pace && input.pace in PACE_MS ? input.pace : DEFAULT_SETTINGS.pace,
    peek: input?.peek === 'all' ? 'all' : 'cpu',
    pokemonGear: input?.pokemonGear !== false,
  };
}

function openSeat(edge: Edge): SeatRecord {
  return { kind: 'open', name: '', edge, device: null };
}

export function newRoom(id: string, settings: RoomSettings, db: DbInfo, now: number, seed: number): Room {
  const edges = defaultEdges(settings.seats);
  return {
    id,
    version: 1,
    createdAt: now,
    updatedAt: now,
    phase: 'lobby',
    settings,
    seats: edges.map(openSeat),
    seed: seed >>> 0,
    state: null,
    cpuDueAt: 0,
    db,
  };
}

/** The name a seat goes by: what was typed, or "Player n". */
export function seatName(room: Room, seat: number): string {
  const record = room.seats[seat];
  return record?.name.trim() || `Player ${seat + 1}`;
}

/** Up to 16 printable characters, nothing that could break a name tag. */
export function cleanName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

/* -------------------------------------------------------------- the lobby */

export function changeSettings(room: Room, input: Partial<RoomSettings>): void {
  const next = normalizeSettings({ ...room.settings, ...input });
  if (room.phase !== 'lobby') {
    // Once dealt, only how the table runs and looks may change, never what was dealt.
    room.settings = { ...room.settings, pace: next.pace, peek: next.peek, pokemonGear: next.pokemonGear };
    return;
  }
  if (next.seats !== room.seats.length) {
    if (next.seats < room.seats.length && room.seats.slice(next.seats).some((s) => s.kind === 'human')) {
      throw new RoomError('Somebody is sitting in a seat that would go — free it first', 409);
    }
    const edges = defaultEdges(next.seats);
    room.seats = edges.map((edge, i) => (room.seats[i] ? { ...room.seats[i], edge } : openSeat(edge)));
  }
  room.settings = next;
}

export function renameSeat(room: Room, seat: number, name: unknown): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  // The snapshot holds who sat where and under what name; a seat change outdates it.
  room.undo = null;
  record.name = cleanName(name);
  if (!record.name && record.kind === 'human') record.name = defaultName(room, seat);
  // Naming a seated person after a Pokémon dresses their pawn as it too, if nobody else wears it.
  const named = asPokemon(record.name);
  if (record.kind === 'human' && named && !avatarsBesides(room, seat).has(named)) record.avatar = named;
  if (room.state && record.kind !== 'cpu') room.state.players[seat].name = seatName(room, seat);
}

export function cycleEdge(room: Room, seat: number): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  record.edge = EDGES[(EDGES.indexOf(record.edge) + 1) % EDGES.length];
}

/**
 * A phone scanning a seat's code. In the lobby that seats them; mid-game it
 * takes the seat over from the computer, or from an earlier phone — the newest
 * scan always wins, and the phone it replaced is told so.
 */
export function joinSeat(room: Room, seat: number, device: string, name: unknown): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  room.undo = null;
  if (room.phase === 'over') throw new RoomError('This game is over', 409);
  const typed = cleanName(name);
  // Taking a seat over from the computer drops the computer's name with it.
  if (typed || record.kind === 'cpu') record.name = typed;
  if (!record.name) record.name = defaultName(room, seat);
  record.device = device;
  if (record.kind !== 'human') {
    record.kind = 'human';
    delete record.personality;
  }
  // A Pokémon name picks that pawn; otherwise a seat taken over keeps its pawn, pack and all.
  record.avatar = freeAvatar(room, seat, asPokemon(record.name) ?? record.avatar);
  if (room.state) {
    const player = room.state.players[seat];
    player.isHuman = true;
    delete player.personality;
    player.name = seatName(room, seat);
  }
}

/**
 * A phone arming its seat's flasks, in the order they should fill. Any time,
 * not only on the seat's turn: it is a standing choice, not a move, and it
 * changes nothing on the board until the seat next collects water. The
 * take-back snapshot gets the same order, so undoing a tablet tap never
 * quietly disarms a phone.
 */
export function setFlasks(room: Room, seat: number, order: unknown): void {
  const state = room.state;
  if (room.phase !== 'playing' || !state) throw new RoomError('The game is not running', 409);
  const player = state.players[seat];
  if (!player) throw new RoomError('No such seat', 404);
  if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) throw new RoomError('Not a list of flasks', 400);
  const ids = order as string[];
  if (new Set(ids).size !== ids.length || ids.some((id) => !player.bottles.some((b) => b.id === id))) {
    throw new RoomError('Those are not your flasks', 400);
  }
  player.flaskOrder = [...ids];
  if (room.undo) room.undo.state.players[seat].flaskOrder = [...ids];
}

/** A phone giving its seat up. The seat keeps playing — from the tablet — until the tablet says otherwise. */
export function leaveSeat(room: Room, seat: number): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  room.undo = null;
  record.device = null;
  if (room.phase === 'lobby') {
    record.kind = 'open';
    record.name = '';
    delete record.avatar;
  }
}

/** The tablet emptying a chair in the lobby, or handing a seat to the computer mid-game. */
export function freeSeat(room: Room, seat: number, now: number): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  room.undo = null;
  record.device = null;
  if (room.phase === 'lobby') {
    record.kind = 'open';
    record.name = '';
    delete record.avatar;
    return;
  }
  if (record.kind === 'cpu' || !room.state) return;
  const stock = nextStockCpu(room);
  record.kind = 'cpu';
  record.personality = stock.personality;
  const player = room.state.players[seat];
  player.isHuman = false;
  player.personality = stock.personality;
  schedule(room, now);
}

/**
 * A Pokémon name for a person who left theirs blank, unused by anyone else at
 * the table as a name or a pawn — so the name and the pawn can match.
 */
function defaultName(room: Room, seat: number): string {
  const taken = room.seats.flatMap((s, i) => (i === seat ? [] : [seatName(room, i), s.avatar]));
  const preferred = asPokemon(room.seats[seat]?.avatar);
  if (preferred && !taken.some((t) => t?.toLowerCase() === preferred.toLowerCase())) return preferred;
  return pickPokemon(room.seed, seat, taken);
}

/** The Pokémon every other seat's pawn wears. */
function avatarsBesides(room: Room, seat: number): Set<string> {
  return new Set(room.seats.flatMap((s, i) => (i !== seat && s.avatar ? [s.avatar] : [])));
}

/**
 * The pawn a seat should wear: `preferred` if it is a Pokémon nobody else
 * wears, otherwise one picked from the seed among those still free.
 */
function freeAvatar(room: Room, seat: number, preferred: string | null | undefined): string {
  const others = avatarsBesides(room, seat);
  const wanted = asPokemon(preferred);
  if (wanted && !others.has(wanted)) return wanted;
  const names = room.seats.flatMap((s, i) => (i === seat || s.kind === 'open' ? [] : [seatName(room, i)]));
  return pickPokemon(room.seed, seat + 7, [...others, ...names]);
}

/**
 * A phone trading its seat's pawn for another Pokémon nobody else wears. A
 * name that was the old Pokémon's follows it, so "Psyduck" does not end up
 * wearing Mudkip.
 */
export function setAvatar(room: Room, seat: number, avatar: unknown): void {
  const record = room.seats[seat];
  if (!record) throw new RoomError('No such seat', 404);
  const wanted = asPokemon(typeof avatar === 'string' ? avatar : '');
  if (!wanted) throw new RoomError('That is not one of the table’s Pokémon', 400);
  if (avatarsBesides(room, seat).has(wanted)) throw new RoomError(`Someone at the table is already ${wanted}`, 409);
  const old = record.avatar;
  record.avatar = wanted;
  if (old && record.name.trim().toLowerCase() === old.toLowerCase()) {
    record.name = wanted;
    if (room.state) {
      // The snapshot holds the old name; a take-back would hand it back.
      room.undo = null;
      room.state.players[seat].name = wanted;
    }
  }
}

/** The next stock opponent whose name nobody at the table is using yet, as a name or a pawn. */
function nextStockCpu(room: Room): { name: string; personality: AiPersonality } {
  const taken = new Set(room.seats.flatMap((s, i) => (s.kind === 'cpu' || s.kind === 'human' ? [seatName(room, i), s.avatar] : [])));
  return CPU_SEATS.find((c) => !taken.has(c.name)) ?? CPU_SEATS[room.seats.length % CPU_SEATS.length];
}

/** Deals the board. Every seat nobody took is played by a computer with its own name and style. */
export function startGame(room: Room, now: number): void {
  if (room.phase !== 'lobby') throw new RoomError('The game is already dealt', 409);
  let state = createGame({
    seed: room.seed,
    expansions: room.settings.expansions,
    houseRules: room.settings.houseRules,
    players: room.seats.length,
  });
  room.seats.forEach((record, seat) => {
    if (record.kind === 'human' && !record.name.trim()) record.name = defaultName(room, seat);
    if (record.kind === 'human') record.avatar = freeAvatar(room, seat, record.avatar ?? asPokemon(record.name));
  });
  room.seats.forEach((record, seat) => {
    if (record.kind !== 'human') {
      const stock = nextStockCpu(room);
      record.kind = 'cpu';
      record.name = stock.name;
      record.personality = stock.personality;
      record.avatar = freeAvatar(room, seat, stock.name);
    }
  });
  state = {
    ...state,
    players: state.players.map((player, index) => {
      const record = room.seats[index];
      const human = record.kind === 'human';
      const next = { ...player, isHuman: human, name: seatName(room, index), color: SEAT_COLORS[index] };
      if (human) delete next.personality;
      else next.personality = record.personality;
      return next;
    }),
  };
  room.state = state;
  room.phase = 'playing';
  room.cpuDueAt = 0;
  schedule(room, now);
}

/* ------------------------------------------------------------------ play */

/** The seat that has to act next, or null when nobody does. */
export function actorOf(state: GameState): number | null {
  if (state.phase !== 'playing') return null;
  return state.pending ? state.pending.player : state.current;
}

const ACTION_TYPES = new Set<GameAction['type']>([
  'move',
  'tent',
  'bison',
  'use-bottle',
  'camera',
  'camera-photo',
  'season-photo',
  'discard',
  'swap-give',
  'swap-get',
  'swap-done',
  'copy-site',
  'copy-skip',
  'park-or-gear',
  'trail-end',
  'outfitter',
  'end-season',
]);

/** A cheap shape check before the engine sees it; the engine checks legality. */
export function isGameAction(value: unknown): value is GameAction {
  return (
    typeof value === 'object' &&
    value !== null &&
    ACTION_TYPES.has((value as { type?: unknown }).type as GameAction['type'])
  );
}

/**
 * Whether this action may be played for this seat now. A pending decision
 * belongs to one seat; otherwise the seat on the clock moves or uses a bottle.
 */
export function mayAct(state: GameState, seat: number, action: GameAction): boolean {
  if (state.phase !== 'playing') return false;
  if (action.type === 'end-season') return false;
  // A flask may be emptied mid-decision — fresh water can pay for the photo
  // the same stop offers — but nobody walks on until the stop is resolved.
  if (state.pending) return state.pending.player === seat && action.type !== 'move';
  if (state.current !== seat) return false;
  return action.type === 'move' || action.type === 'use-bottle';
}

/**
 * The tablet playing a person's move. `seat` is who the tablet believes is on
 * the clock: if the table moved on since it last looked, the move is refused
 * rather than landing on somebody else's turn.
 */
export function playFor(room: Room, seat: number, action: GameAction, now: number): void {
  const state = room.state;
  if (room.phase !== 'playing' || !state) throw new RoomError('The game is not running', 409);
  if (!isGameAction(action)) throw new RoomError('Not a move', 400);
  if (actorOf(state) !== seat) throw new RoomError('It is not that seat’s turn', 409);
  if (!state.players[seat].isHuman) throw new RoomError('The computer is playing that seat', 409);
  if (!mayAct(state, seat, action)) throw new RoomError('That is not allowed right now', 409);
  const next = applyAction(state, action);
  if (JSON.stringify(next) === JSON.stringify(state)) throw new RoomError('That move is not allowed', 409);
  room.state = next;
  room.cpuDueAt = 0;
  const said = next.log.slice(state.log.length).find((entry) => entry.player === seat)?.text ?? 'their last action';
  room.undo = revealsNothing(state, next) ? { seat, at: now, label: said, state } : null;
  settle(room, now);
}

/** What a phone may answer for its own seat: the park decision it stands at. */
const PHONE_ACTIONS = new Set<GameAction['type']>(['trail-end', 'park-or-gear']);

/**
 * A phone answering its own seat's park decision — visit, reserve, buy gear,
 * or pass — so a player can shop from the cards in their hand. Hikers are
 * still walked on the tablet, and no phone can answer for another seat.
 */
export function playForPhone(room: Room, seat: number, action: GameAction, now: number): void {
  const state = room.state;
  if (room.phase !== 'playing' || !state) throw new RoomError('The game is not running', 409);
  if (!isGameAction(action) || !PHONE_ACTIONS.has(action.type)) {
    throw new RoomError('A phone answers park decisions only — hikers are walked on the tablet', 403);
  }
  if (state.pending?.player !== seat || state.pending.kind !== action.type) {
    throw new RoomError('That is not your decision to make right now', 409);
  }
  playFor(room, seat, action, now);
}

/**
 * True when nothing face down came to light between two states of one game:
 * no card left a deck — a refilled park row or gear row shows the next card —
 * no row was dealt afresh (the Outfitter Camp turns the whole gear row over
 * without shrinking the deck), and no new season was dealt. Taking back a
 * move after that would let the table see a card and then pretend it had not.
 */
export function revealsNothing(before: GameState, after: GameState): boolean {
  const shown = (row: { id: string }[]) => new Set(row.map((c) => c.id));
  const wasUp = (row: { id: string }[], earlier: Set<string>) => row.every((c) => earlier.has(c.id));
  return (
    before.season === after.season &&
    before.rng === after.rng &&
    before.parkDeck.length === after.parkDeck.length &&
    before.gearDeck.length === after.gearDeck.length &&
    before.bottleDeck.length === after.bottleDeck.length &&
    wasUp(after.gearRow, shown(before.gearRow)) &&
    wasUp(after.parkRow, shown(before.parkRow))
  );
}

/** The take-back still on offer at `now`, if there is one. */
export function openUndo(room: Room, now: number): UndoRecord | null {
  const undo = room.undo;
  if (!undo || room.phase !== 'playing' || !room.state) return null;
  if (now - undo.at > UNDO_MS || !revealsNothing(undo.state, room.state)) return null;
  return undo;
}

/**
 * Takes the tablet's latest action back, along with any computer steps played
 * since — the computers then play again from there.
 */
export function undoLast(room: Room, now: number): void {
  const undo = openUndo(room, now);
  if (!undo) throw new RoomError('Too late to take that back', 409);
  room.state = undo.state;
  room.undo = null;
  room.cpuDueAt = 0;
  settle(room, now);
}

/** The season break: the tablet turns the page once everyone has looked at the board. */
export function nextSeason(room: Room, now: number): void {
  if (room.phase !== 'playing' || room.state?.phase !== 'season-end') {
    throw new RoomError('The season is still running', 409);
  }
  room.state = applyAction(room.state, { type: 'end-season' });
  room.cpuDueAt = 0;
  room.undo = null;
  settle(room, now);
}

function hasHumans(room: Room): boolean {
  return room.seats.some((s) => s.kind === 'human');
}

function settle(room: Room, now: number): void {
  if (room.state?.phase === 'game-over') {
    room.phase = 'over';
    room.cpuDueAt = 0;
    return;
  }
  schedule(room, now);
}

/**
 * Puts the computer's next step on the clock, if a computer is the one who has
 * to act. A table with no people at all also turns its own seasons.
 */
export function schedule(room: Room, now: number): void {
  const state = room.state;
  if (room.phase !== 'playing' || !state) {
    room.cpuDueAt = 0;
    return;
  }
  const pace = PACE_MS[room.settings.pace];
  if (state.phase === 'season-end') {
    if (!hasHumans(room) && room.cpuDueAt === 0) room.cpuDueAt = now + pace * 2;
    else if (hasHumans(room)) room.cpuDueAt = 0;
    return;
  }
  const actor = actorOf(state);
  if (actor === null || state.players[actor].isHuman) {
    room.cpuDueAt = 0;
    return;
  }
  if (room.cpuDueAt === 0) room.cpuDueAt = now + (state.pending ? pace * DECISION_SHARE : pace);
}

/** A safe answer for any decision, should the AI ever have none: pass, keep, or take the default. */
function fallbackAction(state: GameState): GameAction | null {
  const pending = state.pending;
  if (!pending) {
    const move = legalMoves(state)[0];
    return move ? { type: 'move', ...move } : null;
  }
  switch (pending.kind) {
    case 'discard':
      return { type: 'discard', resources: defaultDiscard(state, pending.player) };
    case 'season-photo':
      return { type: 'season-photo', take: false };
    case 'camera':
      return pending.stage === 'take-photo' ? { type: 'camera-photo', take: false } : { type: 'camera', option: 'take-bottle' };
    case 'tent':
      return { type: 'tent', option: 'site' };
    case 'bison':
      return { type: 'bison' };
    case 'wild-swap':
    case 'token-swap':
      return { type: 'swap-done' };
    case 'copy-site':
      return { type: 'copy-skip' };
    case 'park-or-gear':
      return { type: 'park-or-gear', option: 'skip' };
    case 'trail-end':
      return { type: 'trail-end', option: 'skip' };
    case 'outfitter': {
      const player = state.players[pending.player];
      const free = state.gearRow.find((g) => !player.gear.some((o) => o.id === g.id));
      return free ? { type: 'outfitter', gearId: free.id } : null;
    }
  }
}

/**
 * Plays every computer step that has come due by `now`, each one a beat after
 * the last, so a tablet that polls late catches up in one go rather than
 * falling further behind. Returns true when the game moved.
 */
export function drain(room: Room, now: number, maxSteps = 80): boolean {
  let moved = false;
  for (let step = 0; step < maxSteps; step++) {
    const state = room.state;
    if (room.phase !== 'playing' || !state) break;
    schedule(room, now);
    if (room.cpuDueAt === 0 || now < room.cpuDueAt) break;

    const due = room.cpuDueAt;
    let next = state;
    for (const candidate of [aiAction(state), fallbackAction(state)]) {
      if (!candidate) continue;
      const tried = applyAction(state, candidate);
      if (JSON.stringify(tried) !== JSON.stringify(state)) {
        next = tried;
        break;
      }
    }
    if (next === state) {
      // Nothing the computer can do changes the game; stop rather than spin.
      room.cpuDueAt = 0;
      break;
    }
    room.state = next;
    moved = true;
    room.cpuDueAt = 0;
    if (room.undo && !revealsNothing(room.undo.state, next)) room.undo = null;
    if (next.phase === 'game-over') {
      settle(room, now);
      break;
    }
    // The next beat is timed from when this one was due, not from now.
    schedule(room, due);
  }
  return moved;
}

/** Restores a room read back from storage, filling in fields an older build did not write. */
export function hydrateRoom(room: Room): Room {
  if (room.state) room.state = hydrate(room.state);
  room.cpuDueAt ??= 0;
  room.undo ??= null;
  if (room.undo) room.undo.state = hydrate(room.undo.state);
  room.settings = normalizeSettings(room.settings);
  // Games dealt before pawns wore Pokémon get theirs now, one per seat.
  if (room.phase !== 'lobby') {
    room.seats.forEach((record, seat) => {
      if (!asPokemon(record.avatar)) record.avatar = freeAvatar(room, seat, asPokemon(record.name));
    });
  }
  return room;
}

/* ----------------------------------------------------------------- views */

export interface PublicSeat {
  seat: number;
  name: string;
  kind: SeatKind;
  edge: Edge;
  /** One or two letters for the pawn, unique at the table. */
  tag: string;
  color: string;
  /** True while a phone holds the seat. */
  phone: boolean;
  /** What the seat's two hikers are called, in the order of the player's hikers. */
  hikers: [string, string];
  /** The Pokémon the seat's pawn wears; null for a seat nobody has taken yet. */
  avatar: string | null;
}

interface ViewBase {
  id: string;
  version: number;
  phase: RoomPhase;
  settings: RoomSettings;
  seats: PublicSeat[];
  db: DbInfo;
  /** The seat that has to act, and whether that is a computer thinking. */
  actor: number | null;
  cpuThinking: boolean;
  game: GameView | null;
  serverNow: number;
  /** Who may take their latest tap back, until when (server time), and what it was. */
  undo: { seat: number; until: number; label: string } | null;
}

export type TableView = ViewBase & { role: 'table'; tickets: string[] };
export type SeatView = ViewBase & { role: 'seat'; seat: number };
export type RoomView = TableView | SeatView;

/** Pawn letters: initials, widened to two letters where two names share one. */
export function seatTags(names: string[]): string[] {
  const initial = (name: string, length: number) =>
    Array.from(name.replace(/[^\p{L}\p{N}]/gu, '') || '?')
      .slice(0, length)
      .join('')
      .toUpperCase();
  const firsts = names.map((n) => initial(n, 1));
  const tags = names.map((n, i) => (firsts.filter((f) => f === firsts[i]).length > 1 ? initial(n, 2) : firsts[i]));
  return tags.map((tag, i) => (tags.filter((t) => t === tag).length > 1 ? `${tag.slice(0, 1)}${i + 1}` : tag));
}

function publicSeats(room: Room): PublicSeat[] {
  const names = room.seats.map((_, i) => seatName(room, i));
  const tags = seatTags(names);
  return room.seats.map((record, seat) => ({
    seat,
    name: names[seat],
    kind: record.kind,
    edge: record.edge,
    tag: tags[seat],
    color: SEAT_COLORS[seat],
    phone: record.device !== null,
    hikers: hikerNames(record.avatar ?? names[seat], room.seed, seat),
    avatar: asPokemon(record.avatar),
  }));
}

function humanSeats(room: Room): number[] {
  return room.seats.flatMap((s, i) => (s.kind === 'human' ? [i] : []));
}

/**
 * The tablet's view. It shows the board, so it needs nobody's bonus cards. It
 * does need the sheet of whoever is acting — their decision is answered on the
 * tablet — and, while they stand at a park decision, the parks they reserved.
 */
export function tableView(room: Room, now: number, tickets: string[]): TableView {
  const actor = room.state ? actorOf(room.state) : null;
  const pendingKind = room.state?.pending?.kind;
  const game = room.state
    ? viewFor(room.state, null, {
        hideSheets: room.settings.peek === 'cpu' ? humanSeats(room).filter((s) => s !== actor) : [],
        revealReserved:
          actor !== null && (pendingKind === 'trail-end' || pendingKind === 'park-or-gear') ? [actor] : [],
      })
    : null;
  return { role: 'table', tickets, ...base(room, now, actor, game) };
}

/** A phone's view: its own sheet and bonus cards, and the others' sheets as the table allows. */
export function seatView(room: Room, seat: number, now: number): SeatView {
  const actor = room.state ? actorOf(room.state) : null;
  const game = room.state
    ? viewFor(room.state, seat, {
        hideSheets: room.settings.peek === 'cpu' ? humanSeats(room).filter((s) => s !== seat) : [],
      })
    : null;
  return { role: 'seat', seat, ...base(room, now, actor, game) };
}

function base(room: Room, now: number, actor: number | null, game: GameView | null): ViewBase {
  return {
    id: room.id,
    version: room.version,
    phase: room.phase,
    settings: room.settings,
    seats: publicSeats(room),
    db: room.db,
    actor,
    cpuThinking: actor !== null && room.state !== null && !room.state.players[actor].isHuman,
    game,
    serverNow: now,
    undo: undoFor(room, now),
  };
}

function undoFor(room: Room, now: number): ViewBase['undo'] {
  const undo = openUndo(room, now);
  return undo ? { seat: undo.seat, until: undo.at + UNDO_MS, label: undo.label } : null;
}
