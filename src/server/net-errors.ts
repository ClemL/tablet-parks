/**
 * Node's fetch (undici) throws a bare `TypeError: fetch failed` and hides the
 * real reason (DNS, TLS, refused connection, timeout) in `err.cause`. Walk the
 * cause chain so the message names what actually went wrong.
 */
export function describeError(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && !seen.has(current) && parts.length < 6) {
    seen.add(current);
    const e = current as {
      message?: string;
      code?: string;
      errno?: number;
      syscall?: string;
      hostname?: string;
      address?: string;
      port?: number;
      errors?: unknown[];
      cause?: unknown;
    };
    const detail = [
      e.code,
      e.syscall,
      e.hostname ?? e.address,
      e.port !== undefined ? `port ${e.port}` : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    const message = e.message || String(current);
    // Skip the detail suffix when the message already names the error code.
    parts.push(detail && !(e.code && message.includes(e.code)) ? `${message} (${detail})` : message);
    // Happy-eyeballs failures arrive as an AggregateError with one error per address.
    if (Array.isArray(e.errors) && e.errors.length) {
      parts.push(...e.errors.slice(0, 3).map((inner) => describeError(inner)));
      break;
    }
    current = e.cause;
  }
  return [...new Set(parts)].join(' <- ');
}

/** Error thrown when a request never got an HTTP response (network-level failure). */
export class TransportError extends Error {
  constructor(target: string, err: unknown) {
    super(`Request to ${target} failed: ${describeError(err)}`);
    this.name = 'TransportError';
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return `invalid URL '${url}'`;
  }
}

/** Every `code` found along the cause chain (including AggregateError members). */
export function errorCodes(err: unknown): string[] {
  const codes: string[] = [];
  const visit = (value: unknown, depth: number) => {
    if (!value || depth > 6) return;
    const e = value as { code?: string; cause?: unknown; errors?: unknown[] };
    if (e.code) codes.push(e.code);
    e.errors?.forEach((inner) => visit(inner, depth + 1));
    visit(e.cause, depth + 1);
  };
  visit(err, 0);
  return codes;
}

/**
 * Failures that happen while opening the connection, before any bytes of the
 * request are sent. Retrying these cannot double-apply a non-idempotent command
 * such as INCR or LPUSH. ECONNRESET is excluded on purpose: it can occur after
 * the request was delivered.
 */
const CONNECT_PHASE = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
  'ETIMEDOUT',
]);

export function isConnectPhaseError(err: unknown): boolean {
  return errorCodes(err).some((code) => CONNECT_PHASE.has(code));
}
