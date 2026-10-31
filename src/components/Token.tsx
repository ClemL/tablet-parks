import type { Resource, ResourceBag } from '@/game/types';
import { RESOURCES } from '@/game/types';
import { RESOURCE_LABEL, costLabel } from './bits';

function signedLabel(bag: ResourceBag, sign: boolean): string {
  const parts = RESOURCES.filter((r) => (bag[r] ?? 0) !== 0).map((r) => {
    const n = bag[r] ?? 0;
    return `${sign && n > 0 ? '+' : ''}${n} ${RESOURCE_LABEL[r]}`;
  });
  return parts.join(', ') || 'nothing';
}

/*
 * Resource tokens drawn rather than typed as emoji: emoji come out differently
 * on every phone and tablet, and a token has to read the same at every seat.
 * Each one differs in shape as well as colour.
 */
const GLYPHS: Record<Resource, React.ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path
        d="M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l2 2M16.6 16.6l2 2M5.4 18.6l2-2M16.6 7.4l2-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </>
  ),
  water: <path d="M12 3.2c-3 4-6.2 7.6-6.2 10.8a6.2 6.2 0 0 0 12.4 0c0-3.2-3.2-6.8-6.2-10.8z" />,
  forest: <path d="M12 2.2l-5.6 7.6h3.1L5.4 16h5.6v5.6h2V16h5.6l-4.1-6.2h3.1z" />,
  mountain: <path d="M2 20l6.8-11.6 4.1 6.7 2.6-3.6L22 20z" />,
  wild: (
    <>
      <circle cx="6.6" cy="9.4" r="2.1" />
      <circle cx="10.6" cy="5.8" r="2.1" />
      <circle cx="15.4" cy="6.2" r="2.1" />
      <circle cx="18.8" cy="10" r="2" />
      <path d="M7.6 17.4c0-3.1 2.5-5.6 5.4-5.6s5 2.3 5 4.8c0 2.3-1.7 3.2-3.4 2.7-1.1-.3-2-.3-3 .1-2.1.7-4 .1-4-2z" />
    </>
  ),
};

/** One resource token. Named for screen readers unless `decorative`, when the words are already beside it. */
export function Token({ r, size = 'md', decorative = false }: { r: Resource; size?: 'xs' | 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  return (
    <span
      className={`tok tok--${r} tok--${size}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : RESOURCE_LABEL[r]}
      aria-hidden={decorative ? true : undefined}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {GLYPHS[r]}
      </svg>
    </span>
  );
}

/** A bag of tokens as counts: "2 (water) 5 (mountain)", read out in words. */
export function TokenBag({ bag, size = 'sm', sign = false }: { bag: ResourceBag; size?: 'xs' | 'sm' | 'md'; sign?: boolean }) {
  const parts = RESOURCES.filter((r) => (bag[r] ?? 0) !== 0);
  return (
    <span className="tok-bag" role="img" aria-label={signedLabel(bag, sign)}>
      {parts.map((r) => {
        const n = bag[r] ?? 0;
        return (
          <span key={r} className="tok-bag__item" aria-hidden="true">
            {sign && n > 0 ? `+${n}` : n}
            <Token r={r} size={size} decorative />
          </span>
        );
      })}
    </span>
  );
}

/** A row of single tokens, one per unit: what a site pays, as printed on the tile. */
export function TokenRow({ bag, size = 'sm' }: { bag: ResourceBag; size?: 'xs' | 'sm' | 'md' }) {
  const singles = RESOURCES.flatMap((r) => Array.from({ length: Math.max(0, bag[r] ?? 0) }, () => r));
  return (
    <span className="tok-row" role="img" aria-label={costLabel(bag)}>
      {singles.map((r, i) => (
        <Token key={i} r={r} size={size} decorative />
      ))}
    </span>
  );
}
