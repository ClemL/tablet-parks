'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CPU_SEATS } from '@/game/engine';
import type { SeatView } from '@/room/room';
import type { SeatPreview } from '@/server/service';
import { ApiError, api } from '@/client/api';
import { HIDE_OBJECTIVES_KEY, local, seatKey } from '@/client/storage';
import { usePoll } from '@/client/usePoll';
import { Pawn, seasonName } from '../bits';
import { Scoreboard } from '../Scoreboard';
import { SeatSheet } from './SeatSheet';

function ticketFromHash(): string | null {
  const match = /(?:^#|&)t=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  return match ? match[1] : null;
}

/**
 * A player's phone. It shows, and never changes, the game: moves are made on
 * the tablet. The seat's QR code lands here with a ticket in the fragment
 * (never sent to the server in a URL); joining trades it for this phone's own
 * handle, kept so a reload or a locked screen picks the seat straight back up.
 */
export function PhoneApp() {
  const [ticket, setTicket] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const found = ticketFromHash();
    setTicket(found);
    if (found) setToken(local.get(seatKey(found)));
    setReady(true);
  }, []);

  const poll = usePoll<SeatView>(token, (view) => (view && view.actor === view.seat ? 1500 : 2500));
  const { view } = poll;

  const signOut = useCallback(
    (message: string) => {
      if (ticket) local.set(seatKey(ticket), null);
      setToken(null);
      setNotice(message);
    },
    [ticket],
  );

  useEffect(() => {
    const error = poll.error;
    if (error?.status === 403) signOut(error.message);
    else if (error?.status === 410 || error?.status === 401) signOut('This game has ended. Scan a seat’s code on the tablet to join the next one.');
  }, [poll.error, signOut]);

  if (!ready) return null;
  if (!ticket) {
    return (
      <main className="phone phone--empty">
        <h1>Trailside Seasons</h1>
        <p>Scan the code by your seat on the tablet to join the game.</p>
      </main>
    );
  }
  if (!token || !view) {
    if (token && !poll.error) {
      return (
        <main className="phone phone--empty" aria-busy="true">
          <p>Finding your seat…</p>
        </main>
      );
    }
    return (
      <Join
        ticket={ticket}
        notice={notice}
        onJoined={(handle, joined) => {
          local.set(seatKey(ticket), handle);
          setNotice(null);
          setToken(handle);
          poll.accept(joined, handle);
        }}
      />
    );
  }
  return (
    <Seat
      view={view}
      offline={poll.error?.status === 0 ? poll.error.message : null}
      onLeave={async () => {
        try {
          if (token) await api.leave(token);
        } catch {
          // Leaving a seat that is already gone is still leaving it.
        }
        signOut('You left the seat. Scan its code again to sit back down.');
      }}
    />
  );
}

function Join({ ticket, notice, onJoined }: { ticket: string; notice: string | null; onJoined: (handle: string, view: SeatView) => void }) {
  const [preview, setPreview] = useState<SeatPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.preview(ticket).then(
      (p) => {
        setPreview(p);
        const stock = CPU_SEATS.some((c) => c.name === p.seat.name) || /^Player \d$/.test(p.seat.name);
        if (!stock) setName(p.seat.name);
      },
      (err: unknown) => setProblem(err instanceof ApiError && err.status === 410 ? 'This game has ended.' : err instanceof Error ? err.message : 'Could not read that code'),
    );
  }, [ticket]);

  const join = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const joined = await api.join(ticket, name);
      onJoined(joined.seat, joined.view);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not take the seat');
      setBusy(false);
    }
  };

  return (
    <main className="phone phone--join">
      <p className="eyebrow">Trailside Seasons{preview ? ` · Table ${preview.table}` : ''}</p>
      {preview ? (
        <>
          <h1 className="join__seat">
            <Pawn seat={preview.seat} size="lg" /> Seat {preview.seat.seat + 1}
          </h1>
          {notice ? (
            <p className="notice" role="status">
              {notice}
            </p>
          ) : null}
          {preview.phase === 'over' ? (
            <p>This game is over.</p>
          ) : (
            <form
              className="join__form"
              onSubmit={(e) => {
                e.preventDefault();
                void join();
              }}
            >
              <label htmlFor="join-name">Your name</label>
              <input
                id="join-name"
                value={name}
                maxLength={16}
                autoComplete="nickname"
                placeholder={`Player ${preview.seat.seat + 1}`}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="muted">
                {preview.seat.kind === 'cpu'
                  ? 'The computer is playing this seat. Taking it over hands it to you — you make its moves on the tablet.'
                  : preview.seat.phone
                    ? 'Another phone is in this seat. Joining moves the seat to this phone.'
                    : 'Your resources, camera and secret objectives show here. Moves are made on the tablet.'}
              </p>
              <button type="submit" className="btn btn--primary btn--big" disabled={busy}>
                {busy ? 'Taking the seat…' : 'Take this seat'}
              </button>
            </form>
          )}
        </>
      ) : (
        <p>{problem ?? 'Reading the seat code…'}</p>
      )}
      {preview && problem ? (
        <p className="error" role="alert">
          {problem}
        </p>
      ) : null}
    </main>
  );
}

function Seat({ view, offline, onLeave }: { view: SeatView; offline: string | null; onLeave: () => void }) {
  const me = view.seats[view.seat];
  const [tab, setTab] = useState(view.seat);
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(local.get(HIDE_OBJECTIVES_KEY) === '1'), []);
  const toggle = () => {
    setHidden((h) => {
      local.set(HIDE_OBJECTIVES_KEY, h ? null : '1');
      return !h;
    });
  };
  useTurnBuzz(view.actor === view.seat && !view.cpuThinking);

  if (view.phase === 'lobby' || !view.game) {
    return (
      <main className="phone">
        <PhoneHead view={view} />
        <section className="phone__waiting">
          <h2>You’re in.</h2>
          <p>Waiting for the tablet to start the game. Open seats will be played by the computer.</p>
          <ul className="phone__seats">
            {view.seats.map((seat) => (
              <li key={seat.seat}>
                <Pawn seat={seat} size="sm" /> {seat.name}
                <span className="muted"> · {seat.kind === 'human' ? 'joined' : 'open'}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={onLeave}>
            Leave this seat
          </button>
        </section>
      </main>
    );
  }

  const state = view.game;
  const actor = view.actor;
  const turn =
    state.phase === 'game-over'
      ? 'The game is over.'
      : state.phase === 'season-end'
        ? `${seasonName(state.season)} is over — the tablet starts the next season.`
        : actor === view.seat && !view.cpuThinking
          ? 'Your turn — make your move on the tablet.'
          : actor !== null
            ? view.cpuThinking
              ? `${state.players[actor].name} (computer) is thinking…`
              : `${state.players[actor].name}’s turn.`
            : '';

  return (
    <main className="phone">
      <PhoneHead view={view} />
      <p className={`phone__turn${actor === view.seat && !view.cpuThinking ? ' phone__turn--you' : ''}`} aria-live="polite" style={{ '--seat': me.color } as React.CSSProperties}>
        {turn}
      </p>
      {offline ? (
        <p className="notice" role="status">
          {offline}
        </p>
      ) : null}

      {state.phase === 'game-over' ? (
        <section className="phone__scores">
          <h2>Final scores</h2>
          <Scoreboard state={state} seats={view.seats} highlight={view.seat} />
        </section>
      ) : null}

      <nav className="tabs" aria-label="Whose sheet">
        {view.seats.map((seat) => {
          const locked = state.redacted.hiddenSheets[seat.seat];
          return (
            <button
              key={seat.seat}
              type="button"
              className={`tab${tab === seat.seat ? ' is-on' : ''}`}
              aria-pressed={tab === seat.seat}
              disabled={locked}
              onClick={() => setTab(seat.seat)}
              title={locked ? 'Kept on their own phone' : undefined}
            >
              <Pawn seat={seat} size="sm" />
              <span>{seat.seat === view.seat ? 'You' : seat.name}</span>
              {locked ? <span aria-label="private">🔒</span> : null}
            </button>
          );
        })}
      </nav>

      <SeatSheet
        state={state}
        seat={view.seats[tab] ?? me}
        mine={tab === view.seat}
        objectivesHidden={hidden}
        onToggleObjectives={toggle}
      />

      <footer className="phone__foot">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onLeave}>
          Leave this seat
        </button>
      </footer>
    </main>
  );
}

function PhoneHead({ view }: { view: SeatView }) {
  const me = view.seats[view.seat];
  return (
    <header className="phone__head" style={{ '--seat': me.color } as React.CSSProperties}>
      <Pawn seat={me} size="lg" />
      <div>
        <h1>{me.name}</h1>
        <p className="muted">
          Seat {view.seat + 1} · Table {view.id}
          {view.game ? ` · ${seasonName(view.game.season)}, season ${view.game.season} of 4` : ''}
        </p>
      </div>
    </header>
  );
}

/** A short buzz when the table comes round to you, where the phone allows it. */
function useTurnBuzz(yourTurn: boolean) {
  const was = useRef(false);
  useEffect(() => {
    if (yourTurn && !was.current && 'vibrate' in navigator) navigator.vibrate?.(180);
    was.current = yourTurn;
  }, [yourTurn]);
}
