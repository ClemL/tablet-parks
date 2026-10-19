'use client';

import { useEffect, useState } from 'react';
import type { PublicSeat, RoomSettings, TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { Pawn } from '../bits';
import { QrCode } from '../QrCode';
import { EdgeFrame } from './EdgeFrame';
import { SettingsForm } from './SettingsForm';
import { DbLine } from './DbLine';

/**
 * The gathering screen: one name tag and one QR code per seat, on the edge of
 * the tablet nearest whoever sits there. Scanning a code seats that phone;
 * nothing is dealt until the tablet says Start, and every seat still open then
 * is played by the computer.
 */
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoomSettings>(view.settings);
  useEffect(() => {
    if (!editing) setDraft(view.settings);
  }, [view.settings, editing]);

  // A tablet 800px tall with a tag on every edge leaves little room between
  // them, so the tags shrink on smaller screens rather than the instructions.
  const roomy = useRoomy();
  const tag = roomy ? { width: 212, height: 268, qr: 150 } : { width: 184, height: 234, qr: 124 };

  const joined = view.seats.filter((s) => s.kind === 'human').length;
  const open = view.seats.length - joined;

  return (
    <EdgeFrame
      seats={view.seats}
      width={tag.width}
      height={tag.height}
      upright={upright}
      className="lobby"
      tag={(seat) => (
        <SeatTag
          key={seat.seat}
          seat={seat}
          url={origin && view.tickets[seat.seat] ? `${origin}/seat#t=${view.tickets[seat.seat]}` : null}
          qr={tag.qr}
          busy={busy}
          onRename={(name) => onCommand({ type: 'rename', seat: seat.seat, name })}
          onEdge={() => onCommand({ type: 'edge', seat: seat.seat })}
          onFree={() => onCommand({ type: 'free', seat: seat.seat })}
        />
      )}
    >
      <section className="lobby__center" aria-labelledby="lobby-title">
        <header className="lobby__head">
          <div>
            <p className="eyebrow">Trailside Seasons</p>
            <h1 id="lobby-title" className="lobby__title">
              Table <span className="code">{view.id}</span>
            </h1>
          </div>
          <button type="button" className="btn btn--ghost btn--danger btn--sm" disabled={busy} onClick={onAbandon}>
            Abandon table
          </button>
        </header>

        {editing ? (
          <div className="lobby__settings">
            <SettingsForm value={draft} onChange={setDraft} disabled={busy} />
            <label className="toggle">
              <input type="checkbox" checked={!upright} onChange={(e) => onUpright(!e.target.checked)} />
              <span>Turn name tags toward their seats (off for a tablet on a stand)</span>
            </label>
            <div className="row">
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => {
                  onCommand({ type: 'settings', settings: draft });
                  setEditing(false);
                }}
              >
                Apply
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <ol className="lobby__steps">
              <li>Scan the code on your side of the tablet with your phone.</li>
              <li>Your resources, camera and secret objectives show on your phone.</li>
              <li>Hikers move, and parks and gear are bought, here on the tablet.</li>
            </ol>
            <div className="lobby__actions">
              <DbLine db={view.db} />
              <p className="lobby__summary">
                {view.settings.seats} seats ·{' '}
                {[view.settings.expansions.nightfall && 'Nightfall', view.settings.expansions.wildlife && 'Wildlife']
                  .filter(Boolean)
                  .join(' + ') || 'base game'}{' '}
                · {view.settings.pace} pace · phones open {view.settings.peek === 'cpu' ? 'computer seats only' : 'every seat'}{' '}
                <button type="button" className="btn btn--link" onClick={() => setEditing(true)}>
                  Change
                </button>
              </p>
              <button type="button" className="btn btn--primary btn--big" disabled={busy} onClick={() => onCommand({ type: 'start' })}>
                Start the game
              </button>
              <span className="muted" aria-live="polite">
                {joined === 0
                  ? 'Nobody has joined yet: the computer would play every seat.'
                  : open > 0
                    ? `${joined} joined · the computer plays the ${open} open seat${open === 1 ? '' : 's'}.`
                    : 'Every seat is taken.'}
              </span>
            </div>
          </>
        )}
      </section>
    </EdgeFrame>
  );
}

function SeatTag({
  seat,
  url,
  qr,
  busy,
  onRename,
  onEdge,
  onFree,
}: {
  seat: PublicSeat;
  url: string | null;
  qr: number;
  busy: boolean;
  onRename: (name: string) => void;
  onEdge: () => void;
  onFree: () => void;
}) {
  const here = seat.kind === 'human';
  const [name, setName] = useState(here || seat.name.startsWith('Player ') ? '' : seat.name);
  const [showCode, setShowCode] = useState(!here);
  useEffect(() => setShowCode(!here), [here]);
  const placeholder = here ? seat.name : `Player ${seat.seat + 1}`;
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== seat.name) onRename(trimmed);
  };

  return (
    <div className={`seat-tag${here ? ' seat-tag--here' : ''}`} style={{ '--seat': seat.color } as React.CSSProperties}>
      <div className="seat-tag__head">
        <Pawn seat={seat} size="lg" />
        {here ? (
          <span className="seat-tag__name">{seat.name}</span>
        ) : (
          <input
            className="seat-tag__input"
            value={name}
            maxLength={16}
            placeholder={placeholder}
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
      <div className="seat-tag__meta">
        <span className="seat-tag__state">{here ? (seat.phone ? '✓ Phone joined' : '✓ Seated') : 'Open — scan to join'}</span>
        <button type="button" className="btn btn--icon" aria-label={`Move seat ${seat.seat + 1}'s tag to the next edge`} title="Move to the next edge" disabled={busy} onClick={onEdge}>
          ↻
        </button>
      </div>
      {showCode && url ? (
        <a className="seat-tag__qr" href={url} target="_blank" rel="noreferrer" aria-label={`Seat ${seat.seat + 1} join link`}>
          <QrCode value={url} label={`Scan to take seat ${seat.seat + 1}`} size={qr} />
        </a>
      ) : (
        <div className="seat-tag__hidden">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCode(true)}>
            Show code again
          </button>
          <span className="muted">Scanning it moves the seat to a new phone.</span>
        </div>
      )}
      {here ? (
        <div className="seat-tag__foot">
          {showCode ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCode(false)}>
              Hide code
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onFree}>
            Free seat
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** True on screens with room for full-size tags on every edge. */
function useRoomy(): boolean {
  const [roomy, setRoomy] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1200px) and (min-height: 960px)');
    const update = () => setRoomy(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return roomy;
}
