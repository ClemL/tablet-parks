'use client';

import {
  affordableGear,
  bisonPark,
  canClaimChance,
  canReserveTop,
  claimableParks,
  gearCost,
  reservableParks,
} from '@/game/engine';
import { parkDeckLeft } from '@/game/view';
import type { GameAction, GameState, ParkCard, Player } from '@/game/types';
import { IllustratedParkArt } from '@/art/illustrated';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';
import { parkPlace } from '../ParkCard';
import { costCheck } from '../shopping';
import { useLongPress } from '@/client/useLongPress';
import type { InfoSubject } from './InfoSheet';

type ShopKind = 'trail-end' | 'park-or-gear';
type Option = Extract<GameAction, { type: 'trail-end' }>['option'];

/**
 * The board at a park decision. The cards take the middle of the table, big
 * enough to act on, and each park checks its cost against the pack of the
 * person standing there: what they have, what a wildcard covers, what they
 * are short. The tablet may show that pack while they decide.
 */
export function Shop({
  state,
  shopper,
  kind,
  busy,
  onAction,
  onInfo,
}: {
  state: GameState;
  shopper: number;
  kind: ShopKind;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onInfo: (subject: InfoSubject) => void;
}) {
  const hold = useLongPress();
  const player = state.players[shopper];
  const claimable = new Set(claimableParks(state, shopper).map((p) => p.id));
  const reservable = new Set(reservableParks(state).map((p) => p.id));
  const buyable = new Set(kind === 'trail-end' ? affordableGear(state, shopper).map((g) => g.id) : []);
  const bison = bisonPark(state)?.id;
  const takesLead = !state.firstPlayerTokenClaimed;
  const act = (option: Option, extra: { parkId?: string; gearId?: string } = {}) => onAction({ type: kind, option, ...extra } as GameAction);

  return (
    <div className={`shop${kind === 'trail-end' ? '' : ' shop--parks-only'}`}>
      <section className="shop__parks" aria-labelledby="shop-parks">
        <header className="shop__head">
          <h2 id="shop-parks">Visit or reserve a park</h2>
          {takesLead ? <span className="muted">The first reserve this season takes the first player token</span> : null}
        </header>
        <div className="shop__row">
          {player.reserved.map((park) => (
            <ShopPark
              key={park.id}
              park={park}
              player={player}
              state={state}
              mine
              holdProps={hold(() => onInfo({ kind: 'park', id: park.id }))}
              canVisit={claimable.has(park.id)}
              busy={busy}
              onVisit={() => act('claim-park', { parkId: park.id })}
            />
          ))}
          {state.parkRow.map((park) => (
            <ShopPark
              key={park.id}
              park={park}
              player={player}
              state={state}
              bison={park.id === bison}
              holdProps={hold(() => onInfo({ kind: 'park', id: park.id }))}
              canVisit={claimable.has(park.id)}
              canReserve={reservable.has(park.id)}
              busy={busy}
              onVisit={() => act('claim-park', { parkId: park.id })}
              onReserve={() => act('reserve-park', { parkId: park.id })}
            />
          ))}
          <article className="shop-park shop-park--deck" aria-label={`Park deck, ${parkDeckLeft(state)} cards`}>
            <div className="shop-park__back" aria-hidden="true">
              {parkDeckLeft(state)}
            </div>
            <div className="shop-park__body">
              <h3>Park deck</h3>
              <span className="shop-park__place">Face down. {state.houseRules.blindReserve ? 'A reserve may take the top card unseen.' : ''}</span>
              <div className="shop-park__buttons">
                {canClaimChance(state, shopper) ? (
                  <button type="button" className="shop-btn shop-btn--go" disabled={busy} onClick={() => act('chance-park')}>
                    Visit the top card unseen
                  </button>
                ) : null}
                {canReserveTop(state) ? (
                  <button type="button" className="shop-btn" disabled={busy} onClick={() => act('reserve-top')}>
                    Reserve the top card
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>

      {kind === 'trail-end' ? (
        <section className="shop__gear" aria-labelledby="shop-gear">
          <header className="shop__head">
            <h2 id="shop-gear">Or buy gear</h2>
            <span className="muted">
              {state.gearDiscountsLeft > 0 ? `${state.gearDiscountsLeft} discount${state.gearDiscountsLeft === 1 ? '' : 's'} left` : 'full price'}
            </span>
          </header>
          <div className="shop__gear-list">
            {state.gearRow.map((card) => {
              const price = gearCost(state, card);
              return (
                <article key={card.id} className="shop-gear">
                  <span className="shop-gear__icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <div className="shop-gear__text pressable" {...hold(() => onInfo({ kind: 'gear', id: card.id }))}>
                    <h3>{card.name}</h3>
                    <p>{card.text}</p>
                  </div>
                  <button
                    type="button"
                    className="shop-btn shop-btn--go shop-gear__buy"
                    disabled={!buyable.has(card.id) || busy}
                    aria-label={`Buy ${card.name} for ${price} sun`}
                    onClick={() => act('buy-gear', { gearId: card.id })}
                  >
                    {price}
                    <Token r="sun" size="sm" decorative />
                    {price !== card.cost ? <s>{card.cost}</s> : null}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ShopPark({
  park,
  player,
  state,
  mine = false,
  bison = false,
  canVisit,
  canReserve = false,
  busy,
  onVisit,
  onReserve,
  holdProps,
}: {
  park: ParkCard;
  player: Player;
  state: GameState;
  mine?: boolean;
  bison?: boolean;
  canVisit: boolean;
  canReserve?: boolean;
  busy: boolean;
  onVisit: () => void;
  onReserve?: () => void;
  /** Holding the picture opens the park's rules. */
  holdProps: React.HTMLAttributes<HTMLElement>;
}) {
  const rows = costCheck(state, player, park);
  return (
    <article className={`shop-park${mine ? ' shop-park--mine' : ''}${canVisit ? ' shop-park--can' : ''}`} aria-label={`${park.name}, ${park.vp} points${mine ? ', your reservation' : ''}`}>
      <div className="shop-park__art pressable" {...holdProps}>
        <IllustratedParkArt park={park} />
        <span className="shop-park__vp" aria-hidden="true">
          {park.vp}
        </span>
        {mine ? <span className="shop-park__mine">Yours</span> : null}
        {bison ? (
          <span className="shop-park__bison" title="The bison is here: visiting offers a wildcard trade">
            🦬
          </span>
        ) : null}
      </div>
      <div className="shop-park__body">
        <h3>{park.name}</h3>
        <span className="shop-park__place">
          {parkPlace(park)}
          <br />
          {park.tags.join(', ')}
        </span>
        <ul className="shop-park__check">
          {rows.map(({ r, need, have, status }) => (
            <li key={r} className={`check check--${status}`}>
              <Token r={r} size="xs" decorative />
              <span>
                {status === 'wild' ? `${need} · ${have} + wild` : `${need} · have ${have}`}
              </span>
              <span className="check__mark" aria-label={status === 'short' ? `not enough ${RESOURCE_LABEL[r]}` : 'covered'}>
                <Icon name={status === 'short' ? 'x' : 'check'} size={15} />
              </span>
            </li>
          ))}
        </ul>
        <div className="shop-park__buttons">
          <button type="button" className="shop-btn shop-btn--go" disabled={!canVisit || busy} onClick={onVisit}>
            Visit · {park.vp} VP
          </button>
          {onReserve ? (
            <button type="button" className="shop-btn" disabled={!canReserve || busy} onClick={onReserve}>
              Reserve
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
