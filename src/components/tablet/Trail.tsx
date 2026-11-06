'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { legalMoves, siteDef, type MoveOption } from '@/game/engine';
import type { GameState, Hiker, SiteKind } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { SiteArt } from '@/art/siteArt';
import { Pawn, RESOURCE_LABEL, hikerName } from '../bits';
import { Icon } from '../Icon';
import { Token, TokenRow } from '../Token';
import { useLongPress } from '@/client/useLongPress';
import { trailLayout } from './trailLayout';

/**
 * What a site does, short enough for a tile a dozen of which share one row.
 * Sites that simply pay out show their tokens instead; the full rules text
 * stays in each tile's label and tooltip.
 */
const SHORT: Partial<Record<SiteKind, string>> = {
  trailhead: 'Start here · no limit',
  'trail-end': 'Visit, reserve or buy gear',
  camera: 'Camera, or a bottle',
  'adv-wildcard': 'Swap 1 for a wild',
  'adv-swap': 'Swap a token, twice',
  'adv-park': 'Visit or reserve a park',
  'adv-copy': 'Copy a site for 1 water',
  'adv-memory': 'A photo for 1 of each',
  'adv-bison': 'Swap 1 for a wild; bison moves',
  'adv-lookout': '1 sun per hiker ahead',
  'adv-talk': 'Reserve the top park',
};

/** Hikers standing on a site: those still walking, and at the end, those home. */
function hikersAt(state: GameState, index: number): Hiker[] {
  const end = state.trail.length - 1;
  return state.players.flatMap((p) => p.hikers.filter((h) => h.position === index && (!h.finished || index === end)));
}

/** Pawns shrink only as a stop gets crowded; one you can pick never drops below large. */
function pawnSize(crowd: number, pickable: boolean): 'md' | 'lg' | 'xl' {
  const size = crowd <= 2 ? 'xl' : crowd <= 4 ? 'lg' : 'md';
  return pickable && size === 'md' ? 'lg' : size;
}

/**
 * The season's trail, drawn as a path winding across the board with a round
 * stop for each site, as big as the board allows. While a person is on the
 * clock the stops they can reach light up: tap one to walk there (the rear
 * hiker is picked to begin with; tap the other hiker to switch). A stop that
 * needs a campfire to share says so and asks first. Tapping any other stop,
 * or holding any stop, opens its full rules.
 */
export function Trail({
  state,
  seats,
  canMove,
  busy,
  onMove,
  onInfo,
}: {
  state: GameState;
  seats: PublicSeat[];
  /** The seat a person is moving for, or null when nobody may move from the tablet. */
  canMove: number | null;
  busy: boolean;
  onMove: (move: MoveOption) => void;
  onInfo: (index: number) => void;
}) {
  const hold = useLongPress();
  const moves = canMove !== null ? legalMoves(state) : [];
  const mine = canMove !== null ? state.players[canMove].hikers.filter((h) => !h.finished && moves.some((m) => m.hikerId === h.id)) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<MoveOption | null>(null);
  const arrived = useArrivals(state);
  const [box, size] = useSize<HTMLElement>();
  const layout = trailLayout(state.trail.length, size.width, size.height);

  // A new turn starts from the rear hiker, the usual move.
  const turnKey = `${state.season}:${state.current}:${state.log.length}`;
  useEffect(() => {
    setChosen(null);
    setConfirm(null);
  }, [turnKey]);
  const rear = [...mine].sort((a, b) => a.position - b.position)[0];
  const selected = mine.find((h) => h.id === chosen) ?? rear ?? null;
  const targets = new Map(moves.filter((m) => m.hikerId === selected?.id).map((m) => [m.to, m]));

  return (
    <section className="trail" aria-label="The trail" ref={box} style={{ '--stop': `${layout.stop}px` } as React.CSSProperties}>
      <svg className="trail__path" width={size.width} height={size.height} aria-hidden="true">
        <path className="trail__path-bed" d={layout.path} />
        <path className="trail__path-line" d={layout.path} />
      </svg>
      <ol className="trail__sites">
        {layout.places.length === state.trail.length
          ? state.trail.map((kind, index) => {
              const def = siteDef(kind);
              const place = layout.places[index];
              const token = state.siteTokens[index];
              const tent = state.tentSites.includes(index);
              const here = hikersAt(state, index);
              const target = targets.get(index);
              const from = selected?.position === index && canMove !== null;
              const end = index === 0 || index === state.trail.length - 1;
              const label = `${def.name}: ${def.text}${token ? ` ${RESOURCE_LABEL[token]} token waiting.` : ''}${tent ? ' Tent site.' : ''}${
                target ? (target.useCampfire ? ' Reachable by spending your campfire.' : ' Reachable.') : ''
              }`;
              return (
                <li
                  key={`${state.season}-${index}`}
                  style={{ left: place.x, top: place.y }}
                  className={[
                    'site',
                    end ? 'site--end' : '',
                    def.tier === 'advanced' ? 'site--advanced' : '',
                    target ? (target.useCampfire ? 'site--campfire' : 'site--target') : '',
                    from ? 'site--from' : '',
                    // A crowd of hikers at the board's edge lines up inward rather than off the board.
                    place.x < layout.stop ? 'site--first-col' : '',
                    place.x > size.width - layout.stop ? 'site--last-col' : '',
                    arrived.has(index) ? 'site--arrived' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="site__face"
                    aria-label={target ? `Walk to ${label}` : `Rules for ${label}`}
                    title={def.text}
                    {...hold(() => onInfo(index))}
                    onClick={() => {
                      if (!target) return onInfo(index);
                      if (busy) return;
                      if (target.useCampfire) setConfirm(target);
                      else onMove(target);
                    }}
                  >
                    <span className="site__disc">
                      <SiteArt id={kind} className="site__art" />
                    </span>
                    <span className="site__name">
                      <span className="site__step" aria-hidden="true">
                        {index + 1}
                      </span>
                      {def.name}
                    </span>
                    <span className="site__does">{def.gain ? <TokenRow bag={def.gain} size="md" /> : SHORT[kind] ?? def.text}</span>
                    {target ? (
                      <span className="site__foot">
                        {target.useCampfire ? (
                          <>
                            <Icon name="fire" size={16} />
                            Campfire
                          </>
                        ) : (
                          <>
                            <Icon name="boot" size={16} />
                            Walk here
                          </>
                        )}
                      </span>
                    ) : from ? (
                      <span className="site__foot site__foot--from">Moving from here</span>
                    ) : null}
                  </button>
                  {token ? (
                    <span className="site__token" title={`First hiker here takes 1 ${RESOURCE_LABEL[token].toLowerCase()}`}>
                      <Token r={token} size="lg" decorative />
                    </span>
                  ) : null}
                  {tent ? (
                    <span className="site__tent" title="Tent site: camp here instead of taking the action">
                      <Icon name="tent" size={18} />
                    </span>
                  ) : null}
                  <span className="site__hikers">
                    {here.map((hiker) => {
                      const seat = seats[hiker.owner];
                      const pickable = mine.length > 1 && mine.some((h) => h.id === hiker.id);
                      const name = hikerName(seat, state.players[hiker.owner].hikers, hiker.id);
                      const pawn = <Pawn seat={seat} size={pawnSize(here.length, pickable)} ring={selected?.id === hiker.id} hiker={name} />;
                      return pickable ? (
                        <button
                          key={hiker.id}
                          type="button"
                          className={`hiker hiker--pick${selected?.id === hiker.id ? ' is-on' : ''}`}
                          aria-pressed={selected?.id === hiker.id}
                          aria-label={`Move ${name} of ${seat.name}`}
                          onClick={() => setChosen(hiker.id)}
                        >
                          {pawn}
                        </button>
                      ) : (
                        <span key={hiker.id} className="hiker">
                          {pawn}
                        </span>
                      );
                    })}
                  </span>
                </li>
              );
            })
          : null}
      </ol>
      {confirm ? (
        <div className="trail__confirm" role="alertdialog" aria-label="Spend a campfire?">
          <Icon name="fire" size={22} />
          <span>
            <b>{siteDef(state.trail[confirm.to]).name}</b> is occupied. Spend your campfire to share it?
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

/** An element's size, kept current as the screen turns or the window resizes. */
function useSize<T extends HTMLElement>(): [(node: T | null) => void, { width: number; height: number }] {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize((old) => (Math.abs(old.width - rect.width) < 1 && Math.abs(old.height - rect.height) < 1 ? old : { width: rect.width, height: rect.height }));
    };
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
  }, []);
  return [ref, size];
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
