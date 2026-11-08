'use client';

import { useEffect, useRef } from 'react';
import { parkFact } from '@/game/data/parkFacts';
import type { ParkCard } from '@/game/types';
import { IllustratedParkArt } from '@/art/illustrated';
import { Icon } from './Icon';

/**
 * A short card about a real park: where it is, when it became a national
 * park, and one thing worth knowing. It opens when a player visits a park and
 * whenever they tap one on a sheet.
 */
export function ParkFactSheet({
  park,
  eyebrow = 'Park visited',
  closeAfterMs,
  onClose,
}: {
  park: ParkCard;
  eyebrow?: string;
  /** Closes by itself after this long; the tablet uses it so a forgotten card never blocks the board. */
  closeAfterMs?: number;
  onClose: () => void;
}) {
  const fact = parkFact(park.id);
  const button = useRef<HTMLButtonElement>(null);
  // The parent re-renders on every poll with a fresh callback; the effects
  // below run once per park, so the clock is not restarted and focus not retaken.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    const timer = closeAfterMs ? window.setTimeout(() => close.current(), closeAfterMs) : undefined;
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [park.id, closeAfterMs]);

  return (
    <div className="scrim park-fact-scrim" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="park-fact" role="dialog" aria-modal="true" aria-labelledby="park-fact-title">
        <div className="park-fact__art">
          <IllustratedParkArt park={park} />
          <span className="park-fact__vp" aria-label={`${park.vp} points`}>
            {park.vp}
          </span>
        </div>
        <div className="park-fact__body">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="park-fact-title">{park.name}</h2>
          <p className="park-fact__where">
            <b>{fact ? fact.states.join(' · ') : park.state}</b>
            {fact ? <span> · National park since {fact.year}</span> : null}
          </p>
          {fact?.since ? (
            <p className="park-fact__since">
              First protected in {fact.since.year}, as {fact.since.as}.
            </p>
          ) : null}
          {fact ? <p className="park-fact__fact">{fact.fact}</p> : null}
          <button ref={button} type="button" className="btn btn--primary btn--sm park-fact__ok" onClick={onClose}>
            <Icon name="check" size={16} />
            Back to the trail
          </button>
        </div>
      </div>
    </div>
  );
}
