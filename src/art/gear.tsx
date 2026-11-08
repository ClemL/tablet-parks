import type { ReactNode } from 'react';

/*
 * REI's goods, drawn: one small flat illustration per gear card, in the same
 * inked style as the Pokémon pawns, so a card looks the same on every phone
 * and tablet — an emoji comes out differently on each. Drawn on a 64×64 grid.
 */

const INK = '#2a2118';

/** A canteen with an emblem on its face, for the two spare flasks. */
function Canteen({ body, rim, children }: { body: string; rim: string; children: ReactNode }) {
  return (
    <>
      <path d="M14 22 q-6 -12 6 -14 M50 22 q6 -12 -6 -14" fill="none" stroke="#6e4524" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="27" y="7" width="10" height="7" rx="1.5" fill="#7f8c99" />
      <rect x="25" y="4" width="14" height="5" rx="2" fill="#4a5560" />
      <circle cx="32" cy="37" r="21" fill={body} />
      <circle cx="32" cy="37" r="15.5" fill={rim} />
      {children}
    </>
  );
}

const ART: Record<string, ReactNode> = {
  boots: (
    <>
      <path d="M15 11 h16 l1 21 l13 5 q8 3 8 10 H11 l3 -11 z" fill="#9c6a3a" />
      <path d="M35 39 q10 1 16 8 H33 z" fill="#b8854f" />
      <rect x="13" y="8" width="20" height="7" rx="3" fill="#6e4524" />
      <path d="M18 19 h11 M18 24 h11 M19 29 h11" fill="none" stroke="#efe2c2" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 47 h46 q3 0 3 3 v4 q0 2 -2 2 H9 q-2 0 -2 -2 v-5 z" fill="#3a2a1e" />
      <path d="M13 56 v3 M21 56 v3 M29 56 v3 M37 56 v3 M45 56 v3 M53 56 v3" fill="none" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  poles: (
    <>
      <path d="M17 9 L45 58 M47 9 L19 58" fill="none" stroke="#9aa6b1" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M15.5 6.5 L20.5 15.5 M48.5 6.5 L43.5 15.5" fill="none" stroke="#2f3a44" strokeWidth="7" strokeLinecap="round" />
      <path d="M13 13 q-5 -6 1 -9 M51 13 q5 -6 -1 -9" fill="none" stroke="#e2483d" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="40.5" cy="50" rx="5" ry="2" fill="#2f3a44" transform="rotate(30 40.5 50)" />
      <ellipse cx="23.5" cy="50" rx="5" ry="2" fill="#2f3a44" transform="rotate(-30 23.5 50)" />
    </>
  ),
  filter: (
    <>
      <path d="M32 50 q0 9 -12 10" fill="none" stroke="#2f3a44" strokeWidth="3" strokeLinecap="round" />
      <rect x="21" y="14" width="22" height="36" rx="7" fill="#4aa3e0" />
      <rect x="21" y="26" width="22" height="10" fill="#f3f6f1" />
      <path d="M24 31 q2 -2 4 0 t4 0 t4 0 t4 0" fill="none" stroke="#2f7fb8" strokeWidth="1.6" />
      <rect x="23" y="7" width="18" height="9" rx="3" fill="#2f3a44" />
      <path d="M50 30 c-4 6 -6 8.5 -6 11.5 a6 6 0 0 0 12 0 c0 -3 -2 -5.5 -6 -11.5 z" fill="#6fb3e0" />
    </>
  ),
  binoculars: (
    <>
      <rect x="13" y="10" width="13" height="11" rx="3" fill="#2b2f35" />
      <rect x="38" y="10" width="13" height="11" rx="3" fill="#2b2f35" />
      <rect x="9" y="18" width="21" height="34" rx="9" fill="#4a515a" />
      <rect x="34" y="18" width="21" height="34" rx="9" fill="#4a515a" />
      <rect x="27" y="25" width="10" height="12" rx="2" fill="#2b2f35" />
      <circle cx="19.5" cy="44" r="7" fill="#7fb6d8" />
      <circle cx="44.5" cy="44" r="7" fill="#7fb6d8" />
      <circle cx="17" cy="41.5" r="2" fill="#fff" stroke="none" />
      <circle cx="42" cy="41.5" r="2" fill="#fff" stroke="none" />
    </>
  ),
  sunhat: (
    <>
      <ellipse cx="32" cy="41" rx="28" ry="10" fill="#e8c66a" />
      <path d="M9 42 q23 9 46 0" fill="none" stroke="#c9a347" strokeWidth="1.2" />
      <path d="M17 39 q0 -21 15 -21 q15 0 15 21 z" fill="#f0d27e" />
      <path d="M17.4 33 q14.6 5 29.2 0 l0.4 5 q-15 5 -30 0 z" fill="#e2483d" />
      <path d="M44 34 l6 -4 l1 6 z" fill="#e2483d" />
    </>
  ),
  'sleeping-bag': (
    <>
      <path d="M19 12 q13 -8 26 0 q5 21 3 43 q-16 7 -32 0 q-2 -22 3 -43 z" fill="#3d8d8a" />
      <ellipse cx="32" cy="17" rx="9" ry="5.5" fill="#24504e" />
      <path d="M17.5 27 q14.5 5 29 0 M17 38 q15 5 30 0 M17.2 48 q14.8 5 29.6 0" fill="none" stroke="#2c6d6a" strokeWidth="1.6" />
      <path d="M40 20 q3 18 1 34" fill="none" stroke="#efe2c2" strokeWidth="1.6" strokeDasharray="2.5 2" />
    </>
  ),
  tripod: (
    <>
      <path d="M32 30 L15 59 M32 30 L49 59 M32 30 L32 59" fill="none" stroke="#9aa6b1" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="28" y="26" width="8" height="6" rx="1.5" fill="#2f3a44" />
      <rect x="22" y="6" width="9" height="5" rx="1.5" fill="#2f3a44" />
      <rect x="16" y="9" width="32" height="18" rx="4" fill="#3a4450" />
      <circle cx="32" cy="18" r="7" fill="#2b2f35" />
      <circle cx="32" cy="18" r="4.5" fill="#7fb6d8" stroke="none" />
      <circle cx="30.5" cy="16.5" r="1.4" fill="#fff" stroke="none" />
      <circle cx="43" cy="13" r="1.6" fill="#e2483d" stroke="none" />
    </>
  ),
  album: (
    <>
      <rect x="12" y="9" width="42" height="48" rx="4" fill="#8a5a33" />
      <rect x="12" y="9" width="8" height="48" rx="3" fill="#6e4524" />
      <rect x="24" y="17" width="24" height="21" fill="#f6f0e0" />
      <rect x="27" y="20" width="18" height="13" fill="#9fd0ec" stroke="none" />
      <path d="M27 33 l6 -7 l4 4 l3 -3 l5 6 z" fill="#5f8f5a" stroke="none" />
      <circle cx="41" cy="23.5" r="2" fill="#f5c542" stroke="none" />
      <path d="M27 45 h18 M30 50 h12" fill="none" stroke="#e9d8b4" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  'trail-map': (
    <>
      <path d="M7 15 l17 -5 l16 5 l17 -5 v40 l-17 5 l-16 -5 l-17 5 z" fill="#f3e7c4" />
      <path d="M24 10 v40 l16 5 V15 z" fill="#e7d6a6" />
      <ellipse cx="45" cy="38" rx="6" ry="4" fill="#9fd0ec" stroke="none" />
      <path d="M15 24 l3 -6 l3 6 z M19 30 l3 -6 l3 6 z" fill="#5f8f5a" strokeWidth="1" />
      <path d="M12 44 q8 -9 15 -4 q8 6 14 -9 q4 -8 9 -10" fill="none" stroke="#c23b2b" strokeWidth="2" strokeDasharray="3 2.4" strokeLinecap="round" />
      <path d="M47 18 l5 5 M52 18 l-5 5" fill="none" stroke="#c23b2b" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  'spare-flask': (
    <Canteen body="#c9884a" rim="#e0a865">
      <circle cx="32" cy="37" r="6" fill="#f5c542" />
      <path
        d="M32 25 v3 M32 46 v3 M20 37 h3 M41 37 h3 M23.5 28.5 l2 2 M38.5 43.5 l2 2 M23.5 45.5 l2 -2 M38.5 30.5 l2 -2"
        fill="none"
        stroke="#7a4e12"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Canteen>
  ),
  'spare-stone': (
    <Canteen body="#8d8f96" rim="#b2b4ba">
      <path d="M20 46 l8 -13 l5 7 l4 -5 l8 11 z" fill="#5f6168" />
      <path d="M26 36 l2 -3 l2 3 z" fill="#f6f0e0" strokeWidth="1" />
    </Canteen>
  ),
  'park-pass': (
    <>
      <path d="M32 6 v10" fill="none" stroke="#3f6fa8" strokeWidth="3" strokeLinecap="round" />
      <rect x="9" y="16" width="46" height="34" rx="5" fill="#2f6b45" />
      <circle cx="16" cy="33" r="3" fill="#f6f0e0" />
      <circle cx="35" cy="29" r="9" fill="#f6f0e0" stroke="none" />
      <path d="M27 33 l5 -7 l3 4 l2 -2 l5 5 a9 9 0 0 1 -15 0 z" fill="#2f6b45" stroke="none" />
      <path d="M24 42 h22 M27 46 h16" fill="none" stroke="#bfe0c8" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  daypack: (
    <>
      <path d="M26 12 q6 -7 12 0" fill="none" stroke="#7a3a22" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 20 q0 -9 15 -9 q15 0 15 9 v33 q0 4 -4 4 H21 q-4 0 -4 -4 z" fill="#e07a5f" />
      <path d="M17 26 h30" fill="none" stroke="#b5583f" strokeWidth="1.6" />
      <rect x="22" y="34" width="20" height="17" rx="4" fill="#c4623f" />
      <path d="M25 38 h14" fill="none" stroke="#f6f0e0" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 24 v24 M51 24 v24" fill="none" stroke="#7a3a22" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};

export function hasGearArt(id: string): boolean {
  return id in ART;
}

/** One gear card's illustration, sized by the box (or the font size) it sits in. */
export function GearArt({ id, className = '' }: { id: string; className?: string }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg className={`gear-art${className ? ` ${className}` : ''}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
        {art}
      </g>
    </svg>
  );
}
