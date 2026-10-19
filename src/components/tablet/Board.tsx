'use client';

import { useState } from 'react';
import { SEASONS, type MoveOption } from '@/game/engine';
import type { GameAction } from '@/game/types';
import type { PublicSeat, TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { Pawn, SeasonCardLine, seasonName } from '../bits';
import { EdgeFrame } from './EdgeFrame';
import { Trail } from './Trail';
import { Market } from './Market';
import { TurnBar } from './TurnBar';
import { DecisionSheet, needsSheet } from './DecisionSheet';
import { FinalScores, SeasonBreak } from './Overlays';
import { TableMenu } from './TableMenu';

/**
 * The tablet during play. It shows the board and nothing private: the trail,
 * the parks, the gear shop and the campsites, with a name tag on each edge.
 * Everyone's resources and objectives are on their own phones.
 */
export function Board({
  view,
  busy,
  error,
  upright,
  onUpright,
  onAction,
  onCommand,
  onAbandon,
  onNewGame,
}: {
  view: TableView;
  busy: boolean;
  error: string | null;
  upright: boolean;
  onUpright: (value: boolean) => void;
  onAction: (seat: number, action: GameAction) => void;
  onCommand: (command: TableCommand) => void;
  onAbandon: () => void;
  onNewGame: () => void;
}) {
  const state = view.game!;
  const [menu, setMenu] = useState(false);
  const actor = view.actor;
  const person = actor !== null && !view.cpuThinking ? actor : null;
  const moving = person !== null && !state.pending ? person : null;
  const shopper = person !== null && state.pending && !needsSheet(state) ? person : null;
  const act = (action: GameAction) => person !== null && onAction(person, action);
  const allComputers = view.seats.every((s) => s.kind === 'cpu');

  return (
    <EdgeFrame
      seats={view.seats}
      width={236}
      height={52}
      upright={upright}
      className="table"
      tag={(seat) => <NameTag seat={seat} view={view} />}
    >
      <div className="board">
        <header className="board__head">
          <span className="board__season">
            {seasonName(state.season)} <span className="muted">· {state.season} of {SEASONS}</span>
          </span>
          <SeasonCardLine card={state.seasonCard} />
          <span className="board__holders">
            <span title="Camera">
              📷 {state.cameraHolder === null ? 'on the trail' : <Pawn seat={view.seats[state.cameraHolder]} size="sm" />}
            </span>
            <span title="First player token">
              🥇 <Pawn seat={view.seats[state.firstPlayer]} size="sm" />
              {!state.firstPlayerTokenClaimed ? <span className="muted"> · up for grabs</span> : null}
            </span>
          </span>
          <button type="button" className="btn btn--ghost btn--sm board__menu" onClick={() => setMenu(true)} aria-label="Table menu">
            ☰ Table {view.id}
          </button>
        </header>

        <Trail state={state} seats={view.seats} canMove={moving} busy={busy} onMove={(move: MoveOption) => act({ type: 'move', ...move })} />
        <TurnBar state={state} seats={view.seats} actor={actor} cpuThinking={view.cpuThinking} busy={busy} error={error} onAction={act} />
        <Market state={state} seats={view.seats} shopper={shopper} busy={busy} onAction={act} />
      </div>

      {person !== null && state.pending && needsSheet(state) ? (
        <DecisionSheet state={state} seat={view.seats[person]} edge={upright ? 'bottom' : view.seats[person].edge} busy={busy} onAction={act} />
      ) : null}
      {state.phase === 'season-end' ? (
        <SeasonBreak state={state} seats={view.seats} busy={busy} automatic={allComputers} onContinue={() => onCommand({ type: 'nextSeason' })} />
      ) : null}
      {state.phase === 'game-over' ? <FinalScores state={state} seats={view.seats} onNewGame={onNewGame} /> : null}
      {menu ? (
        <TableMenu
          view={view}
          busy={busy}
          upright={upright}
          onUpright={onUpright}
          onCommand={onCommand}
          onAbandon={onAbandon}
          onClose={() => setMenu(false)}
        />
      ) : null}
    </EdgeFrame>
  );
}

/** A seat's tag during play: who, whether a computer or a phone is behind it, and whose turn it is. */
function NameTag({ seat, view }: { seat: PublicSeat; view: TableView }) {
  const state = view.game!;
  const player = state.players[seat.seat];
  const onClock = view.actor === seat.seat;
  const home = player.hikers.filter((h) => h.finished).length;
  return (
    <div className={`name-tag${onClock ? ' name-tag--turn' : ''}`} style={{ '--seat': seat.color } as React.CSSProperties}>
      <Pawn seat={seat} size="md" />
      <span className="name-tag__name">{seat.name}</span>
      <span className="name-tag__marks">
        {seat.kind === 'cpu' ? <span title="Played by the computer">🤖</span> : seat.phone ? <span title="Phone connected">📱</span> : null}
        {state.cameraHolder === seat.seat ? <span title="Holds the camera">📷</span> : null}
        {state.firstPlayer === seat.seat ? <span title="First player">🥇</span> : null}
        <span className="name-tag__home" title={`${home} of 2 hikers home`}>
          {home}/2
        </span>
      </span>
      {onClock ? <span className="name-tag__turn">{view.cpuThinking ? 'thinking' : 'your turn'}</span> : null}
    </div>
  );
}
