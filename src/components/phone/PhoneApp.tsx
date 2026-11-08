'use client';

import { useCallback, useEffect, useState } from 'react';
import { CPU_SEATS, SEASONS } from '@/game/engine';
import type { SeatView } from '@/room/room';
import { isPokemon } from '@/room/names';
import type { SeatPreview } from '@/server/service';
import { ApiError, api } from '@/client/api';
import { local, seatKey } from '@/client/storage';
import { usePoll } from '@/client/usePoll';
import { useDisplay } from '@/client/display';
import { Pawn, SEASON_NAMES, seasonName, seatStyle } from '../bits';
import { SiteArt } from '@/art/siteArt';
import { Icon } from '../Icon';
import { Footer } from '../Footer';
import { PhoneGame } from './PhoneGame';
import { PokemonPicker } from './PokemonPicker';

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
  // This phone's own text size and scale, from its menu.
  useDisplay();

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
        <Footer />
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
      token={token}
      offline={poll.error?.status === 0 ? poll.error.message : null}
      onView={(next) => poll.accept(next)}
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
        // A stock or handed-out name is not theirs to keep: leave the box blank for a fresh one.
        const stock = CPU_SEATS.some((c) => c.name === p.seat.name) || /^Player \d$/.test(p.seat.name) || isPokemon(p.seat.name);
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

  const seat = preview?.seat;
  const lead = !seat
    ? ''
    : seat.kind === 'cpu'
      ? 'The computer is playing this seat. Taking it over hands it to you, pack and all.'
      : seat.phone
        ? 'Another phone is in this seat. Joining moves the seat to this phone.'
        : 'Open — the computer plays it if nobody takes it.';
  return (
    <main className="phone phone--join" style={seat ? seatStyle(seat) : undefined}>
      <div className="permit__scene" aria-hidden="true">
        <SiteArt id="trailhead" className="permit__art" />
      </div>
      <p className="eyebrow permit__eyebrow">Trailside Seasons{preview ? ` · Table ${preview.table}` : ''}</p>
      {preview && seat ? (
        <>
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
              <section className="permit" aria-label={`Your hiking permit for seat ${seat.seat + 1}`}>
                <div className="permit__head">
                  <Pawn seat={seat} size="lg" />
                  <div>
                    <span className="permit__kind">Hiking permit</span>
                    <h1 className="join__seat">Seat {seat.seat + 1}</h1>
                  </div>
                </div>
                <ol className="permit__seasons" aria-label="Valid spring to winter">
                  {SEASON_NAMES.map((name) => (
                    <li key={name} className={`permit__season permit__season--${name.toLowerCase()}`}>
                      {name}
                    </li>
                  ))}
                </ol>
                <label htmlFor="join-name">Your name</label>
                <input id="join-name" value={name} maxLength={16} autoComplete="nickname" placeholder="Blank for a Pokémon name" onChange={(e) => setName(e.target.value)} />
                <p className="permit__lead">{lead}</p>
              </section>
              <button type="submit" className="btn btn--primary btn--big join__go" disabled={busy}>
                {busy ? 'Taking the seat…' : `Take seat ${seat.seat + 1}`}
              </button>
              <section className="join__on" aria-labelledby="join-on">
                <h2 id="join-on" className="join__on-title">
                  On this phone
                </h2>
                <ul className="join__what">
                  <li>
                    <Icon name="pack" />
                    <span>
                      <b>Your pack</b> — resources, camera, photos, campfire, bottles and gear.
                    </span>
                  </li>
                  <li>
                    <Icon name="eyeoff" />
                    <span>
                      <b>Two secret objectives</b>, hidden with one tap when someone leans over.
                    </span>
                  </li>
                  <li>
                    <Icon name="buzz" />
                    <span>
                      <b>It buzzes on your turn.</b> Hikers are walked on the tablet; parks and gear can be chosen here.
                    </span>
                  </li>
                </ul>
              </section>
              <p className="join__fine">Scanning this code from another phone later moves the seat there.</p>
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
      <Footer />
    </main>
  );
}

function Seat({
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
  const me = view.seats[view.seat];
  if (view.phase !== 'lobby' && view.game) {
    return <PhoneGame view={view} token={token} offline={offline} onLeave={onLeave} onView={onView} />;
  }
  return (
    <main className="phone" style={seatStyle(me)}>
      <PhoneHead view={view} />
      <section className="phone__waiting">
        <h2>You’re in.</h2>
        <p>Waiting for the tablet to start the game. Open seats will be played by the computer.</p>
        <PokemonPicker view={view} token={token} onView={onView} />
        <p className="phone__sideways">
          <Icon name="phone" size={18} /> Once the game is dealt, turn your phone sideways: it is played in landscape.
        </p>
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
      <Footer />
    </main>
  );
}

/** Who this phone is, at which table and seat. */
function PhoneHead({ view }: { view: SeatView }) {
  const me = view.seats[view.seat];
  const game = view.game;
  return (
    <header className="phone__head">
      <Pawn seat={me} size="lg" />
      <div className="phone__who">
        <h1>{me.name}</h1>
        <p className="muted">
          Seat {view.seat + 1}
          {game ? ` · ${seasonName(game.season)}, ${game.season} of ${SEASONS}` : ''}
        </p>
      </div>
    </header>
  );
}
