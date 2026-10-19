import { describe, expect, it } from 'vitest';
import { open, seal, type Handle } from './seal';

const db = { u: 'https://usw1-quiet-heron-41234.upstash.io', t: 'AX8nAAIjcDE5ZTg0NjE4ZjBmMzA0YmE0OWQ2NDcxOGZjNWZmMGY0OHAxMA' };

describe('sealed handles', () => {
  it('opens what it sealed', () => {
    const handles: Handle[] = [
      { k: 'h', g: 'K7MPQ', d: db },
      { k: 't', g: 'K7MPQ', d: db, s: 3 },
      { k: 's', g: 'K7MPQ', d: { m: 1 }, s: 0, n: 'abc' },
    ];
    for (const handle of handles) expect(open(seal(handle))).toEqual(handle);
  });

  it('keeps the credentials out of sight', () => {
    const token = seal({ k: 't', g: 'K7MPQ', d: db, s: 1 });
    expect(token).not.toContain('upstash');
    expect(Buffer.from(token, 'base64url').toString('latin1')).not.toContain(db.t);
  });

  it('seals the same handle to the same string, so a QR code holds still', () => {
    const handle: Handle = { k: 't', g: 'K7MPQ', d: db, s: 2 };
    expect(seal(handle)).toBe(seal(handle));
    expect(seal(handle)).not.toBe(seal({ ...handle, s: 3 }));
  });

  it('refuses anything altered by a single bit', () => {
    const token = seal({ k: 't', g: 'K7MPQ', d: db, s: 1 });
    const raw = Buffer.from(token, 'base64url');
    for (const at of [1, 14, raw.length - 20, raw.length - 1]) {
      const bent = Buffer.from(raw);
      bent[at] ^= 1;
      expect(open(bent.toString('base64url'))).toBeNull();
    }
  });

  it('refuses garbage without throwing', () => {
    for (const junk of [null, undefined, '', 'not a token', 'AAAA', '!'.repeat(40), 'A'.repeat(5000)]) {
      expect(open(junk)).toBeNull();
    }
  });

  it('stays short enough for a seat’s QR code', () => {
    // A real start-redis endpoint and token are about this long.
    const token = seal({ k: 't', g: 'K7MPQ', d: db, s: 4 });
    expect(token.length).toBeLessThan(260);
  });
});
