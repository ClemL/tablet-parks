'use client';

import { useEffect, useRef, useState } from 'react';
import { bisonPark, campsiteDef, gearCost, siteDef } from '@/game/engine';
import { campsiteCapacity } from '@/game/data/campsites';
import type { GameState } from '@/game/types';
import { EDGES, type Edge, type PublicSeat } from '@/room/room';
import { SiteArt } from '@/art/siteArt';
import { IllustratedParkArt } from '@/art/illustrated';
import { Pawn, RESOURCE_LABEL, costLabel, hikerName } from '../bits';
import { Icon } from '../Icon';
import { Token, TokenBag, TokenRow } from '../Token';
import { parkPlace } from '../ParkCard';

/** What the rules sheet is about: one thing on the board, or all of it. */
export type InfoSubject =
  | { kind: 'site'; index: number }
  | { kind: 'camp'; id: string }
  | { kind: 'park'; id: string }
  | { kind: 'gear'; id: string }
  | { kind: 'all' };

/**
 * The full text of whatever was tapped or held, which the tiles leave out to
 * stay readable from across the table. A tablet lying flat has no "the right
 * way up", so the sheet opens facing whoever is on the clock — the person most
 * likely asking — and turns to each other seat on request.
 */
export function InfoSheet({
  state,
  seats,
  subject,
  edge: start,
  upright,
  onClose,
}: {
  state: GameState;
  seats: PublicSeat[];
  subject: InfoSubject;
  edge: Edge;
  upright: boolean;
  onClose: () => void;
}) {
  const used = EDGES.filter((e) => seats.some((s) => s.edge === e));
  const [edge, setEdge] = useState<Edge>(upright ? 'bottom' : start);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const turn = () => setEdge((now) => used[(used.indexOf(now) + 1) % used.length] ?? 'bottom');

  return (
    <div className="scrim" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet sheet--${edge} info`} role="dialog" aria-modal="true" aria-labelledby="info-title" ref={panel}>
        <header className="sheet__head">
          <div>
            <p className="eyebrow">Rules</p>
            <h2 id="info-title">{title(state, subject)}</h2>
          </div>
          {!upright && used.length > 1 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={turn} aria-label="Turn this toward the next seat">
              <Icon name="rotate" size={16} />
              Turn
            </button>
          ) : null}
          <button type="button" className="btn btn--icon" aria-label="Close the rules" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <Body state={state} seats={seats} subject={subject} />
      </div>
    </div>
  );
}

function title(state: GameState, subject: InfoSubject): string {
  switch (subject.kind) {
    case 'site':
      return siteDef(state.trail[subject.index]).name;
    case 'camp':
      return campsiteDef(subject.id).name;
    case 'park':
      return [...state.parkRow, ...state.players.flatMap((p) => p.reserved)].find((p) => p.id === subject.id)?.name ?? 'Park';
    case 'gear':
      return state.gearRow.find((g) => g.id === subject.id)?.name ?? 'Gear';
    case 'all':
      return 'Everything on the board';
  }
}

function Body({ state, seats, subject }: { state: GameState; seats: PublicSeat[]; subject: InfoSubject }) {
  switch (subject.kind) {
    case 'site':
      return <SiteRules state={state} seats={seats} index={subject.index} />;
    case 'camp':
      return <CampRules state={state} seats={seats} id={subject.id} />;
    case 'park': {
      const park = [...state.parkRow, ...state.players.flatMap((p) => p.reserved)].find((p) => p.id === subject.id);
      if (!park) return null;
      return (
        <div className="info__item">
          <div className="info__art">
            <IllustratedParkArt park={park} />
          </div>
          <p>
            <b>{park.vp} VP</b> · {parkPlace(park)} · {park.tags.join(', ')}
          </p>
          <p className="info__line">
            Visiting costs <TokenBag bag={park.cost} size="sm" /> <span className="muted">({costLabel(park.cost)})</span>. A wildcard stands in for any one
            resource{state.expansions.nightfall ? ', or two' : ''}.
          </p>
          {bisonPark(state)?.id === park.id ? <p className="info__note">The bison is here: visiting it offers a wildcard trade.</p> : null}
        </div>
      );
    }
    case 'gear': {
      const card = state.gearRow.find((g) => g.id === subject.id);
      if (!card) return null;
      const price = gearCost(state, card);
      return (
        <div className="info__item">
          <p className="info__line">
            <span className="info__emoji" aria-hidden="true">
              {card.icon}
            </span>
            {card.text}
          </p>
          <p className="info__line">
            Costs {price} <Token r="sun" size="sm" decorative />
            {price !== card.cost ? <span className="muted"> (printed {card.cost}; early-buyer discount)</span> : null}. Bought at the Trail End.
          </p>
        </div>
      );
    }
    case 'all':
      return <AllRules state={state} seats={seats} />;
  }
}

function SiteRules({ state, seats, index }: { state: GameState; seats: PublicSeat[]; index: number }) {
  const kind = state.trail[index];
  const def = siteDef(kind);
  const token = state.siteTokens[index];
  const end = state.trail.length - 1;
  const here = state.players.flatMap((p) => p.hikers.filter((h) => h.position === index && (!h.finished || index === end)));
  const tier = index === 0 ? 'Where every hiker starts' : index === end ? 'Where every hiker ends the season' : def.tier === 'advanced' ? 'Advanced site' : 'Basic site';
  return (
    <div className="info__item">
      <div className="info__art">
        <SiteArt id={kind} className="info__site-art" />
      </div>
      <p className="info__kicker">{tier}</p>
      <p className="info__text">{def.text}</p>
      {def.gain ? (
        <p className="info__line">
          Pays <TokenRow bag={def.gain} size="md" />
          {state.seasonCard?.effect.kind === 'weather' ? <span className="muted"> — and {state.seasonCard.name} may add to it.</span> : null}
        </p>
      ) : null}
      {token ? (
        <p className="info__line">
          <Token r={token} size="md" decorative /> The first hiker to stop here also takes this {RESOURCE_LABEL[token].toLowerCase()} token.
        </p>
      ) : null}
      {state.tentSites.includes(index) ? (
        <p className="info__line">
          <Icon name="tent" size={18} /> Tent site: a hiker stopping here may camp at an open campsite instead of taking this action.
        </p>
      ) : null}
      {index > 0 && index < end ? (
        <p className="info__note">One hiker at a time. Sharing a site with another hiker costs your campfire, unless you own the Trail Map.</p>
      ) : null}
      {here.length > 0 ? (
        <p className="info__line">
          Here now:{' '}
          {here.map((h) => (
            <Pawn key={h.id} seat={seats[h.owner]} size="sm" hiker={hikerName(seats[h.owner], state.players[h.owner].hikers, h.id)} />
          ))}
        </p>
      ) : null}
    </div>
  );
}

function CampRules({ state, seats, id }: { state: GameState; seats: PublicSeat[]; id: string }) {
  const def = campsiteDef(id);
  const camp = state.campsites.find((c) => c.id === id);
  const capacity = campsiteCapacity(state.players.length);
  return (
    <div className="info__item">
      <div className="info__art">
        <SiteArt id={id} className="info__site-art" />
      </div>
      <p className="info__kicker">Campsite · reached by pitching a tent at a tent site</p>
      <p className="info__text">{def.text}</p>
      <p className="info__line">
        {camp ? camp.tents.length : 0} of {capacity} tents pitched{' '}
        {camp?.tents.map((who, i) => (
          <Pawn key={i} seat={seats[who]} size="sm" />
        ))}
      </p>
    </div>
  );
}

/** Every rule on the board at once: the season, each site in trail order, the campsites and the gear. */
function AllRules({ state }: { state: GameState; seats: PublicSeat[] }) {
  const seen = new Set<string>();
  const sites = state.trail.filter((kind) => !seen.has(kind) && seen.add(kind));
  return (
    <div className="info__all">
      {state.seasonCard ? (
        <section>
          <h3>{state.seasonCard.name}</h3>
          <p>{state.seasonCard.text}</p>
        </section>
      ) : null}
      <section>
        <h3>The trail</h3>
        <dl>
          {sites.map((kind) => (
            <div key={kind}>
              <dt>{siteDef(kind).name}</dt>
              <dd>{siteDef(kind).text}</dd>
            </div>
          ))}
        </dl>
      </section>
      {state.campsites.length > 0 ? (
        <section>
          <h3>Campsites</h3>
          <dl>
            {state.campsites.map((camp) => (
              <div key={camp.id}>
                <dt>{campsiteDef(camp.id).name}</dt>
                <dd>{campsiteDef(camp.id).text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <section>
        <h3>Gear shop</h3>
        <dl>
          {state.gearRow.map((card) => (
            <div key={card.id}>
              <dt>
                {card.name} · {gearCost(state, card)} sun
              </dt>
              <dd>{card.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
