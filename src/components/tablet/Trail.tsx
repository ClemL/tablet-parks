'use client';

import { useEffect, useRef, useState } from 'react';
import { legalMoves, siteDef, type MoveOption } from '@/game/engine';
import type { GameState, Hiker } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { SiteArt } from '@/art/siteArt';
import { Pawn, RESOURCE_ICON } from '../bits';

/**
 * The season's trail, start to end. While a person is on the clock their
 * hikers are the only things lit: tap one (the rear hiker is picked to begin
 * with), then tap any highlighted site to walk there. A site that needs a
 * campfire to share says so and asks first.
 */
export function Trail({
  state,
  seats,
  canMove,
  busy,
  onMove,
}: {
  state: GameState;
  seats: PublicSeat[];
  /** The seat a person is moving for, or null when nobody may move from the tablet. */
  canMove: number | null;
  busy: boolean;
  onMove: (move: MoveOption) => void;
}) {
  const moves = canMove !== null ? legalMoves(state) : [];
  const mine = canMove !== null ? state.players[canMove].hikers.filter((h) => !h.finished && moves.some((m) => m.hikerId === h.id)) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<MoveOption | null>(null);
  const arrived = useArrivals(state);

  // A new turn starts from the rear hiker, the usual move.
  const turnKey = `${state.season}:${state.current}:${state.log.length}`;
  useEffect(() => {
    setChosen(null);
    setConfirm(null);
  }, [turnKey]);
  const rear = [...mine].sort((a, b) => a.position - b.position)[0];
  const selected = mine.find((h) => h.id === chosen) ?? rear ?? null;
  const targets = new Map(moves.filter((m) => m.hikerId === selected?.id).map((m) => [m.to, m]));

  const seatOf = (hiker: Hiker) => seats[hiker.owner];

  return (
    <section className="trail" aria-label="The trail">
      <ol className="trail__sites">
        {state.trail.map((kind, index) => {
          const def = siteDef(kind);
          const token = state.siteTokens[index];
          const tent = state.tentSites.includes(index);
          const here = state.players.flatMap((p) => p.hikers.filter((h) => h.position === index && (h.finished ? index === state.trail.length - 1 : true)));
          const target = targets.get(index);
          const end = index === 0 || index === state.trail.length - 1;
          const label = `${def.name}${token ? `, ${token} token waiting` : ''}${tent ? ', tent site' : ''}${target ? target.useCampfire ? ', reachable with a campfire' : ', reachable' : ''}`;
          return (
            <li
              key={`${state.season}-${index}`}
              className={[
                'site',
                end ? 'site--end' : '',
                def.tier === 'advanced' ? 'site--advanced' : '',
                target ? 'site--target' : '',
                target?.useCampfire ? 'site--campfire' : '',
                arrived.has(index) ? 'site--arrived' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className="site__face"
                disabled={!target || busy}
                aria-label={target ? `Walk to ${label}` : label}
                onClick={() => {
                  if (!target) return;
                  if (target.useCampfire) setConfirm(target);
                  else onMove(target);
                }}
              >
                <SiteArt id={kind} />
                <span className="site__icon" aria-hidden="true">
                  {def.icon}
                </span>
                <span className="site__name">{def.name}</span>
                <span className="site__text">{def.text}</span>
                <span className="site__marks">
                  {token ? (
                    <span className={`site__token site__token--${token}`} title={`First hiker here takes 1 ${token}`}>
                      {RESOURCE_ICON[token]}
                    </span>
                  ) : null}
                  {tent ? (
                    <span className="site__tent" title="Tent site: camp here instead of taking the action">
                      ⛺
                    </span>
                  ) : null}
                  {target?.useCampfire ? (
                    <span className="site__fire" title="Sharing costs your campfire">
                      🔥
                    </span>
                  ) : null}
                </span>
              </button>
              <span className="site__hikers">
                {here.map((hiker) => {
                  const pickable = mine.some((h) => h.id === hiker.id);
                  const pawn = <Pawn seat={seatOf(hiker)} size="sm" ring={selected?.id === hiker.id} />;
                  return pickable && mine.length > 1 ? (
                    <button
                      key={`${hiker.id}-${hiker.position}`}
                      type="button"
                      className={`hiker hiker--pick${selected?.id === hiker.id ? ' is-on' : ''}`}
                      aria-pressed={selected?.id === hiker.id}
                      aria-label={`Move this hiker of ${seatOf(hiker).name}`}
                      onClick={() => setChosen(hiker.id)}
                    >
                      {pawn}
                    </button>
                  ) : (
                    <span key={`${hiker.id}-${hiker.position}`} className={`hiker${pickable ? ' hiker--mine' : ''}`}>
                      {pawn}
                    </span>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ol>
      {confirm ? (
        <div className="trail__confirm" role="alertdialog" aria-label="Spend a campfire?">
          <span>
            🔥 <b>{siteDef(state.trail[confirm.to]).name}</b> is occupied. Spend your campfire to share it?
          </span>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onMove(confirm)}>
            Spend the campfire
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Sites a hiker has just walked onto, lit for a moment so a computer's move is easy to follow. */
function useArrivals(state: GameState): Set<number> {
  const previous = useRef<Map<string, number> | null>(null);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const season = state.season;
  const seasonRef = useRef(season);
  useEffect(() => {
    const now = new Map(state.players.flatMap((p) => p.hikers.map((h) => [h.id, h.position] as const)));
    const before = previous.current;
    previous.current = now;
    if (!before || seasonRef.current !== season) {
      seasonRef.current = season;
      return;
    }
    const moved = new Set<number>();
    for (const [id, position] of now) if (before.get(id) !== position && position > 0) moved.add(position);
    if (moved.size === 0) return;
    setLit(moved);
    const timer = setTimeout(() => setLit(new Set()), 1600);
    return () => clearTimeout(timer);
  }, [state, season]);
  return lit;
}
