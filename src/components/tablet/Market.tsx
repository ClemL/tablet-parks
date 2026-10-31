'use client';

import { bisonPark, campsiteDef, gearCost } from '@/game/engine';
import { campsiteCapacity } from '@/game/data/campsites';
import { parkDeckLeft, reservedCount } from '@/game/view';
import type { GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { SiteArt } from '@/art/siteArt';
import { Pawn } from '../bits';
import { Icon } from '../Icon';
import { GearCard } from '../GearCard';
import { ParkCard, ParkDeck } from '../ParkCard';
import type { InfoSubject } from './InfoSheet';

/**
 * The cards on offer while hikers walk: the park row and deck, and the gear
 * shop. Nothing here is bought from — when a person stops at the Trail End or
 * a Ranger Station, the board turns into the shop (see Shop). Tapping a card
 * opens its rules.
 */
export function Market({ state, seats, onInfo }: { state: GameState; seats: PublicSeat[]; onInfo: (subject: InfoSubject) => void }) {
  const bison = bisonPark(state)?.id;
  const holders = state.players.filter((p) => reservedCount(state, p.index) > 0);
  return (
    <div className="market">
      <section className="market__parks" aria-label="Parks">
        <h3 className="market__title">
          Parks <span className="muted">visit for points</span>
          {holders.length > 0 ? (
            <span className="market__held">
              Reserved
              {holders.map((p) => (
                <span key={p.index} className="held">
                  <Pawn seat={seats[p.index]} size="xs" />
                  {reservedCount(state, p.index)}
                </span>
              ))}
            </span>
          ) : null}
        </h3>
        <div className="market__row">
          {state.parkRow.map((park) => (
            <button key={park.id} type="button" className="card-btn" aria-label={`Rules for ${park.name}`} onClick={() => onInfo({ kind: 'park', id: park.id })}>
              <ParkCard park={park} bison={park.id === bison} />
            </button>
          ))}
          <ParkDeck left={parkDeckLeft(state)} />
        </div>
      </section>

      <section className="market__gear" aria-label="Gear shop">
        <h3 className="market__title">
          Gear shop{' '}
          <span className="muted">
            {state.gearDiscountsLeft > 0
              ? `${state.gearDiscountsLeft} early-buyer discount${state.gearDiscountsLeft === 1 ? '' : 's'} left this season`
              : 'full price'}
          </span>
        </h3>
        <div className="market__row">
          {state.gearRow.map((card) => (
            <button key={card.id} type="button" className="card-btn" aria-label={`Rules for ${card.name}`} onClick={() => onInfo({ kind: 'gear', id: card.id })}>
              <GearCard card={card} price={gearCost(state, card)} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Nightfall's campsites in one strip: what each gives, and whose tents are pitched there. */
export function Campsites({ state, seats, onInfo }: { state: GameState; seats: PublicSeat[]; onInfo: (subject: InfoSubject) => void }) {
  if (state.campsites.length === 0) return null;
  const capacity = campsiteCapacity(state.players.length);
  return (
    <section className="camps" aria-label="Campsites">
      <span className="camps__title">
        <span className="camps__badge">
          <Icon name="tent" size={14} />
        </span>
        <b>Campsites</b>
        <span className="muted">from tent sites</span>
      </span>
      {state.campsites.map((camp) => {
        const def = campsiteDef(camp.id);
        return (
          <button
            key={camp.id}
            type="button"
            className="camp"
            aria-label={`${def.name}: ${def.text} ${camp.tents.length} of ${capacity} tents pitched.`}
            title={def.text}
            onClick={() => onInfo({ kind: 'camp', id: camp.id })}
          >
            <SiteArt id={camp.id} className="camp__art" />
            <span className="camp__text">
              <b>{def.name}</b>
              <span>{def.text}</span>
            </span>
            <span className="camp__tents" aria-hidden="true">
              {Array.from({ length: capacity }, (_, i) => {
                const who = camp.tents[i];
                return who === undefined ? <span key={i} className="camp__free" /> : <Pawn key={i} seat={seats[who]} size="xs" />;
              })}
            </span>
          </button>
        );
      })}
    </section>
  );
}
