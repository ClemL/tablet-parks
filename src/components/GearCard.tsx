import type { GearCard as Gear } from '@/game/types';

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
  return (
    <article className={`gear${dim ? ' gear--dim' : ''}`} aria-label={`${card.name}, ${shown} sun`}>
      <div className="gear__head">
        <span className="gear__icon" aria-hidden="true">
          {card.icon}
        </span>
        <h4 className="gear__name">{card.name}</h4>
        <span className="gear__cost">
          {shown} ☀️{price !== undefined && price !== card.cost ? <s> {card.cost}</s> : null}
        </span>
      </div>
      <p className="gear__text">{card.text}</p>
      {children ? <div className="gear__actions">{children}</div> : null}
    </article>
  );
}
