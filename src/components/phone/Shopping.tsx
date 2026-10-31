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
import type { GameAction, GameState, ParkCard } from '@/game/types';
import { IllustratedParkArt } from '@/art/illustrated';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';
import { parkPlace } from '../ParkCard';
import { costCheck } from '../shopping';

/** The park decision this phone's player stands at, if any. */
export type Shopping = 'trail-end' | 'park-or-gear' | null;

type Option = Extract<GameAction, { type: 'trail-end' }>['option'];

const WHERE: Record<'trail-end' | 'park-or-gear', string> = {
  'trail-end': 'the Trail End',
  'park-or-gear': 'the Ranger Station',
};

/**
 * The parks on offer, checked against this player's pack. Always there to
 * browse; the buttons come alive when one of their hikers stops at the Trail
 * End or a Ranger Station, and then answer the decision from the phone — the
 * tablet's shop can answer it too, whichever is tapped first.
 */
export function ParksPanel({
  state,
  seat,
  shopping,
  busy,
  onChoose,
}: {
  state: GameState;
  seat: number;
  shopping: Shopping;
  busy: boolean;
  onChoose: (action: GameAction) => void;
}) {
  const player = state.players[seat];
  const claimable = new Set(claimableParks(state, seat).map((p) => p.id));
  const reservable = new Set(reservableParks(state).map((p) => p.id));
  const bison = bisonPark(state)?.id;
  const act = (option: Option, extra: { parkId?: string } = {}) => shopping && onChoose({ type: shopping, option, ...extra } as GameAction);

  return (
    <div className="shopping">
      <header className="shopping__head">
        <h2>Parks</h2>
        {shopping ? (
          <>
            <p className="shopping__now">
              At {WHERE[shopping]}: visit or reserve one{shopping === 'trail-end' ? ', or buy gear (swipe on)' : ''}.
              {!state.firstPlayerTokenClaimed ? ' A reserve takes the first player token.' : ''}
            </p>
            <PassButton busy={busy} onPass={() => act('skip')} />
          </>
        ) : (
          <p className="shopping__later">Visit or reserve when one of your hikers stops at the Trail End or a Ranger Station.</p>
        )}
      </header>
      <div className="offers">
        {player.reserved.map((park) => (
          <Offer
            key={park.id}
            park={park}
            state={state}
            seat={seat}
            mine
            shopping={shopping}
            canVisit={claimable.has(park.id)}
            busy={busy}
            onVisit={() => act('claim-park', { parkId: park.id })}
          />
        ))}
        {state.parkRow.map((park) => (
          <Offer
            key={park.id}
            park={park}
            state={state}
            seat={seat}
            bison={park.id === bison}
            shopping={shopping}
            canVisit={claimable.has(park.id)}
            canReserve={reservable.has(park.id)}
            busy={busy}
            onVisit={() => act('claim-park', { parkId: park.id })}
            onReserve={() => act('reserve-park', { parkId: park.id })}
          />
        ))}
        <article className="offer offer--deck" aria-label={`Park deck, ${parkDeckLeft(state)} cards`}>
          <div className="offer__back" aria-hidden="true">
            {parkDeckLeft(state)}
          </div>
          <div className="offer__body">
            <h3>Park deck</h3>
            <span className="offer__place">Face down.{state.houseRules.blindReserve ? ' A reserve may take the top card unseen.' : ''}</span>
            {shopping ? (
              <div className="offer__buttons">
                {canClaimChance(state, seat) ? (
                  <button type="button" className="offer-btn offer-btn--go" disabled={busy} onClick={() => act('chance-park')}>
                    Visit unseen
                  </button>
                ) : null}
                {canReserveTop(state) ? (
                  <button type="button" className="offer-btn" disabled={busy} onClick={() => act('reserve-top')}>
                    Reserve the top card
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}

/** The gear shop, with what each card costs this player now. Gear is bought at the Trail End only. */
export function GearPanel({
  state,
  seat,
  shopping,
  busy,
  onChoose,
}: {
  state: GameState;
  seat: number;
  shopping: Shopping;
  busy: boolean;
  onChoose: (action: GameAction) => void;
}) {
  const player = state.players[seat];
  const buyable = new Set(shopping === 'trail-end' ? affordableGear(state, seat).map((g) => g.id) : []);
  const sun = player.resources.sun ?? 0;
  return (
    <div className="shopping">
      <header className="shopping__head">
        <h2>Gear</h2>
        {shopping === 'trail-end' ? (
          <>
            <p className="shopping__now">
              At the Trail End: buy one with sun, or visit a park instead. You have {sun} <Token r="sun" size="xs" decorative /> sun.
            </p>
            <PassButton busy={busy} onPass={() => onChoose({ type: 'trail-end', option: 'skip' })} />
          </>
        ) : (
          <p className="shopping__later">
            {shopping === 'park-or-gear' ? 'The Ranger Station sells no gear: that is the Trail End’s.' : 'Gear is bought when one of your hikers reaches the Trail End.'}{' '}
            {state.gearDiscountsLeft > 0 ? `${state.gearDiscountsLeft} early-buyer discount${state.gearDiscountsLeft === 1 ? '' : 's'} left this season.` : ''}
          </p>
        )}
      </header>
      <div className="gear-offers">
        {state.gearRow.map((card) => {
          const price = gearCost(state, card);
          const owned = player.gear.some((g) => g.id === card.id);
          return (
            <article key={card.id} className="gear-offer">
              <span className="gear-offer__icon" aria-hidden="true">
                {card.icon}
              </span>
              <div className="gear-offer__text">
                <h3>{card.name}</h3>
                <p>{card.text}</p>
                <span className="gear-offer__price">
                  {price} <Token r="sun" size="xs" decorative /> sun
                  {price !== card.cost ? <s> {card.cost}</s> : null}
                  {owned ? ' · you have one' : sun < price ? ` · ${price - sun} short` : ''}
                </span>
              </div>
              {shopping === 'trail-end' ? (
                <button
                  type="button"
                  className="offer-btn offer-btn--go gear-offer__buy"
                  disabled={!buyable.has(card.id) || busy}
                  onClick={() => onChoose({ type: 'trail-end', option: 'buy-gear', gearId: card.id })}
                >
                  Buy
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function PassButton({ busy, onPass }: { busy: boolean; onPass: () => void }) {
  return (
    <button type="button" className="offer-btn shopping__pass" disabled={busy} onClick={onPass}>
      Pass
    </button>
  );
}

function Offer({
  park,
  state,
  seat,
  mine = false,
  bison = false,
  shopping,
  canVisit,
  canReserve = false,
  busy,
  onVisit,
  onReserve,
}: {
  park: ParkCard;
  state: GameState;
  seat: number;
  mine?: boolean;
  bison?: boolean;
  shopping: Shopping;
  canVisit: boolean;
  canReserve?: boolean;
  busy: boolean;
  onVisit: () => void;
  onReserve?: () => void;
}) {
  const rows = costCheck(state, state.players[seat], park);
  return (
    <article className={`offer${mine ? ' offer--mine' : ''}${canVisit ? ' offer--can' : ''}`} aria-label={`${park.name}, ${park.vp} points${mine ? ', your reservation' : ''}`}>
      <div className="offer__art">
        <IllustratedParkArt park={park} />
        <span className="offer__vp" aria-hidden="true">
          {park.vp}
        </span>
        {mine ? <span className="offer__mine">Yours</span> : null}
        {bison ? (
          <span className="offer__bison" title="The bison is here: visiting offers a wildcard trade">
            🦬
          </span>
        ) : null}
      </div>
      <div className="offer__body">
        <h3>{park.name}</h3>
        <span className="offer__place">
          {parkPlace(park)} · {park.tags.join(', ')}
        </span>
        <ul className="offer__check">
          {rows.map(({ r, need, have, status }) => (
            <li key={r} className={`check check--${status}`}>
              <Token r={r} size="xs" decorative />
              <span>{status === 'wild' ? `${need} · ${have} + wild` : `${need} · have ${have}`}</span>
              <span className="check__mark" aria-label={status === 'short' ? `not enough ${RESOURCE_LABEL[r]}` : 'covered'}>
                <Icon name={status === 'short' ? 'x' : 'check'} size={13} />
              </span>
            </li>
          ))}
        </ul>
        {shopping ? (
          <div className="offer__buttons">
            <button type="button" className="offer-btn offer-btn--go" disabled={!canVisit || busy} onClick={onVisit}>
              Visit · {park.vp} VP
            </button>
            {onReserve ? (
              <button type="button" className="offer-btn" disabled={!canReserve || busy} onClick={onReserve}>
                Reserve
              </button>
            ) : null}
          </div>
        ) : canVisit ? (
          <span className="offer__can">
            <Icon name="check" size={13} /> Your pack covers it
          </span>
        ) : null}
      </div>
    </article>
  );
}
