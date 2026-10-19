'use client';

import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/data/sites';
import type { Pace, Peek, RoomSettings } from '@/room/room';

const PACES: { value: Pace; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: 'time to watch each move' },
  { value: 'normal', label: 'Normal', hint: 'about a move and a half a second' },
  { value: 'brisk', label: 'Brisk', hint: 'computers barely pause' },
];

const PEEKS: { value: Peek; label: string; hint: string }[] = [
  { value: 'cpu', label: 'Computer seats only', hint: 'each person’s sheet stays on their own phone' },
  { value: 'all', label: 'Every seat', hint: 'open information, as at a physical table' },
];

/**
 * Everything the tablet decides before the deal. `locked` greys out what is
 * fixed once the board is dealt — only the pace and the peek rule change then.
 */
export function SettingsForm({
  value,
  onChange,
  locked = false,
  disabled = false,
}: {
  value: RoomSettings;
  onChange: (next: RoomSettings) => void;
  locked?: boolean;
  disabled?: boolean;
}) {
  const seatCounts = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);
  const set = (patch: Partial<RoomSettings>) => onChange({ ...value, ...patch });
  return (
    <div className="settings">
      <fieldset className="settings__group" disabled={locked || disabled}>
        <legend>Seats</legend>
        <div className="segmented" role="radiogroup" aria-label="Number of seats">
          {seatCounts.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value.seats === n}
              className={value.seats === n ? 'is-on' : ''}
              onClick={() => set({ seats: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="settings__hint">Seats nobody scans into are played by the computer.</p>
      </fieldset>

      <fieldset className="settings__group" disabled={locked || disabled}>
        <legend>Expansions</legend>
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.expansions.nightfall}
            onChange={(e) => set({ expansions: { ...value.expansions, nightfall: e.target.checked } })}
          />
          <span>
            <b>Nightfall</b> — tents, campsites, a wildcard each, wildcards worth two
          </span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.expansions.wildlife}
            onChange={(e) => set({ expansions: { ...value.expansions, wildlife: e.target.checked } })}
          />
          <span>
            <b>Wildlife</b> — four more advanced sites, more season cards, the bison
          </span>
        </label>
      </fieldset>

      <fieldset className="settings__group" disabled={locked || disabled}>
        <legend>House rules</legend>
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.houseRules.blindReserve}
            onChange={(e) => set({ houseRules: { ...value.houseRules, blindReserve: e.target.checked } })}
          />
          <span>
            <b>Reserve from the deck</b> — a reserve may take the unseen top park
          </span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.houseRules.rangerFirst}
            onChange={(e) => set({ houseRules: { ...value.houseRules, rangerFirst: e.target.checked } })}
          />
          <span>
            <b>Ranger Station first</b> — spring’s advanced site is always the Ranger Station
          </span>
        </label>
      </fieldset>

      <fieldset className="settings__group" disabled={disabled}>
        <legend>Computer pace</legend>
        <div className="segmented" role="radiogroup" aria-label="Computer pace">
          {PACES.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={value.pace === p.value}
              className={value.pace === p.value ? 'is-on' : ''}
              onClick={() => set({ pace: p.value })}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group" disabled={disabled}>
        <legend>Phones may open</legend>
        {PEEKS.map((p) => (
          <label key={p.value} className="toggle">
            <input type="radio" name="peek" checked={value.peek === p.value} onChange={() => set({ peek: p.value })} />
            <span>
              <b>{p.label}</b> — {p.hint}
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
