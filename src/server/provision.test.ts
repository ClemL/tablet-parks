import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { normalizeEndpoint, parseStartRedis, provisionDatabase } from './provision';
import { command } from './redis';
import { startMockUpstash, type MockUpstash } from '../../scripts/mock-upstash.mjs';

/** The shape start-redis answers with (see the upstash-redis-demo repo). */
const SAMPLE = `# Redis database created

Your database is ready. Claim it within 3 days or it is deleted.

**Database ID:** \`0b0a3c9e-5f1d-4f7a-9d35-1a2b3c4d5e6f\`
**Endpoint:** [https://usw1-quiet-heron-41234.upstash.io](https://usw1-quiet-heron-41234.upstash.io)
**Token:** \`AX8nAAIjcDE5ZTg0NjE4ZjBmMzA0YmE0\`
**Metrics:** https://upstash.com/start-redis/metrics/0b0a3c9e
**Expires:** Wed, 22 Oct 2026 04:00:00 GMT.
`;

describe('reading start-redis', () => {
  it('finds the endpoint, token, id and expiry', () => {
    const db = parseStartRedis(SAMPLE, 'fallback');
    expect(db.url).toBe('https://usw1-quiet-heron-41234.upstash.io');
    expect(db.token).toBe('AX8nAAIjcDE5ZTg0NjE4ZjBmMzA0YmE0');
    expect(db.id).toBe('0b0a3c9e-5f1d-4f7a-9d35-1a2b3c4d5e6f');
    expect(db.expires).toBe('Wed, 22 Oct 2026 04:00:00 GMT');
  });

  it('falls back to the key it sent when no id comes back', () => {
    const db = parseStartRedis(SAMPLE.replace(/\*\*Database ID.*\n/, ''), 'my-key');
    expect(db.id).toBe('my-key');
  });

  it('refuses an answer with no credentials', () => {
    expect(() => parseStartRedis('# Rate limited\n\nTry again later.', 'k')).toThrow(/endpoint and token/);
  });

  it('tidies the many ways markdown can wrap a URL', () => {
    expect(normalizeEndpoint('`usw1-x.upstash.io`')).toBe('https://usw1-x.upstash.io');
    expect(normalizeEndpoint('<https://usw1-x.upstash.io/>.')).toBe('https://usw1-x.upstash.io');
    expect(normalizeEndpoint('[here](https://usw1-x.upstash.io)')).toBe('https://usw1-x.upstash.io');
    expect(normalizeEndpoint('http://127.0.0.1:3299/db/2')).toBe('http://127.0.0.1:3299/db/2');
  });
});

const redisAvailable = Boolean(process.env.REDIS_PORT) || spawnSync('redis-server', ['--version']).status === 0;

describe.skipIf(!redisAvailable)('provisioning against a stand-in Upstash', () => {
  let mock: MockUpstash;
  beforeAll(async () => {
    mock = await startMockUpstash();
    process.env.UPSTASH_START_REDIS_URL = `${mock.base}/start-redis`;
  });
  afterAll(async () => {
    delete process.env.UPSTASH_START_REDIS_URL;
    await mock.stop();
  });

  it('gets a database it can talk to, and a different one each time', async () => {
    const a = await provisionDatabase();
    const b = await provisionDatabase();
    expect(a.url).not.toBe(b.url);
    expect(await command(a, ['PING'])).toBe('PONG');
    await command(a, ['SET', 'only-in-a', '1']);
    expect(await command(b, ['GET', 'only-in-a'])).toBeNull();
    expect(await command(a, ['GET', 'only-in-a'])).toBe('1');
  });

  it('is refused with the wrong token', async () => {
    const db = await provisionDatabase();
    await expect(command({ ...db, token: 'nope' }, ['PING'])).rejects.toThrow(/Unauthorized/);
  });
});
