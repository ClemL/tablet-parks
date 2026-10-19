'use client';

import { SEASONS } from '@/game/engine';
import type { GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn, seasonName } from '../bits';
import { Scoreboard } from '../Scoreboard';

/** Between seasons: a moment to look at the board before the trail is rebuilt. */
export function SeasonBreak({
  state,
  seats,
  busy,
  automatic,
  onContinue,
}: {
  state: GameState;
  seats: PublicSeat[];
  busy: boolean;
  /** A table of computers turns its own seasons. */
  automatic: boolean;
  onContinue: () => void;
}) {
  const lead = state.firstPlayer;
  return (
    <div className="scrim" role="presentation">
      <div className="sheet sheet--bottom sheet--center" role="dialog" aria-modal="true" aria-labelledby="season-title">
        <p className="eyebrow">
          Season {state.season} of {SEASONS}
        </p>
        <h2 id="season-title">{seasonName(state.season)} is over</h2>
        <p className="sheet__note">
          Every hiker is home. Resources carry over; bottles refill and campfires re-light. The trail grows by one advanced
          site for {seasonName(state.season + 1)}.
        </p>
        <p className="sheet__note">
          <Pawn seat={seats[lead]} size="sm" /> <b>{state.players[lead].name}</b> holds the first player token and leads.
        </p>
        {automatic ? (
          <p className="muted">The computers will carry on in a moment.</p>
        ) : (
          <button type="button" className="btn btn--primary btn--big" disabled={busy} onClick={onContinue} autoFocus>
            Begin {seasonName(state.season + 1)}
          </button>
        )}
      </div>
    </div>
  );
}

export function FinalScores({
  state,
  seats,
  onNewGame,
}: {
  state: GameState;
  seats: PublicSeat[];
  onNewGame: () => void;
}) {
  const winner = state.finalScores?.[0];
  return (
    <div className="scrim" role="presentation">
      <div className="sheet sheet--bottom sheet--wide" role="dialog" aria-modal="true" aria-labelledby="final-title">
        <p className="eyebrow">Four seasons walked</p>
        <h2 id="final-title">{winner ? `${state.players[winner.player].name} wins with ${winner.total}` : 'Final scores'}</h2>
        <Scoreboard state={state} seats={seats} />
        <p className="muted">Every objective is revealed on the phones too. A new game gets a fresh database and new seat codes.</p>
        <button type="button" className="btn btn--primary btn--big" onClick={onNewGame} autoFocus>
          New game
        </button>
      </div>
    </div>
  );
}
