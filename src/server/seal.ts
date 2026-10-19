import 'server-only';

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Sealed handles: the only thing a tablet or phone holds.
 *
 * Every game lives in a database of its own, so the server has nowhere to look
 * up which database a request is about — the request has to carry it. A handle
 * carries the database's address and token, the game, and who is asking, all
 * encrypted and authenticated with a key only the server has. A device can
 * neither read the credentials out of its handle (and go round the server to
 * read everyone's bonus cards) nor forge one (and point the server at a host of
 * its choosing).
 *
 * AES-256-GCM, with the IV derived from the plaintext (an HMAC of it), so the
 * same handle always seals to the same string. That keeps a seat's QR code
 * still from one poll to the next, and is safe because a given IV is only
 * ever used for the one plaintext it was derived from.
 */

/** Where a game's data lives: a Redis REST endpoint, or this process's memory. */
export type DbRef = { u: string; t: string } | { m: 1 };

export type Handle =
  /** The tablet: may do anything at its game. */
  | { k: 'h'; g: string; d: DbRef }
  /** A seat's QR code: lets whoever scans it take that seat. */
  | { k: 't'; g: string; d: DbRef; s: number }
  /** A phone in a seat. Only good while `n` is the seat's current device. */
  | { k: 's'; g: string; d: DbRef; s: number; n: string };

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let devSecret: string | null = null;

/**
 * TABLE_SECRET when the deployment sets one; otherwise the key minted for this
 * build (see next.config.ts). Outside a Next build — unit tests, scripts — a
 * random key for the life of the process.
 */
function secret(): string {
  const configured = process.env.TABLE_SECRET?.trim() || process.env.PARKS_BUILD_SECRET;
  if (configured) return configured;
  devSecret ??= randomBytes(32).toString('base64url');
  return devSecret;
}

let cached: { from: string; enc: Buffer; iv: Buffer } | null = null;

function keys(): { enc: Buffer; iv: Buffer } {
  const from = secret();
  if (cached?.from !== from) {
    const derive = (info: string) => Buffer.from(hkdfSync('sha256', from, 'tablet-parks', info, 32));
    cached = { from, enc: derive('seal/enc'), iv: derive('seal/iv') };
  }
  return cached;
}

export function seal(handle: Handle): string {
  const { enc, iv: ivKey } = keys();
  const plain = Buffer.from(JSON.stringify(handle), 'utf8');
  const iv = createHmac('sha256', ivKey).update(plain).digest().subarray(0, IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', enc, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, body, cipher.getAuthTag()]).toString('base64url');
}

function isDbRef(value: unknown): value is DbRef {
  if (typeof value !== 'object' || value === null) return false;
  const ref = value as Record<string, unknown>;
  return ref.m === 1 || (typeof ref.u === 'string' && typeof ref.t === 'string');
}

/** The handle inside a sealed string, or null for anything forged, damaged or sealed under another key. */
export function open(token: string | null | undefined): Handle | null {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const raw = Buffer.from(token, 'base64url');
  if (raw.length < 1 + IV_BYTES + TAG_BYTES + 2 || raw[0] !== VERSION) return null;
  const iv = raw.subarray(1, 1 + IV_BYTES);
  const tag = raw.subarray(raw.length - TAG_BYTES);
  const body = raw.subarray(1 + IV_BYTES, raw.length - TAG_BYTES);
  try {
    const decipher = createDecipheriv('aes-256-gcm', keys().enc, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]);
    const parsed = JSON.parse(plain.toString('utf8')) as Handle;
    if (typeof parsed?.g !== 'string' || !isDbRef(parsed.d)) return null;
    if (parsed.k === 'h') return parsed;
    if ((parsed.k === 't' || parsed.k === 's') && Number.isInteger(parsed.s)) {
      if (parsed.k === 's' && typeof parsed.n !== 'string') return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** True when the deployment pins its own key, so a redeploy keeps games alive. */
export function secretConfigured(): boolean {
  return Boolean(process.env.TABLE_SECRET?.trim());
}
