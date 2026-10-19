import type { ParkCard as Park } from '@/game/types';
import { IllustratedParkArt } from '@/art/illustrated';
import { CostRow } from './bits';

/** A park as printed: its picture, its points, its name and what it costs to visit. */
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
      <div className="park__art">
        <IllustratedParkArt park={park} />
        <span className="park__vp" aria-hidden="true">
          {park.vp}
        </span>
        {bison ? (
          <span className="park__bison" title="The bison is here: visiting offers a wildcard trade">
            🦬
          </span>
        ) : null}
      </div>
      <div className="park__body">
        <h4 className="park__name">{park.name}</h4>
        {!compact ? <span className="park__state">{park.state}</span> : null}
        <CostRow cost={cost ?? park.cost} />
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
        <span>🏞️</span>
      </div>
      <div className="park__body">
        <h4 className="park__name">Park deck</h4>
        <span className="park__state">{left} left</span>
      </div>
      {children ? <div className="park__actions">{children}</div> : null}
    </article>
  );
}
