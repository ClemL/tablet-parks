import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { legalMoves } from '@/game/engine';
import { actorOf, newRoom, normalizeSettings, type SeatView, type TableView } from '@/room/room';
import { startMockUpstash, type MockUpstash } from '../../scripts/mock-upstash.mjs';
import { open, seal } from './seal';
import { provisionDatabase } from './provision';
import { RedisStore, GAME_TTL_SECONDS } from './store';
import {
  RoomError,
  abandonGame,
  choosePark,
  controlGame,
  createGame,
  joinGame,
  leaveGame,
  playMove,
  readGame,
  type PollResult,
} from './service';

const redisAvailable = Boolean(process.env.REDIS_PORT) || spawnSync('redis-server', ['--version']).status === 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function full(result: PollResult): TableView | SeatView {
  if ('unchanged' in result) throw new Error('expected a full view');
  return result;
}

async function rejects(promise: Promise<unknown>, status: number): Promise<void> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(RoomError);
  expect((error as RoomError).status).toBe(status);
}

describe.skipIf(!redisAvailable)('a game round a tablet, each in its own database', () => {
  let mock: MockUpstash;
  beforeAll(async () => {
    mock = await startMockUpstash();
    process.env.UPSTASH_START_REDIS_URL = `${mock.base}/start-redis`;
  });
  afterAll(async () => {
    delete process.env.UPSTASH_START_REDIS_URL;
    await mock.stop();
  });

  it('provisions a fresh database for every new game', async () => {
    const before = mock.provisioned();
    const a = await createGame({ seats: 3 });
    const b = await createGame({ seats: 3 });
    expect(mock.provisioned()).toBe(before + 2);
    expect(a.view.db.source).toBe('start-redis');
    expect(a.view.db.expires).toMatch(/GMT/);
    const ha = open(a.host)!;
    const hb = open(b.host)!;
    expect(ha.d).not.toEqual(hb.d);
    // The tablet is told a fingerprint, never the database id or token.
    expect(JSON.stringify(a.view)).not.toContain('upstash');
    expect(JSON.stringify(a.view)).not.toContain((ha.d as { t: string }).t);
  });

  it('plays from lobby to the computer’s first moves', async () => {
    const { host, view } = await createGame({ seats: 3, pace: 'brisk' });
    expect(view.phase).toBe('lobby');
    expect(view.tickets).toHaveLength(3);

    // A phone scans seat 1's code.
    const joined = await joinGame(view.tickets[0], 'Kris');
    expect(joined.view.seat).toBe(0);
    expect(joined.view.seats[0]).toMatchObject({ name: 'Kris', kind: 'human', phone: true });

    const lobby = full(await readGame(host)) as TableView;
    expect(lobby.seats[0].name).toBe('Kris');
    // Nothing changed since: one short read.
    expect(await readGame(host, lobby.version)).toEqual({ version: lobby.version, unchanged: true });

    const started = await controlGame(host, { type: 'start' });
    expect(started.phase).toBe('playing');
    expect(started.seats.map((s) => s.kind)).toEqual(['human', 'cpu', 'cpu']);
    expect(actorOf(started.game!)).toBe(0);

    // The tablet moves Kris's hiker; then the computers are on the clock.
    const move = legalMoves(started.game!)[0];
    let table = await playMove(host, 0, { type: 'move', ...move });
    // Answer any decision the move opened, the simple way.
    for (let i = 0; i < 6 && table.actor === 0 && table.game!.pending; i++) {
      const pending = table.game!.pending!;
      const pass =
        pending.kind === 'camera'
          ? pending.stage === 'take-photo'
            ? { type: 'camera-photo' as const, take: false }
            : { type: 'camera' as const, option: 'take-bottle' as const }
          : pending.kind === 'tent'
            ? { type: 'tent' as const, option: 'site' as const }
            : pending.kind === 'copy-site'
              ? { type: 'copy-skip' as const }
              : { type: 'swap-done' as const };
      table = await playMove(host, 0, pass);
    }
    expect(table.cpuThinking).toBe(true);
    const version = table.version;

    await sleep(1000);
    const later = full(await readGame(host, version)) as TableView;
    expect(later.version).toBeGreaterThan(version);
    expect(later.game!.log.length).toBeGreaterThan(table.game!.log.length);

    // The phone sees its own bonus cards; the tablet sees none.
    const phone = full(await readGame(joined.seat)) as SeatView;
    expect(phone.game!.players[0].bonusCards.every((c) => c !== 'hidden')).toBe(true);
    expect(later.game!.players[0].bonusCards.every((c) => c === 'hidden')).toBe(true);
  });

  it('lets only the tablet move, and only the latest phone read a seat', async () => {
    const { host, view } = await createGame({ seats: 2 });
    const first = await joinGame(view.tickets[1], 'Srini');
    const started = await controlGame(host, { type: 'start' });
    const move = legalMoves(started.game!)[0];

    // A phone's handle and a seat's QR code cannot move a hiker.
    await rejects(playMove(first.seat, started.actor!, { type: 'move', ...move }), 401);
    await rejects(playMove(view.tickets[1], started.actor!, { type: 'move', ...move }), 401);
    // A QR code is for joining, not for reading the game.
    await rejects(readGame(view.tickets[1]), 401);

    // A second scan of the same seat takes it over; the first phone is told.
    const second = await joinGame(view.tickets[1], '');
    expect(full(await readGame(second.seat)).seats[1].name).toBe('Srini');
    await rejects(readGame(first.seat), 403);
  });

  it('lets a phone answer its own park decision, and only that', async () => {
    const { host, view } = await createGame({ seats: 2 });
    const phones = [await joinGame(view.tickets[0], 'Kris'), await joinGame(view.tickets[1], 'Srini')];
    const started = await controlGame(host, { type: 'start' });
    const seat = started.actor!;
    const end = started.game!.trail.length - 1;
    const hiker = started.game!.players[seat].hikers[0].id;
    await playMove(host, seat, { type: 'move', hikerId: hiker, to: end });

    const skip = { type: 'trail-end', option: 'skip' } as const;
    // Not the tablet's handle, not a QR code, not the other player's phone.
    await rejects(choosePark(host, skip), 401);
    await rejects(choosePark(view.tickets[seat], skip), 401);
    await rejects(choosePark(phones[1 - seat].seat, skip), 409);

    const answered = await choosePark(phones[seat].seat, skip);
    expect(answered.role).toBe('seat');
    expect(answered.seat).toBe(seat);
    expect(answered.game!.pending).toBeNull();
  });

  it('refuses forged and foreign handles', async () => {
    const a = await createGame({ seats: 2 });
    const handle = open(a.host)!;
    await rejects(readGame('not-a-handle'), 401);
    // Sealed by this server, but naming a game that is not in that database.
    await rejects(readGame(seal({ ...handle, g: 'ZZZZZ' })), 410);
  });

  it('keeps both of two simultaneous commands', async () => {
    const { host, view } = await createGame({ seats: 4 });
    const results = await Promise.all([
      controlGame(host, { type: 'rename', seat: 1, name: 'Teja' }),
      controlGame(host, { type: 'rename', seat: 2, name: 'Parth' }),
      controlGame(host, { type: 'edge', seat: 3 }),
    ]);
    const after = full(await readGame(host)) as TableView;
    expect(after.version).toBe(view.version + 3);
    expect(after.seats[1].name).toBe('Teja');
    expect(after.seats[2].name).toBe('Parth');
    expect(after.seats[3].edge).not.toBe(view.seats[3].edge);
    expect(results).toHaveLength(3);
  });

  it('lets a phone give its seat back', async () => {
    const { host, view } = await createGame({ seats: 2 });
    const joined = await joinGame(view.tickets[0], 'Sherman');
    await leaveGame(joined.seat);
    const after = full(await readGame(host)) as TableView;
    expect(after.seats[0].kind).toBe('open');
    await rejects(readGame(joined.seat), 403);
  });

  it('forgets an abandoned game at once', async () => {
    const { host, view } = await createGame({ seats: 2 });
    const joined = await joinGame(view.tickets[0], 'Steven');
    await abandonGame(host);
    await rejects(readGame(host), 410);
    await rejects(readGame(joined.seat), 410);
  });

  it('runs the compare-and-set in Redis: of two writers on one version, exactly one lands', async () => {
    const db = await provisionDatabase();
    const store = new RedisStore(db);
    const room = newRoom('RACE1', normalizeSettings({ seats: 2 }), { source: 'start-redis', label: 'x', expires: null }, 1, 1);
    expect(await store.create(room, GAME_TTL_SECONDS)).toBe(true);
    expect(await store.create(room, GAME_TTL_SECONDS)).toBe(false);
    expect(await store.peek('RACE1')).toEqual({ version: 1, dueAt: 0 });

    const a = { ...room, version: 2, cpuDueAt: 5 };
    const b = { ...room, version: 2, cpuDueAt: 9 };
    const outcomes = await Promise.all([store.compareAndSet(a, 1, 60), store.compareAndSet(b, 1, 60)]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    const peek = await store.peek('RACE1');
    expect(peek?.version).toBe(2);
    expect([5, 9]).toContain(peek?.dueAt);
    // A stale writer is turned away.
    expect(await store.compareAndSet({ ...room, version: 3 }, 1, 60)).toBe(false);
    expect((await store.load('RACE1'))?.version).toBe(2);
    expect(await store.peek('NOPE')).toBeNull();
  });
});

describe('where a game lives when start-redis cannot be reached', () => {
  const saved = { ...process.env };
  afterEach(() => {
    for (const key of ['UPSTASH_START_REDIS_URL', 'PARKS_STORE', 'NODE_ENV', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
      if (saved[key] === undefined) delete process.env[key];
      else (process.env as Record<string, string>)[key] = saved[key]!;
    }
  });

  it('falls back to process memory on a laptop', async () => {
    process.env.UPSTASH_START_REDIS_URL = 'http://127.0.0.1:9/start-redis';
    delete process.env.UPSTASH_REDIS_REST_URL;
    const { host, view } = await createGame({ seats: 2 });
    expect(view.db.source).toBe('memory');
    expect(full(await readGame(host)).phase).toBe('lobby');
  });

  it('refuses rather than use process memory on a deployment', async () => {
    process.env.UPSTASH_START_REDIS_URL = 'http://127.0.0.1:9/start-redis';
    delete process.env.UPSTASH_REDIS_REST_URL;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    await rejects(createGame({ seats: 2 }), 503);
  });

  it('uses memory outright when told to', async () => {
    process.env.PARKS_STORE = 'memory';
    const { view } = await createGame({ seats: 5 });
    expect(view.db.source).toBe('memory');
    expect(view.seats).toHaveLength(5);
  });
});
