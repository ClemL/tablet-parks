'use client';

import { bottleDef, pendingLabel, tokenCount, usableBottles } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import { reservedCount } from '@/game/view';
import type { GameAction, GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat, TableView } from '@/room/room';
import { Pawn, RESOURCE_LABEL, seatStyle, tokensText } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';

/**
 * A seat's strip along its own edge of the tablet, turned to face whoever sits
 * there. Between turns it says who they are and what the table can see of
 * them; on their turn it grows a colour and says what to do, with their pack —
 * the tablet may show it while they act — and the few controls that are not a
 * card or a site: emptying a flask, and passing at a park decision. A
 * computer's turn shows its latest move instead.
 */
export function SeatRail({
  seat,
  view,
  busy,
  onAction,
}: {
  seat: PublicSeat;
  view: TableView;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const state = view.game!;
  const player = state.players[seat.seat];
  const onClock = view.actor === seat.seat;
  const thinking = onClock && view.cpuThinking;
  const acting = onClock && !view.cpuThinking;
  const home = player.hikers.filter((h) => h.finished).length;
  const reserved = reservedCount(state, seat.seat);

  return (
    <section
      className={`rail${acting ? ' rail--acting' : ''}${thinking ? ' rail--thinking' : ''}`}
      style={seatStyle(seat)}
      aria-label={`${seat.name}${acting ? ', on the clock' : thinking ? ', thinking' : ''}`}
    >
      <Pawn seat={seat} size={acting ? 'xl' : 'lg'} />
      <div className="rail__who">
        <span className="rail__name">{seat.name}</span>
        {acting ? <span className="rail__chip">Your turn</span> : thinking ? <span className="rail__chip">Thinking</span> : <Kind seat={seat} />}
      </div>
      {acting ? (
        <Acting state={state} seat={seat} busy={busy} onAction={onAction} />
      ) : thinking ? (
        <p className="rail__say rail__say--muted">
          <span className="dots" aria-hidden="true" />
          {lastMove(state)}
        </p>
      ) : (
        <div className="rail__facts">
          <span className="rail__fact">
            <Icon name="boot" size={18} />
            {home} of 2 home
          </span>
          <span className="rail__fact">
            <Icon name="ticket" size={18} />
            {reserved === 0 ? 'none reserved' : `${reserved} reserved`}
          </span>
          {state.cameraHolder === seat.seat ? (
            <span className="rail__fact rail__fact--token">
              <Icon name="camera" size={18} />
              Camera
            </span>
          ) : null}
          {state.firstPlayer === seat.seat ? (
            <span className="rail__fact rail__fact--gold">
              <Icon name="flag" size={18} />
              First player
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Kind({ seat }: { seat: PublicSeat }) {
  if (seat.kind === 'cpu') {
    return (
      <span className="rail__kind">
        <Icon name="cpu" size={15} />
        computer
      </span>
    );
  }
  return (
    <span className="rail__kind">
      <Icon name="phone" size={15} />
      {seat.phone ? 'phone' : 'no phone'}
    </span>
  );
}

/** What the person on the clock does next, their pack, and the controls that are not on a card or a site. */
function Acting({ state, seat, busy, onAction }: { state: GameState; seat: PublicSeat; busy: boolean; onAction: (action: GameAction) => void }) {
  const player = state.players[seat.seat];
  const pending = state.pending;
  const shopping = pending && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear') ? pending.kind : null;
  const movable = player.hikers.filter((h) => !h.finished).length;
  const bottles = usableBottles(player);

  let say: string;
  let sub: string;
  if (shopping === 'trail-end') {
    say = 'At the Trail End: pick one action.';
    sub = 'Visit a park, reserve one, or buy gear. Or pass.';
  } else if (shopping === 'park-or-gear') {
    say = 'At the Ranger Station: visit or reserve a park.';
    sub = 'Or pass and keep walking next turn.';
  } else if (pending) {
    say = `Deciding: ${pendingLabel(state)}.`;
    sub = 'The choices are on the sheet turned toward you.';
  } else {
    say = 'Walk a hiker: tap a lit site.';
    sub = movable > 1 ? 'Your rear hiker is picked. Tap your other hiker to move that one instead.' : 'One hiker left on the trail this season.';
  }

  return (
    <>
      <div className="rail__say">
        <b>{say}</b>
        <span className="rail__sub">{sub}</span>
      </div>
      <div className="rail__pack" aria-label={`${seat.name}'s pack: ${tokensText(player.resources)}`} role="group">
        <span className="rail__pack-head">
          <Icon name="pack" size={15} />
          {tokenCount(player)} of {TOKEN_LIMIT}
        </span>
        <span className="rail__pack-tokens" aria-hidden="true">
          {RESOURCES.map((r) => (
            <span key={r} className={(player.resources[r] ?? 0) === 0 ? 'is-empty' : ''}>
              <Token r={r} size="sm" decorative />
              {player.resources[r] ?? 0}
            </span>
          ))}
          <span className={player.campfires > 0 ? 'rail__fire' : 'rail__fire is-empty'}>
            <Icon name="fire" size={17} />
            {player.campfires > 0 ? 'lit' : 'out'}
          </span>
        </span>
      </div>
      {bottles.length > 0 || shopping ? (
        <div className="rail__actions">
          {bottles.map((bottle) => {
            const def = bottleDef(bottle.kind);
            const gain = RESOURCES.filter((r) => def.gain[r]).map((r) => `${def.gain[r]} ${RESOURCE_LABEL[r].toLowerCase()}`).join(', ');
            return (
              <button
                key={bottle.id}
                type="button"
                className="rail-btn"
                disabled={busy}
                aria-label={`Empty the ${def.name}: 1 water for ${gain}`}
                onClick={() => onAction({ type: 'use-bottle', bottleId: bottle.id })}
              >
                <Icon name="flask" size={17} />
                {def.name}
              </button>
            );
          })}
          {shopping ? (
            <button type="button" className="rail-btn rail-btn--pass" disabled={busy} onClick={() => onAction({ type: shopping, option: 'skip' })}>
              Pass
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** The newest thing a player did, for whoever is watching a computer think. */
export function lastMove(state: GameState): string {
  const last = [...state.log].reverse().find((entry) => entry.player >= 0) ?? state.log[state.log.length - 1];
  return last ? `${last.player >= 0 ? `${state.players[last.player].name} ` : ''}${last.text}` : '';
}
