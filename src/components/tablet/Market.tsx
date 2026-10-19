'use client';

import {
  affordableGear,
  bisonPark,
  campsiteDef,
  canClaimChance,
  canReserveTop,
  claimableParks,
  effectiveCost,
  gearCost,
  reservableParks,
} from '@/game/engine';
import { campsiteCapacity } from '@/game/data/campsites';
import { parkDeckLeft, reservedCount } from '@/game/view';
import type { GameAction, GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { SiteArt } from '@/art/siteArt';
import { Pawn } from '../bits';
import { GearCard } from '../GearCard';
import { ParkCard, ParkDeck } from '../ParkCard';

/**
 * The cards on offer: the park row and deck, the gear shop, and with Nightfall
 * the campsites. When a person stands at the Trail End or a Ranger Station the
 * cards they can act on grow buttons; buying happens right here on the board.
 */
export function Market({
  state,
  seats,
  shopper,
  busy,
  onAction,
}: {
  state: GameState;
  seats: PublicSeat[];
  /** The seat at a park decision on the tablet, or null. */
  shopper: number | null;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const pending = state.pending;
  const kind = shopper !== null && pending && (pending.kind === 'trail-end' || pending.kind === 'park-or-gear') ? pending.kind : null;
  const player = shopper !== null ? state.players[shopper] : null;
  const claimable = new Set(kind && player ? claimableParks(state, player.index).map((p) => p.id) : []);
  const reservable = new Set(kind ? reservableParks(state).map((p) => p.id) : []);
  const gear = new Set(kind === 'trail-end' && player ? affordableGear(state, player.index).map((g) => g.id) : []);
  const bison = bisonPark(state)?.id;
  const act = (option: Extract<GameAction, { type: 'trail-end' }>['option'], extra: { parkId?: string; gearId?: string } = {}) =>
    kind && onAction({ type: kind, option, ...extra } as GameAction);

  const reserveNote = !state.firstPlayerTokenClaimed ? ' · takes 🥇' : '';
  const deckLeft = parkDeckLeft(state);

  return (
    <div className={`market${kind ? ' market--shopping' : ''}`}>
      <section className="market__parks" aria-label="Parks">
        <h3 className="market__title">
          Parks <span className="muted">· visit for points</span>
        </h3>
        <div className="market__row">
          {state.parkRow.map((park) => {
            const canVisit = claimable.has(park.id);
            const canReserve = reservable.has(park.id);
            const paid = player && canVisit ? effectiveCost(player, park, state) : undefined;
            return (
              <ParkCard key={park.id} park={park} bison={park.id === bison} dim={Boolean(kind) && !canVisit && !canReserve} cost={paid}>
                {kind ? (
                  <>
                    <button type="button" className="btn btn--primary btn--sm" disabled={!canVisit || busy} onClick={() => act('claim-park', { parkId: park.id })}>
                      Visit
                    </button>
                    <button type="button" className="btn btn--sm" disabled={!canReserve || busy} onClick={() => act('reserve-park', { parkId: park.id })}>
                      Reserve{reserveNote}
                    </button>
                  </>
                ) : null}
              </ParkCard>
            );
          })}
          <ParkDeck left={deckLeft}>
            {kind ? (
              <>
                {canReserveTop(state) ? (
                  <button type="button" className="btn btn--sm" disabled={busy} onClick={() => act('reserve-top')}>
                    Reserve top{reserveNote}
                  </button>
                ) : null}
                {player && canClaimChance(state, player.index) ? (
                  <button type="button" className="btn btn--sm" disabled={busy} onClick={() => act('chance-park')}>
                    🎲 Visit unseen
                  </button>
                ) : null}
              </>
            ) : null}
          </ParkDeck>
        </div>
        {kind && player && player.reserved.length > 0 ? (
          <div className="market__reserved">
            <h4>{player.name}’s reservations</h4>
            <div className="market__row">
              {player.reserved.map((park) => {
                const canVisit = claimable.has(park.id);
                return (
                  <ParkCard key={park.id} park={park} compact dim={!canVisit} cost={canVisit ? effectiveCost(player, park, state) : undefined}>
                    <button type="button" className="btn btn--primary btn--sm" disabled={!canVisit || busy} onClick={() => act('claim-park', { parkId: park.id })}>
                      Visit
                    </button>
                  </ParkCard>
                );
              })}
            </div>
          </div>
        ) : null}
        <p className="market__held">
          {state.players
            .filter((p) => reservedCount(state, p.index) > 0)
            .map((p) => (
              <span key={p.index} className="held">
                <Pawn seat={seats[p.index]} size="sm" /> {reservedCount(state, p.index)} reserved
              </span>
            ))}
        </p>
      </section>

      <section className="market__gear" aria-label="Gear shop">
        <h3 className="market__title">
          Gear shop{' '}
          <span className="muted">
            · {state.gearDiscountsLeft > 0 ? `${state.gearDiscountsLeft} early-buyer discount${state.gearDiscountsLeft === 1 ? '' : 's'} left` : 'full price'}
          </span>
        </h3>
        <div className="market__row">
          {state.gearRow.map((card) => {
            const price = gearCost(state, card);
            const canBuy = gear.has(card.id);
            return (
              <GearCard key={card.id} card={card} price={price} dim={kind === 'trail-end' && !canBuy}>
                {kind === 'trail-end' ? (
                  <button type="button" className="btn btn--primary btn--sm" disabled={!canBuy || busy} onClick={() => act('buy-gear', { gearId: card.id })}>
                    Buy for {price} ☀️
                  </button>
                ) : null}
              </GearCard>
            );
          })}
        </div>
      </section>

      {state.campsites.length > 0 ? (
        <section className="market__camps" aria-label="Campsites">
          <h3 className="market__title">
            Campsites <span className="muted">· reached from ⛺ sites</span>
          </h3>
          <div className="market__row market__row--camps">
            {state.campsites.map((camp) => {
              const def = campsiteDef(camp.id);
              const capacity = campsiteCapacity(state.players.length);
              return (
                <article key={camp.id} className="camp" aria-label={`${def.name}, ${camp.tents.length} of ${capacity} tents`}>
                  <SiteArt id={camp.id} className="camp__art" />
                  <div className="camp__body">
                    <h4>
                      <span aria-hidden="true">{def.icon}</span> {def.name}
                    </h4>
                    <p>{def.text}</p>
                    <span className="camp__tents">
                      {Array.from({ length: capacity }, (_, i) => {
                        const who = camp.tents[i];
                        return who === undefined ? (
                          <span key={i} className="camp__free" aria-label="free tent spot">
                            ⛺
                          </span>
                        ) : (
                          <Pawn key={i} seat={seats[who]} size="sm" />
                        );
                      })}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
