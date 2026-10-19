import 'server-only';

import { TransportError } from './net-errors';
import type { RedisCreds } from './redis';

/**
 * A fresh Upstash Redis database for every game, from one HTTP request.
 *
 * `POST https://upstash.com/start-redis` needs no account and no API key: it
 * answers with a short markdown page naming the new database's REST endpoint
 * and token. Unclaimed databases are deleted after three days, which is far
 * longer than a game, so nothing has to clean up after an abandoned table.
 *
 * The Idempotency-Key is a fresh UUID per game. Re-sending the same key returns
 * the same database, which makes the call safe to retry — and makes that key a
 * credential in its own right, so it never leaves the server.
 */

export const START_REDIS_URL = () => process.env.UPSTASH_START_REDIS_URL ?? 'https://upstash.com/start-redis';
const USER_AGENT = 'tablet-parks';

export interface Provisioned extends RedisCreds {
  id: string;
  expires: string | null;
}

/** Pull `**Label:** value` out of the markdown start-redis returns. */
function field(markdown: string, label: string): string | undefined {
  const match = markdown.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i'));
  return match?.[1].trim();
}

/**
 * Unwraps `[text](url)` links and backticks, drops trailing punctuation, and
 * adds https:// when the scheme is missing.
 */
export function normalizeEndpoint(raw: string): string {
  let value = raw.trim();
  const link = value.match(/\]\((https?:\/\/[^)\s]+)\)/) ?? value.match(/<(https?:\/\/[^>\s]+)>/);
  if (link) value = link[1];
  value = value.replace(/[`*[\]<>]/g, '').split(/\s/)[0].replace(/[.,;:)]+$/, '');
  if (value && !/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value.replace(/\/+$/, '');
}

export function parseStartRedis(markdown: string, fallbackId: string): Provisioned {
  const rawUrl = field(markdown, 'Endpoint') ?? markdown.match(/https:\/\/[\w-]+\.upstash\.io/)?.[0];
  const token = field(markdown, 'Token')?.replace(/[`*]/g, '').split(/\s/)[0];
  if (!rawUrl || !token) {
    throw new Error('start-redis answered without an endpoint and token');
  }
  const url = normalizeEndpoint(rawUrl);
  if (!/^https?:\/\/[^/\s]+/.test(url)) throw new Error('start-redis answered with an endpoint that is not a URL');
  const id = field(markdown, 'Database ID')?.replace(/[`*]/g, '').split(/\s/)[0] ?? fallbackId;
  const expires = field(markdown, 'Expires')?.replace(/\.$/, '') ?? null;
  return { url, token, id, expires };
}

export async function provisionDatabase(): Promise<Provisioned> {
  const id = crypto.randomUUID();
  const target = START_REDIS_URL();
  let response: Response | null = null;
  // Same key, same database: a retry after a dropped connection cannot make a second one.
  for (let attempt = 0; attempt < 2 && !response; attempt++) {
    try {
      response = await fetch(target, {
        method: 'POST',
        headers: { 'Idempotency-Key': id, 'User-Agent': USER_AGENT },
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      if (attempt === 1) throw new TransportError(target, err);
    }
  }
  const body = await response!.text();
  if (!response!.ok) {
    console.error(`[start-redis] HTTP ${response!.status}: ${body.slice(0, 200)}`);
    throw new Error(`start-redis answered ${response!.status}`);
  }
  return parseStartRedis(body, id);
}
