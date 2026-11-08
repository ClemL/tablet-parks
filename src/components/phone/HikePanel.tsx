'use client';

import { campsiteDef, usableCampsites } from '@/game/engine';
import { campsiteCapacity } from '@/game/data/campsites';
import type { GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { SeatView } from '@/room/room';
import { TentArt } from '@/art/tent';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';
import { TurnPreview } from './TurnPreview';
import { FlaskButton } from './Flasks';

/**
 * The Hike panel: where this player's hikers can go (on their turn), the
 * Nightfall campsites still open, and — down the right — what they carry
 * into the walk: their tokens, their flasks (armed here as on Status), and
 * whether they hold the camera or a lit campfire.
 */
export function HikePanel({
  view,
  busy,
  onToggleFlask,
}: {
  view: SeatView;
  busy: boolean;
  onToggleFlask: (id: string) => void;
}) {
  const state = view.game!;
  const me = state.players[view.seat];
  return (
    <div className="hike">
      <div className="hike__main">
        <OpenCampsites state={state} seat={view.seat} />
        <TurnPreview
          state={state}
          seat={view.seat}
          hikers={view.seats[view.seat].hikers}
          seats={view.seats}
          fallback={
            <p className="preview__idle">
              {state.phase === 'playing'
                ? 'On your turn, this lists where each of your hikers can go, what each stop would hand you, and — with your campfire lit — the taken stops you could share.'
                : 'Nobody is walking right now.'}
            </p>
          }
        />
      </div>
      <aside className="hike__pack" aria-label="What you carry">
        <ul className="hike__res" aria-label="Your pack">
          {RESOURCES.map((r) => {
            const n = me.resources[r] ?? 0;
            return (
              <li key={r} className={n === 0 ? 'is-none' : ''} aria-label={`${n} ${RESOURCE_LABEL[r]}`}>
                <Token r={r} size="sm" decorative />
                <b aria-hidden="true">{n}</b>
              </li>
            );
          })}
        </ul>
        <div className="hike__kit">
          {state.cameraHolder === view.seat ? (
            <span className="hike__chip hike__chip--camera" title="You hold the camera">
              <Icon name="camera" size={18} />
              Camera
            </span>
          ) : null}
          {me.campfires > 0 ? (
            <span className="hike__chip hike__chip--fire" title="Your campfire is lit: spend it to share a taken stop">
              <Icon name="fire" size={18} />
              Campfire{me.campfires > 1 ? ` ×${me.campfires}` : ''}
            </span>
          ) : null}
        </div>
        <div className="hike__flasks">
          <h3>
            Flasks <span>{me.bottles.length}</span>
          </h3>
          {me.bottles.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <ul>
              {me.bottles.map((bottle) => (
                <li key={bottle.id}>
                  <FlaskButton bottle={bottle} order={me.flaskOrder ?? []} busy={busy} compact onToggle={onToggleFlask} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

/** The Nightfall campsites with room for another tent, and whether this player could camp there. */
function OpenCampsites({ state, seat }: { state: GameState; seat: number }) {
  const room = campsiteCapacity(state.players.length);
  const open = state.campsites.filter((c) => c.tents.length < room);
  if (open.length === 0) return null;
  const usable = new Set(usableCampsites(state, seat).map((d) => d.id));
  return (
    <section className="open-camps" aria-labelledby="camps-title">
      <h2 id="camps-title" className="open-camps__title">
        <TentArt size={22} /> Campsites still open
      </h2>
      <ul className="open-camps__list">
        {open.map((camp) => {
          const def = campsiteDef(camp.id);
          const left = room - camp.tents.length;
          return (
            <li key={camp.id} className={`open-camps__item${usable.has(camp.id) ? '' : ' open-camps__item--out'}`}>
              <span className="open-camps__icon" aria-hidden="true">
                {def.icon}
              </span>
              <span className="open-camps__text">
                <b>{def.name}</b>
                <small>{def.text}</small>
                <small className="open-camps__left">
                  {left} spot{left === 1 ? '' : 's'} left{usable.has(camp.id) ? '' : ' · not for your pack yet'}
                </small>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
