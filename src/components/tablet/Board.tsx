'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEASONS, nextPlayer, type MoveOption } from '@/game/engine';
import { reservedCount } from '@/game/view';
import type { GameAction, GameState } from '@/game/types';
import type { TableView } from '@/room/room';
import type { TableCommand } from '@/server/service';
import { Pawn, seasonName, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { TurnBar, type Undo } from './TurnBar';
import { Trail } from './Trail';
import { Campsites, Market } from './Market';
import { Shop } from './Shop';
import { DecisionSheet, needsSheet } from './DecisionSheet';
import { FinalScores, SeasonBreak } from './Overlays';
import { TableMenu } from './TableMenu';
import { InfoSheet, type InfoSubject } from './InfoSheet';

/**
 * The tablet during play, read upright from one side. It shows the board and
 * nothing private: who is hiking in turn order along the top, the trail drawn
 * across the middle with a large stop for every site, and the turn bar along
 * the bottom. The parks, the gear shop and the campsites wait in a drawer,
 * closed until someone opens it: each player browses them on their own phone,
 * and answers a park decision there too.
 */
export function Board({
  view,
  busy,
  error,
  onAction,
  onCommand,
  onAbandon,
  onNewGame,
}: {
  view: TableView;
  busy: boolean;
  error: string | null;
  onAction: (seat: number, action: GameAction) => void;
  onCommand: (command: TableCommand) => void;
  onAbandon: () => void;
  onNewGame: () => void;
}) {
  const state = view.game!;
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [info, setInfo] = useState<InfoSubject | null>(null);
  const undoClock = useUndoClock(view);
  const actor = view.actor;
  const person = actor !== null && !view.cpuThinking ? actor : null;
  const moving = person !== null && !state.pending ? person : null;
  const pendingKind = state.pending?.kind;
  const shopKind = person !== null && (pendingKind === 'trail-end' || pendingKind === 'park-or-gear') ? pendingKind : null;
  const act = (action: GameAction) => person !== null && onAction(person, action);
  const allComputers = view.seats.every((s) => s.kind === 'cpu');
  const coming = state.phase === 'playing' ? nextPlayer(state) : null;
  const upNext = coming !== actor ? coming : null;
  const undo: Undo | null = undoClock ? { ...undoClock, onUndo: () => onCommand({ type: 'undo' }) } : null;

  return (
    <main className="trailside">
      <TopBar state={state} view={view} upNext={upNext} onMenu={() => setMenu(true)} onRules={() => setInfo({ kind: 'all' })} />

      <Trail
        state={state}
        seats={view.seats}
        canMove={moving}
        busy={busy}
        onMove={(move: MoveOption) => act({ type: 'move', ...move })}
        onInfo={(index) => setInfo({ kind: 'site', index })}
      />

      <section id="market-drawer" className="drawer" aria-label="Parks and gear" hidden={!drawer}>
        <header className="drawer__head">
          <h2>{shopKind ? 'Choose a park or gear' : 'Parks & gear'}</h2>
          <span className="muted">
            {shopKind ? 'The same choices are on the player’s phone.' : 'For a look: parks are visited and gear bought at the Trail End.'}
          </span>
          <button type="button" className="btn btn--ghost btn--sm drawer__close" onClick={() => setDrawer(false)} aria-label="Hide parks and gear">
            <Icon name="x" size={18} />
            Hide
          </button>
        </header>
        <div className="drawer__body">
          {shopKind && person !== null ? (
            <Shop state={state} shopper={person} kind={shopKind} busy={busy} onAction={act} onInfo={setInfo} />
          ) : (
            <>
              <Campsites state={state} seats={view.seats} onInfo={setInfo} />
              <Market state={state} seats={view.seats} onInfo={setInfo} />
            </>
          )}
        </div>
      </section>

      <TurnBar view={view} busy={busy} onAction={act} undo={undo} drawerOpen={drawer} onDrawer={() => setDrawer((open) => !open)} />

      {error ? (
        <p className="toast" role="alert">
          {error}
        </p>
      ) : null}
      {person !== null && state.pending && needsSheet(state) ? (
        <DecisionSheet state={state} seat={view.seats[person]} edge="bottom" busy={busy} onAction={act} undo={undo && undo.seat === person ? undo : null} />
      ) : null}
      {state.phase === 'season-end' ? (
        <SeasonBreak state={state} seats={view.seats} busy={busy} automatic={allComputers} onContinue={() => onCommand({ type: 'nextSeason' })} />
      ) : null}
      {state.phase === 'game-over' ? <FinalScores state={state} seats={view.seats} onNewGame={onNewGame} /> : null}
      {info ? <InfoSheet state={state} seats={view.seats} subject={info} edge="bottom" upright onClose={() => setInfo(null)} /> : null}
      {menu ? <TableMenu view={view} busy={busy} onCommand={onCommand} onAbandon={onAbandon} onClose={() => setMenu(false)} /> : null}
    </main>
  );
}

/**
 * The season and its card, then everyone in turn order from the first player:
 * who is on the clock, who is up next, who is home, and who holds the camera
 * and the first player token.
 */
function TopBar({
  state,
  view,
  upNext,
  onMenu,
  onRules,
}: {
  state: GameState;
  view: TableView;
  upNext: number | null;
  onMenu: () => void;
  onRules: () => void;
}) {
  const count = view.seats.length;
  const order = Array.from({ length: count }, (_, i) => (state.firstPlayer + i) % count);
  return (
    <header className="topbar">
      <div className="topbar__season">
        <span className="topbar__name">{seasonName(state.season)}</span>
        <span className="board__pips" role="img" aria-label={`Season ${state.season} of ${SEASONS}`}>
          {Array.from({ length: SEASONS }, (_, i) => (
            <i key={i} className={i < state.season ? 'is-on' : ''} />
          ))}
        </span>
        {state.seasonCard ? (
          <span className="topbar__card" title={`${state.seasonCard.name} — ${state.seasonCard.text}`}>
            <b>{state.seasonCard.name}</b> {state.seasonCard.text}
          </span>
        ) : null}
      </div>

      <ol className={`order${count >= 5 ? ' order--crowded' : ''}`} aria-label="Turn order">
        {order.map((index) => {
          const seat = view.seats[index];
          const player = state.players[index];
          const home = player.hikers.filter((h) => h.finished).length;
          const on = view.actor === index;
          const status = on ? (view.cpuThinking ? 'Thinking' : 'Turn') : upNext === index ? 'Up next' : home === player.hikers.length ? 'Home' : seat.kind === 'cpu' ? 'Computer' : null;
          const held = reservedCount(state, index);
          return (
            <li
              key={index}
              className={`order__seat${on ? ' order__seat--on' : ''}${upNext === index ? ' order__seat--next' : ''}`}
              style={seatStyle(seat)}
              aria-current={on ? 'step' : undefined}
            >
              <Pawn seat={seat} size="lg" />
              <span className="order__text">
                <span className="order__name">{seat.name}</span>
                <span className="order__facts">
                  {status ? <span className={`order__chip${upNext === index ? ' order__chip--next' : ''}`}>{status}</span> : null}
                  <span>{home}/2 home</span>
                  {held > 0 ? <span>{held} held</span> : null}
                </span>
              </span>
              <span className="order__tokens">
                {state.firstPlayer === index ? (
                  <span className="order__token order__token--gold" title={state.firstPlayerTokenClaimed ? 'First player' : 'First player: the next reserve this season takes the token'}>
                    <Icon name="flag" size={16} />
                  </span>
                ) : null}
                {state.cameraHolder === index ? (
                  <span className="order__token" title="Holds the camera">
                    <Icon name="camera" size={16} />
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="topbar__tools">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRules}>
          <Icon name="book" size={18} />
          Rules
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onMenu} aria-label={`Table menu, table ${view.id}`}>
          <Icon name="menu" size={18} />
          {view.id}
        </button>
      </div>
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
