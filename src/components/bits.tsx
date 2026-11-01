import type { Resource, ResourceBag, SeasonCardDef } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat } from '@/room/room';

export const RESOURCE_LABEL: Record<Resource, string> = {
  sun: 'Sun',
  water: 'Water',
  forest: 'Tree',
  mountain: 'Mountain',
  wild: 'Wildcard',
};

export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function seasonName(season: number): string {
  return SEASON_NAMES[season - 1] ?? `Season ${season}`;
}

export function costLabel(cost: ResourceBag): string {
  return (
    RESOURCES.filter((r) => (cost[r] ?? 0) > 0)
      .map((r) => `${cost[r]} ${RESOURCE_LABEL[r]}`)
      .join(', ') || 'free'
  );
}

/** "2 sun, 1 water": words, so a button label reads the same on every device. */
export function tokensText(bag: ResourceBag): string {
  const parts = RESOURCES.filter((r) => (bag[r] ?? 0) > 0).map((r) => `${bag[r]} ${RESOURCE_LABEL[r].toLowerCase()}`);
  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

export function bagSize(bag: ResourceBag): number {
  return RESOURCES.reduce((sum, r) => sum + (bag[r] ?? 0), 0);
}

/**
 * A seat's pawn: its colour and its letters. The letters carry the identity,
 * so the table never depends on telling two colours apart. Each seat has its
 * own ink: white letters on the light seat colours fall below 4.5:1.
 */
export function Pawn({
  seat,
  size = 'md',
  ring,
  hiker,
}: {
  seat: PublicSeat;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
  /** Set when the pawn stands for one hiker rather than the whole seat: its name, and a corner mark. */
  hiker?: string;
}) {
  const mark = hiker ? hikerMark(hiker) : null;
  return (
    <span
      className={`pawn pawn--${size}${ring ? ' pawn--ring' : ''}${mark ? ' pawn--marked' : ''}`}
      style={seatStyle(seat)}
      aria-label={hiker ? `${hiker} (${seat.name})` : seat.name}
      title={hiker}
      role="img"
    >
      {seat.tag}
      {mark ? (
        <span className="pawn__mark" aria-hidden="true">
          {mark}
        </span>
      ) : null}
    </span>
  );
}

/** What one hiker is called: "Pikachu ♀" for a Pokémon, otherwise "Hiker 1" or "Hiker 2". */
export function hikerName(seat: PublicSeat | undefined, hikers: readonly { id: string }[], hikerId: string): string {
  const index = Math.max(0, hikers.findIndex((h) => h.id === hikerId));
  return seat?.hikers?.[index] ?? `Hiker ${index + 1}`;
}

/** The corner mark that tells a seat's two pawns apart: the ♂ or ♀, or the hiker's number. */
export function hikerMark(name: string): string {
  return name.match(/[♂♀]$/)?.[0] ?? name.match(/\d+$/)?.[0] ?? '';
}

/** The custom properties every seat-coloured surface reads: `--seat` and the ink that sits on it. */
export function seatStyle(seat: Pick<PublicSeat, 'seat'>): React.CSSProperties {
  return { '--seat': `var(--p${seat.seat})`, '--on-seat': `var(--on-p${seat.seat})` } as React.CSSProperties;
}

export function SeasonCardLine({ card }: { card: SeasonCardDef | null }) {
  if (!card) return null;
  return (
    <span className="season-card-line">
      <b>{card.name}</b> — {card.text}
    </span>
  );
}
