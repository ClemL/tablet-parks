'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type RoomSettings, type TableView } from '@/room/room';
import type { GameAction } from '@/game/types';
import type { TableCommand } from '@/server/service';
import { ApiError, api } from '@/client/api';
import { HOST_KEY, local } from '@/client/storage';
import { usePoll } from '@/client/usePoll';
import { SettingsScreen } from './SettingsScreen';
import { Lobby } from './Lobby';
import { Board } from './Board';

const SETTINGS_KEY = 'tablet-parks.settings';
const UPRIGHT_KEY = 'tablet-parks.upright';

/**
 * The tablet. It starts on the settings screen; opening the table provisions a
 * database and shows the seats; Start deals; and from then on every move is
 * made here. The tablet's handle is kept in localStorage, so a reload — or the
 * screen going to sleep — picks the game up where it was.
 */
export function TabletApp() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upright, setUprightState] = useState(false);
  const [initial, setInitial] = useState<RoomSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setToken(local.get(HOST_KEY));
    setUprightState(local.get(UPRIGHT_KEY) === '1');
    try {
      const saved = local.get(SETTINGS_KEY);
      if (saved) setInitial(normalizeSettings(JSON.parse(saved) as Partial<RoomSettings>));
    } catch {
      // A damaged save just means the defaults.
    }
    setReady(true);
  }, []);

  // Fast while a computer plays, so its moves show as they happen; slower
  // while people think, since their moves come back from the tablet's own calls.
  const poll = usePoll<TableView>(token, (view) =>
    !view || view.phase === 'lobby' ? 1200 : view.cpuThinking ? 700 : view.phase === 'over' ? 5000 : 2500,
  );
  const { view, accept } = poll;

  const forget = useCallback((message: string | null) => {
    local.set(HOST_KEY, null);
    setToken(null);
    setNotice(message);
    setError(null);
  }, []);

  useEffect(() => {
    const status = poll.error?.status;
    if (status === 410) forget('That game has ended or expired. Set up a new one.');
    else if (status === 401) forget('That game was opened by a different version of the app. Set up a new one.');
  }, [poll.error, forget]);

  useWakeLock(Boolean(view && view.phase === 'playing'));

  const run = useCallback(
    async (call: () => Promise<TableView>) => {
      setBusy(true);
      setError(null);
      try {
        accept(await call());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That did not work');
        if (err instanceof ApiError && err.status === 409) poll.refresh();
        if (err instanceof ApiError && err.status === 410) forget('That game has ended or expired.');
      } finally {
        setBusy(false);
      }
    },
    [accept, poll, forget],
  );

  const open = async (settings: RoomSettings) => {
    local.set(SETTINGS_KEY, JSON.stringify(settings));
    setInitial(settings);
    const created = await api.create(settings);
    local.set(HOST_KEY, created.host);
    setNotice(null);
    setToken(created.host);
    accept(created.view, created.host);
  };

  const onCommand = (command: TableCommand) => token && void run(() => api.control(token, command));
  const onAction = (seat: number, action: GameAction) => token && void run(() => api.move(token, seat, action));
  const onAbandon = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await api.abandon(token);
    } catch {
      // Gone already is as good as abandoned.
    } finally {
      setBusy(false);
    }
    forget(null);
  };
  const setUpright = (value: boolean) => {
    setUprightState(value);
    local.set(UPRIGHT_KEY, value ? '1' : null);
  };

  if (!ready) return null;
  if (!token) return <SettingsScreen initial={initial} notice={notice} onOpen={open} />;
  if (!view) {
    return (
      <main className="loading" aria-busy="true">
        <p>{poll.error ? poll.error.message : 'Finding the table…'}</p>
        {poll.error ? (
          <button type="button" className="btn btn--ghost" onClick={() => forget(null)}>
            Set up a new game instead
          </button>
        ) : null}
      </main>
    );
  }
  if (view.phase === 'lobby') {
    return (
      <>
        <Lobby view={view} busy={busy} upright={upright} onUpright={setUpright} onCommand={onCommand} onAbandon={onAbandon} />
        {error ? (
          <p className="toast" role="alert">
            {error}
          </p>
        ) : null}
      </>
    );
  }
  return (
    <Board
      view={view}
      busy={busy}
      error={error ?? (poll.error?.status === 0 ? poll.error.message : null)}
      upright={upright}
      onUpright={setUpright}
      onAction={onAction}
      onCommand={onCommand}
      onAbandon={onAbandon}
      onNewGame={() => forget(null)}
    />
  );
}

/** Keeps the tablet's screen on while a game runs, where the browser allows it. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {});
    };
    request();
    // The lock is dropped whenever the page is hidden; take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [on]);
}
