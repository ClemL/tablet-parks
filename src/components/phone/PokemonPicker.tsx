'use client';

import { useState } from 'react';
import type { SeatView } from '@/room/room';
import { nextPokemon } from '@/room/names';
import { ApiError, api } from '@/client/api';
import { Pawn } from '../bits';
import { Icon } from '../Icon';

/**
 * This seat's Pokémon, and buttons that step through the ones nobody else at
 * the table is wearing. The pawn on the tablet changes with it.
 */
export function PokemonPicker({ view, token, onView }: { view: SeatView; token: string; onView: (view: SeatView) => void }) {
  const me = view.seats[view.seat];
  const others = view.seats.filter((s) => s.seat !== view.seat).map((s) => s.avatar);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const step = async (by: 1 | -1) => {
    const next = nextPokemon(me.avatar, others, by);
    if (!next || next === me.avatar) return;
    setBusy(true);
    setProblem(null);
    try {
      onView(await api.avatar(token, next));
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'That did not go through');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pk-picker">
      <Pawn seat={me} size="xl" />
      <div className="pk-picker__text">
        <b className="pk-picker__name">{me.avatar ?? 'No Pokémon yet'}</b>
        <span className="muted">{me.avatar && me.avatar !== me.name ? `${me.name}’s pawn on the tablet` : 'Your pawn on the tablet'}</span>
        {problem ? (
          <span className="error" role="alert">
            {problem}
          </span>
        ) : null}
      </div>
      <div className="pk-picker__buttons">
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} aria-label="Previous unused Pokémon" onClick={() => void step(-1)}>
          <Icon name="back" size={16} />
        </button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void step(1)}>
          Next unused
          <Icon name="next" size={16} />
        </button>
      </div>
    </div>
  );
}
