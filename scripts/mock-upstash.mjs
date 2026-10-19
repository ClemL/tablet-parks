#!/usr/bin/env node
/**
 * A stand-in for Upstash, for the tests: `POST /start-redis` answers the way
 * the real one does — a markdown page naming a database's REST endpoint and
 * token — and that endpoint speaks Upstash's REST protocol in front of a real
 * redis-server. Each Idempotency-Key gets a database of its own (a Redis
 * logical database, selected per request), and the same key gets the same one
 * back, as it does at Upstash.
 *
 * So a test can provision, poll and compare-and-set exactly as production
 * does, Lua included, with no account and no network.
 *
 *   node scripts/mock-upstash.mjs --port 3299
 *
 * Uses the redis-server on REDIS_PORT when that is set (CI runs one as a
 * service); otherwise spawns its own.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createConnection, createServer as createTcpServer } from 'node:net';

const LOGICAL_DATABASES = 15;

async function freePort() {
  const probe = createTcpServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

/** Just enough RESP to talk to Redis without a client library. */
function encode(command) {
  const parts = command.map((arg) => {
    const value = String(arg);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  });
  return `*${command.length}\r\n${parts.join('')}`;
}

/** The parsed reply and where it ends, or null while it is still arriving. */
function parse(buffer, at = 0) {
  const lineEnd = buffer.indexOf('\r\n', at);
  if (lineEnd < 0) return null;
  const kind = String.fromCharCode(buffer[at]);
  const head = buffer.toString('utf8', at + 1, lineEnd);
  const after = lineEnd + 2;
  if (kind === '+') return { value: head, end: after };
  if (kind === '-') return { value: { error: head }, end: after };
  if (kind === ':') return { value: Number(head), end: after };
  if (kind === '$') {
    const length = Number(head);
    if (length < 0) return { value: null, end: after };
    if (buffer.length < after + length + 2) return null;
    return { value: buffer.toString('utf8', after, after + length), end: after + length + 2 };
  }
  if (kind === '*') {
    const count = Number(head);
    if (count < 0) return { value: null, end: after };
    const items = [];
    let cursor = after;
    for (let i = 0; i < count; i++) {
      const item = parse(buffer, cursor);
      if (!item) return null;
      items.push(item.value);
      cursor = item.end;
    }
    return { value: items, end: cursor };
  }
  throw new Error(`unexpected reply ${buffer.toString('utf8', at, at + 20)}`);
}

/**
 * Runs commands on one fresh connection after selecting the database. A
 * connection per request keeps two requests in flight from reading each
 * other's replies.
 */
function run(redisPort, database, commands) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: redisPort });
    let buffer = Buffer.alloc(0);
    const expected = commands.length + 1;
    socket.on('connect', () => socket.write([['SELECT', database], ...commands].map(encode).join('')));
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const replies = [];
      let cursor = 0;
      while (replies.length < expected) {
        const reply = parse(buffer, cursor);
        if (!reply) return;
        replies.push(reply.value);
        cursor = reply.end;
      }
      socket.end();
      resolve(replies.slice(1));
    });
    socket.on('error', reject);
  });
}

async function startRedis() {
  const external = Number(process.env.REDIS_PORT ?? '') || null;
  if (external) return { port: external, stop: async () => {} };
  if (spawnSync('redis-server', ['--version']).status !== 0) {
    throw new Error('mock-upstash needs redis-server on the PATH, or REDIS_PORT pointing at one');
  }
  const port = await freePort();
  const child = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      const [pong] = await run(port, 0, [['PING']]);
      if (pong === 'PONG') break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  return {
    port,
    stop: async () => {
      child.kill();
    },
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/**
 * Starts the mock. Returns its base URL, a counter of databases handed out,
 * and a way to stop it.
 */
export async function startMockUpstash({ port = 0 } = {}) {
  const redis = await startRedis();
  /** Idempotency-Key → { index, token } */
  const databases = new Map();
  /** Logical database → the database now living there. Indexes are reused after 15. */
  const byIndex = new Map();
  let next = 1;
  let base = '';

  const server = createServer(async (request, response) => {
    const send = (status, payload, type = 'application/json') => {
      response.writeHead(status, { 'Content-Type': type });
      response.end(type === 'application/json' ? JSON.stringify(payload) : payload);
    };
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') return send(200, { ok: true });

      if (request.method === 'POST' && url.pathname === '/start-redis') {
        const key = request.headers['idempotency-key'];
        if (typeof key !== 'string' || !key) return send(400, 'Idempotency-Key required', 'text/markdown');
        let db = databases.get(key);
        if (!db) {
          db = { index: next, token: randomBytes(24).toString('base64url') };
          next = (next % LOGICAL_DATABASES) + 1;
          databases.set(key, db);
          byIndex.set(db.index, db);
          await run(redis.port, db.index, [['FLUSHDB']]);
        }
        const expires = new Date(Date.now() + 3 * 24 * 3600 * 1000).toUTCString();
        return send(
          201,
          [
            '# Your Redis database is ready',
            '',
            `**Database ID:** \`${key}\``,
            `**Endpoint:** ${base}/db/${db.index}`,
            `**Token:** \`${db.token}\``,
            `**Expires:** ${expires}.`,
            '',
            'Claim it from the console within three days, or it is deleted.',
          ].join('\n'),
          'text/markdown',
        );
      }

      const match = /^\/db\/(\d+)(\/pipeline)?$/.exec(url.pathname);
      if (request.method === 'POST' && match) {
        const index = Number(match[1]);
        const db = byIndex.get(index);
        if (!db || request.headers.authorization !== `Bearer ${db.token}`) {
          return send(401, { error: 'Unauthorized' });
        }
        const payload = JSON.parse(await readBody(request));
        if (match[2]) {
          const replies = await run(redis.port, index, payload);
          return send(200, replies.map((r) => (r && typeof r === 'object' && 'error' in r ? r : { result: r })));
        }
        const [reply] = await run(redis.port, index, [payload]);
        if (reply && typeof reply === 'object' && 'error' in reply) return send(400, reply);
        return send(200, { result: reply });
      }

      send(404, { error: 'Not found' });
    } catch (error) {
      send(500, { error: String(error?.message ?? error) });
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    provisioned: () => databases.size,
    stop: async () => {
      await new Promise((resolve) => server.close(resolve));
      await redis.stop();
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flag = process.argv.indexOf('--port');
  const port = flag >= 0 ? Number(process.argv[flag + 1]) : 3299;
  const mock = await startMockUpstash({ port });
  console.log(`mock Upstash on ${mock.base} (start-redis at ${mock.base}/start-redis)`);
  const stop = async () => {
    await mock.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
