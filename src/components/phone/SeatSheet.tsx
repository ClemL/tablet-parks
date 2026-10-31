'use client';

import { bonusCardById, bottleDef, canClaim, photoValue, tokenCount } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import { scoringView } from '@/game/scoring';
import { HIDDEN_BONUS, reservedCount, sheetHidden } from '@/game/view';
import type { GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token, TokenBag } from '../Token';
import { IllustratedParkArt } from '@/art/illustrated';

/**
 * One player's mat: the pack, the camera and kit, the objectives (on your own),
 * and what they have collected — laid out so a mid-game sheet fits one screen.
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
      <section className="mat mat--locked" aria-label={`${seat.name}'s sheet`}>
        <p>
          <Icon name="lock" size={18} /> <b>{seat.name}</b>’s sheet stays on their own phone. The table is set so phones open the computers’ seats only.
        </p>
      </section>
    );
  }

  const held = tokenCount(player);
  const photoVp = player.photos * photoValue(player);
  const parkVp = player.parks.reduce((sum, p) => sum + p.vp, 0);
  const reserved = reservedCount(state, seat.seat);
  const holder = state.cameraHolder;
  const view = scoringView(player, holder === seat.seat);

  return (
    <section className="mat" aria-label={mine ? 'Your sheet' : `${seat.name}'s sheet`}>
      <div className="mat__block">
        <ul className="res-grid" aria-label="Resources">
          {RESOURCES.map((r) => (
            <li key={r} className={`res${(player.resources[r] ?? 0) === 0 ? ' res--none' : ''}`}>
              <Token r={r} size="lg" decorative />
              <span className="res__count">{player.resources[r] ?? 0}</span>
              <span className="res__label">{RESOURCE_LABEL[r]}</span>
            </li>
          ))}
        </ul>
        <div className="meter-row">
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={TOKEN_LIMIT} aria-valuenow={held} aria-label="Tokens held">
            <span style={{ width: `${Math.min(100, (held / TOKEN_LIMIT) * 100)}%` }} />
          </div>
          <span>
            <b>
              {held} of {TOKEN_LIMIT}
            </b>{' '}
            tokens
          </span>
        </div>
      </div>

      <ul className="kit" aria-label="Camera and kit">
        <li className={holder === seat.seat ? 'kit__item kit__item--on' : 'kit__item'}>
          <Icon name="camera" />
          <span>
            <b>Camera</b>
            <small>
              {holder === seat.seat ? (mine ? 'Yours · photos cost 1' : 'Holds it') : holder === null ? 'Still on the trail' : `${state.players[holder].name} has it`}
            </small>
          </span>
        </li>
        <li className="kit__item">
          <Icon name="photo" />
          <span>
            <b>
              {player.photos} photo{player.photos === 1 ? '' : 's'}
            </b>
            <small>{photoVp} VP</small>
          </span>
        </li>
        <li className="kit__item">
          <span className={player.campfires > 0 ? 'kit__fire' : 'kit__fire kit__fire--out'}>
            <Icon name="fire" />
          </span>
          <span>
            <b>{player.campfires > 0 ? `Campfire lit${player.campfires > 1 ? ` ×${player.campfires}` : ''}` : 'Campfire out'}</b>
            <small>{player.campfires > 0 ? 'Spend it to share a site' : player.campfireRelit ? 'Out until next season' : 'Re-lights at the Trail End'}</small>
          </span>
        </li>
        {player.bottles.map((bottle) => {
          const def = bottleDef(bottle.kind);
          return (
            <li key={bottle.id} className={bottle.used ? 'kit__item kit__item--used' : 'kit__item'}>
              <Icon name="flask" />
              <span>
                <b>{def.name}</b>
                <small>
                  {bottle.used ? 'Used this season' : <>Fresh water → <TokenBag bag={def.gain} size="xs" /></>}
                </small>
              </span>
            </li>
          );
        })}
      </ul>

      {mine ? (
        <div className={`mat__block objectives${objectivesHidden ? ' objectives--hidden' : ''}`}>
          <h3 className="mat__label">
            Secret objectives
            <button type="button" className="objectives__toggle" aria-pressed={objectivesHidden} onClick={onToggleObjectives}>
              <Icon name={objectivesHidden ? 'eye' : 'eyeoff'} size={17} />
              {objectivesHidden ? 'Show' : 'Hide'}
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
                    <span className="objective__now">{card.score(view)} VP now</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mat__block">
        <h3 className="mat__label">
          Parks visited <span>{parkVp} VP</span>
        </h3>
        {player.parks.length === 0 ? (
          <p className="mat__empty">None yet.</p>
        ) : (
          <div className="mini-row">
            {player.parks.map((park) => (
              <MiniPark key={park.id} name={park.name} vp={park.vp} art={<IllustratedParkArt park={park} />} />
            ))}
          </div>
        )}
      </div>

      <div className="mat__block">
        <h3 className="mat__label">Reserved</h3>
        {!mine ? (
          <p className="mat__empty">{reserved === 0 ? 'None.' : `${reserved} held face down.`}</p>
        ) : player.reserved.length === 0 ? (
          <p className="mat__empty">None. The first reserve each season takes the first player token.</p>
        ) : (
          <div className="mini-row">
            {player.reserved.map((park) => (
              <MiniPark
                key={park.id}
                name={park.name}
                vp={park.vp}
                art={<IllustratedParkArt park={park} />}
                note={canClaim(state, player, park) ? 'You can afford it' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mat__block">
        <h3 className="mat__label">Gear</h3>
        {player.gear.length === 0 ? (
          <p className="mat__empty">None yet.</p>
        ) : (
          <ul className="gear-list">
            {player.gear.map((card) => (
              <li key={card.id} className="gear-chip">
                <span aria-hidden="true">{card.icon}</span>
                <span>
                  <b>{card.name}</b>
                  <small>{card.text}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MiniPark({ name, vp, art, note }: { name: string; vp: number; art: React.ReactNode; note?: string }) {
  return (
    <article className={`mini-park${note ? ' mini-park--can' : ''}`} aria-label={`${name}, ${vp} points${note ? `. ${note}` : ''}`}>
      <div className="mini-park__art">
        {art}
        <span className="mini-park__vp" aria-hidden="true">
          {vp}
        </span>
      </div>
      <span className="mini-park__name">{name}</span>
      {note ? (
        <span className="mini-park__note" aria-hidden="true">
          <Icon name="check" size={13} />
          {note}
        </span>
      ) : null}
    </article>
  );
}
