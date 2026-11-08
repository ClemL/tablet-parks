import type { ParkCard as Park } from '@/game/types';
import { TokenBag } from './Token';
import { ParkPoster } from './ParkPoster';

/** "Utah · Southwest", or just "Alaska" where the state is the region. */
export function parkPlace(park: Park): string {
  return park.state === park.region ? park.state : `${park.state} · ${park.region}`;
}

/**
 * A park as printed: the trail poster on top (picture, name, state and year,
 * points, its visiting Pokémon), then what it costs to visit — and its tags
 * and region, which several objectives score.
 */
export function ParkCard({
  park,
  cost,
  bison,
  dim,
  note,
  children,
  compact,
}: {
  park: Park;
  /** What this player would actually pay, when it differs from the printed cost. */
  cost?: Park['cost'];
  bison?: boolean;
  dim?: boolean;
  note?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <article className={`park${dim ? ' park--dim' : ''}${compact ? ' park--compact' : ''}`} aria-label={`${park.name}, ${park.vp} points`}>
      <ParkPoster park={park} bison={bison} />
      <div className="park__body">
        <TokenBag bag={cost ?? park.cost} size={compact ? 'xs' : 'sm'} />
        {!compact ? <span className="park__state">{park.region}</span> : null}
        {!compact ? <span className="park__tags">{park.tags.join(' · ')}</span> : null}
        {note ? <span className="park__note">{note}</span> : null}
      </div>
      {children ? <div className="park__actions">{children}</div> : null}
    </article>
  );
}

/** The park deck: face down, with how many are left. */
export function ParkDeck({ left, children }: { left: number; children?: React.ReactNode }) {
  return (
    <article className="park park--deck" aria-label={`Park deck, ${left} cards`}>
      <div className="park__back" aria-hidden="true">
        <span>{left}</span>
      </div>
      <div className="park__body">
        <h4 className="park__name">Park deck</h4>
        <span className="park__state">{left} left, face down</span>
      </div>
      {children ? <div className="park__actions">{children}</div> : null}
    </article>
  );
}
