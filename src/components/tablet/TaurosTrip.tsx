'use client';

import { useState } from 'react';
import type { GameState } from '@/game/types';
import { ParkPoster } from '../ParkPoster';
import { TaurosWalker, walkMs, type TaurosWalk } from '../TaurosWalk';

/** How long the strip stays once Tauros has arrived, and how long it takes to come and go. */
const HOLD_MS = 700;
const FADE_MS = 300;

/**
 * Tauros walking on, while the parks are tucked away in the drawer: the park
 * row rises as a strip of small posters above the turn bar, Tauros walks from
 * its old park to the new one, and the strip sinks again. It takes no taps;
 * the trail stays playable underneath.
 */
export function TaurosTrip({ state, walk, onDone }: { state: GameState; walk: TaurosWalk; onDone: (key: string) => void }) {
  // The walker measures the row as it mounts, so it waits for the row to be in place first.
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const arrive = walk.delay + FADE_MS + walkMs(walk);
  const style = {
    '--appear': `${walk.delay}ms`,
    '--leave': `${arrive + HOLD_MS}ms`,
  } as React.CSSProperties;
  const to = state.parkRow[walk.to];
  return (
    <div className="tauros-trip" style={style} aria-hidden="true">
      <p className="tauros-trip__title">
        <b>Tauros</b> walks on{to ? ` to ${to.name}` : ''}
      </p>
      <div className="tauros-trip__row" ref={setRow}>
        {state.parkRow.map((park, index) => (
          <div key={park.id} className="tauros-trip__park">
            <ParkPoster park={park} bison={index === walk.to} />
          </div>
        ))}
        {row ? (
          <TaurosWalker
            walk={{ ...walk, delay: walk.delay + FADE_MS }}
            within={{ current: row }}
            // Hold the arrival for a moment, then let the strip sink before it goes.
            onDone={(key) => window.setTimeout(() => onDone(key), HOLD_MS + FADE_MS)}
          />
        ) : null}
      </div>
    </div>
  );
}
