'use client';

import type { SeatView } from '@/room/room';
import { DisplaySettings } from '../DisplaySettings';
import { RulesList } from '../RulesList';
import { PokemonPicker } from './PokemonPicker';

/**
 * The phone's menu, the panel past REI: this seat's Pokémon, how big this
 * phone draws the game, the rules of the board in play, and leaving the seat.
 */
export function MenuPanel({
  view,
  token,
  onView,
  onLeave,
  notesHidden,
  onShowNotes,
}: {
  view: SeatView;
  token: string;
  onView: (view: SeatView) => void;
  onLeave: () => void;
  notesHidden: boolean;
  onShowNotes: () => void;
}) {
  return (
    <div className="menu-panel">
      <div className="menu-panel__side">
        <section className="menu-panel__group" aria-labelledby="menu-pk">
          <h2 id="menu-pk">Your Pokémon</h2>
          <PokemonPicker view={view} token={token} onView={onView} />
        </section>
        <section className="menu-panel__group" aria-labelledby="menu-display">
          <h2 id="menu-display">Display</h2>
          <DisplaySettings />
        </section>
        {notesHidden ? (
          <section className="menu-panel__group">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onShowNotes}>
              Show the Parks and REI notes again
            </button>
          </section>
        ) : null}
        <section className="menu-panel__group">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onLeave}>
            Leave seat
          </button>
        </section>
      </div>
      <section className="menu-panel__rules" aria-labelledby="menu-rules">
        <h2 id="menu-rules">Rules</h2>
        {view.game ? <RulesList state={view.game} /> : null}
      </section>
    </div>
  );
}
