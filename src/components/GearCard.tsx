import type { GearCard as Gear } from '@/game/types';
import { Token } from './Token';
import { GearIcon, useGearName } from './gearTheme';

export function GearCard({
  card,
  price,
  dim,
  children,
}: {
  card: Gear;
  /** This season's price, when it differs from the printed one. */
  price?: number;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  const shown = price ?? card.cost;
  const nameOf = useGearName();
  return (
    <article className={`gear${dim ? ' gear--dim' : ''}`} aria-label={`${nameOf(card)}, ${shown} sun`}>
      <div className="gear__head">
        <GearIcon card={card} className="gear__icon" />
        <h4 className="gear__name">{nameOf(card)}</h4>
      </div>
      <span className="gear__cost" aria-hidden="true">
        {shown}
        <Token r="sun" size="sm" decorative />
        {price !== undefined && price !== card.cost ? <s>{card.cost}</s> : null}
      </span>
      <p className="gear__text">{card.text}</p>
      {children ? <div className="gear__actions">{children}</div> : null}
    </article>
  );
}
