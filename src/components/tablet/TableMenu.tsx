'use client';

import { useEffect, useState } from 'react';
import type { Pace, Peek, TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { Pawn } from '../bits';
import { QrCode } from '../QrCode';
import { DbLine } from './DbLine';

/**
 * The tablet's menu during play: how fast the computers move, what phones may
 * open, a seat's code for a phone joining late or replacing a flat one, giving
 * a seat to the computer, and walking away from the game.
 */
export function TableMenu({
  view,
  busy,
  upright,
  onUpright,
  onCommand,
  onAbandon,
  onClose,
}: {
  view: TableView;
  busy: boolean;
  upright: boolean;
  onUpright: (value: boolean) => void;
  onCommand: (command: TableCommand) => void;
  onAbandon: () => void;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const [code, setCode] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setPace = (pace: Pace) => onCommand({ type: 'settings', settings: { pace } });
  const setPeek = (peek: Peek) => onCommand({ type: 'settings', settings: { peek } });

  return (
    <div className="scrim" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet sheet--bottom sheet--wide" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <header className="sheet__head">
          <div>
            <p className="eyebrow">Table {view.id}</p>
            <h2 id="menu-title">Table menu</h2>
          </div>
          <button type="button" className="btn btn--icon" aria-label="Close the menu" onClick={onClose}>
            ✕
          </button>
        </header>

        {code !== null && origin ? (
          <div className="menu__code">
            <QrCode value={`${origin}/seat#t=${view.tickets[code]}`} label={`Scan to take seat ${code + 1}`} size={220} />
            <p>
              Scan to take <b>{view.seats[code].name}</b>’s seat on a phone.{' '}
              {view.seats[code].kind === 'cpu' ? 'The computer stops playing it, and the tablet plays it for you.' : 'Any phone already in the seat is signed out.'}
            </p>
            <button type="button" className="btn btn--ghost" onClick={() => setCode(null)}>
              Done
            </button>
          </div>
        ) : (
          <>
            <section className="menu__group">
              <h3>Seats</h3>
              <ul className="menu__seats">
                {view.seats.map((seat) => (
                  <li key={seat.seat}>
                    <Pawn seat={seat} size="sm" />
                    <span className="menu__seatname">
                      {seat.name}
                      <span className="muted">
                        {' '}
                        · {seat.kind === 'cpu' ? 'computer' : seat.phone ? 'phone connected' : 'no phone'}
                      </span>
                    </span>
                    <button type="button" className="btn btn--sm" onClick={() => setCode(seat.seat)}>
                      Seat code
                    </button>
                    {seat.kind === 'human' ? (
                      <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => onCommand({ type: 'free', seat: seat.seat })}>
                        Let the computer play
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="menu__group">
              <h3>Computer pace</h3>
              <div className="segmented" role="radiogroup" aria-label="Computer pace">
                {(['relaxed', 'normal', 'brisk'] as const).map((pace) => (
                  <button key={pace} type="button" role="radio" aria-checked={view.settings.pace === pace} className={view.settings.pace === pace ? 'is-on' : ''} disabled={busy} onClick={() => setPace(pace)}>
                    {pace[0].toUpperCase() + pace.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            <section className="menu__group">
              <h3>Phones may open</h3>
              <div className="segmented" role="radiogroup" aria-label="Phones may open">
                <button type="button" role="radio" aria-checked={view.settings.peek === 'cpu'} className={view.settings.peek === 'cpu' ? 'is-on' : ''} disabled={busy} onClick={() => setPeek('cpu')}>
                  Computer seats only
                </button>
                <button type="button" role="radio" aria-checked={view.settings.peek === 'all'} className={view.settings.peek === 'all' ? 'is-on' : ''} disabled={busy} onClick={() => setPeek('all')}>
                  Every seat
                </button>
              </div>
            </section>

            <section className="menu__group">
              <label className="toggle">
                <input type="checkbox" checked={!upright} onChange={(e) => onUpright(!e.target.checked)} />
                <span>Turn name tags and decisions toward each seat</span>
              </label>
              <DbLine db={view.db} />
            </section>

            <section className="menu__group menu__danger">
              {confirming ? (
                <>
                  <span>Abandon this game? Its data is deleted and every phone is signed out.</span>
                  <button type="button" className="btn btn--danger" disabled={busy} onClick={onAbandon}>
                    Abandon the game
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
                    Keep playing
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--ghost btn--danger" onClick={() => setConfirming(true)}>
                  Abandon game…
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
