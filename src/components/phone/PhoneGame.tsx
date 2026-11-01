'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SEASONS, nextPlayer } from '@/game/engine';
import { scorePlayer } from '@/game/scoring';
import type { GameAction } from '@/game/types';
import type { SeatView } from '@/room/room';
import { ApiError, api } from '@/client/api';
import { HIDE_OBJECTIVES_KEY, local } from '@/client/storage';
import { Pawn, seasonName, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { Scoreboard } from '../Scoreboard';
import { SeatSheet } from './SeatSheet';
import { TurnPreview } from './TurnPreview';
import { GearPanel, ParksPanel, type Shopping } from './Shopping';

const PANELS = [
  { id: 'sheet', label: 'Sheet' },
  { id: 'parks', label: 'Parks' },
  { id: 'gear', label: 'Gear' },
] as const;

/**
 * A player's phone once the game is dealt: held sideways, with three panels a
 * swipe apart — their sheet, the parks, and the gear shop. The phone still
 * walks no hikers; it answers its own player's park decisions — visit,
 * reserve, buy, or pass — and jumps to the parks when one comes up.
 */
export function PhoneGame({
  view,
  token,
  offline,
  onLeave,
  onView,
}: {
  view: SeatView;
  token: string;
  offline: string | null;
  onLeave: () => void;
  onView: (view: SeatView) => void;
}) {
  const state = view.game!;
  const me = view.seats[view.seat];
  const actor = view.actor;
  const yourTurn = actor === view.seat && !view.cpuThinking;
  useTurnBuzz(yourTurn);

  const [tab, setTab] = useState(view.seat);
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(local.get(HIDE_OBJECTIVES_KEY) === '1'), []);
  const toggle = () => {
    setHidden((h) => {
      local.set(HIDE_OBJECTIVES_KEY, h ? null : '1');
      return !h;
    });
  };

  const pending = state.pending;
  const shopping: Shopping =
    yourTurn && pending?.player === view.seat && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear') ? pending.kind : null;

  const strip = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(0);
  const go = useCallback((index: number) => {
    const el = strip.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: index * el.clientWidth, behavior: still ? 'auto' : 'smooth' });
    setPanel(index);
  }, []);
  // A stop at a park decision brings the parks up by itself, once per stop.
  const stop = shopping && pending ? `${state.season}:${pending.hikerId}:${pending.siteIndex}` : null;
  useEffect(() => {
    if (stop) go(1);
  }, [stop, go]);

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const choose = async (action: GameAction) => {
    setBusy(true);
    setProblem(null);
    try {
      onView(await api.choose(token, action));
      go(0);
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'That did not go through');
    } finally {
      setBusy(false);
    }
  };

  const turn =
    state.phase === 'game-over'
      ? 'The game is over.'
      : state.phase === 'season-end'
        ? `${seasonName(state.season)} is over.`
        : shopping
          ? 'Your turn — choose a park or gear, here or on the tablet.'
          : yourTurn
            ? 'Your turn — make your move on the tablet.'
            : actor !== null
              ? view.cpuThinking
                ? `${state.players[actor].name} (computer) is thinking…`
                : `${state.players[actor].name}’s turn.`
              : '';
  const coming = state.phase === 'playing' ? nextPlayer(state) : null;
  const youNext = !yourTurn && coming === view.seat && coming !== actor;
  const score = scorePlayer(state, state.players[view.seat]);
  const total = score.total - (hidden ? score.bonusVp : 0);
  const shown = view.seats[tab] ?? me;

  return (
    <main className="play" style={seatStyle(me)}>
      <RotatePrompt />
      <div className="play__frame">
        <header className="play__bar">
          <Pawn seat={me} size="md" />
          <div className="play__who">
            <h1>{me.name}</h1>
            <span>
              {seasonName(state.season)} {state.season}/{SEASONS} · Table {view.id}
            </span>
          </div>
          <p className={`play__turn${yourTurn ? ' play__turn--you' : ''}`} aria-live="polite">
            {turn}
            {youNext ? <b className="phone__next"> You’re up next.</b> : null}
          </p>
          <p className="play__score" title={hidden ? 'Without your hidden objectives' : 'If the game ended now'}>
            <b>{total}</b> VP
          </p>
          <div className="play__tabs" role="tablist" aria-label="Panels">
            {PANELS.map((p, i) => {
              // The panels this stop can be answered from are marked while it waits.
              const open = Boolean(shopping) && (p.id === 'parks' || (p.id === 'gear' && shopping === 'trail-end'));
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`tab-${p.id}`}
                  aria-controls={`panel-${p.id}`}
                  aria-selected={panel === i}
                  aria-label={open ? `${p.label}, choose here` : p.label}
                  className={panel === i ? 'is-on' : ''}
                  onClick={() => go(i)}
                >
                  {p.label}
                  {open ? <span className="play__dot" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </header>
        {problem || offline ? (
          <p className="play__notice" role="alert">
            {problem ?? offline}
          </p>
        ) : null}

        <div
          className="panels"
          ref={strip}
          onScroll={(e) => {
            const el = e.currentTarget;
            const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (index !== panel) setPanel(index);
          }}
        >
          <section id="panel-sheet" role="tabpanel" aria-labelledby="tab-sheet" className="panel panel--sheet">
            <nav className="seats-nav" aria-label="Whose sheet">
              {view.seats.map((seat) => {
                const locked = state.redacted.hiddenSheets[seat.seat];
                const on = tab === seat.seat;
                const you = seat.seat === view.seat;
                return (
                  <button
                    key={seat.seat}
                    type="button"
                    className={`seat-pick${on ? ' is-on' : ''}${you ? ' seat-pick--you' : ''}`}
                    aria-pressed={on}
                    aria-label={you ? 'Your sheet' : locked ? `${seat.name}’s sheet stays on their phone` : `${seat.name}’s sheet`}
                    disabled={locked}
                    onClick={() => setTab(seat.seat)}
                  >
                    <Pawn seat={seat} size="sm" />
                    {you ? <span>You</span> : on ? <span>{seat.name}</span> : null}
                    {locked ? (
                      <span className="seat-pick__lock">
                        <Icon name="lock" size={12} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <button type="button" className="btn btn--ghost btn--sm play__leave" onClick={onLeave}>
                Leave seat
              </button>
            </nav>
            {state.phase === 'game-over' ? (
              <section className="phone__scores">
                <h2>Final scores</h2>
                <Scoreboard state={state} seats={view.seats} highlight={view.seat} />
              </section>
            ) : null}
            <div className="sheet-grid">
              {yourTurn && tab === view.seat ? <TurnPreview state={state} seat={view.seat} /> : null}
              <SeatSheet state={state} seat={shown} mine={tab === view.seat} objectivesHidden={hidden} onToggleObjectives={toggle} />
            </div>
          </section>
          <section id="panel-parks" role="tabpanel" aria-labelledby="tab-parks" className="panel">
            <ParksPanel state={state} seat={view.seat} shopping={shopping} busy={busy} onChoose={choose} />
          </section>
          <section id="panel-gear" role="tabpanel" aria-labelledby="tab-gear" className="panel">
            <GearPanel state={state} seat={view.seat} shopping={shopping} busy={busy} onChoose={choose} />
          </section>
        </div>
      </div>
    </main>
  );
}

/** Shown instead of the game while the phone is held upright. */
function RotatePrompt() {
  const [canTurn, setCanTurn] = useState(false);
  useEffect(() => setCanTurn(Boolean(document.fullscreenEnabled)), []);
  return (
    <div className="rotate" role="status">
      <span className="rotate__phone" aria-hidden="true">
        <Icon name="phone" size={56} />
      </span>
      <h2>Turn your phone sideways</h2>
      <p>Once the game is dealt, it is played in landscape: your sheet, the parks and the gear sit side by side, a swipe apart.</p>
      {canTurn ? (
        <button type="button" className="btn btn--primary" onClick={() => void goSideways()}>
          Full screen, sideways
        </button>
      ) : null}
    </div>
  );
}

async function goSideways(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (to: 'landscape') => Promise<void> };
    await orientation.lock?.('landscape');
  } catch {
    // Not every browser lets a page turn itself; the prompt stays until the phone is turned.
  }
}

/** A short buzz when the table comes round to you, where the phone allows it. */
function useTurnBuzz(yourTurn: boolean) {
  const was = useRef(false);
  useEffect(() => {
    if (yourTurn && !was.current && 'vibrate' in navigator) navigator.vibrate?.(180);
    was.current = yourTurn;
  }, [yourTurn]);
}
