'use client';

import { useRef } from 'react';
import {
  affordableGear,
  bisonPark,
  canBuyTopGear,
  canClaimChance,
  canReserveTop,
  claimableParks,
  gearCost,
  gearDeckCount,
  reservableParks,
} from '@/game/engine';
import { parkDeckLeft } from '@/game/view';
import { DECK_GEAR_MIN_SUN } from '@/game/data/sites';
import type { GameAction, GameState, ParkCard, Player } from '@/game/types';
import { ParkPoster } from '../ParkPoster';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';
import { costCheck } from '../shopping';
import { useLongPress } from '@/client/useLongPress';
import type { InfoSubject } from './InfoSheet';
import { GearIcon, useGearName } from '../gearTheme';
import { PriceTag } from '../PriceTag';
import { TaurosWalker, type TaurosWalk } from '../TaurosWalk';

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
  walk = null,
  onWalked,
}: {
  state: GameState;
  shopper: number;
  kind: ShopKind;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onInfo: (subject: InfoSubject) => void;
  /** Tauros walking on to its next park, as a visit to its park sends it. */
  walk?: TaurosWalk | null;
  onWalked?: (key: string) => void;
}) {
  const hold = useLongPress();
  const parksRow = useRef<HTMLDivElement>(null);
  const nameOf = useGearName();
  const player = state.players[shopper];
  const claimable = new Set(claimableParks(state, shopper).map((p) => p.id));
  const reservable = new Set(reservableParks(state).map((p) => p.id));
  const buyable = new Set(kind === 'trail-end' ? affordableGear(state, shopper).map((g) => g.id) : []);
  const bison = bisonPark(state)?.id;
  const takesLead = !state.firstPlayerTokenClaimed;
  // The chain-buy house rule: after a visit, only another visit or stopping is open.
  const chain = kind === 'trail-end' && state.pending?.chain === true;
  const act = (option: Option, extra: { parkId?: string; gearId?: string } = {}) => onAction({ type: kind, option, ...extra } as GameAction);

  return (
    <div className={`shop${kind === 'trail-end' ? '' : ' shop--parks-only'}`}>
      <section className="shop__parks" aria-labelledby="shop-parks">
        <header className="shop__head">
          <h2 id="shop-parks">{chain ? 'Visit another park' : 'Visit or reserve a park'}</h2>
          {chain ? (
            <span className="muted">Parks in a row: keep visiting while the pack covers one</span>
          ) : takesLead ? (
            <span className="muted">The first reserve this season takes the first player token</span>
          ) : null}
        </header>
        <div className="shop__row" ref={parksRow}>
          {walk && onWalked ? <TaurosWalker key={walk.key} walk={walk} within={parksRow} onDone={onWalked} /> : null}
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
              onReserve={chain ? undefined : () => act('reserve-park', { parkId: park.id })}
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
                {canReserveTop(state) && !chain ? (
                  <button type="button" className="shop-btn" disabled={busy} onClick={() => act('reserve-top')}>
                    Reserve the top card
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        </div>
        {player.reserved.length > 0 ? (
          <>
            <h3 className="shop__held-title">
              Reserved <span className="muted">only {player.name} can visit these</span>
            </h3>
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
            </div>
          </>
        ) : null}
      </section>

      {kind === 'trail-end' && !chain ? (
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
              const short = (player.resources.sun ?? 0) < price;
              return (
                <PriceTag key={card.id} sideways className="shop-gear" short={short}>
                  <GearIcon card={card} className="tag__art" />
                  <div className="tag__words pressable" {...hold(() => onInfo({ kind: 'gear', id: card.id }))}>
                    <h3 className="tag__name">{nameOf(card)}</h3>
                    <p className="tag__text">{card.text}</p>
                  </div>
                  {/* The price sticker is the button: tapping the price buys it. */}
                  <button
                    type="button"
                    className="tag__price tag__price--button shop-gear__buy"
                    disabled={!buyable.has(card.id) || busy}
                    aria-label={`Buy ${nameOf(card)} for ${price} sun`}
                    onClick={() => act('buy-gear', { gearId: card.id })}
                  >
                    <b>{price}</b>
                    <Token r="sun" size="xs" decorative />
                    {price !== card.cost ? <s>{card.cost}</s> : null}
                  </button>
                </PriceTag>
              );
            })}
            {state.houseRules.deckGear ? (
              <PriceTag sideways className="shop-gear shop-gear--deck" short={(player.resources.sun ?? 0) < DECK_GEAR_MIN_SUN}>
                <span className="tag__art tag__art--deck" aria-hidden="true">
                  <Icon name="deck" size={34} />
                </span>
                <div className="tag__words">
                  <h3 className="tag__name">Top of the gear deck</h3>
                  <p className="tag__text">
                    Unseen, {gearDeckCount(state)} left. Its usual price less 1 sun — with {DECK_GEAR_MIN_SUN} or more sun.
                  </p>
                </div>
                <button
                  type="button"
                  className="tag__price tag__price--button shop-gear__buy"
                  disabled={!canBuyTopGear(state, shopper) || busy}
                  aria-label="Buy the top card of the gear deck unseen, for 1 sun less"
                  onClick={() => act('buy-top-gear')}
                >
                  <b>−1</b>
                  <Token r="sun" size="xs" decorative />
                </button>
              </PriceTag>
            ) : null}
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
        <ParkPoster park={park} badge={mine ? 'Reserved' : undefined} bison={bison} />
      </div>
      <div className="shop-park__body">
        <span className="shop-park__place">
          {park.region} · {park.tags.join(', ')}
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
