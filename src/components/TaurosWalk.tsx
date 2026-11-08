'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { LogEntry } from '@/game/types';
import { TaurosToken } from '@/art/pokemon';

/*
 * Tauros on the move. When the Wildlife bison walks on to the next park (after
 * a visit to its park, or from Bison Meadow), a row of park cards on screen
 * shows it stepping across from one card to the other instead of blinking
 * between them. It is read off the public log's `tauros-walk` entries, as the
 * board's other effects are, so a computer's turn and a person's look the
 * same. Nothing walks under prefers-reduced-motion.
 */

export interface TaurosWalk {
  key: string;
  /** Park-row slots: where it stood, and where it is going. */
  from: number;
  to: number;
  /** How long it waits on the old card first, for whatever happened before it (a trade, a hiker's trip). */
  delay: number;
}

/** How long Tauros takes to cross one card. */
const CARD_MS = 650;

/** How long a walk takes once it starts, stomp included. */
export function walkMs(walk: Pick<TaurosWalk, 'from' | 'to'>): number {
  return 400 + CARD_MS * Math.max(1, Math.abs(walk.to - walk.from));
}

/**
 * The walk among the log entries after `since`. Several walks in one poll (a
 * phone that slept through a few turns) become one, from where the first left
 * to where the last arrived. `traded` says whether Tauros also handed someone a
 * wildcard among those entries, which plays first.
 */
export function walkSince(
  log: readonly LogEntry[],
  since: number,
): { id: number; player: number; from: number; to: number; traded: boolean } | null {
  const fresh = log.filter((e) => (e.id ?? 0) > since);
  const walks = fresh.filter((e) => e.event === 'tauros-walk' && e.walk);
  if (walks.length === 0) return null;
  const first = walks[0];
  const last = walks[walks.length - 1];
  // Round the row and back to the same card: nothing to walk.
  if (first.walk!.from === last.walk!.to) return null;
  return {
    id: last.id ?? 0,
    player: last.player,
    from: first.walk!.from,
    to: last.walk!.to,
    traded: fresh.some((e) => e.event === 'tauros'),
  };
}

export function prefersStill(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Watches a log for Tauros walking on. The first look, and a take-back that
 * rewound the log, start quietly. `tradeDelay` holds the walk back while a
 * trade made in the same breath plays.
 */
export function useTaurosWalk(log: readonly LogEntry[], tradeDelay = 0): { walk: TaurosWalk | null; walked: (key: string) => void } {
  const seen = useRef<number | null>(null);
  const [walk, setWalk] = useState<TaurosWalk | null>(null);
  const newest = log[log.length - 1]?.id ?? log.length;

  useEffect(() => {
    if (seen.current === null || newest < seen.current) {
      seen.current = newest;
      return;
    }
    const since = seen.current;
    seen.current = newest;
    if (prefersStill()) return;
    const found = walkSince(log, since);
    if (found) setWalk({ key: `${found.id}`, from: found.from, to: found.to, delay: found.traded ? tradeDelay : 150 });
    // Keyed on the newest entry: every poll hands over a new array.
  }, [newest]);

  return { walk, walked: (key) => setWalk((now) => (now?.key === key ? null : now)) };
}

/**
 * The keyframes for a walk that starts `dx`, `dy` away from where it ends: a
 * step every card-width-or-so with a bob and a lean into the direction of
 * travel, and a little stomp on arrival.
 */
export function walkFrames(dx: number, dy: number): Keyframe[] {
  const steps = Math.max(4, Math.round(Math.hypot(dx, dy) / 36));
  // Starting to the right of the end means walking left, so lean left.
  const lean = dx > 0 ? -1 : 1;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const up = i % 2 === 1 ? 8 : 0;
    const turn = i % 2 === 1 ? 7 * lean : i === 0 || i === steps ? 0 : -2 * lean;
    frames.push({
      offset: t * 0.88,
      transform: `translate(${(dx * (1 - t)).toFixed(1)}px, ${(dy * (1 - t) - up).toFixed(1)}px) rotate(${turn}deg)`,
    });
  }
  frames.push({ offset: 0.94, transform: 'translate(0px, 0px) scale(1.14, 0.88)' });
  frames.push({ offset: 1, transform: 'translate(0px, 0px) scale(1, 1)' });
  return frames;
}

interface Place {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
}

/**
 * Tauros walking across a row of park cards. `within` is the row: positioned,
 * holding one `.poster` per park-row slot in order, and with Tauros's token
 * already on the card it is walking to. That token hides while a copy waits on
 * the old card for `delay`, then walks over and hands back to it. A row that
 * is not on screen finishes at once.
 */
export function TaurosWalker({ walk, within, onDone }: { walk: TaurosWalk; within: RefObject<HTMLElement | null>; onDone: (key: string) => void }) {
  const node = useRef<HTMLSpanElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const row = within.current;
    const posters = row ? Array.from(row.querySelectorAll<HTMLElement>('.poster')) : [];
    const start = posters[walk.from];
    const end = posters[walk.to];
    const token = end?.querySelector<HTMLElement>('.poster__tauros');
    if (!row || !start || !end || !token || row.offsetWidth === 0) {
      done.current(walk.key);
      return;
    }
    // Rects come back scaled by the menu's zoom setting; offsetWidth does not.
    const box = row.getBoundingClientRect();
    const scale = box.width / row.offsetWidth || 1;
    const rel = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - box.left) / scale + row.scrollLeft, y: (r.top - box.top) / scale + row.scrollTop, w: r.width / scale };
    };
    const at = rel(token);
    const a = rel(start);
    const b = rel(end);
    setPlace({ x: at.x, y: at.y, size: at.w, dx: a.x - b.x, dy: a.y - b.y });
    row.classList.add('tauros-walking');
    return () => row.classList.remove('tauros-walking');
    // One walk per mount: the key changes for every new one.
  }, [walk.key]);

  useLayoutEffect(() => {
    const el = node.current;
    if (!el || !place) return;
    const frames = walkFrames(place.dx, place.dy);
    // Stand on the old card while whatever came first plays out.
    el.style.transform = String(frames[0].transform);
    let animation: Animation | null = null;
    const timer = window.setTimeout(() => {
      animation = el.animate(frames, { duration: walkMs(walk), easing: 'linear', fill: 'forwards' });
      animation.onfinish = () => done.current(walk.key);
    }, walk.delay);
    return () => {
      window.clearTimeout(timer);
      animation?.cancel();
    };
  }, [place]);

  if (!place) return null;
  return (
    <span ref={node} className="tauros-walker" style={{ left: place.x, top: place.y, width: place.size, height: place.size }} aria-hidden="true">
      <TaurosToken />
    </span>
  );
}
