'use client';

import { bonusCardById, bottleDef, photoValue, tokenCount } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import { scoringView } from '@/game/scoring';
import { HIDDEN_BONUS, reservedCount, sheetHidden } from '@/game/view';
import type { GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn, RESOURCE_ICON, RESOURCE_LABEL } from '../bits';
import { GearCard } from '../GearCard';
import { ParkCard } from '../ParkCard';

/**
 * One player's sheet: resources, camera and photos, campfires and bottles,
 * gear, parks visited and reserved — and, on your own, your objectives.
 */
export function SeatSheet({
  state,
  seat,
  mine,
  objectivesHidden,
  onToggleObjectives,
}: {
  state: GameState;
  seat: PublicSeat;
  mine: boolean;
  objectivesHidden: boolean;
  onToggleObjectives: () => void;
}) {
  const player = state.players[seat.seat];
  if (sheetHidden(state, seat.seat)) {
    return (
      <section className="sheet-view sheet-view--locked" aria-label={`${seat.name}'s sheet`}>
        <p>
          🔒 <b>{seat.name}</b>’s sheet stays on their own phone. The table is set so phones open the computers’ seats only.
        </p>
      </section>
    );
  }

  const held = tokenCount(player);
  const camera =
    state.cameraHolder === seat.seat
      ? mine
        ? 'You hold the camera: photos cost you 1 token, and you may take one more when the season ends.'
        : `${seat.name} holds the camera.`
      : state.cameraHolder === null
        ? 'The camera is still on the trail.'
        : `${state.players[state.cameraHolder].name} has the camera.`;
  const parkVp = player.parks.reduce((sum, p) => sum + p.vp, 0);
  const photoVp = player.photos * photoValue(player);
  const reserved = reservedCount(state, seat.seat);
  const view = scoringView(player, state.cameraHolder === seat.seat);

  return (
    <section className="sheet-view" aria-label={mine ? 'Your sheet' : `${seat.name}'s sheet`}>
      <div className="sheet-view__block">
        <h3>
          Resources <span className="muted">· {held} of {TOKEN_LIMIT} tokens</span>
        </h3>
        <ul className="res-grid">
          {RESOURCES.map((r) => (
            <li key={r} className={`res res--${r}${(player.resources[r] ?? 0) === 0 ? ' res--none' : ''}`}>
              <span className="res__icon" aria-hidden="true">
                {RESOURCE_ICON[r]}
              </span>
              <span className="res__count">{player.resources[r] ?? 0}</span>
              <span className="res__label">{RESOURCE_LABEL[r]}</span>
            </li>
          ))}
        </ul>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={TOKEN_LIMIT} aria-valuenow={held} aria-label="Tokens held">
          <span style={{ width: `${Math.min(100, (held / TOKEN_LIMIT) * 100)}%` }} />
        </div>
      </div>

      <div className="sheet-view__block">
        <h3>Camera &amp; kit</h3>
        <ul className="kit">
          <li className={state.cameraHolder === seat.seat ? 'kit--on' : ''}>
            <span aria-hidden="true">📷</span> {camera}
          </li>
          <li>
            <span aria-hidden="true">📸</span> {player.photos} photo{player.photos === 1 ? '' : 's'} · {photoVp} VP
          </li>
          <li>
            <span aria-hidden="true">🔥</span> {player.campfires} campfire{player.campfires === 1 ? '' : 's'} lit
            {player.campfireRelit ? '' : <span className="muted"> · re-lights when a hiker reaches the Trail End</span>}
          </li>
          {player.bottles.map((bottle) => {
            const def = bottleDef(bottle.kind);
            return (
              <li key={bottle.id} className={bottle.used ? 'kit--used' : ''}>
                <span aria-hidden="true">{def.icon}</span> {def.name}: 1 💧 → {RESOURCES.filter((r) => def.gain[r]).map((r) => `${def.gain[r]} ${RESOURCE_ICON[r]}`).join(' ')}
                <span className="muted"> · {bottle.used ? 'used this season' : 'ready (fresh water only)'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {mine ? (
        <div className={`sheet-view__block objectives${objectivesHidden ? ' objectives--hidden' : ''}`}>
          <h3>
            Secret objectives
            <button type="button" className="btn btn--sm objectives__toggle" aria-pressed={objectivesHidden} onClick={onToggleObjectives}>
              {objectivesHidden ? '👁 Show' : '🙈 Hide'}
            </button>
          </h3>
          {objectivesHidden ? (
            <p className="muted">Hidden. Tap Show when nobody is looking over your shoulder.</p>
          ) : (
            <ul className="objective-list">
              {player.bonusCards.map((id) => {
                const card = id === HIDDEN_BONUS ? null : bonusCardById(id);
                if (!card) return null;
                return (
                  <li key={id} className="objective">
                    <b>{card.name}</b>
                    <span>{card.text}</span>
                    <span className="objective__now">worth {card.score(view)} VP right now</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="sheet-view__block">
        <h3>
          Parks visited <span className="muted">· {parkVp} VP</span>
        </h3>
        {player.parks.length === 0 ? <p className="muted">None yet.</p> : null}
        <div className="mini-row">
          {player.parks.map((park) => (
            <ParkCard key={park.id} park={park} compact />
          ))}
        </div>
      </div>

      <div className="sheet-view__block">
        <h3>Reserved parks</h3>
        {mine ? (
          player.reserved.length === 0 ? (
            <p className="muted">None. Reserving a park keeps it for you; the first reserve each season takes the 🥇.</p>
          ) : (
            <div className="mini-row">
              {player.reserved.map((park) => (
                <ParkCard key={park.id} park={park} compact />
              ))}
            </div>
          )
        ) : (
          <p className="muted">{reserved === 0 ? 'None.' : `${reserved} held face down.`}</p>
        )}
      </div>

      <div className="sheet-view__block">
        <h3>Gear</h3>
        {player.gear.length === 0 ? <p className="muted">None yet.</p> : null}
        <div className="mini-col">
          {player.gear.map((card) => (
            <GearCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      <p className="sheet-view__score">
        <Pawn seat={seat} size="sm" /> So far: {parkVp} from parks, {photoVp} from photos
        {state.firstPlayer === seat.seat ? ', 1 for the 🥇' : ''}
        {mine && !objectivesHidden ? `, plus objectives at the end` : ''}.
      </p>
    </section>
  );
}
