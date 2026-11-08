'use client';

import {
  affordableGear,
  canBuyTopGear,
  gearDeckCount,
  bisonPark,
  canClaimChance,
  canReserveTop,
  claimableParks,
  gearCost,
  reservableParks,
} from '@/game/engine';
import { parkDeckLeft } from '@/game/view';
import { DECK_GEAR_MIN_SUN } from '@/game/data/sites';
import type { GameAction, GameState, ParkCard, Player } from '@/game/types';
import { RESOURCES } from '@/game/types';
import { IllustratedParkArt } from '@/art/illustrated';
import { RESOURCE_LABEL } from '../bits';
import { Icon } from '../Icon';
import { Token } from '../Token';
import { parkPlace } from '../ParkCard';
import { costCheck } from '../shopping';
import { GearIcon, useGearName } from '../gearTheme';

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
  noteHidden,
  onHideNote,
}: {
  state: GameState;
  seat: number;
  shopping: Shopping;
  busy: boolean;
  onChoose: (action: GameAction) => void;
  /** The heading and its explanation, closed with their ✕ (the menu brings them back). */
  noteHidden: boolean;
  onHideNote: () => void;
}) {
  const player = state.players[seat];
  const claimable = new Set(claimableParks(state, seat).map((p) => p.id));
  const reservable = new Set(reservableParks(state).map((p) => p.id));
  const bison = bisonPark(state)?.id;
  const act = (option: Option, extra: { parkId?: string } = {}) => shopping && onChoose({ type: shopping, option, ...extra } as GameAction);
  // The chain-buy house rule: after a visit, only another visit or stopping is open.
  const chain = shopping === 'trail-end' && state.pending?.chain === true;

  return (
    <div className="shopping">
      {noteHidden ? null : (
        <Note title="Parks" onHide={onHideNote}>
          {chain ? (
            <p className="shopping__now">You visited a park: visit another while your pack covers one, or tap Done.</p>
          ) : shopping ? (
            <p className="shopping__now">
              At {WHERE[shopping]}: visit or reserve one{shopping === 'trail-end' ? ', or buy gear at REI (swipe on)' : ''}.
              {!state.firstPlayerTokenClaimed ? ' A reserve takes the first player token.' : ''}
            </p>
          ) : (
            <p className="shopping__later">Visit or reserve when one of your hikers stops at the Trail End or a Ranger Station.</p>
          )}
        </Note>
      )}
      <ShoppingBar player={player} shopping={shopping} busy={busy} passLabel={chain ? 'Done' : 'Pass'} onPass={() => act('skip')} />
      <div className="offers">
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
            onReserve={chain ? undefined : () => act('reserve-park', { parkId: park.id })}
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
                {canReserveTop(state) && !chain ? (
                  <button type="button" className="offer-btn" disabled={busy} onClick={() => act('reserve-top')}>
                    Reserve the top card
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      </div>
      {player.reserved.length > 0 ? (
        <section className="offers-held" aria-labelledby="offers-held-title">
          <h3 id="offers-held-title" className="offers-held__title">
            Reserved <span>only you can visit these</span>
          </h3>
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
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * REI, the gear shop, with what each card costs this player now; a card they
 * are short of sun for is greyed. Gear is bought at the Trail End only.
 */
export function GearPanel({
  state,
  seat,
  shopping: offered,
  busy,
  onChoose,
  noteHidden,
  onHideNote,
}: {
  state: GameState;
  seat: number;
  shopping: Shopping;
  busy: boolean;
  onChoose: (action: GameAction) => void;
  noteHidden: boolean;
  onHideNote: () => void;
}) {
  const player = state.players[seat];
  // Mid-chain at the Trail End (the chain-buy house rule), REI is closed: the stop was spent on parks.
  const chain = offered === 'trail-end' && state.pending?.chain === true;
  const shopping = chain ? null : offered;
  const buyable = new Set(shopping === 'trail-end' ? affordableGear(state, seat).map((g) => g.id) : []);
  const sun = player.resources.sun ?? 0;
  const nameOf = useGearName();
  const discounts = state.gearDiscountsLeft > 0 ? ` ${state.gearDiscountsLeft} early-buyer discount${state.gearDiscountsLeft === 1 ? '' : 's'} left this season.` : '';
  return (
    <div className="shopping">
      {noteHidden ? null : (
        <Note title="REI" onHide={onHideNote}>
          {shopping === 'trail-end' ? (
            <p className="shopping__now">At the Trail End: buy one with sun, or visit a park instead.{discounts}</p>
          ) : (
            <p className="shopping__later">
              {chain
                ? 'You are visiting parks in a row: gear waits for your next Trail End.'
                : shopping === 'park-or-gear'
                  ? 'The Ranger Station sells no gear: that is the Trail End’s.'
                  : 'Gear is bought when one of your hikers reaches the Trail End.'}
              {discounts}
            </p>
          )}
        </Note>
      )}
      <ShoppingBar
        player={player}
        shopping={shopping === 'trail-end' ? shopping : null}
        busy={busy}
        onPass={() => onChoose({ type: 'trail-end', option: 'skip' })}
      />
      <div className="gear-offers">
        {state.gearRow.map((card) => {
          const price = gearCost(state, card);
          const owned = player.gear.some((g) => g.id === card.id);
          const short = sun < price;
          return (
            <article
              key={card.id}
              className={`gear-offer${short ? ' gear-offer--short' : ''}`}
              aria-label={`${nameOf(card)}, ${price} sun${short ? `, ${price - sun} sun short` : ''}`}
            >
              <GearIcon card={card} className="gear-offer__icon" />
              <div className="gear-offer__text">
                <h3>{nameOf(card)}</h3>
                <p>{card.text}</p>
                <span className="gear-offer__price">
                  {price} <Token r="sun" size="xs" decorative /> sun
                  {price !== card.cost ? <s> {card.cost}</s> : null}
                  {owned ? ' · you have one' : short ? ` · ${price - sun} short` : ''}
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
        {state.houseRules.deckGear ? (
          <article className={`gear-offer gear-offer--deck${sun < DECK_GEAR_MIN_SUN ? ' gear-offer--short' : ''}`} aria-label={`Top of the gear deck, unseen, ${gearDeckCount(state)} left`}>
            <span className="gear-offer__icon" aria-hidden="true">
              <Icon name="deck" size={24} />
            </span>
            <div className="gear-offer__text">
              <h3>Top of the gear deck</h3>
              <p>Unseen, {gearDeckCount(state)} left: its usual price less 1 sun.</p>
              <span className="gear-offer__price">
                Needs {DECK_GEAR_MIN_SUN} <Token r="sun" size="xs" decorative /> sun
                {sun < DECK_GEAR_MIN_SUN ? ` · ${DECK_GEAR_MIN_SUN - sun} short` : ''}
              </span>
            </div>
            {shopping === 'trail-end' ? (
              <button
                type="button"
                className="offer-btn offer-btn--go gear-offer__buy"
                disabled={!canBuyTopGear(state, seat) || busy}
                aria-label="Buy the top card of the gear deck unseen, for 1 sun less"
                onClick={() => onChoose({ type: 'trail-end', option: 'buy-top-gear' })}
              >
                Buy unseen
              </button>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>
  );
}

/** A panel's heading and what it is for, with a ✕ in its upper right that closes it for good. */
function Note({ title, onHide, children }: { title: string; onHide: () => void; children: React.ReactNode }) {
  return (
    <header className="shopping__head">
      <h2>{title}</h2>
      {children}
      <button type="button" className="shopping__close" aria-label={`Close the ${title} note`} onClick={onHide}>
        <Icon name="x" size={16} />
      </button>
    </header>
  );
}

/**
 * The player's pack, token by token, so the cost on each card can be read
 * against it; and Pass, while they stand at a decision this panel answers.
 */
function ShoppingBar({
  player,
  shopping,
  busy,
  passLabel = 'Pass',
  onPass,
}: {
  player: Player;
  shopping: Shopping;
  busy: boolean;
  passLabel?: string;
  onPass: () => void;
}) {
  return (
    <div className="shopping__bar">
      <span className="shopping__pack-label">Your pack</span>
      <ul className="pack-strip" aria-label="Your pack">
        {RESOURCES.map((r) => {
          const n = player.resources[r] ?? 0;
          return (
            <li key={r} className={`pack-strip__item${n === 0 ? ' is-none' : ''}`} aria-label={`${n} ${RESOURCE_LABEL[r]}`}>
              <Token r={r} size="sm" decorative />
              <b aria-hidden="true">{n}</b>
            </li>
          );
        })}
      </ul>
      {shopping ? (
        <button type="button" className="offer-btn shopping__pass" disabled={busy} onClick={onPass}>
          {passLabel}
        </button>
      ) : null}
    </div>
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
        {mine ? <span className="offer__mine">Reserved</span> : null}
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
        ) : null}
      </div>
    </article>
  );
}
