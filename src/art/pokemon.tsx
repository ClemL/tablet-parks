import type { ReactNode } from 'react';

/*
 * The seats' pawns: twenty Pokémon heads, each under the same park ranger's
 * hat, drawn here as simple shapes so they read at a pawn's size on every
 * screen. Fan art for a home game, like the names. The hat's band is drawn in
 * the seat's colour (`--seat`), so a pawn carries its seat twice over.
 *
 * Each head is drawn on a 64×64 grid: ears and horns behind the head, the
 * head itself centred near (32, 40), then the hat on top, then anything that
 * pokes out through the hat.
 */

const INK = '#2a2118';

interface Look {
  /** Behind the head: ears, horns, a bulb, spikes. */
  back?: ReactNode;
  head: ReactNode;
  /** Over the hat: whatever sticks out through it. */
  front?: ReactNode;
}

/** Two eyes with a glint, the most common pair. */
function Eyes({ y = 40, dx = 8, r = 3, fill = '#1c1714', glint = true }: { y?: number; dx?: number; r?: number; fill?: string; glint?: boolean }) {
  return (
    <g stroke="none">
      <circle cx={32 - dx} cy={y} r={r} fill={fill} />
      <circle cx={32 + dx} cy={y} r={r} fill={fill} />
      {glint ? (
        <>
          <circle cx={32 - dx - r * 0.35} cy={y - r * 0.4} r={r * 0.35} fill="#fff" />
          <circle cx={32 + dx - r * 0.35} cy={y - r * 0.4} r={r * 0.35} fill="#fff" />
        </>
      ) : null}
    </g>
  );
}

/** A left-side shape and its mirror image on the right. */
function Pair({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <g transform="translate(64 0) scale(-1 1)">{children}</g>
    </>
  );
}

const LOOKS: Record<string, Look> = {
  Pikachu: {
    back: (
      <Pair>
        <path d="M24 31 Q12 20 5 4 Q19 10 30 26 Z" fill="#f6d23c" />
        <path d="M5 4 Q10 6 13.5 9.5 Q9 10 7.5 8 Z" fill="#1f1a16" />
      </Pair>
    ),
    head: (
      <>
        <circle cx="32" cy="41" r="18" fill="#f6d23c" />
        <circle cx="19" cy="47" r="4.2" fill="#e2483d" stroke="none" />
        <circle cx="45" cy="47" r="4.2" fill="#e2483d" stroke="none" />
        <Eyes y={39} dx={8} r={3} />
        <circle cx="32" cy="43.5" r="0.9" fill={INK} />
        <path d="M27.5 47 q2.2 2.4 4.5 0 q2.3 2.4 4.5 0" fill="none" />
      </>
    ),
  },
  Eevee: {
    back: (
      <Pair>
        <path d="M23 31 L6 3 L31 25 Z" fill="#b5793d" />
        <path d="M21 26 L10 8 L26 23 Z" fill="#5a3a20" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <path d="M11 52 q5 11 21 11 q16 0 21 -11 q-6 3 -9 0 q-4 4 -12 3 q-8 1 -12 -3 q-3 3 -9 0 z" fill="#f1dfb6" />
        <circle cx="32" cy="40" r="17" fill="#b5793d" />
        <Eyes y={40} dx={7.5} r={3.6} fill="#2b1a10" />
        <path d="M30.5 45 h3 l-1.5 1.5 z" fill={INK} />
        <path d="M29 48 q3 2 6 0" fill="none" />
      </>
    ),
  },
  Snorlax: {
    back: (
      <Pair>
        <path d="M15 33 L12 22 L22 27 Z" fill="#2f6f7a" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="42" rx="20" ry="17" fill="#2f6f7a" />
        <path d="M15 47 q2 -10 9 -11 q4 4 8 4 q4 0 8 -4 q7 1 9 11 q-2 12 -17 12 q-15 0 -17 -12 z" fill="#efe3c4" />
        <path d="M21 44 h7 M36 44 h7" fill="none" strokeWidth="2" />
        <path d="M24 51 q8 5 16 0" fill="none" />
        <path d="M26 51.6 l1.2 -2.4 l1.2 2.9 M38 51.6 l-1.2 -2.4 l-1.2 2.9" fill="#fff" strokeWidth="1" />
      </>
    ),
  },
  Bulbasaur: {
    back: (
      <>
        <circle cx="47" cy="19" r="12" fill="#4e9a5c" />
        <path d="M47 8 q-3 10 0 22 M38 14 q8 4 18 0" fill="none" stroke="#2c6b3a" />
        <Pair>
          <path d="M15 34 L12 23 L22 29 Z" fill="#69b8a1" />
        </Pair>
      </>
    ),
    head: (
      <>
        <ellipse cx="32" cy="43" rx="20" ry="15" fill="#69b8a1" />
        <path d="M17 38 l3 2 l-3 2 z M45 47 l3 1.5 l-2 2.5 z" fill="#3f8a76" stroke="none" />
        <ellipse cx="24" cy="42" rx="3.2" ry="3.8" fill="#fff" stroke="none" />
        <ellipse cx="40" cy="42" rx="3.2" ry="3.8" fill="#fff" stroke="none" />
        <circle cx="24.6" cy="42.6" r="2.3" fill="#c8362f" stroke="none" />
        <circle cx="39.4" cy="42.6" r="2.3" fill="#c8362f" stroke="none" />
        <path d="M20 38.5 l7 1.5 M44 38.5 l-7 1.5" fill="none" />
        <path d="M24 50 q8 5 16 0" fill="none" />
      </>
    ),
  },
  Squirtle: {
    head: (
      <>
        <path d="M13 55 q19 12 38 0 l0 6 q-19 8 -38 0 z" fill="#c9884a" />
        <circle cx="32" cy="40" r="17.5" fill="#7cc4e4" />
        <ellipse cx="25" cy="39" rx="3.3" ry="4" fill="#fff" stroke="none" />
        <ellipse cx="39" cy="39" rx="3.3" ry="4" fill="#fff" stroke="none" />
        <circle cx="25.5" cy="39.8" r="2.5" fill="#6b2c2c" stroke="none" />
        <circle cx="38.5" cy="39.8" r="2.5" fill="#6b2c2c" stroke="none" />
        <circle cx="24.6" cy="38.6" r="0.8" fill="#fff" stroke="none" />
        <circle cx="37.6" cy="38.6" r="0.8" fill="#fff" stroke="none" />
        <path d="M23 47 q9 6 18 0" fill="none" />
        <path d="M41 47 q2 -1 2.5 -3" fill="none" />
      </>
    ),
  },
  Jigglypuff: {
    back: (
      <Pair>
        <path d="M17 32 L11 19 L25 26 Z" fill="#f6b6c8" />
        <path d="M16 28 L13 22 L20 25.5 Z" fill="#2a1f22" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <circle cx="32" cy="42" r="18.5" fill="#f6b6c8" />
        <path d="M31 28 q-5 3 -1.5 7 q3 2.5 3.5 -1" fill="none" />
        <circle cx="24" cy="42" r="5.2" fill="#fff" stroke="none" />
        <circle cx="40" cy="42" r="5.2" fill="#fff" stroke="none" />
        <circle cx="24.4" cy="42.6" r="3.8" fill="#2f8da0" stroke="none" />
        <circle cx="39.6" cy="42.6" r="3.8" fill="#2f8da0" stroke="none" />
        <circle cx="23" cy="41" r="1.6" fill="#fff" stroke="none" />
        <circle cx="38.2" cy="41" r="1.6" fill="#fff" stroke="none" />
        <path d="M30 51 q2 1.5 4 0" fill="none" />
      </>
    ),
  },
  Meowth: {
    back: (
      <Pair>
        <path d="M20 31 L10 13 L28 26 Z" fill="#f2e3b7" />
        <path d="M19 27 L13 17 L24 25 Z" fill="#3a2b22" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="42" rx="18" ry="16" fill="#f2e3b7" />
        <ellipse cx="32" cy="31" rx="4.3" ry="3.6" fill="#e8b43a" />
        <ellipse cx="25" cy="41" rx="2" ry="3.4" fill="#5a7a3a" stroke="none" />
        <ellipse cx="39" cy="41" rx="2" ry="3.4" fill="#5a7a3a" stroke="none" />
        <path d="M25 41 v-2 M39 41 v-2" stroke="#111" strokeWidth="1" />
        <circle cx="32" cy="45" r="0.9" fill={INK} />
        <path d="M28 48 q2 2 4 0 q2 2 4 0" fill="none" />
        <path d="M35 48.6 l0.6 2 l0.8 -2.2" fill="#fff" strokeWidth="0.8" />
        <path d="M14 43 h-9 M14.5 46 l-8.5 2.5 M50 43 h9 M49.5 46 l8.5 2.5" fill="none" strokeWidth="1.2" />
      </>
    ),
  },
  Psyduck: {
    head: (
      <>
        <circle cx="32" cy="41" r="18" fill="#f2cc4b" />
        <circle cx="23" cy="39" r="4" fill="#fff" stroke="none" />
        <circle cx="41" cy="39" r="4" fill="#fff" stroke="none" />
        <circle cx="23" cy="39" r="1.2" fill="#111" stroke="none" />
        <circle cx="41" cy="39" r="1.2" fill="#111" stroke="none" />
        <ellipse cx="32" cy="49" rx="10" ry="5.6" fill="#f6e2ab" />
        <path d="M23 49 q9 2.4 18 0" fill="none" strokeWidth="1.1" />
      </>
    ),
    front: <path d="M29 9 q-2 -5 -5 -6 M32 8 v-6 M35 9 q2 -5 5 -6" fill="none" strokeWidth="1.8" strokeLinecap="round" />,
  },
  Clefairy: {
    back: (
      <Pair>
        <path d="M21 31 L9 10 L28 26 Z" fill="#f6c3c9" />
        <path d="M9 10 L13 13 L15 18 L11 16 Z" fill="#8a5a3c" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <circle cx="32" cy="42" r="17.5" fill="#f6c3c9" />
        <path d="M30 28 q-4 4 0 7 q4 2 3 -2" fill="none" />
        <ellipse cx="25" cy="41" rx="2.2" ry="3.4" fill="#2b1d1d" stroke="none" />
        <ellipse cx="39" cy="41" rx="2.2" ry="3.4" fill="#2b1d1d" stroke="none" />
        <circle cx="20" cy="47" r="2.8" fill="#ec8fa2" stroke="none" />
        <circle cx="44" cy="47" r="2.8" fill="#ec8fa2" stroke="none" />
        <path d="M29.5 48 q2.5 2.2 5 0" fill="none" />
      </>
    ),
  },
  Vulpix: {
    back: (
      <Pair>
        <path d="M21 32 L9 9 L29 26 Z" fill="#c8603a" />
        <path d="M20 27 L13 14 L25 25 Z" fill="#4a2318" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="42" rx="16.5" ry="16" fill="#c8603a" />
        <path d="M22 29 q-3 6 3 8 q-1 -5 4 -6 q-2 6 4 6 q-1 -5 5 -5 q-1 6 5 4 q0 -5 -4 -7 z" fill="#ec8b4b" />
        <Eyes y={42} dx={7} r={3.2} fill="#3a1d12" />
        <path d="M30.6 47 h2.8 l-1.4 1.4 z" fill={INK} />
        <path d="M29 50 q3 2 6 0" fill="none" />
      </>
    ),
  },
  Slowpoke: {
    back: (
      <Pair>
        <ellipse cx="14" cy="34" rx="5" ry="4" fill="#f2a1b2" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="40" rx="19" ry="17" fill="#f2a1b2" />
        <circle cx="24" cy="38" r="4.2" fill="#fff" stroke="none" />
        <circle cx="40" cy="38" r="4.2" fill="#fff" stroke="none" />
        <circle cx="24" cy="39.5" r="1.6" fill="#111" stroke="none" />
        <circle cx="40" cy="39.5" r="1.6" fill="#111" stroke="none" />
        <path d="M19.8 37 h8.4 M35.8 37 h8.4" fill="none" />
        <ellipse cx="32" cy="50" rx="13" ry="8" fill="#f6e1c8" />
        <path d="M24 50 q8 3 16 0" fill="none" />
      </>
    ),
  },
  Mew: {
    back: (
      <Pair>
        <path d="M19 32 L12 17 L26 27 Z" fill="#f4b8cf" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="42" rx="17" ry="16.5" fill="#f4b8cf" />
        <ellipse cx="25" cy="41" rx="3.6" ry="5" fill="#fff" stroke="none" />
        <ellipse cx="39" cy="41" rx="3.6" ry="5" fill="#fff" stroke="none" />
        <ellipse cx="25.5" cy="42" rx="2.7" ry="3.8" fill="#3b77c2" stroke="none" />
        <ellipse cx="38.5" cy="42" rx="2.7" ry="3.8" fill="#3b77c2" stroke="none" />
        <circle cx="24.6" cy="40.4" r="1.1" fill="#fff" stroke="none" />
        <circle cx="37.6" cy="40.4" r="1.1" fill="#fff" stroke="none" />
        <path d="M29 50 q3 2.2 6 0" fill="none" />
      </>
    ),
  },
  Poliwag: {
    head: (
      <>
        <circle cx="32" cy="41" r="19" fill="#4f7fd0" />
        <circle cx="32" cy="50" r="10.5" fill="#f6f4ee" />
        <path d="M41 50 A9 9 0 0 0 23 50 A7 7 0 0 0 37 50 A5 5 0 0 0 27 50 A3 3 0 0 0 33 50 A1.4 1.4 0 0 0 30.2 50" fill="none" strokeWidth="1.7" strokeLinecap="round" />
        <ellipse cx="24.5" cy="34" rx="4.6" ry="5" fill="#fff" />
        <ellipse cx="39.5" cy="34" rx="4.6" ry="5" fill="#fff" />
        <circle cx="25.4" cy="35" r="2.5" fill="#111" stroke="none" />
        <circle cx="38.6" cy="35" r="2.5" fill="#111" stroke="none" />
        <ellipse cx="32" cy="39.6" rx="2.6" ry="1.5" fill="#f2a1b2" strokeWidth="1" />
      </>
    ),
  },
  Togepi: {
    back: (
      <Pair>
        <path d="M19 37 L11 33 L19 32 Z" fill="#f7f0d4" />
      </Pair>
    ),
    head: (
      <>
        <circle cx="32" cy="37" r="14" fill="#f7f0d4" />
        <path d="M13 47 l4.5 -5 l4.5 5 l5 -5 l5 5 l5 -5 l5 5 l4.5 -5 l4.5 5 v4 q0 11 -19 11 q-19 0 -19 -11 z" fill="#ffffff" />
        <path d="M20 52 l3 4 h-6 z" fill="#e2483d" stroke="none" />
        <path d="M30 55 l3 4 h-6 z" fill="#3b77c2" stroke="none" />
        <path d="M41 52 l3 4 h-6 z" fill="#e2483d" stroke="none" />
        <ellipse cx="27" cy="37" rx="1.8" ry="2.6" fill="#1c1714" stroke="none" />
        <ellipse cx="37" cy="37" rx="1.8" ry="2.6" fill="#1c1714" stroke="none" />
        <path d="M29 42 q3 2.6 6 0" fill="none" />
      </>
    ),
  },
  Marill: {
    back: (
      <Pair>
        <circle cx="15" cy="27" r="7.5" fill="#4aa3e0" />
        <circle cx="15" cy="27" r="4" fill="#cfe9f8" stroke="none" />
      </Pair>
    ),
    head: (
      <>
        <circle cx="32" cy="41" r="17.5" fill="#4aa3e0" />
        <ellipse cx="32" cy="48" rx="9" ry="6.5" fill="#cfe9f8" stroke="none" />
        <ellipse cx="25.5" cy="40" rx="2.6" ry="3.4" fill="#1c1714" stroke="none" />
        <ellipse cx="38.5" cy="40" rx="2.6" ry="3.4" fill="#1c1714" stroke="none" />
        <circle cx="24.8" cy="38.8" r="0.9" fill="#fff" stroke="none" />
        <circle cx="37.8" cy="38.8" r="0.9" fill="#fff" stroke="none" />
        <ellipse cx="32" cy="45" rx="1.8" ry="1.3" fill="#7a2f3a" stroke="none" />
        <path d="M29.5 48 q2.5 2 5 0" fill="none" strokeWidth="1.2" />
      </>
    ),
  },
  Piplup: {
    head: (
      <>
        <circle cx="32" cy="41" r="18" fill="#2f66b8" />
        <path d="M19 44 q0 -9 7 -10 q6 3 6 3 q0 0 6 -3 q7 1 7 10 q-3 12 -13 12 q-10 0 -13 -12 z" fill="#8cc4ee" />
        <circle cx="25" cy="40" r="3.3" fill="#1c1714" stroke="none" />
        <circle cx="39" cy="40" r="3.3" fill="#1c1714" stroke="none" />
        <circle cx="24" cy="38.8" r="1.2" fill="#fff" stroke="none" />
        <circle cx="38" cy="38.8" r="1.2" fill="#fff" stroke="none" />
        <circle cx="21" cy="47" r="1.6" fill="#fff" stroke="none" />
        <circle cx="43" cy="47" r="1.6" fill="#fff" stroke="none" />
        <path d="M26.5 45 q5.5 -2 11 0 q-1.5 4.5 -5.5 5 q-4 -0.5 -5.5 -5 z" fill="#f3c13a" />
      </>
    ),
  },
  Mudkip: {
    back: (
      <Pair>
        <path d="M15 44 l-8 -5 l6 0 l-6 -6 l8 3 l-1 -7 l6 8 z" fill="#f08a3a" />
      </Pair>
    ),
    head: (
      <>
        <ellipse cx="32" cy="42" rx="18" ry="16" fill="#62b7e8" />
        <ellipse cx="32" cy="49" rx="10" ry="6.5" fill="#d8eef9" stroke="none" />
        <circle cx="25" cy="40" r="2.6" fill="#1c1714" stroke="none" />
        <circle cx="39" cy="40" r="2.6" fill="#1c1714" stroke="none" />
        <circle cx="24.2" cy="39" r="0.9" fill="#fff" stroke="none" />
        <circle cx="38.2" cy="39" r="0.9" fill="#fff" stroke="none" />
        <circle cx="30" cy="46" r="0.7" fill="#1c1714" />
        <circle cx="34" cy="46" r="0.7" fill="#1c1714" />
        <path d="M27 50 q5 3.5 10 0" fill="none" />
      </>
    ),
    front: <path d="M30 13 q-2 -9 6 -12 q-1 7 2 11 z" fill="#62b7e8" strokeWidth="1.4" />,
  },
  Ditto: {
    head: (
      <>
        <path d="M12 56 q-4 -9 2 -16 q-2 -12 10 -15 q8 -3 16 0 q12 3 10 15 q6 7 2 16 q-20 5 -40 0 z" fill="#c49ad8" />
        <circle cx="26" cy="41" r="1.4" fill={INK} stroke="none" />
        <circle cx="38" cy="41" r="1.4" fill={INK} stroke="none" />
        <path d="M24 47 q8 4 16 0" fill="none" />
      </>
    ),
  },
  Growlithe: {
    back: (
      <Pair>
        <path d="M17 34 q-8 -6 -6 -14 q8 3 11 10 z" fill="#ec8a3e" />
      </Pair>
    ),
    head: (
      <>
        <path d="M12 46 q-2 -6 3 -8 q-3 7 4 9 z M52 46 q2 -6 -3 -8 q3 7 -4 9 z" fill="#f2dfb0" />
        <ellipse cx="32" cy="42" rx="17" ry="16" fill="#ec8a3e" />
        <path d="M18 36 l5 2 M18 41 l4 1 M46 36 l-5 2 M46 41 l-4 1" fill="none" strokeWidth="1.8" />
        <path d="M24 30 q8 -3 16 0 q-3 5 -8 5 q-5 0 -8 -5 z" fill="#f2dfb0" />
        <ellipse cx="32" cy="50" rx="9" ry="6" fill="#f2dfb0" />
        <Eyes y={42} dx={7} r={2.8} fill="#2a1a10" />
        <ellipse cx="32" cy="47.5" rx="2.4" ry="1.7" fill={INK} />
        <path d="M29 51 q3 2 6 0" fill="none" />
      </>
    ),
  },
  Diglett: {
    head: (
      <>
        <path d="M15 58 V41 Q15 24 32 24 Q49 24 49 41 V58 Z" fill="#9a6b4a" />
        <ellipse cx="26.5" cy="38" rx="1.8" ry="3.2" fill="#111" stroke="none" />
        <ellipse cx="37.5" cy="38" rx="1.8" ry="3.2" fill="#111" stroke="none" />
        <ellipse cx="32" cy="46" rx="7" ry="4.6" fill="#e98aa5" />
        <path d="M10 60 q4 -6 9 -3 q3 -5 8 -1 q5 -4 10 0 q5 -4 8 1 q5 -3 9 3 z" fill="#6b5a4a" />
      </>
    ),
  },
};

/** The park ranger's hat every Pokémon wears: a tan crown with four dents, its band in the seat's colour. */
function Hat() {
  return (
    <g className="pk__hat">
      <ellipse cx="32" cy="25.5" rx="23" ry="5.4" fill="#b98d4f" />
      <path d="M20.5 25 C20 17 23 10 27 8.5 L32 11.5 L37 8.5 C41 10 44 17 43.5 25 Z" fill="#d6b06d" />
      <path d="M32 11.5 V19" fill="none" stroke="#9a733b" strokeWidth="1.1" />
      <path className="pk__band" d="M20.6 20.6 Q32 23.4 43.4 20.6 L43.5 25 Q32 27.6 20.5 25 Z" />
    </g>
  );
}

export function isDrawnPokemon(name: string | null | undefined): boolean {
  return Boolean(name && LOOKS[name]);
}

/** One Pokémon's head under its ranger hat, filling whatever box it is put in. */
export function PokemonHead({ name, className = '' }: { name: string; className?: string }) {
  const look = LOOKS[name];
  if (!look) return null;
  return (
    <svg className={`pk${className ? ` ${className}` : ''}`} viewBox="-3 -3 70 70" aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
        {look.back}
        {look.head}
        <Hat />
        {look.front}
      </g>
    </svg>
  );
}
