'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomView } from '@/room/room';
import { ApiError, api } from './api';

export interface Poll<V extends RoomView> {
  view: V | null;
  /** The last failure, cleared by the next success. */
  error: ApiError | null;
  /**
   * Install a view returned by a move or command, so the screen does not wait
   * for the next poll. `forToken` names the handle it belongs to when that
   * handle is being set in the same breath (a new game, a fresh join).
   */
  accept: (view: V, forToken?: string) => void;
  refresh: () => void;
}

/**
 * Keeps one game view fresh by polling its version. When nothing has changed
 * the server answers with a bare version, so the steady state costs a few
 * dozen bytes. `interval` is asked again after every poll, so a screen can
 * poll faster while a computer is playing and slower while people think.
 * Polling stops while the page is hidden and resumes, with a full read, when
 * it comes back.
 *
 * Every view is filed under the handle it was read with, so switching handles
 * shows nothing stale — without a reset that could wipe a view installed for
 * the new handle a moment earlier.
 */
export function usePoll<V extends RoomView>(token: string | null, interval: (view: V | null) => number): Poll<V> {
  const [entry, setEntry] = useState<{ token: string; view: V } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const latest = useRef<{ token: string; version: number; view: V } | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const [nonce, setNonce] = useState(0);

  const accept = useCallback((next: V, forToken?: string) => {
    const owner = forToken ?? tokenRef.current;
    if (!owner) return;
    const held = latest.current;
    if (held && held.token === owner && next.version < held.version) return;
    latest.current = { token: owner, version: next.version, view: next };
    setEntry({ token: owner, view: next });
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    if (latest.current) latest.current = { ...latest.current, version: -1 };
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const since = () => (latest.current?.token === token && latest.current.version >= 0 ? latest.current.version : undefined);
    const current = () => (latest.current?.token === token ? latest.current.view : null);

    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const result = await api.poll(token, since());
        if (cancelled) return;
        setError(null);
        if (!('unchanged' in result)) accept(result as V, token);
      } catch (err) {
        if (cancelled) return;
        const failure = err instanceof ApiError ? err : new ApiError(String(err), 0);
        setError(failure);
        // A game that is gone or a seat that was taken will not come back by asking again.
        if (failure.status === 401 || failure.status === 403 || failure.status === 410) return;
      }
      if (!cancelled) timer = setTimeout(tick, intervalRef.current(current()));
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      if (latest.current?.token === token) latest.current = { ...latest.current, version: -1 };
      void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, nonce, accept]);

  return { view: entry && entry.token === token ? entry.view : null, error, accept, refresh };
}
