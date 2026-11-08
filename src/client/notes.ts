'use client';

import { useCallback, useEffect, useState } from 'react';
import { local } from './storage';

/** The phone panels whose heading and explanation can be closed for good. */
export type NoteId = 'parks' | 'gear';

const KEY = 'tablet-parks.notes-hidden';

/**
 * Which panel headings this phone has closed with their ✕, remembered across
 * games: once a player knows what the parks panel is for, its explanation
 * only costs them screen. The menu brings them all back.
 */
export function useHiddenNotes(): { hidden: ReadonlySet<NoteId>; hide: (id: NoteId) => void; reset: () => void } {
  const [hidden, setHidden] = useState<ReadonlySet<NoteId>>(new Set());
  useEffect(() => {
    try {
      const saved = JSON.parse(local.get(KEY) ?? '[]') as unknown;
      if (Array.isArray(saved)) setHidden(new Set(saved.filter((id): id is NoteId => id === 'parks' || id === 'gear')));
    } catch {
      // A damaged save just means every note shows.
    }
  }, []);
  const hide = useCallback((id: NoteId) => {
    setHidden((now) => {
      const next = new Set(now).add(id);
      local.set(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    local.set(KEY, null);
    setHidden(new Set());
  }, []);
  return { hidden, hide, reset };
}
