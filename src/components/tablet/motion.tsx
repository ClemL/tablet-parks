'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameState, Resource, ResourceBag } from '@/game/types';
import { RESOURCES } from '@/game/types';
import { walkSince, type TaurosWalk } from '../TaurosWalk';
import type { StopPlace } from './trailLayout';

/*
 * The board in motion: a hiker who moves walks along the trail from stop to
 * stop instead of blinking across it, and the things that happen on the way —
 * a campfire spent to share a stop, a flask emptied, Tauros trading a
 * wildcard — get a moment of their own over the stop where they happened.
 * When Tauros then walks on to its next park, that walk is handed to whatever
 * shows the parks (the drawer, or a strip of cards that rises for it).
 * Everything here is read off
 * the change from one view of the game to the next, so the computers' moves
 * and the tablet's own taps look the same. Nothing moves under
 * prefers-reduced-motion.
 */

export type Gait = 'walk' | 'hop' | 'skip' | 'roll';

export interface Travel {
  key: string;
  hikerId: string;
  owner: number;
  from: number;
  to: number;
  gait: Gait;
  /** How long the trip takes, so what happens on arrival can wait for it. */
  ms: number;
}

export interface Fx {
  key: string;
  kind: 'fire' | 'flask' | 'tauros';
  at: number;
  /** What a flask turned the water into, or what Tauros handed over. */
  gain?: ResourceBag;
  /** What the player handed Tauros for it. */
  gave?: Resource;
  delay: number;
}

/** How long each effect plays once it starts; the stylesheet's animations match. */
export const FX_MS: Record<Fx['kind'], number> = { fire: 1900, flask: 1900, tauros: 2600 };

const STEP_MS: Record<Gait, number> = { walk: 420, hop: 380, skip: 360, roll: 320 };
const MAX_TRIP_MS = 3200;

/** Short trips are walked; a long one is walked often, otherwise hopped, skipped or rolled. */
export function pickGait(steps: number, roll: number): Gait {
  if (steps < 3) return 'walk';
  if (roll < 0.4) return 'walk';
  if (roll < 0.6) return 'hop';
  if (roll < 0.8) return 'skip';
  return 'roll';
}

export function tripMs(gait: Gait, steps: number): number {
  return Math.min(MAX_TRIP_MS, STEP_MS[gait] * Math.max(1, steps));
}

function stillPreferred(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Compares each new view of the game with the last one and hands back the
 * trips to walk and the effects to play. A new season, a take-back (hikers
 * moving backwards) and the first look all start quietly.
 */
export interface BoardMotion {
  travels: Travel[];
  fx: Fx[];
  arrived: (key: string) => void;
  /** Tauros walking on to its next park, once the trip and the trade before it have played. */
  walk: TaurosWalk | null;
  walked: (key: string) => void;
}

export function useBoardMotion(state: GameState): BoardMotion {
  const before = useRef<{ season: number; positions: Map<string, number>; logId: number } | null>(null);
  const lastStop = useRef(new Map<number, number>());
  const [travels, setTravels] = useState<Travel[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);
  const [walk, setWalk] = useState<TaurosWalk | null>(null);
  const logId = state.log[state.log.length - 1]?.id ?? state.log.length;
  const key = `${state.season}|${logId}|${state.players.map((p) => p.hikers.map((h) => h.position).join('.')).join('|')}`;

  useEffect(() => {
    const positions = new Map(state.players.flatMap((p) => p.hikers.map((h) => [h.id, h.position] as const)));
    const was = before.current;
    before.current = { season: state.season, positions, logId };
    // A trip whose hiker is no longer headed there — taken back, or a new season — stops at once.
    setTravels((now) => (now.some((t) => positions.get(t.hikerId) !== t.to) ? now.filter((t) => positions.get(t.hikerId) === t.to) : now));
    if (!was || was.season !== state.season || stillPreferred()) return;

    const trips: Travel[] = [];
    for (const player of state.players) {
      for (const hiker of player.hikers) {
        const from = was.positions.get(hiker.id);
        if (from === undefined || hiker.position <= from) continue;
        const steps = hiker.position - from;
        const gait = pickGait(steps, Math.random());
        trips.push({ key: `${hiker.id}:${logId}`, hikerId: hiker.id, owner: player.index, from, to: hiker.position, gait, ms: tripMs(gait, steps) });
        lastStop.current.set(player.index, hiker.position);
      }
    }

    const effects: Fx[] = [];
    for (const entry of state.log) {
      if ((entry.id ?? 0) <= was.logId || !entry.event || entry.event === 'tauros-walk') continue;
      const trip = trips.find((t) => t.owner === entry.player);
      // Tauros trades at the Trail End too, after the trip there was walked in an earlier poll.
      const furthest = entry.event === 'tauros' ? Math.max(...(state.players[entry.player]?.hikers.map((h) => h.position) ?? [])) : undefined;
      const at = trip?.to ?? lastStop.current.get(entry.player) ?? (Number.isFinite(furthest) ? furthest : undefined);
      if (at === undefined) continue;
      const delay = (trip?.ms ?? 0) + (entry.event === 'flask' && effects.some((e) => e.at === at) ? 500 : 0);
      const gain: ResourceBag = {};
      for (const r of RESOURCES) if ((entry.delta?.[r] ?? 0) > 0) gain[r] = entry.delta![r];
      if (entry.event === 'tauros') {
        const gave = RESOURCES.find((r) => (entry.delta?.[r] ?? 0) < 0);
        effects.push({ key: `${entry.id}`, kind: 'tauros', at, gain: { wild: gain.wild ?? 1 }, gave, delay });
      } else {
        effects.push({ key: `${entry.id}`, kind: entry.event === 'campfire' ? 'fire' : 'flask', at, gain, delay });
      }
    }

    // Tauros walks on once its trade has played, or once the hiker that sent it on its way has arrived.
    const walked = walkSince(state.log, was.logId);
    if (walked) {
      const trade = effects.find((e) => e.kind === 'tauros' && e.at !== undefined);
      const trip = trips.find((t) => t.owner === walked.player);
      const delay = trade ? trade.delay + FX_MS.tauros - 300 : trip ? trip.ms + 300 : 250;
      setWalk({ key: `${walked.id}`, from: walked.from, to: walked.to, delay });
    }

    if (trips.length > 0) setTravels((now) => [...now.filter((t) => !trips.some((n) => n.hikerId === t.hikerId)), ...trips]);
    if (effects.length > 0) {
      setFx((now) => [...now, ...effects]);
      const longest = Math.max(...effects.map((e) => e.delay + FX_MS[e.kind])) + 300;
      window.setTimeout(() => setFx((now) => now.filter((e) => !effects.includes(e))), longest);
    }
    // Keyed on what moved: every poll hands over a new state object.
  }, [key]);

  return {
    travels,
    fx,
    arrived: (done) => setTravels((now) => now.filter((t) => t.key !== done)),
    walk,
    walked: (done) => setWalk((now) => (now?.key === done ? null : now)),
  };
}

/** Where a pawn's feet are on a stop: the hikers there stand on its top edge, 22px into the disc. */
export function standPoint(place: StopPlace, stop: number): StopPlace {
  return { x: place.x, y: place.y - stop / 2 + 22 };
}

/**
 * One hiker on the move: a copy of its pawn travelling stop by stop along
 * the trail, in its gait, while the pawn itself waits hidden at the far end.
 */
export function Traveller({
  travel,
  places,
  stop,
  children,
  onDone,
}: {
  travel: Travel;
  places: StopPlace[];
  stop: number;
  children: React.ReactNode;
  onDone: (key: string) => void;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const start = places[travel.from] ? standPoint(places[travel.from], stop) : null;

  useLayoutEffect(() => {
    const el = node.current;
    if (!el || !start) return;
    const points = [];
    for (let i = travel.from; i <= travel.to; i++) if (places[i]) points.push(standPoint(places[i], stop));
    const frames = gaitFrames(travel.gait, points.map((p) => ({ x: p.x - start.x, y: p.y - start.y })));
    const animation = el.animate(frames, { duration: travel.ms, easing: 'linear', fill: 'forwards' });
    animation.onfinish = () => done.current(travel.key);
    return () => animation.cancel();
    // One trip per mount: the key changes for every new trip.
  }, [travel.key]);

  if (!start) return null;
  return (
    <span ref={node} className={`traveller traveller--${travel.gait}`} style={{ left: start.x, top: start.y }} aria-hidden="true">
      {children}
    </span>
  );
}

/** The keyframes for a trip through `points` (offsets from the start), in the given gait. */
export function gaitFrames(gait: Gait, points: StopPlace[]): Keyframe[] {
  const legs = Math.max(1, points.length - 1);
  const frames: Keyframe[] = [];
  const at = (leg: number, t: number) => {
    const a = points[Math.min(leg, points.length - 1)];
    const b = points[Math.min(leg + 1, points.length - 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const push = (leg: number, t: number, lift: number, turn: number, scale = 1) => {
    const p = at(leg, t);
    frames.push({
      offset: Math.min(1, (leg + t) / legs),
      transform: `translate(-50%, -100%) translate(${p.x.toFixed(1)}px, ${(p.y - lift).toFixed(1)}px) rotate(${turn}deg) scale(${scale})`,
    });
  };
  push(0, 0, 0, 0);
  for (let leg = 0; leg < legs; leg++) {
    switch (gait) {
      case 'walk':
        push(leg, 0.25, 6, -6);
        push(leg, 0.5, 0, 0);
        push(leg, 0.75, 6, 6);
        push(leg, 1, 0, 0);
        break;
      case 'hop':
        push(leg, 0.15, 0, 0, 0.92);
        push(leg, 0.5, 52, 0, 1.06);
        push(leg, 0.92, 0, 0, 0.94);
        push(leg, 1, 0, 0, 1);
        break;
      case 'skip':
        push(leg, 0.25, 20, -8);
        push(leg, 0.5, 0, 0);
        push(leg, 0.75, 20, 8);
        push(leg, 1, 0, 0);
        break;
      case 'roll':
        push(leg, 0.5, 4, 360 * leg + 180);
        push(leg, 1, 0, 360 * (leg + 1));
        break;
    }
  }
  return frames;
}
