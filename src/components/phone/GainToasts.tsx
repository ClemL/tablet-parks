'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogEntry, ResourceBag } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn } from '../bits';
import { TokenBag } from '../Token';

/** How long each toast stays. */
const TOAST_MS = 3200;

interface Toast {
  key: string;
  seat: number;
  bag: ResourceBag;
}

/**
 * What everyone collects, as it happens: each turn that hands a player
 * resources sends a small toast to the corner of every phone — their Pokémon,
 * with the tokens flying in. Read from the game log, which every device is
 * sent anyway, so it says nothing a phone could not already read.
 */
export function GainToasts({ log, seats }: { log: readonly LogEntry[]; seats: readonly PublicSeat[] }) {
  const seen = useRef<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const newest = log[log.length - 1]?.id ?? log.length;

  useEffect(() => {
    // The first look, and a take-back that rewound the log, show nothing.
    if (seen.current === null || newest < seen.current) {
      seen.current = newest;
      return;
    }
    const since = seen.current;
    const fresh = log.filter((e) => (e.id ?? 0) > since);
    seen.current = newest;
    // A stop and the flask that filled from it land together: add each player's steps up.
    const bySeat = new Map<number, ResourceBag>();
    for (const entry of fresh) {
      if (entry.player < 0 || !entry.delta) continue;
      const sum = bySeat.get(entry.player) ?? {};
      for (const r of RESOURCES) sum[r] = (sum[r] ?? 0) + (entry.delta[r] ?? 0);
      bySeat.set(entry.player, sum);
    }
    const next: Toast[] = [];
    for (const [seat, sum] of bySeat) {
      const gained: ResourceBag = {};
      for (const r of RESOURCES) if ((sum[r] ?? 0) > 0) gained[r] = sum[r];
      if (Object.keys(gained).length > 0) next.push({ key: `${newest}-${seat}`, seat, bag: gained });
    }
    if (next.length > 0) setToasts((now) => [...now, ...next].slice(-3));
    // Keyed on the newest entry: every poll hands over a new array.
  }, [newest]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => setToasts((now) => now.slice(1)), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;
  return (
    <ol className="gain-toasts" aria-live="polite" aria-label="Collected just now">
      {toasts.map((toast) => {
        const seat = seats[toast.seat];
        if (!seat) return null;
        return (
          <li key={toast.key} className="gain-toast">
            <span className="gain-toast__tokens">
              <TokenBag bag={toast.bag} sign size="sm" />
            </span>
            <span className="gain-toast__who">
              <Pawn seat={seat} size="md" />
              <span className="gain-toast__name">{seat.name}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
