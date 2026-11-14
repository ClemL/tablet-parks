'use client';

import { useEffect, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/data/sites';
import type { Pace, Peek, RoomSettings } from '@/room/room';
import type { HouseRules } from '@/game/types';
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

/** The published rules come first; the rest are this table's own. */
const RULES: { key: keyof HouseRules; label: string; hint: string }[] = [
  { key: 'blindReserve', label: 'Reserve from the deck', hint: 'A reserve may take the unseen top park' },
  { key: 'lastHiker', label: 'Last hiker goes home', hint: 'Once one hiker is left out, it goes straight to the Trail End' },
  { key: 'rangerFirst', label: 'Ranger Station first', hint: 'Spring’s advanced site is the Ranger Station' },
  { key: 'deckGear', label: 'Gear from the deck', hint: 'With 3+ sun, buy the top gear card unseen, 1 sun off' },
  { key: 'startReserve', label: 'A park in hand', hint: 'Everyone starts with one park reserved, face down' },
  { key: 'chainParks', label: 'Chain park visits', hint: 'After a visit at the Trail End, keep visiting while you can pay' },
  { key: 'shortGame', label: 'Short game', hint: 'Two seasons instead of four: it ends after summer' },
];

/**
 * Everything the tablet decides before the deal, in the bar under the seat
 * cards: the expansions and the table's looks as switches, the house rules as
 * one card saying which are on (they open in a dialog of their own, so the
 * setup stays one screen however many there are), then the computers' pace
 * and whose sheets a phone may open. Pace, peeking and the looks can change
 * during play too, from the table menu; the rest is fixed once dealt.
 */
export function SetupSettings({
  value,
  onChange,
  disabled = false,
}: {
  value: RoomSettings;
  onChange: (next: RoomSettings) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<RoomSettings>) => onChange({ ...value, ...patch });
  const pace = PACES.find((p) => p.value === value.pace) ?? PACES[1];
  const peek = PEEKS.find((p) => p.value === value.peek) ?? PEEKS[0];
  const [rulesOpen, setRulesOpen] = useState(false);
  const on = RULES.filter((rule) => value.houseRules[rule.key] === true);
  return (
    <div className="basecamp-settings">
      <div className="basecamp-settings__chips" role="group" aria-label="Expansions and house rules">
        <Chip
          label="Nightfall"
          hint="Tents, campsites, a wildcard each"
          kind="Expansion"
          checked={value.expansions.nightfall}
          disabled={disabled}
          onChange={(nightfall) => set({ expansions: { ...value.expansions, nightfall } })}
        />
        <Chip
          label="Wildlife"
          hint="Four advanced sites and Tauros"
          kind="Expansion"
          checked={value.expansions.wildlife}
          disabled={disabled}
          onChange={(wildlife) => set({ expansions: { ...value.expansions, wildlife } })}
        />
        <button
          type="button"
          className="setting-chip setting-chip--rules"
          aria-haspopup="dialog"
          aria-label={`House rules, ${on.length} of ${RULES.length} on${on.length ? `: ${on.map((r) => r.label).join(', ')}` : ''}`}
          onClick={() => setRulesOpen(true)}
        >
          <span className="setting-chip__top">
            <span className="setting-chip__kind">House rules</span>
            <span className="setting-chip__count">
              {on.length} of {RULES.length} on
            </span>
          </span>
          <span className="house-rules-summary" aria-hidden="true">
            {on.length ? on.map((rule) => <span key={rule.key}>{rule.label}</span>) : <span className="muted">None: every rule as printed is off</span>}
          </span>
          <span className="setting-chip__more" aria-hidden="true">
            Change the rules <Icon name="next" size={14} />
          </span>
        </button>
        <Chip
          label="Pokémon themed"
          hint="Pokémon visit the parks and lend REI their gear; looks only"
          kind="Table"
          checked={value.pokemon}
          disabled={disabled}
          onChange={(pokemon) => set({ pokemon })}
        />
        <Chip
          label="Diorama stops"
          hint="Each stop on the trail drawn as a little tile; looks only"
          kind="Table"
          checked={value.diorama}
          disabled={disabled}
          onChange={(diorama) => set({ diorama })}
        />
      </div>
      {rulesOpen ? (
        <HouseRulesDialog
          rules={value.houseRules}
          disabled={disabled}
          onChange={(houseRules) => set({ houseRules })}
          onClose={() => setRulesOpen(false)}
        />
      ) : null}
      <div className="basecamp-settings__row">
        <div className="basecamp-settings__seg">
          <span className="basecamp-settings__label" id="setting-pace">
            Computer pace <span className="basecamp-settings__hint">{pace.hint}</span>
          </span>
          <Segmented label="Computer pace" options={PACES} value={value.pace} disabled={disabled} onChange={(next) => set({ pace: next })} />
        </div>
        <div className="basecamp-settings__seg">
          <span className="basecamp-settings__label" id="setting-peek">
            Phones may open <span className="basecamp-settings__hint">{peek.hint}</span>
          </span>
          <Segmented label="Phones may open" options={PEEKS} value={value.peek} disabled={disabled} onChange={(next) => set({ peek: next })} />
        </div>
      </div>
    </div>
  );
}

/**
 * Every house rule in one dialog over the setup: the published ones first,
 * then the table's own, each a switch with what it does underneath.
 */
function HouseRulesDialog({
  rules,
  disabled,
  onChange,
  onClose,
}: {
  rules: HouseRules;
  disabled: boolean;
  onChange: (next: HouseRules) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet sheet--wide house-rules" role="dialog" aria-modal="true" aria-labelledby="house-rules-title">
        <header className="house-rules__head">
          <h2 id="house-rules-title">House rules</h2>
          <p className="muted">The first two are the published rules and start on; the rest are this table’s own.</p>
        </header>
        <div className="house-rules__grid" role="group" aria-label="House rules">
          {RULES.map((rule) => (
            <Chip
              key={rule.key}
              label={rule.label}
              hint={rule.hint}
              kind={rule.key === 'blindReserve' || rule.key === 'lastHiker' ? 'Published rule' : 'House rule'}
              checked={rules[rule.key] === true}
              disabled={disabled}
              onChange={(on) => onChange({ ...rules, [rule.key]: on })}
            />
          ))}
        </div>
        <button type="button" className="btn btn--primary house-rules__done" onClick={onClose} autoFocus>
          Done
        </button>
      </div>
    </div>
  );
}

/** How many seats round the table; never fewer than the phones already in. */
export function SeatStepper({
  value,
  joined,
  disabled,
  onChange,
}: {
  value: number;
  joined: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="stepper" role="group" aria-label="Number of seats">
      <button type="button" aria-label="One seat fewer" disabled={disabled || value <= Math.max(MIN_PLAYERS, joined)} onClick={() => onChange(value - 1)}>
        <Icon name="minus" />
      </button>
      <output aria-label="Seats" aria-live="polite">
        {value}
      </output>
      <button type="button" aria-label="One seat more" disabled={disabled || value >= MAX_PLAYERS} onClick={() => onChange(value + 1)}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

/** A setting as a card-sized switch: what it is, in a word, and what it does underneath. */
function Chip({
  label,
  hint,
  kind,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  kind: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-description={`${kind}: ${hint}`}
      className="setting-chip"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="setting-chip__top">
        <span className="setting-chip__kind">{kind}</span>
        <span className="setting-chip__mark" aria-hidden="true">
          {checked ? <Icon name="check" size={14} /> : null}
        </span>
      </span>
      <b>{label}</b>
      <span className="setting-chip__hint">{hint}</span>
    </button>
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
