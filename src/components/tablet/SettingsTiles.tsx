'use client';

import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/data/sites';
import type { Edge, Pace, Peek, PublicSeat, RoomSettings } from '@/room/room';
import { Pawn } from '../bits';
import { Icon } from '../Icon';

const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: 'Time to watch each computer move.' },
  { value: 'normal', label: 'Normal', hint: 'About a move and a half a second.' },
  { value: 'brisk', label: 'Brisk', hint: 'Computers barely pause between moves.' },
];

const PEEKS: { value: Peek; label: string; hint: string }[] = [
  { value: 'cpu', label: 'Computer seats', hint: 'Each person’s sheet stays on their own phone.' },
  { value: 'all', label: 'Every seat', hint: 'Open information, as at a physical table.' },
];

/**
 * Everything the tablet decides before the deal, as tiles that fit one screen
 * between the seat tags. Pace and peeking can change during play too, from the
 * table menu; the rest is fixed once the board is dealt.
 */
export function SettingsTiles({
  value,
  onChange,
  seats,
  joined,
  upright,
  onUpright,
  disabled = false,
}: {
  value: RoomSettings;
  onChange: (next: RoomSettings) => void;
  /** The seats as they sit round the tablet, for the little table drawing. */
  seats: PublicSeat[];
  /** Phones already seated, which a smaller table would turn away. */
  joined: number;
  upright: boolean;
  onUpright: (value: boolean) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<RoomSettings>) => onChange({ ...value, ...patch });
  const pace = PACES.find((p) => p.value === value.pace) ?? PACES[1];
  const peek = PEEKS.find((p) => p.value === value.peek) ?? PEEKS[0];
  return (
    <div className="tiles">
      <section className="tile" aria-labelledby="tile-seats">
        <h3 id="tile-seats">Seats</h3>
        <div className="tile__row">
          <div className="stepper">
            <button type="button" aria-label="One seat fewer" disabled={disabled || value.seats <= MIN_PLAYERS} onClick={() => set({ seats: value.seats - 1 })}>
              <Icon name="minus" />
            </button>
            <output aria-label="Seats" aria-live="polite">
              {value.seats}
            </output>
            <button type="button" aria-label="One seat more" disabled={disabled || value.seats >= MAX_PLAYERS} onClick={() => set({ seats: value.seats + 1 })}>
              <Icon name="plus" />
            </button>
          </div>
          <MiniTable seats={seats} />
        </div>
        <p className="tile__hint">
          {joined === 0 ? 'Seats nobody scans into are played by the computer.' : `${joined} phone${joined === 1 ? '' : 's'} in. Open seats are played by the computer.`}
        </p>
      </section>

      <section className="tile" aria-labelledby="tile-expansions">
        <h3 id="tile-expansions">Expansions</h3>
        <Switch
          label="Nightfall"
          hint="Tents, campsites, a wildcard each"
          checked={value.expansions.nightfall}
          disabled={disabled}
          onChange={(nightfall) => set({ expansions: { ...value.expansions, nightfall } })}
        />
        <Switch
          label="Wildlife"
          hint="Four advanced sites, the bison"
          checked={value.expansions.wildlife}
          disabled={disabled}
          onChange={(wildlife) => set({ expansions: { ...value.expansions, wildlife } })}
        />
      </section>

      <section className="tile" aria-labelledby="tile-house">
        <h3 id="tile-house">House rules</h3>
        <Switch
          label="Reserve from the deck"
          hint="A reserve may take the unseen top park"
          checked={value.houseRules.blindReserve}
          disabled={disabled}
          onChange={(blindReserve) => set({ houseRules: { ...value.houseRules, blindReserve } })}
        />
        <Switch
          label="Ranger Station first"
          hint="Spring’s advanced site is the Ranger Station"
          checked={value.houseRules.rangerFirst}
          disabled={disabled}
          onChange={(rangerFirst) => set({ houseRules: { ...value.houseRules, rangerFirst } })}
        />
      </section>

      <section className="tile" aria-labelledby="tile-pace">
        <h3 id="tile-pace">Computer pace</h3>
        <Segmented label="Computer pace" options={PACES} value={value.pace} disabled={disabled} onChange={(next) => set({ pace: next })} />
        <p className="tile__hint">{pace.hint}</p>
      </section>

      <section className="tile" aria-labelledby="tile-peek">
        <h3 id="tile-peek">Phones may open</h3>
        <Segmented label="Phones may open" options={PEEKS} value={value.peek} disabled={disabled} onChange={(next) => set({ peek: next })} />
        <p className="tile__hint">{peek.hint}</p>
      </section>

      <section className="tile" aria-labelledby="tile-tags">
        <h3 id="tile-tags">Name tags</h3>
        <Segmented
          label="Name tags"
          options={[
            { value: 'face', label: 'Face each seat' },
            { value: 'upright', label: 'All upright' },
          ]}
          value={upright ? 'upright' : 'face'}
          onChange={(next) => onUpright(next === 'upright')}
        />
        <p className="tile__hint">Upright suits a tablet on a stand. This tablet remembers it.</p>
      </section>
    </div>
  );
}

function Switch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="switch-row">
      <span className="switch-row__text">
        <b>{label}</b>
        <span>{hint}</span>
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)}>
        <i />
      </button>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'is-on' : ''}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SPOT: Record<Edge, (i: number, n: number) => { left: string; top: string }> = {
  bottom: (i, n) => ({ left: `${((i + 1) / (n + 1)) * 100}%`, top: '100%' }),
  top: (i, n) => ({ left: `${(1 - (i + 1) / (n + 1)) * 100}%`, top: '0%' }),
  left: (i, n) => ({ left: '0%', top: `${(1 - (i + 1) / (n + 1)) * 100}%` }),
  right: (i, n) => ({ left: '100%', top: `${((i + 1) / (n + 1)) * 100}%` }),
};

/** A tablet seen from above with a pawn on each seat's edge, so the seat count reads as people. */
function MiniTable({ seats }: { seats: PublicSeat[] }) {
  return (
    <div className="mini-table" aria-hidden="true">
      <div className="mini-table__top">
        {seats.map((seat) => {
          const along = seats.filter((s) => s.edge === seat.edge);
          return (
            <span key={seat.seat} className="mini-table__seat" style={SPOT[seat.edge](along.indexOf(seat), along.length)}>
              <Pawn seat={seat} size="xs" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
