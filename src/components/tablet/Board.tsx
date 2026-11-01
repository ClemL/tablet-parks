'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEASONS, nextPlayer, type MoveOption } from '@/game/engine';
import type { GameAction, GameState } from '@/game/types';
import type { TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { Pawn, SeasonCardLine, seasonName } from '../bits';
import { Icon } from '../Icon';
import { EdgeFrame } from './EdgeFrame';
import { SeatRail, lastMove } from './SeatRail';
import { Trail, TrailStrip } from './Trail';
import { Campsites, Market } from './Market';
import { Shop } from './Shop';
import { DecisionSheet, needsSheet } from './DecisionSheet';
import { FinalScores, SeasonBreak } from './Overlays';
import { TableMenu } from './TableMenu';
import { InfoSheet, type InfoSubject } from './InfoSheet';

/**
 * The tablet during play. It shows the board and nothing private: the trail,
 * the parks, the gear shop and the campsites, with each seat's rail on its own
 * edge. While hikers walk, the trail has the room; when a person stops at the
 * Trail End or a Ranger Station, the cards take it instead, and the trail
 * shrinks to a strip.
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
  const [info, setInfo] = useState<InfoSubject | null>(null);
  const undo = useUndoClock(view);
  const actor = view.actor;
  const person = actor !== null && !view.cpuThinking ? actor : null;
  const moving = person !== null && !state.pending ? person : null;
  const pendingKind = state.pending?.kind;
  const shopKind = person !== null && (pendingKind === 'trail-end' || pendingKind === 'park-or-gear') ? pendingKind : null;
  const act = (action: GameAction) => person !== null && onAction(person, action);
  const allComputers = view.seats.every((s) => s.kind === 'cpu');
  const coming = state.phase === 'playing' ? nextPlayer(state) : null;
  const upNext = coming !== actor ? coming : null;
  const undoFor = (seat: number) => (undo && undo.seat === seat ? { ...undo, onUndo: () => onCommand({ type: 'undo' }) } : null);

  return (
    <EdgeFrame seats={view.seats} rails upright={upright} className="table" tag={(seat) => <SeatRail seat={seat} view={view} busy={busy} onAction={act} next={upNext === seat.seat} undo={undoFor(seat.seat)} />}>
      <div className={`board${shopKind ? ' board--shop' : ''}`}>
        <BoardHead state={state} view={view} onMenu={() => setMenu(true)} onRules={() => setInfo({ kind: 'all' })} />
        {shopKind && person !== null ? (
          <>
            <TrailStrip state={state} seats={view.seats} at={state.pending!.siteIndex} />
            <Shop state={state} shopper={person} kind={shopKind} busy={busy} onAction={act} onInfo={setInfo} />
          </>
        ) : (
          <>
            <Trail
              state={state}
              seats={view.seats}
              canMove={moving}
              busy={busy}
              onMove={(move: MoveOption) => act({ type: 'move', ...move })}
              onInfo={(index) => setInfo({ kind: 'site', index })}
            />
            <p className="board__log" aria-live="polite">
              {lastMove(state)}
            </p>
            <Campsites state={state} seats={view.seats} onInfo={setInfo} />
            <Market state={state} seats={view.seats} onInfo={setInfo} />
          </>
        )}
      </div>

      {error ? (
        <p className="toast" role="alert">
          {error}
        </p>
      ) : null}
      {person !== null && state.pending && needsSheet(state) ? (
        <DecisionSheet
          state={state}
          seat={view.seats[person]}
          edge={upright ? 'bottom' : view.seats[person].edge}
          busy={busy}
          onAction={act}
          undo={undoFor(person)}
        />
      ) : null}
      {state.phase === 'season-end' ? (
        <SeasonBreak state={state} seats={view.seats} busy={busy} automatic={allComputers} onContinue={() => onCommand({ type: 'nextSeason' })} />
      ) : null}
      {state.phase === 'game-over' ? <FinalScores state={state} seats={view.seats} onNewGame={onNewGame} /> : null}
      {info ? (
        <InfoSheet
          state={state}
          seats={view.seats}
          subject={info}
          edge={person !== null ? view.seats[person].edge : 'bottom'}
          upright={upright}
          onClose={() => setInfo(null)}
        />
      ) : null}
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

/** The season, its card, and who holds the camera and the first player token — read from every side. */
function BoardHead({ state, view, onMenu, onRules }: { state: GameState; view: TableView; onMenu: () => void; onRules: () => void }) {
  return (
    <header className="board__head">
      <span className="board__season">{seasonName(state.season)}</span>
      <span className="board__pips" role="img" aria-label={`Season ${state.season} of ${SEASONS}`}>
        {Array.from({ length: SEASONS }, (_, i) => (
          <i key={i} className={i < state.season ? 'is-on' : ''} />
        ))}
      </span>
      <SeasonCardLine card={state.seasonCard} />
      <span className="holder" title="The camera">
        <Icon name="camera" size={18} />
        Camera
        {state.cameraHolder === null ? <span className="muted">on the trail</span> : <Pawn seat={view.seats[state.cameraHolder]} size="sm" />}
      </span>
      <span className="holder" title={state.firstPlayerTokenClaimed ? 'The first player token' : 'The first player token: the next reserve this season takes it'}>
        <Icon name="flag" size={18} className="holder__gold" />
        First player
        <Pawn seat={view.seats[state.firstPlayer]} size="sm" />
        {!state.firstPlayerTokenClaimed ? <span className="muted">up for grabs</span> : null}
      </span>
      <button type="button" className="btn btn--ghost btn--sm board__menu" onClick={onRules}>
        <Icon name="book" size={18} />
        Rules
      </button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onMenu} aria-label={`Table menu, table ${view.id}`}>
        <Icon name="menu" size={18} />
        Table {view.id}
      </button>
    </header>
  );
}

/**
 * The take-back on offer, counted down on this tablet's own clock: the server
 * says when it ends in its time, and the difference from ours is fixed when
 * the view arrives.
 */
function useUndoClock(view: TableView): { seat: number; label: string; seconds: number } | null {
  const undo = view.undo;
  const deadline = useMemo(() => (undo ? Date.now() + (undo.until - view.serverNow) : 0), [undo, view.serverNow]);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, [deadline]);
  if (!undo) return null;
  const left = deadline - Date.now();
  return left > 0 ? { seat: undo.seat, label: undo.label, seconds: Math.ceil(left / 1000) } : null;
}
