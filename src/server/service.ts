import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import {
  RoomError,
  changeSettings,
  cycleEdge,
  drain,
  freeSeat,
  hydrateRoom,
  joinSeat,
  leaveSeat,
  newRoom,
  nextSeason,
  playForPhone,
  undoLast,
  normalizeSettings,
  playFor,
  renameSeat,
  seatView,
  startGame,
  tableView,
  type DbInfo,
  type PublicSeat,
  type Room,
  type RoomSettings,
  type RoomView,
  type SeatView,
  type TableView,
} from '@/room/room';
import type { GameAction } from '@/game/types';
import { open, seal, type DbRef, type Handle } from './seal';
import { provisionDatabase } from './provision';
import { waitUntilReachable, type RedisCreds } from './redis';
import { FINISHED_TTL_SECONDS, GAME_TTL_SECONDS, MemoryStore, RedisStore, type GameStore } from './store';

export { RoomError };

/** Read off a screen, so no 0/O or 1/I. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gameCode(): string {
  return Array.from(randomBytes(5), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function nonce(): string {
  return randomBytes(9).toString('base64url');
}

function storeFor(ref: DbRef): GameStore {
  return 'm' in ref ? new MemoryStore() : new RedisStore({ url: ref.u, token: ref.t });
}

function envCreds(): RedisCreds | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export type StoreMode = 'start-redis' | 'env' | 'memory';

export function storeMode(): StoreMode {
  const mode = process.env.PARKS_STORE;
  return mode === 'env' || mode === 'memory' ? mode : 'start-redis';
}

/** Process memory is a trap on a deployment, where every function instance has its own. */
function memoryAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.PARKS_STORE === 'memory';
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

/**
 * Finds the new game a home: a database of its own from start-redis, or — if
 * that cannot be reached — the deployment's shared database, or, on a laptop,
 * this process's memory.
 */
async function newDatabase(): Promise<{ ref: DbRef; info: DbInfo }> {
  const mode = storeMode();
  const problems: string[] = [];

  if (mode === 'start-redis') {
    try {
      const db = await provisionDatabase();
      await waitUntilReachable(db);
      console.log(`[games] provisioned a database (${fingerprint(db.id)}) at ${new URL(db.url).host}`);
      return {
        ref: { u: db.url, t: db.token },
        info: { source: 'start-redis', label: fingerprint(db.id), expires: db.expires },
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      problems.push(`start-redis: ${reason}`);
      console.error(`[games] could not provision a database: ${reason}`);
    }
  }

  if (mode !== 'memory') {
    const creds = envCreds();
    if (creds) {
      return { ref: { u: creds.url, t: creds.token }, info: { source: 'env', label: fingerprint(creds.url), expires: null } };
    }
    if (mode === 'env') problems.push('PARKS_STORE=env but no UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  }

  if (memoryAllowed()) {
    return { ref: { m: 1 }, info: { source: 'memory', label: 'local', expires: null } };
  }
  throw new RoomError(`Could not get a database for the game. ${problems.join(' · ')}`, 503);
}

function ttlFor(room: Room): number {
  return room.phase === 'over' ? FINISHED_TTL_SECONDS : GAME_TTL_SECONDS;
}

/** The QR code behind each seat: sealed, and the same string every time. */
function ticketsFor(room: Room, ref: DbRef): string[] {
  return room.seats.map((_, s) => seal({ k: 't', g: room.id, d: ref, s }));
}

function viewOf(room: Room, handle: Handle, now: number): RoomView {
  if (handle.k === 'h') return tableView(room, now, ticketsFor(room, handle.d));
  return seatView(room, handle.s, now);
}

async function load(store: GameStore, id: string): Promise<Room> {
  const room = await store.load(id);
  if (!room) throw new RoomError('This game has ended or expired', 410);
  return hydrateRoom(room);
}

/** Checks a phone still holds its seat: a newer scan of the same code takes it over. */
function checkSeat(room: Room, handle: Handle): void {
  if (handle.k !== 's') return;
  const record = room.seats[handle.s];
  if (record && record.device === null) {
    throw new RoomError('The tablet freed this seat. Scan its code to sit down again.', 403);
  }
  if (!record || record.device !== handle.n) {
    throw new RoomError('Another phone has taken this seat. Scan its code on the tablet to take it back.', 403);
  }
}

/**
 * Apply a change and write it back, starting again from fresh state if
 * somebody else's write landed first.
 */
async function mutate(
  handle: Handle,
  apply: (room: Room, now: number) => void,
  attempts = 5,
): Promise<{ room: Room; now: number }> {
  const store = storeFor(handle.d);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const room = await load(store, handle.g);
    const expected = room.version;
    const now = Date.now();
    apply(room, now);
    drain(room, now);
    room.version = expected + 1;
    room.updatedAt = now;
    if (await store.compareAndSet(room, expected, ttlFor(room))) return { room, now };
  }
  throw new RoomError('The table changed while you were acting — try again', 409);
}

function requireHandle(token: string | null, kinds: Handle['k'][]): Handle {
  const handle = open(token);
  if (!handle || !kinds.includes(handle.k)) {
    throw new RoomError('That link is not valid here. It may be from an older version of the app — open the game again from the tablet.', 401);
  }
  return handle;
}

/* ------------------------------------------------------------------ API */

export async function createGame(input: Partial<RoomSettings> | undefined): Promise<{ host: string; view: TableView }> {
  const { ref, info } = await newDatabase();
  const store = storeFor(ref);
  const settings = normalizeSettings(input);
  const now = Date.now();
  for (let attempt = 0; attempt < 5; attempt++) {
    const room = newRoom(gameCode(), settings, info, now, randomBytes(4).readUInt32LE(0));
    if (!(await store.create(room, GAME_TTL_SECONDS))) continue;
    const host: Handle = { k: 'h', g: room.id, d: ref };
    return { host: seal(host), view: tableView(room, now, ticketsFor(room, ref)) };
  }
  throw new RoomError('Could not find a free table code', 500);
}

export type PollResult = RoomView | { version: number; unchanged: true };

/**
 * The poll. When the caller already holds the latest version and no computer
 * move has come due, the answer is one short read. Otherwise the game is
 * loaded, any computer moves now due are played, and the result written back.
 */
export async function readGame(token: string | null, since?: number, attempt = 0): Promise<PollResult> {
  const handle = requireHandle(token, ['h', 's']);
  const store = storeFor(handle.d);
  const now = Date.now();
  const peek = await store.peek(handle.g);
  if (!peek) throw new RoomError('This game has ended or expired', 410);
  const due = peek.dueAt > 0 && now >= peek.dueAt;
  if (since !== undefined && since === peek.version && !due) return { version: peek.version, unchanged: true };

  const room = await load(store, handle.g);
  checkSeat(room, handle);
  if (due) {
    const expected = room.version;
    const dueBefore = room.cpuDueAt;
    if (drain(room, now) || room.cpuDueAt !== dueBefore) {
      room.version = expected + 1;
      room.updatedAt = now;
      // Losing this race is fine: whoever won played the same moves, so read theirs.
      if (!(await store.compareAndSet(room, expected, ttlFor(room)))) {
        if (attempt < 3) return readGame(token, undefined, attempt + 1);
        throw new RoomError('The table is busy — trying again', 409);
      }
    }
  }
  return viewOf(room, handle, now);
}

export interface SeatPreview {
  table: string;
  phase: Room['phase'];
  seat: PublicSeat;
}

/** What a seat's code leads to, for the join screen: which seat, and who if anyone holds it. */
export async function previewSeat(ticket: string | null): Promise<SeatPreview> {
  const handle = requireHandle(ticket, ['t']);
  if (handle.k !== 't') throw new RoomError('Not a seat code', 400);
  const room = await load(storeFor(handle.d), handle.g);
  const seat = seatView(room, handle.s, Date.now()).seats[handle.s];
  if (!seat) throw new RoomError('That seat is no longer at the table', 404);
  return { table: room.id, phase: room.phase, seat };
}

/** A phone scanning a seat's code. Returns the phone's own handle for that seat. */
export async function joinGame(ticket: string | null, name: unknown): Promise<{ seat: string; view: SeatView }> {
  const handle = requireHandle(ticket, ['t']);
  if (handle.k !== 't') throw new RoomError('Not a seat code', 400);
  const device = nonce();
  const { room, now } = await mutate(handle, (r) => joinSeat(r, handle.s, device, name));
  const mine: Handle = { k: 's', g: handle.g, d: handle.d, s: handle.s, n: device };
  return { seat: seal(mine), view: seatView(room, handle.s, now) };
}

export async function leaveGame(token: string | null): Promise<void> {
  const handle = requireHandle(token, ['s']);
  if (handle.k !== 's') return;
  await mutate(handle, (room) => {
    checkSeat(room, handle);
    leaveSeat(room, handle.s);
  });
}

/** A move made on the tablet for the seat on the clock. */
export async function playMove(token: string | null, seat: number, action: GameAction): Promise<TableView> {
  const handle = requireHandle(token, ['h']);
  const { room, now } = await mutate(handle, (r, at) => playFor(r, seat, action, at));
  return tableView(room, now, ticketsFor(room, handle.d));
}

/** A phone answering its own seat's park decision: visit, reserve, buy gear or pass. Nothing else. */
export async function choosePark(token: string | null, action: GameAction): Promise<SeatView> {
  const handle = requireHandle(token, ['s']);
  if (handle.k !== 's') throw new RoomError('Not a seat', 401);
  const { room, now } = await mutate(handle, (r, at) => {
    checkSeat(r, handle);
    playForPhone(r, handle.s, action, at);
  });
  return seatView(room, handle.s, now);
}

export type TableCommand =
  | { type: 'settings'; settings: Partial<RoomSettings> }
  | { type: 'rename'; seat: number; name: string }
  | { type: 'edge'; seat: number }
  | { type: 'free'; seat: number }
  | { type: 'start' }
  | { type: 'nextSeason' }
  /** Takes back the latest action made on the tablet, within a few seconds of it. */
  | { type: 'undo' };

/** Everything else the tablet does. */
export async function controlGame(token: string | null, command: TableCommand): Promise<TableView> {
  const handle = requireHandle(token, ['h']);
  const { room, now } = await mutate(handle, (r, at) => {
    switch (command?.type) {
      case 'settings':
        changeSettings(r, command.settings ?? {});
        break;
      case 'rename':
        renameSeat(r, Number(command.seat), command.name);
        break;
      case 'edge':
        cycleEdge(r, Number(command.seat));
        break;
      case 'free':
        freeSeat(r, Number(command.seat), at);
        break;
      case 'start':
        startGame(r, at);
        break;
      case 'nextSeason':
        nextSeason(r, at);
        break;
      case 'undo':
        undoLast(r, at);
        break;
      default:
        throw new RoomError('Unknown command', 400);
    }
  });
  return tableView(room, now, ticketsFor(room, handle.d));
}

/**
 * The tablet walking away from a game. Its data is deleted at once; the
 * database itself is Upstash's to remove, which it does to unclaimed ones
 * after three days.
 */
export async function abandonGame(token: string | null): Promise<void> {
  const handle = requireHandle(token, ['h']);
  await storeFor(handle.d).remove(handle.g);
}
