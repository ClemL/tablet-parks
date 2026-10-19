'use client';

import { useEffect, useState } from 'react';
import type { RoomSettings } from '@/room/room';
import { api, type Health } from '@/client/api';
import { SettingsForm } from './SettingsForm';
import { Footer } from '../Footer';

/**
 * Where the tablet starts: choosing the game. Opening the table provisions a
 * database for this game alone, then shows the seats and their codes.
 */
export function SettingsScreen({
  initial,
  notice,
  onOpen,
}: {
  initial: RoomSettings;
  notice: string | null;
  onOpen: (settings: RoomSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, []);

  const open = async () => {
    setOpening(true);
    setError(null);
    try {
      await onOpen(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the table');
      setOpening(false);
    }
  };

  return (
    <main className="setup">
      <header className="setup__head">
        <p className="eyebrow">A PARKS-style hiking game for one tablet and a phone each</p>
        <h1 className="setup__title">Trailside Seasons</h1>
        <p className="setup__lead">
          The tablet is the board: hikers walk the trail, and parks and gear are bought, right here. Each player’s phone
          holds their resources, their camera and their secret objectives.
        </p>
      </header>

      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}

      <section className="setup__card" aria-labelledby="setup-title">
        <h2 id="setup-title">Prepare the game</h2>
        <SettingsForm value={settings} onChange={setSettings} disabled={opening} />
        <div className="setup__go">
          <button type="button" className="btn btn--primary btn--big" disabled={opening} onClick={open}>
            {opening ? 'Opening the table…' : 'Open the table'}
          </button>
          <span className="muted" aria-live="polite">
            {opening
              ? health?.store === 'memory'
                ? 'Setting the table up in this server’s memory…'
                : 'Provisioning a fresh Upstash Redis database for this game — a few seconds…'
              : health?.store === 'memory'
                ? 'Games are kept in this server’s memory (local runs only).'
                : 'Each game gets its own Upstash Redis database, used until the game is over or abandoned.'}
          </span>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <Footer />
    </main>
  );
}
