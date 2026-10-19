import 'server-only';

import { TransportError, hostOf, isConnectPhaseError } from './net-errors';

/**
 * Upstash's REST API: one HTTPS POST per command, with the command as a JSON
 * array. No socket to keep open, so it works from a serverless function, and
 * the same few lines talk to a start-redis database, a Vercel Marketplace one,
 * or the mock the browser tests run.
 */

export interface RedisCreds {
  url: string;
  token: string;
}

export type Command = (string | number)[];

export class RedisError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RedisError';
  }
}

/** A connect-phase failure never sent the request, so retrying cannot apply a write twice. */
const RETRY_DELAYS_MS = [300, 900];
const TIMEOUT_MS = 8000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function command(creds: RedisCreds, args: Command): Promise<unknown> {
  const target = creds.url.replace(/\/+$/, '');
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(target, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args.map(String)),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < RETRY_DELAYS_MS.length && isConnectPhaseError(err)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const error = new TransportError(target, err);
      console.error(`[redis] ${String(args[0])} ${hostOf(target)}: ${error.message}`);
      throw error;
    }
    const body = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!response.ok || body.error) {
      const message = body.error ?? `HTTP ${response.status}`;
      console.error(`[redis] ${String(args[0])} ${hostOf(target)}: ${message}`);
      throw new RedisError(message, response.status);
    }
    return body.result ?? null;
  }
}

/**
 * Waits for a database that was created a moment ago to answer. A new
 * start-redis endpoint can take a few seconds to appear in DNS, and until it
 * does every call fails — a PING is safe to repeat, so keep asking.
 */
export async function waitUntilReachable(creds: RedisCreds, budgetMs = 20_000): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let lastError: unknown;
  for (let delay = 400; Date.now() < deadline; delay = Math.min(delay * 1.6, 3000)) {
    try {
      if ((await command(creds, ['PING'])) === 'PONG') return;
    } catch (err) {
      lastError = err;
      // A token the database refuses will not start working by waiting.
      if (err instanceof RedisError && (err.status === 401 || err.status === 403)) throw err;
    }
    await sleep(delay);
  }
  throw lastError instanceof Error ? lastError : new Error('The new database did not answer in time');
}
