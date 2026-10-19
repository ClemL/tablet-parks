import type { Resource, ResourceBag, SeasonCardDef } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { PublicSeat } from '@/room/room';

export const RESOURCE_ICON: Record<Resource, string> = {
  sun: '☀️',
  water: '💧',
  forest: '🌲',
  mountain: '⛰️',
  wild: '🐾',
};

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

/** "2 ☀️ 1 💧" */
export function tokensText(bag: ResourceBag): string {
  const parts = RESOURCES.filter((r) => (bag[r] ?? 0) > 0).map((r) => `${bag[r]} ${RESOURCE_ICON[r]}`);
  return parts.length > 0 ? parts.join(' ') : 'nothing';
}

export function bagSize(bag: ResourceBag): number {
  return RESOURCES.reduce((sum, r) => sum + (bag[r] ?? 0), 0);
}

/** A cost as a row of resource icons, with the words for screen readers. */
export function CostRow({ cost }: { cost: ResourceBag }) {
  const icons: string[] = [];
  for (const r of RESOURCES) for (let i = 0; i < (cost[r] ?? 0); i++) icons.push(RESOURCE_ICON[r]);
  return (
    <span className="cost-row" role="img" aria-label={costLabel(cost)}>
      {icons.map((icon, i) => (
        <span key={i} className="cost-pip" aria-hidden="true">
          {icon}
        </span>
      ))}
    </span>
  );
}

/**
 * A seat's pawn: its colour and its letters. The letters carry the identity,
 * so the table never depends on telling two colours apart.
 */
export function Pawn({ seat, size = 'md', ring }: { seat: PublicSeat; size?: 'sm' | 'md' | 'lg'; ring?: boolean }) {
  return (
    <span
      className={`pawn pawn--${size}${ring ? ' pawn--ring' : ''}`}
      style={{ background: seat.color }}
      aria-label={seat.name}
      role="img"
    >
      {seat.tag}
    </span>
  );
}

export function SeasonCardLine({ card }: { card: SeasonCardDef | null }) {
  if (!card) return null;
  return (
    <span className="season-card-line">
      <b>{card.name}</b> — {card.text}
    </span>
  );
}
