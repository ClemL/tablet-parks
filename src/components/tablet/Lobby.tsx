'use client';

import { useEffect, useState } from 'react';
import { defaultEdges, SEAT_COLORS, type PublicSeat, type RoomSettings, type TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { api, type Health } from '@/client/api';
import { Pawn, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { QrCode } from '../QrCode';
import { Footer } from '../Footer';
import { EdgeFrame } from './EdgeFrame';
import { SettingsTiles } from './SettingsTiles';
import { DbLine } from './DbLine';

/*
 * Setting the table: one screen from first tap to the deal. The settings sit
 * in the middle and a tag for each seat sits on the edge nearest whoever will
 * sit there, turned to face them. Opening the table provisions the game's
 * database and puts a QR code on every tag; the settings stay editable, in
 * the same place, until Start.
 */

const TAG = { width: 300, height: 136, qr: 116 };

/** Before the table is opened: the settings, with empty tags where the codes will appear. */
export function DraftTable({
  initial,
  notice,
  upright,
  onUpright,
  onOpen,
}: {
  initial: RoomSettings;
  notice: string | null;
  upright: boolean;
  onUpright: (value: boolean) => void;
  onOpen: (settings: RoomSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, []);

  const seats: PublicSeat[] = defaultEdges(settings.seats).map((edge, seat) => ({
    seat,
    name: `Player ${seat + 1}`,
    kind: 'open',
    edge,
    tag: `P${seat + 1}`,
    color: SEAT_COLORS[seat],
    phone: false,
    hikers: ['Hiker 1', 'Hiker 2'],
  }));
  const memory = health?.store === 'memory';

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
    <EdgeFrame seats={seats} width={TAG.width} height={TAG.height} upright={upright} className="lobby" tag={(seat) => <WaitingTag seat={seat} />}>
      <section className="setup" aria-labelledby="setup-title">
        <header className="setup__head">
          <div>
            <p className="eyebrow">A PARKS-style hiking game for one tablet and a phone each</p>
            <h1 id="setup-title" className="setup__title">
              Trailside Seasons
            </h1>
          </div>
        </header>
        {notice ? (
          <p className="notice" role="status">
            {notice}
          </p>
        ) : null}
        <SettingsTiles value={settings} onChange={setSettings} seats={seats} joined={0} upright={upright} onUpright={onUpright} disabled={opening} />
        <footer className="setup__go">
          <button type="button" className="btn btn--primary btn--big setup__cta" disabled={opening} onClick={open}>
            {opening ? 'Opening the table…' : 'Open the table'}
          </button>
          <p className="setup__status" aria-live="polite">
            {opening
              ? memory
                ? 'Setting the table up in this server’s memory…'
                : 'Provisioning a fresh Upstash Redis database for this game — a few seconds…'
              : memory
                ? 'Games are kept in this server’s memory (local runs only). The seat codes appear on the tags.'
                : 'Each game gets its own Upstash Redis database. Then the seat codes appear on the tags.'}
          </p>
        </footer>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <Footer />
      </section>
    </EdgeFrame>
  );
}

/** The table is open: the same screen, now with each seat's code, and Start where Open was. */
export function Lobby({
  view,
  busy,
  upright,
  onUpright,
  onCommand,
  onAbandon,
}: {
  view: TableView;
  busy: boolean;
  upright: boolean;
  onUpright: (value: boolean) => void;
  onCommand: (command: TableCommand) => void;
  onAbandon: () => void;
}) {
  // The seat links need this page's own origin, which only the browser knows.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  const joined = view.seats.filter((s) => s.kind === 'human');
  const open = view.seats.filter((s) => s.kind !== 'human');

  return (
    <EdgeFrame
      seats={view.seats}
      width={TAG.width}
      height={TAG.height}
      upright={upright}
      className="lobby"
      tag={(seat) => (
        <SeatTag
          key={seat.seat}
          seat={seat}
          url={origin && view.tickets[seat.seat] ? `${origin}/seat#t=${view.tickets[seat.seat]}` : null}
          busy={busy}
          onRename={(name) => onCommand({ type: 'rename', seat: seat.seat, name })}
          onEdge={() => onCommand({ type: 'edge', seat: seat.seat })}
          onFree={() => onCommand({ type: 'free', seat: seat.seat })}
        />
      )}
    >
      <section className="setup" aria-labelledby="lobby-title">
        <header className="setup__head">
          <div>
            <p className="eyebrow">Trailside Seasons</p>
            <h1 id="lobby-title" className="setup__title">
              Table <span className="code">{view.id}</span>
            </h1>
          </div>
          <div className="setup__db">
            <DbLine db={view.db} />
          </div>
          <button type="button" className="btn btn--ghost btn--danger btn--sm" disabled={busy} onClick={onAbandon}>
            Abandon table
          </button>
        </header>
        <SettingsTiles
          value={view.settings}
          onChange={(settings) => onCommand({ type: 'settings', settings })}
          seats={view.seats}
          joined={joined.length}
          upright={upright}
          onUpright={onUpright}
          disabled={busy}
        />
        <footer className="setup__go">
          <button type="button" className="btn btn--primary btn--big setup__cta" disabled={busy} onClick={() => onCommand({ type: 'start' })}>
            Start the game
          </button>
          <p className="setup__status" aria-live="polite">
            {joined.length === 0 ? (
              'Nobody has joined yet: the computer would play every seat.'
            ) : (
              <>
                <b>{listNames(joined.map((s) => s.name))} in.</b>{' '}
                {open.length > 0
                  ? `The computer plays seat${open.length === 1 ? '' : 's'} ${listNames(open.map((s) => String(s.seat + 1)))} unless someone scans in first.`
                  : 'Every seat is taken.'}
              </>
            )}
          </p>
        </footer>
      </section>
    </EdgeFrame>
  );
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** A seat's tag before the table exists: where its code will be. */
function WaitingTag({ seat }: { seat: PublicSeat }) {
  return (
    <div className="seat-tag" style={seatStyle(seat)}>
      <div className="seat-tag__qr seat-tag__qr--waiting" aria-hidden="true">
        <Icon name="qr" size={34} />
      </div>
      <div className="seat-tag__meta">
        <div className="seat-tag__head">
          <Pawn seat={seat} size="md" />
          <span className="seat-tag__name">Seat {seat.seat + 1}</span>
        </div>
        <span className="seat-tag__state">Its code appears when the table opens</span>
      </div>
    </div>
  );
}

function SeatTag({
  seat,
  url,
  busy,
  onRename,
  onEdge,
  onFree,
}: {
  seat: PublicSeat;
  url: string | null;
  busy: boolean;
  onRename: (name: string) => void;
  onEdge: () => void;
  onFree: () => void;
}) {
  const here = seat.kind === 'human';
  const [name, setName] = useState(here || seat.name.startsWith('Player ') ? '' : seat.name);
  const [showCode, setShowCode] = useState(!here);
  useEffect(() => setShowCode(!here), [here]);
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== seat.name) onRename(trimmed);
  };

  return (
    <div className={`seat-tag${here ? ' seat-tag--here' : ''}`} style={seatStyle(seat)}>
      {showCode && url ? (
        <a className="seat-tag__qr" href={url} target="_blank" rel="noreferrer" aria-label={`Seat ${seat.seat + 1} join link`}>
          <QrCode value={url} label={`Scan to take seat ${seat.seat + 1}`} size={TAG.qr} />
        </a>
      ) : (
        <div className="seat-tag__qr seat-tag__qr--joined" aria-hidden="true">
          <Icon name="check" size={56} />
        </div>
      )}
      <div className="seat-tag__meta">
        <div className="seat-tag__head">
          <Pawn seat={seat} size="md" />
          {here ? (
            <span className="seat-tag__name">{seat.name}</span>
          ) : (
            <input
              className="seat-tag__input"
              value={name}
              maxLength={16}
              placeholder={`Player ${seat.seat + 1}`}
              aria-label={`Name for seat ${seat.seat + 1}`}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          )}
        </div>
        <span className="seat-tag__state">{here ? (seat.phone ? `Phone joined · seat ${seat.seat + 1}` : `Seated · seat ${seat.seat + 1}`) : 'Open · scan to join'}</span>
        <div className="seat-tag__tools">
          {here ? (
            <>
              <button type="button" className="tag-btn" onClick={() => setShowCode((s) => !s)}>
                {showCode ? 'Hide code' : 'Show code'}
              </button>
              <button type="button" className="tag-btn" disabled={busy} onClick={onFree}>
                Free seat
              </button>
            </>
          ) : (
            <button type="button" className="tag-btn" aria-label={`Move seat ${seat.seat + 1}'s tag to the next edge`} disabled={busy} onClick={onEdge}>
              <Icon name="rotate" size={16} />
              Next edge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
