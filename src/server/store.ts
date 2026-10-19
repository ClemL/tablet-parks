import 'server-only';

import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { Room } from '@/room/room';
import { command, type RedisCreds } from './redis';

/**
 * Game persistence: one key per game.
 *
 *   parks:game:<id>  "v<version>;d<cpuDueAt>;<deflated JSON of the room>"
 *
 * The version and the computer's next due time sit in plain text in front, so
 * the poll every device runs once a second or two can read them with a
 * GETRANGE of a few dozen bytes and stop there, which is nearly always. The
 * room behind them is deflated: late in a game it is ~30 KB of JSON, ~6 KB
 * packed. Writes are a compare-and-set on the version, in Lua, because the
 * REST API has no WATCH across calls.
 */

export interface Peek {
  version: number;
  dueAt: number;
}

export interface GameStore {
  /** Fails when the id is already taken. */
  create(room: Room, ttlSeconds: number): Promise<boolean>;
  peek(id: string): Promise<Peek | null>;
  load(id: string): Promise<Room | null>;
  /** Writes only if the stored version is still `expected`. */
  compareAndSet(room: Room, expected: number, ttlSeconds: number): Promise<boolean>;
  remove(id: string): Promise<void>;
}

/** A game is forgotten a day after its last move: that is what "abandoned" means here. */
export const GAME_TTL_SECONDS = 24 * 60 * 60;
/** A finished game stays long enough for everyone to read the scores. */
export const FINISHED_TTL_SECONDS = 6 * 60 * 60;

export const gameKey = (id: string) => `parks:game:${id}`;

const PREFIX = /^v(\d+);d(\d+);/;

export function encodeRoom(room: Room): string {
  return `v${room.version};d${Math.max(0, Math.floor(room.cpuDueAt))};${deflateRawSync(JSON.stringify(room)).toString('base64')}`;
}

export function decodeRoom(raw: string): Room {
  const prefix = PREFIX.exec(raw);
  if (!prefix) throw new Error('Not a stored game');
  return JSON.parse(inflateRawSync(Buffer.from(raw.slice(prefix[0].length), 'base64')).toString('utf8')) as Room;
}

export function peekPrefix(raw: string): Peek | null {
  const prefix = PREFIX.exec(raw);
  return prefix ? { version: Number(prefix[1]), dueAt: Number(prefix[2]) } : null;
}

/** The first bytes cover the longest prefix: two 15-digit numbers and their markers. */
const PEEK_BYTES = 40;

export const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current == false then return 0 end
local version = string.match(current, '^v(%d+);')
if version == nil or tonumber(version) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`.trim();

export class RedisStore implements GameStore {
  constructor(private creds: RedisCreds) {}

  async create(room: Room, ttlSeconds: number): Promise<boolean> {
    const result = await command(this.creds, ['SET', gameKey(room.id), encodeRoom(room), 'NX', 'EX', ttlSeconds]);
    return result === 'OK';
  }

  async peek(id: string): Promise<Peek | null> {
    const raw = await command(this.creds, ['GETRANGE', gameKey(id), 0, PEEK_BYTES - 1]);
    return typeof raw === 'string' && raw ? peekPrefix(raw) : null;
  }

  async load(id: string): Promise<Room | null> {
    const raw = await command(this.creds, ['GET', gameKey(id)]);
    return typeof raw === 'string' ? decodeRoom(raw) : null;
  }

  async compareAndSet(room: Room, expected: number, ttlSeconds: number): Promise<boolean> {
    const result = await command(this.creds, ['EVAL', CAS_SCRIPT, 1, gameKey(room.id), expected, encodeRoom(room), ttlSeconds]);
    return Number(result) === 1;
  }

  async remove(id: string): Promise<void> {
    await command(this.creds, ['DEL', gameKey(id)]);
  }
}

/**
 * Process memory, for local runs and the unit tests. On a deployment each
 * function instance would hold its own copy, so the service only falls back to
 * it outside production. Kept on globalThis because Next bundles each route
 * separately, and they must all see the same games.
 */
export class MemoryStore implements GameStore {
  private get data(): Map<string, { raw: string; expiresAt: number }> {
    const holder = globalThis as { __parksMemoryStore?: Map<string, { raw: string; expiresAt: number }> };
    holder.__parksMemoryStore ??= new Map();
    return holder.__parksMemoryStore;
  }

  private read(id: string): string | null {
    const entry = this.data.get(gameKey(id));
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.data.delete(gameKey(id));
      return null;
    }
    return entry.raw;
  }

  async create(room: Room, ttlSeconds: number): Promise<boolean> {
    if (this.read(room.id)) return false;
    this.data.set(gameKey(room.id), { raw: encodeRoom(room), expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  async peek(id: string): Promise<Peek | null> {
    const raw = this.read(id);
    return raw ? peekPrefix(raw) : null;
  }

  async load(id: string): Promise<Room | null> {
    const raw = this.read(id);
    return raw ? decodeRoom(raw) : null;
  }

  async compareAndSet(room: Room, expected: number, ttlSeconds: number): Promise<boolean> {
    const raw = this.read(room.id);
    if (!raw || peekPrefix(raw)?.version !== expected) return false;
    this.data.set(gameKey(room.id), { raw: encodeRoom(room), expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }

  async remove(id: string): Promise<void> {
    this.data.delete(gameKey(id));
  }
}
