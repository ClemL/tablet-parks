import type { GameAction } from '@/game/types';
import type { RoomSettings, SeatView, TableView } from '@/room/room';
import type { PollResult, SeatPreview, TableCommand } from '@/server/service';

/** A failed call, with the HTTP status the UI branches on (403 taken over, 410 gone). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: { token?: string | null; body?: unknown; method?: string } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the game server — check the Wi-Fi', 0);
  }
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? `The server answered ${response.status}`, response.status);
  return payload;
}

export interface Health {
  store: 'start-redis' | 'env' | 'memory';
  secretConfigured: boolean;
  sharedDatabase: boolean;
}

export const api = {
  health: () => call<Health>('/api/health'),
  create: (settings: Partial<RoomSettings>) =>
    call<{ host: string; view: TableView }>('/api/games', { body: { settings } }),
  poll: (token: string, since?: number) =>
    call<PollResult>(`/api/games/state${since === undefined ? '' : `?since=${since}`}`, { token }),
  preview: (ticket: string) => call<SeatPreview>('/api/games/seat', { token: ticket }),
  join: (ticket: string, name: string) => call<{ seat: string; view: SeatView }>('/api/games/join', { body: { ticket, name } }),
  move: (host: string, seat: number, action: GameAction) =>
    call<TableView>('/api/games/move', { token: host, body: { seat, action } }),
  control: (host: string, command: TableCommand) =>
    call<TableView>('/api/games/control', { token: host, body: { command } }),
  leave: (seat: string) => call<{ ok: true }>('/api/games/leave', { token: seat, body: {} }),
  abandon: (host: string) => call<{ ok: true }>('/api/games/abandon', { token: host, body: {} }),
};
