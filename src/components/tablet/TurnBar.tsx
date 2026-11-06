'use client';

import { bottleDef, pendingLabel, tokenCount, usableBottles } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import type { GameAction, GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat, TableView } from '@/room/room';
import { Pawn, RESOURCE_LABEL, seatStyle, tokensText } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';

/**
 * The bar along the bottom of the board, read upright from one side. Whoever
 * is on the clock gets it: what to do, their pack — the tablet may show it
 * while they act — and the few controls that are not a stop or a card:
 * emptying a flask, and passing at a park decision. A computer's turn shows
 * its latest move instead. For a few seconds after a tap on the tablet it
 * offers to take the tap back. Its far end opens the parks and gear, which
 * are hidden until asked for: each player browses them on their own phone.
 */
export function TurnBar({
  view,
  busy,
  onAction,
  undo,
  drawerOpen,
  onDrawer,
}: {
  view: TableView;
  busy: boolean;
  onAction: (action: GameAction) => void;
  undo: Undo | null;
  drawerOpen: boolean;
  onDrawer: () => void;
}) {
  const state = view.game!;
  const actor = view.actor;
  const seat = actor !== null ? view.seats[actor] : null;
  const thinking = seat !== null && view.cpuThinking;
  const acting = seat !== null && !view.cpuThinking;

  return (
    <section
      className={`turnbar${acting ? ' turnbar--acting' : ''}${thinking ? ' turnbar--thinking' : ''}`}
      style={seat ? seatStyle(seat) : undefined}
      aria-label={seat ? `${seat.name}${acting ? ', on the clock' : ', thinking'}` : 'The turn'}
    >
      {seat ? (
        <>
          <Pawn seat={seat} size={acting ? 'xl' : 'lg'} />
          <div className="turnbar__who">
            <span className="turnbar__name">{seat.name}</span>
            <span className="turnbar__chip">{acting ? 'Your turn' : 'Thinking'}</span>
          </div>
        </>
      ) : null}
      {acting && seat ? (
        <Acting state={state} seat={seat} busy={busy} onAction={onAction} undo={undo && undo.seat === seat.seat ? undo : null} drawerOpen={drawerOpen} />
      ) : (
        <p className="rail__say rail__say--muted">
          {thinking ? <span className="dots" aria-hidden="true" /> : null}
          {lastMove(state)}
        </p>
      )}
      {undo && (!acting || undo.seat !== actor) ? (
        <div className="rail__actions">
          <UndoButton undo={undo} busy={busy} />
        </div>
      ) : null}
      <button type="button" className={`turnbar__drawer${drawerOpen ? ' is-on' : ''}`} aria-expanded={drawerOpen} aria-controls="market-drawer" onClick={onDrawer}>
        <Icon name="deck" size={20} />
        {drawerOpen ? 'Hide parks & gear' : 'Parks & gear'}
      </button>
    </section>
  );
}

/** What the person on the clock does next, their pack, and the controls that are not on a card or a stop. */
function Acting({
  state,
  seat,
  busy,
  onAction,
  undo,
  drawerOpen,
}: {
  state: GameState;
  seat: PublicSeat;
  busy: boolean;
  onAction: (action: GameAction) => void;
  undo: Undo | null;
  drawerOpen: boolean;
}) {
  const player = state.players[seat.seat];
  const pending = state.pending;
  const shopping = pending && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear') ? pending.kind : null;
  const movable = player.hikers.filter((h) => !h.finished).length;
  const bottles = usableBottles(player);
  const phone = seat.phone ? 'on your phone' : 'here';
  const here = drawerOpen ? 'on the cards above' : 'with Parks & gear';

  let say: string;
  let sub: string;
  if (shopping === 'trail-end') {
    say = 'At the Trail End: visit or reserve a park, or buy gear.';
    sub = seat.phone ? `Choose ${phone}, or ${here}. Or pass.` : `Choose ${here}. Or pass.`;
  } else if (shopping === 'park-or-gear') {
    say = 'At the Ranger Station: visit or reserve a park.';
    sub = seat.phone ? `Choose ${phone}, or ${here}. Or pass and keep walking.` : `Choose ${here}. Or pass and keep walking.`;
  } else if (pending) {
    say = `Deciding: ${pendingLabel(state)}.`;
    sub = 'The choices are on the sheet above.';
  } else {
    say = 'Walk a hiker: tap a lit stop.';
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
      {bottles.length > 0 || shopping || undo ? (
        <div className="rail__actions">
          {undo ? <UndoButton undo={undo} busy={busy} /> : null}
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

export interface Undo {
  seat: number;
  label: string;
  seconds: number;
  onUndo: () => void;
}

function UndoButton({ undo, busy }: { undo: Undo; busy: boolean }) {
  return (
    <button type="button" className="rail-btn rail-btn--undo" disabled={busy} onClick={undo.onUndo} aria-label={`Take back: ${undo.label}`} title={`Take back: ${undo.label}`}>
      <Icon name="undo" size={17} />
      Undo · {undo.seconds}
    </button>
  );
}
