import type { HTMLAttributes, ReactNode } from 'react';
import { Token } from './Token';

/*
 * REI's cards, as price tags: kraft card with its corners cut, a reinforced
 * hole and a length of string, and the price on a round sticker. Upright on
 * the phone and in the drawer; on its side in the tablet's shop list, where
 * the cards stack one under another.
 */

/** A gear card's tag. `short` greys it out: the buyer is short of sun for it. */
export function PriceTag({
  sideways = false,
  short = false,
  className = '',
  children,
  ...rest
}: { sideways?: boolean; short?: boolean; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <article className={`tag${sideways ? ' tag--side' : ''}${short ? ' tag--short' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      <span className="tag__string" aria-hidden="true" />
      <div className="tag__card">
        <span className="tag__hole" aria-hidden="true" />
        {children}
      </div>
    </article>
  );
}

/** The price on its round sticker, with the printed price struck through while a discount applies. */
export function PriceSticker({ price, printed }: { price: number; printed?: number }) {
  return (
    <span className="tag__price" aria-hidden="true">
      <b>{price}</b>
      <Token r="sun" size="xs" decorative />
      {printed !== undefined && printed !== price ? <s>{printed}</s> : null}
    </span>
  );
}
