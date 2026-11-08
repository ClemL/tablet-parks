'use client';

import { useEffect, useRef, useState } from 'react';
import { bottleDef } from '@/game/engine';
import type { Bottle, Player } from '@/game/types';
import { local } from '@/client/storage';
import { Icon } from '../Icon';
import { TokenBag } from '../Token';

/** Arming a flask puts it last in line; tapping an armed one takes it out of the line. */
export function toggleFlask(order: readonly string[], id: string): string[] {
  return order.includes(id) ? order.filter((x) => x !== id) : [...order, id];
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

/**
 * One flask on a player's own phone, as a switch. Flasks start unarmed;
 * tapping one arms it and numbers it in the order it will fill, and tapping
 * it again disarms it. An armed flask fills itself from water a stop pays,
 * at the end of that turn.
 */
export function FlaskButton({
  bottle,
  order,
  busy,
  compact = false,
  onToggle,
}: {
  bottle: Bottle;
  order: readonly string[];
  busy: boolean;
  compact?: boolean;
  onToggle: (id: string) => void;
}) {
  const def = bottleDef(bottle.kind);
  const at = order.indexOf(bottle.id);
  const armed = at >= 0;
  return (
    <button
      type="button"
      className={`flask${armed ? ' flask--armed' : ''}${bottle.used ? ' flask--used' : ''}${compact ? ' flask--compact' : ''}`}
      aria-pressed={armed}
      aria-label={`${def.name}: ${armed ? `armed, fills ${ordinal(at + 1)}` : 'not armed'}${bottle.used ? ', used this season' : ''}`}
      disabled={busy}
      onClick={() => onToggle(bottle.id)}
    >
      <span className="flask__icon" aria-hidden="true">
        <Icon name="flask" size={compact ? 18 : 22} />
        {armed ? <span className="flask__order">{at + 1}</span> : null}
      </span>
      <span className="flask__text" aria-hidden="true">
        <b>{def.name}</b>
        <small>
          {bottle.used ? (
            'Used this season'
          ) : (
            <>
              1 fresh water → <TokenBag bag={def.gain} size="xs" />
            </>
          )}
        </small>
        {compact ? null : <small className="flask__state">{armed ? `Armed · fills ${ordinal(at + 1)}` : 'Tap to arm'}</small>}
      </span>
    </button>
  );
}

const nudgeKey = (table: string, seat: number) => `tablet-parks.flask-nudge.${table}.${seat}`;

/**
 * A nudge for a player who went through the whole first season without
 * emptying a flask: arming one is easy to miss, and a full flask is a free
 * conversion going begging. Once per table and seat.
 */
export function FlaskReminder({
  table,
  seat,
  player,
  season,
  seasonOver,
  onShow,
}: {
  table: string;
  seat: number;
  player: Player;
  season: number;
  seasonOver: boolean;
  onShow: () => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const due = player.bottles.length > 0 && (player.flasksUsed ?? 0) === 0 && (season >= 2 || seasonOver);
  useEffect(() => {
    if (!due || local.get(nudgeKey(table, seat)) === '1') return;
    local.set(nudgeKey(table, seat), '1');
    setOpen(true);
  }, [due, table, seat]);
  useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);
  if (!open) return null;
  const n = player.bottles.length;
  const armed = (player.flaskOrder ?? []).length > 0;
  return (
    <div className="scrim nudge-scrim" role="presentation" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="nudge" role="dialog" aria-modal="true" aria-labelledby="nudge-title">
        <span className="nudge__icon" aria-hidden="true">
          <Icon name="flask" size={30} />
        </span>
        <div className="nudge__body">
          <h2 id="nudge-title">Your flask{n === 1 ? ' is' : 's are'} still full</h2>
          {armed ? (
            <p>
              A whole season went by without emptying {n === 1 ? 'it' : 'one'}. {n === 1 ? 'It is' : 'One is'} armed, so walk to a stop that pays water — a
              Valley, a Waterfall, a water token — and it fills itself, turning 1 water into something better.
            </p>
          ) : (
            <p>
              A whole season went by without emptying {n === 1 ? 'it' : 'one'}. Tap a flask to arm it: the next time a stop pays you water, it fills itself and
              turns 1 water into something better.
            </p>
          )}
          <div className="nudge__buttons">
            <button
              ref={button}
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setOpen(false);
                onShow();
              }}
            >
              Show my flasks
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
