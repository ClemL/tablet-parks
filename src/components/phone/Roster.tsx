'use client';

import { useEffect, useRef, useState } from 'react';
import type { SeatView } from '@/room/room';
import { local } from '@/client/storage';
import { Pawn } from '../bits';

/** How long the roster stays up before it gets out of the way. */
export const ROSTER_MS = 4500;

const seenKey = (view: SeatView) => `tablet-parks.roster.${view.id}.${view.seat}`;

/**
 * Who is who, shown for a few seconds when the game is dealt: a handed-out
 * Pokémon name is easy to miss, and the pawns on the tablet carry only letters.
 * Once per seat per table, so a reload mid-game does not bring it back.
 */
export function Roster({ view }: { view: SeatView }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const live = view.phase === 'playing';

  useEffect(() => {
    if (!live || local.get(seenKey(view)) === '1') return;
    local.set(seenKey(view), '1');
    setOpen(true);
    // Keyed on the table and seat only: later polls of the same game must not reopen it.
  }, [live, view.id, view.seat]);

  // The clock runs off `open` itself, so an effect that re-runs cannot leave it up for good.
  useEffect(() => {
    if (!open) return;
    button.current?.focus();
    const timer = window.setTimeout(() => setOpen(false), ROSTER_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;
  const me = view.seats[view.seat];
  const others = view.seats.filter((s) => s.seat !== view.seat);
  return (
    <div className="scrim roster-scrim" role="presentation" onClick={() => setOpen(false)}>
      <div className="roster" role="dialog" aria-modal="true" aria-labelledby="roster-title">
        <p className="eyebrow">The game is dealt</p>
        <div className="roster__you">
          <Pawn seat={me} size="xl" />
          <div>
            <span className="roster__label">You are</span>
            <h2 id="roster-title">{me.name}</h2>
            <span className="roster__hikers">Hikers: {me.hikers.join(' · ')}</span>
          </div>
        </div>
        <ul className="roster__others" aria-label="Also at the table">
          {others.map((seat) => (
            <li key={seat.seat}>
              <Pawn seat={seat} size="sm" />
              <span>{seat.name}</span>
              {seat.kind === 'cpu' ? <span className="muted">computer</span> : null}
            </li>
          ))}
        </ul>
        <button ref={button} type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(false)}>
          Let’s hike
        </button>
        <span className="roster__timer" aria-hidden="true" style={{ animationDuration: `${ROSTER_MS}ms` }} />
      </div>
    </div>
  );
}
