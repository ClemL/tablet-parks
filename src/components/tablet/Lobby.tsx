'use client';

import { useEffect, useState } from 'react';
import { defaultEdges, SEAT_COLORS, type PublicSeat, type RoomSettings, type TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { api, type Health } from '@/client/api';
import { SiteArt } from '@/art/siteArt';
import { PokemonHead, isDrawnPokemon } from '@/art/pokemon';
import { Pawn, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { QrCode } from '../QrCode';
import { Footer } from '../Footer';
import { SetupSettings, SeatStepper } from './SetupSettings';
import { DbLine } from './DbLine';

/*
 * Setting the table: one screen from first tap to the deal, read upright from
 * one side. A band of the trail's own scenery carries the title; under it,
 * every seat has a card in one row, so everyone can scan their own code at
 * once; the settings sit under the cards. Opening the table provisions the
 * game's database and puts the codes on the cards; the settings stay
 * editable, in the same place, until Start.
 */

const QR_SIZE = 148;

/** The scenery band across the top: the trail's sites side by side, start to end. */
const PANORAMA = ['trailhead', 'mountain', 'forest', 'basin', 'waterfall', 'valley', 'camera', 'trail-end'];

function Panorama({ children }: { children: React.ReactNode }) {
  return (
    <header className="panorama">
      <div className="panorama__art" aria-hidden="true">
        {PANORAMA.map((id) => (
          <SiteArt key={id} id={id} className="panorama__scene" />
        ))}
      </div>
      <svg className="panorama__path" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 78 C 120 50, 200 92, 330 72 S 560 48, 690 74 S 900 88, 1000 60" vectorEffect="non-scaling-stroke" />
      </svg>
      {children}
    </header>
  );
}

/** Before the table is opened: the settings, and a card per seat where its code will appear. */
export function DraftTable({
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

  const seats: PublicSeat[] = defaultEdges(settings.seats).map((edge, seat) => ({
    seat,
    name: `Player ${seat + 1}`,
    kind: 'open',
    edge,
    tag: `P${seat + 1}`,
    color: SEAT_COLORS[seat],
    phone: false,
    hikers: ['Hiker 1', 'Hiker 2'],
    avatar: null,
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
    <main className="basecamp" aria-labelledby="setup-title">
      <Panorama>
        <div className="panorama__sign">
          <p className="eyebrow">A PARKS-style hiking game for one tablet and a phone each</p>
          <h1 id="setup-title" className="setup__title">
            Trailside Seasons
          </h1>
        </div>
        {/* In the scenery, not under it: the seat cards rise into the band's foot and would cover it. */}
        {notice ? (
          <div className="panorama__aside">
            <p className="notice panorama__notice" role="status">
              {notice}
            </p>
          </div>
        ) : null}
      </Panorama>

      <Hikers
        count={settings.seats}
        onCount={(next) => setSettings({ ...settings, seats: next })}
        joined={0}
        disabled={opening}
        note="Each seat gets its own code when the table opens. Seats nobody scans into are played by the computer."
      >
        {seats.map((seat) => (
          <li key={seat.seat}>
            <WaitingCard seat={seat} />
          </li>
        ))}
      </Hikers>

      <section className="basecamp__bar" aria-label="Settings and start">
        <SetupSettings value={settings} onChange={setSettings} disabled={opening} />
        <div className="basecamp__go">
          <p className="basecamp__status" aria-live="polite">
            {opening
              ? memory
                ? 'Setting the table up in this server’s memory…'
                : 'Provisioning a fresh Upstash Redis database for this game — a few seconds…'
              : memory
                ? 'Games are kept in this server’s memory (local runs only).'
                : 'Each game gets its own Upstash Redis database.'}
          </p>
          <button type="button" className="btn btn--primary btn--big basecamp__cta" disabled={opening} onClick={open}>
            {opening ? 'Opening the table…' : 'Open the table'}
          </button>
        </div>
      </section>
      {error ? (
        <p className="error basecamp__error" role="alert">
          {error}
        </p>
      ) : null}
      <Footer />
    </main>
  );
}

/** The table is open: the same screen, now with each seat's code, and Start where Open was. */
export function Lobby({
  view,
  busy,
  onCommand,
  onAbandon,
}: {
  view: TableView;
  busy: boolean;
  onCommand: (command: TableCommand) => void;
  onAbandon: () => void;
}) {
  // The seat links need this page's own origin, which only the browser knows.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  const joined = view.seats.filter((s) => s.kind === 'human');
  const open = view.seats.filter((s) => s.kind !== 'human');

  return (
    <main className="basecamp" aria-labelledby="lobby-title">
      <Panorama>
        <div className="panorama__sign">
          <p className="eyebrow">Trailside Seasons</p>
          <h1 id="lobby-title" className="setup__title">
            Table <span className="code">{view.id}</span>
          </h1>
        </div>
        <div className="panorama__aside">
          <span className="panorama__db">
            <DbLine db={view.db} />
          </span>
          <button type="button" className="btn btn--ghost btn--danger btn--sm panorama__abandon" disabled={busy} onClick={onAbandon}>
            Abandon table
          </button>
        </div>
      </Panorama>

      <Hikers
        count={view.settings.seats}
        onCount={(next) => onCommand({ type: 'settings', settings: { ...view.settings, seats: next } })}
        joined={joined.length}
        disabled={busy}
        note="Everyone scans their own seat’s code, all at once. Seats nobody scans into are played by the computer."
      >
        {view.seats.map((seat) => (
          <li key={seat.seat}>
            <SeatCard
              seat={seat}
              url={origin && view.tickets[seat.seat] ? `${origin}/seat#t=${view.tickets[seat.seat]}` : null}
              busy={busy}
              onRename={(name) => onCommand({ type: 'rename', seat: seat.seat, name })}
              onFree={() => onCommand({ type: 'free', seat: seat.seat })}
            />
          </li>
        ))}
      </Hikers>

      <section className="basecamp__bar" aria-label="Settings and start">
        <SetupSettings value={view.settings} onChange={(settings) => onCommand({ type: 'settings', settings })} disabled={busy} />
        <div className="basecamp__go">
          <p className="basecamp__status" aria-live="polite">
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
          <button type="button" className="btn btn--primary btn--big basecamp__cta" disabled={busy} onClick={() => onCommand({ type: 'start' })}>
            Start the game
          </button>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The row of seat cards, under a heading that also sets how many seats there are. */
function Hikers({
  count,
  onCount,
  joined,
  disabled,
  note,
  children,
}: {
  count: number;
  onCount: (next: number) => void;
  /** Phones already seated, which a smaller table would turn away. */
  joined: number;
  disabled: boolean;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hikers" aria-labelledby="hikers-title">
      <header className="hikers__head">
        <h2 id="hikers-title">Who’s hiking?</h2>
        <span className="hikers__note">{note}</span>
        <SeatStepper value={count} joined={joined} disabled={disabled} onChange={onCount} />
      </header>
      <ul className="hikers__row" style={{ '--n': count } as React.CSSProperties}>
        {children}
      </ul>
    </section>
  );
}

/** A seat's card before the table exists: where its code will be. */
function WaitingCard({ seat }: { seat: PublicSeat }) {
  return (
    <article className="seat-card" style={seatStyle(seat)} aria-label={`Seat ${seat.seat + 1}`}>
      <div className="seat-card__qr seat-card__qr--waiting" aria-hidden="true">
        <Icon name="qr" size={40} />
      </div>
      <div className="seat-card__head">
        <Pawn seat={seat} size="md" />
        <span className="seat-card__name">Seat {seat.seat + 1}</span>
      </div>
      <span className="seat-card__state">Its code appears when the table opens</span>
    </article>
  );
}

function SeatCard({
  seat,
  url,
  busy,
  onRename,
  onFree,
}: {
  seat: PublicSeat;
  url: string | null;
  busy: boolean;
  onRename: (name: string) => void;
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
    <article className={`seat-card${here ? ' seat-card--here' : ''}`} style={seatStyle(seat)} aria-label={`Seat ${seat.seat + 1}${here ? `, ${seat.name}` : ', open'}`}>
      {showCode && url ? (
        <a className="seat-card__qr" href={url} target="_blank" rel="noreferrer" aria-label={`Seat ${seat.seat + 1} join link`}>
          <QrCode value={url} label={`Scan to take seat ${seat.seat + 1}`} size={QR_SIZE} />
        </a>
      ) : (
        <div className={`seat-card__qr${here ? ' seat-card__qr--joined' : ' seat-card__qr--waiting'}`} aria-hidden="true">
          {here ? (
            <>
              {seat.avatar && isDrawnPokemon(seat.avatar) ? (
                <>
                  <PokemonHead name={seat.avatar} className="seat-card__pk" />
                  <span className="seat-card__tag">{seat.tag}</span>
                </>
              ) : (
                <span className="seat-card__initial">{seat.tag}</span>
              )}
              <span className="seat-card__check">
                <Icon name="check" size={22} />
              </span>
            </>
          ) : (
            <Icon name="qr" size={40} />
          )}
        </div>
      )}
      <div className="seat-card__head">
        <Pawn seat={seat} size="md" />
        {here ? (
          <span className="seat-card__name">{seat.name}</span>
        ) : (
          <input
            className="seat-card__input"
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
      <span className={`seat-card__state${here ? ' seat-card__state--here' : ''}`}>
        {here ? (seat.phone ? `Phone joined · seat ${seat.seat + 1}` : `Seated · seat ${seat.seat + 1}`) : `Seat ${seat.seat + 1} · scan to join`}
      </span>
      {here ? (
        <div className="seat-card__tools">
          <button type="button" className="tag-btn" onClick={() => setShowCode((s) => !s)}>
            {showCode ? 'Hide code' : 'Show code'}
          </button>
          <button type="button" className="tag-btn" disabled={busy} onClick={onFree}>
            Free seat
          </button>
        </div>
      ) : null}
    </article>
  );
}
