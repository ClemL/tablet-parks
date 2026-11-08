import type { GearCard as Gear } from '@/game/types';
import { GearIcon, useGearName } from './gearTheme';
import { PriceSticker, PriceTag } from './PriceTag';

/** A gear card in the drawer: a price tag with the item, its name, what it does and this season's price. */
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
    <PriceTag className={`gear${dim ? ' gear--dim' : ''}`} aria-label={`${nameOf(card)}, ${shown} sun`}>
      <PriceSticker price={shown} printed={card.cost} />
      <GearIcon card={card} className="tag__art" />
      <h4 className="tag__name">{nameOf(card)}</h4>
      <p className="tag__text">{card.text}</p>
      {children ? <div className="gear__actions">{children}</div> : null}
    </PriceTag>
  );
}
