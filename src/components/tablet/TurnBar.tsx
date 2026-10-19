'use client';

import { bottleDef, pendingLabel, usableBottles } from '@/game/engine';
import type { GameAction, GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn, tokensText } from '../bits';

/**
 * One line under the board saying who is on the clock and what they are doing,
 * with the few controls that are not a card or a site: emptying a flask, and
 * passing at a park decision. A computer's turn shows its latest move instead.
 */
export function TurnBar({
  state,
  seats,
  actor,
  cpuThinking,
  busy,
  error,
  onAction,
}: {
  state: GameState;
  seats: PublicSeat[];
  actor: number | null;
  cpuThinking: boolean;
  busy: boolean;
  error: string | null;
  onAction: (action: GameAction) => void;
}) {
  const last = [...state.log].reverse().find((entry) => entry.player >= 0) ?? state.log[state.log.length - 1];
  const lastLine = last ? `${last.player >= 0 ? `${state.players[last.player].name} ` : ''}${last.text}` : '';

  if (actor === null) {
    return (
      <div className="turn-bar" aria-live="polite">
        <span className="turn-bar__last">{lastLine}</span>
      </div>
    );
  }

  const seat = seats[actor];
  const player = state.players[actor];
  const pending = state.pending;
  const shopping = !cpuThinking && pending && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear') ? pending.kind : null;
  const bottles = !cpuThinking ? usableBottles(player) : [];

  let what: React.ReactNode;
  if (cpuThinking) {
    what = (
      <>
        <b>{player.name}</b> is thinking<span className="dots" aria-hidden="true" />
      </>
    );
  } else if (shopping === 'trail-end') {
    what = (
      <>
        <b>{player.name}</b> is at the Trail End: visit a park, reserve one, or buy gear — tap a card above.
      </>
    );
  } else if (shopping === 'park-or-gear') {
    what = (
      <>
        <b>{player.name}</b> is at the Ranger Station: visit or reserve a park — tap a card above.
      </>
    );
  } else if (pending) {
    what = (
      <>
        <b>{player.name}</b> is deciding: {pendingLabel(state)}
      </>
    );
  } else {
    what = (
      <>
        <b>{player.name}</b>, walk a hiker: tap a lit site on the trail.
      </>
    );
  }

  return (
    <div className={`turn-bar${cpuThinking ? ' turn-bar--cpu' : ' turn-bar--human'}`} style={{ '--seat': seat.color } as React.CSSProperties} aria-live="polite">
      <Pawn seat={seat} size="md" />
      <span className="turn-bar__what">{what}</span>
      {cpuThinking ? <span className="turn-bar__last">{lastLine}</span> : null}
      {bottles.length > 0 ? (
        <span className="turn-bar__tools">
          {bottles.map((bottle) => {
            const def = bottleDef(bottle.kind);
            return (
              <button key={bottle.id} type="button" className="btn btn--sm" disabled={busy} onClick={() => onAction({ type: 'use-bottle', bottleId: bottle.id })}>
                {def.icon} Empty {def.name}: 1 💧 → {tokensText(def.gain)}
              </button>
            );
          })}
        </span>
      ) : null}
      {shopping ? (
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => onAction({ type: shopping, option: 'skip' })}>
          Pass
        </button>
      ) : null}
      {error ? (
        <span className="turn-bar__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
