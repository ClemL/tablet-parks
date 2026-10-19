import 'server-only';

import { RoomError } from '@/room/room';
import { TransportError } from './net-errors';
import { RedisError } from './redis';

/**
 * The handle travels in the Authorization header rather than the URL, so it
 * stays out of request logs and browser history.
 */
export function bearer(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  return match ? match[1] : null;
}

export async function body<T>(request: Request): Promise<Partial<T>> {
  try {
    const parsed = (await request.json()) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function fail(error: unknown): Response {
  if (error instanceof RoomError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof TransportError || error instanceof RedisError) {
    return Response.json({ error: 'The game’s database did not answer — trying again' }, { status: 503 });
  }
  console.error('[games]', error);
  return Response.json({ error: 'Something went wrong on the server' }, { status: 500 });
}

type LimitKind = 'create' | 'join';

/**
 * Per-instance throttles on the two calls that cost something: a new game
 * provisions a database at Upstash, and a join takes a seat. Everything else
 * needs a sealed handle, which a passer-by cannot make. On a deployment each
 * function instance counts on its own, so this slows a loop down rather than
 * holding a hard line.
 */
const LIMITS: Record<LimitKind, { tokens: number; windowMs: number }> = {
  create: { tokens: 12, windowMs: 10 * 60_000 },
  // A table of phones shares one Wi-Fi address, and a dead phone rescans.
  join: { tokens: 40, windowMs: 10 * 60_000 },
};

/** PARKS_RATE_LIMIT scales both allowances; the browser tests open many games from one address. */
function allowance(kind: LimitKind): number {
  const scale = Number(process.env.PARKS_RATE_LIMIT ?? '1');
  return LIMITS[kind].tokens * (Number.isFinite(scale) && scale > 0 ? scale : 1);
}

const hits = new Map<string, number[]>();

export function limit(kind: LimitKind, request: Request): void {
  const forwarded = request.headers.get('x-forwarded-for');
  const client = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const key = `${kind}:${client}`;
  const now = Date.now();
  const { windowMs } = LIMITS[kind];
  const tokens = allowance(kind);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= tokens) {
    hits.set(key, recent);
    throw new RoomError('Too many attempts from this network — wait a few minutes', 429);
  }
  recent.push(now);
  hits.set(key, recent);
}
