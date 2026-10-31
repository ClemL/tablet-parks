'use client';

import { useState } from 'react';
import type { Resource, ResourceBag } from '@/game/types';
import { RESOURCES } from '@/game/types';
import { RESOURCE_LABEL } from './bits';
import { Token } from './Token';

/**
 * Choose some of your tokens: for a photo's price, or what goes back to get
 * under the token limit. Starts from a suggested pick, so one tap on the
 * confirm button accepts it.
 */
export function TokenPicker({
  held,
  initial,
  valid,
  confirmLabel,
  onConfirm,
  busy,
  children,
}: {
  held: ResourceBag;
  initial: ResourceBag;
  valid: (pick: ResourceBag) => boolean;
  confirmLabel: (pick: ResourceBag) => string;
  onConfirm: (pick: ResourceBag) => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const [pick, setPick] = useState<ResourceBag>(initial);
  const kinds = RESOURCES.filter((r) => (held[r] ?? 0) > 0);
  const step = (r: Resource, by: number) =>
    setPick((current) => ({ ...current, [r]: Math.min(held[r] ?? 0, Math.max(0, (current[r] ?? 0) + by)) }));
  const ok = valid(pick);
  return (
    <>
      <ul className="picker">
        {kinds.map((r) => (
          <li key={r}>
            <span className="picker__kind">
              <Token r={r} size="md" decorative /> {RESOURCE_LABEL[r]}
              <span className="muted"> · holding {held[r]}</span>
            </span>
            <span className="picker__step">
              <button type="button" className="btn btn--ghost" aria-label={`One less ${RESOURCE_LABEL[r]}`} disabled={(pick[r] ?? 0) === 0} onClick={() => step(r, -1)}>
                −
              </button>
              <output aria-label={`${RESOURCE_LABEL[r]} chosen`}>{pick[r] ?? 0}</output>
              <button type="button" className="btn btn--ghost" aria-label={`One more ${RESOURCE_LABEL[r]}`} disabled={(pick[r] ?? 0) >= (held[r] ?? 0)} onClick={() => step(r, 1)}>
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="choices">
        <button type="button" className="choice choice--primary" disabled={!ok || busy} onClick={() => onConfirm(pick)}>
          {confirmLabel(pick)}
        </button>
        {children}
      </div>
    </>
  );
}
