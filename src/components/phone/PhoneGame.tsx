'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { nextPlayer, seasonsIn } from '@/game/engine';
import type { GameAction, ParkCard } from '@/game/types';
import type { SeatView } from '@/room/room';
import { ApiError, api } from '@/client/api';
import { HIDE_OBJECTIVES_KEY, local } from '@/client/storage';
import { useHiddenNotes } from '@/client/notes';
import { Pawn, seasonName, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { Scoreboard } from '../Scoreboard';
import { SeatSheet } from './SeatSheet';
import { HikePanel } from './HikePanel';
import { FlaskReminder, toggleFlask } from './Flasks';
import { GainToasts } from './GainToasts';
import { Roster } from './Roster';
import { GearPanel, ParksPanel, type Shopping } from './Shopping';
import { MenuPanel } from './MenuPanel';
import { ParkFactSheet } from '../ParkFactSheet';

const PANELS = [
  { id: 'sheet', label: 'Status' },
  { id: 'moves', label: 'Hike' },
  { id: 'parks', label: 'Parks' },
  { id: 'gear', label: 'REI' },
  { id: 'menu', label: 'Menu' },
] as const;

const panelIndex = (id: (typeof PANELS)[number]['id']) => PANELS.findIndex((p) => p.id === id);

/** Whether this seat still stands at a park decision in `view`, as chained visits leave it. */
function stillShopping(view: SeatView): boolean {
  const pending = view.game?.pending;
  return !!pending && pending.player === view.seat && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear');
}

/**
 * A player's phone once the game is dealt: held sideways, with five panels a
 * swipe apart — their status (the sheet), the hike (where their hikers can
 * go), the parks, the gear shop (REI), and the menu. The phone still
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
  const notes = useHiddenNotes();
  const [fact, setFact] = useState<{ park: ParkCard; visited: boolean } | null>(null);
  useNewParks(state.players[view.seat].parks, (park) => setFact({ park, visited: true }));
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
    if (stop) go(panelIndex('parks'));
  }, [stop, go]);
  // The turn coming round brings the moves up once — but only from the sheet,
  // where the preview used to sit, so nobody browsing the shop is pulled away.
  const walking = yourTurn && !pending && state.phase === 'playing' ? `${state.season}:${state.log.length}` : null;
  useEffect(() => {
    if (walking && panel === 0) go(panelIndex('moves'));
    // `panel` is read, not watched: swiping back to the sheet must not bounce.
  }, [walking, go]);

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Arming a flask is this phone's own standing choice, so it may happen on anyone's turn.
  const armFlask = async (id: string) => {
    setBusy(true);
    setProblem(null);
    try {
      onView(await api.flasks(token, toggleFlask(state.players[view.seat].flaskOrder ?? [], id)));
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'That did not go through');
    } finally {
      setBusy(false);
    }
  };
  const choose = async (action: GameAction) => {
    setBusy(true);
    setProblem(null);
    try {
      const next = await api.choose(token, action);
      onView(next);
      // Chained park visits leave the decision open: stay on the parks for the next one.
      go(stillShopping(next) ? panelIndex('parks') : 0);
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
          ? pending?.chain
            ? 'Your turn — visit another park, or tap Done.'
            : 'Your turn — choose a park or gear, here or on the tablet.'
          : yourTurn
            ? 'Your turn — make your move on the tablet.'
            : actor !== null
              ? view.cpuThinking
                ? `${state.players[actor].name} (computer) is thinking…`
                : `${state.players[actor].name}’s turn.`
              : '';
  const coming = state.phase === 'playing' ? nextPlayer(state) : null;
  const youNext = !yourTurn && coming === view.seat && coming !== actor;
  const shown = view.seats[tab] ?? me;

  return (
    <main className="play" style={seatStyle(me)}>
      <RotatePrompt />
      <Roster view={view} />
      <div className="play__frame">
        <header className="play__bar">
          <Pawn seat={me} size="md" />
          <div className="play__who">
            <h1>{me.name}</h1>
            <span>
              {seasonName(state.season)} {state.season}/{seasonsIn(state)}
            </span>
          </div>
          <p className={`play__turn${yourTurn ? ' play__turn--you' : ''}`} aria-live="polite">
            {turn}
            {youNext ? <b className="phone__next"> You’re up next.</b> : null}
          </p>
          <div className="play__tabs" role="tablist" aria-label="Panels">
            {PANELS.map((p, i) => {
              // The panels this stop can be answered from are marked while it waits.
              const open =
                (Boolean(shopping) && (p.id === 'parks' || (p.id === 'gear' && shopping === 'trail-end' && !pending?.chain))) ||
                (p.id === 'moves' && yourTurn && !shopping && state.phase === 'playing');
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  id={`tab-${p.id}`}
                  aria-controls={`panel-${p.id}`}
                  aria-selected={panel === i}
                  aria-label={open ? `${p.label}, choose here` : p.label}
                  className={`${panel === i ? 'is-on' : ''}${p.id === 'menu' ? ' play__tab-menu' : ''}`}
                  onClick={() => go(i)}
                >
                  {p.id === 'menu' ? <Icon name="menu" size={20} /> : p.label}
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
            </nav>
            {state.phase === 'game-over' ? (
              <section className="phone__scores">
                <h2>Final scores</h2>
                <Scoreboard state={state} seats={view.seats} highlight={view.seat} />
              </section>
            ) : null}
            <div className="sheet-grid">
              <SeatSheet
                state={state}
                seat={shown}
                mine={tab === view.seat}
                objectivesHidden={hidden}
                onToggleObjectives={toggle}
                onPark={(park) => setFact({ park, visited: false })}
                flasks={tab === view.seat ? { busy, onToggle: (id) => void armFlask(id) } : undefined}
              />
            </div>
          </section>
          <section id="panel-moves" role="tabpanel" aria-labelledby="tab-moves" className="panel panel--moves">
            <HikePanel view={view} busy={busy} onToggleFlask={(id) => void armFlask(id)} />
          </section>
          <section id="panel-parks" role="tabpanel" aria-labelledby="tab-parks" className="panel">
            <ParksPanel
              state={state}
              seat={view.seat}
              shopping={shopping}
              busy={busy}
              onChoose={choose}
              noteHidden={notes.hidden.has('parks')}
              onHideNote={() => notes.hide('parks')}
            />
          </section>
          <section id="panel-gear" role="tabpanel" aria-labelledby="tab-gear" className="panel">
            <GearPanel
              state={state}
              seat={view.seat}
              shopping={shopping}
              busy={busy}
              onChoose={choose}
              noteHidden={notes.hidden.has('gear')}
              onHideNote={() => notes.hide('gear')}
            />
          </section>
          <section id="panel-menu" role="tabpanel" aria-labelledby="tab-menu" className="panel panel--menu">
            <MenuPanel view={view} token={token} onView={onView} onLeave={onLeave} notesHidden={notes.hidden.size > 0} onShowNotes={notes.reset} />
          </section>
        </div>
      </div>
      {fact ? (
        <ParkFactSheet
          park={fact.park}
          eyebrow={fact.visited ? 'You visited' : 'About this park'}
          onClose={() => {
            setFact(null);
            // Back to the parks once the story is read, while another visit is still open.
            if (shopping) go(panelIndex('parks'));
          }}
        />
      ) : null}
      <FlaskReminder
        table={view.id}
        seat={view.seat}
        player={state.players[view.seat]}
        season={state.season}
        seasonOver={state.phase !== 'playing'}
        onShow={() => go(panelIndex('moves'))}
      />
      <GainToasts log={state.log} seats={view.seats} />
    </main>
  );
}

/**
 * Calls `onNew` with a park this seat has just visited — from this phone or
 * the tablet — once. The parks already visited when the phone opens are taken
 * as seen, so a reload does not replay them.
 */
function useNewParks(parks: readonly ParkCard[], onNew: (park: ParkCard) => void) {
  const seen = useRef<Set<string> | null>(null);
  const latest = useRef(onNew);
  latest.current = onNew;
  const key = parks.map((p) => p.id).join(',');
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(parks.map((p) => p.id));
      return;
    }
    const fresh = parks.find((p) => !seen.current!.has(p.id));
    for (const park of parks) seen.current.add(park.id);
    if (fresh) latest.current(fresh);
    // Keyed on the ids: every poll hands over a new array with the same parks.
  }, [key]);
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
      <p>Once the game is dealt, it is played in landscape: your status, your hike, the parks, REI and the menu sit side by side, a swipe apart.</p>
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
