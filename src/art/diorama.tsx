import type { ReactNode } from 'react';
import type { SiteKind } from '../game/types';
import { Bison, Bird, Cloud, land, poly, Sky, Sun, type Kit, type Pt } from './kit';
import type { ParkScene } from './scenes/types';

/*
 * The trail's stops as little diorama tiles, the table's other look for the
 * trail (the "Diorama stops" setting): each site a square of ground seen from
 * above at an angle, with earth showing down its two front sides and the
 * site's own landmark standing on it, like a piece from a board game. Drawn
 * on the same 160 × 100 board as the round scenes, the tile centred where
 * the stop's round window crops it.
 */

const n = (v: number) => Math.round(v * 10) / 10;

/**
 * A point on the tile's top face, `lift` pixels up. u runs from the back
 * corner down to the right, v from the back corner down to the left.
 */
export function iso(u: number, v: number, lift = 0): Pt {
  return [n(80 + (u - v) * 44), n(28 + (u + v) * 22 - lift)];
}

const DEPTH = 14;

interface TileColours {
  top: string;
  lip: [string, string];
  faces: [string, string];
}

const GRASS: TileColours = { top: '#8fc06a', lip: ['#5f9a48', '#4f8a3e'], faces: ['#8a5a36', '#6e4428'] };
const DUSK_GRASS: TileColours = { top: '#5f8a4a', lip: ['#46703a', '#3a6030'], faces: ['#6a4630', '#523422'] };
const SAND: TileColours = { top: '#e8d2a0', lip: ['#d8b880', '#c8a46a'], faces: ['#c07a4a', '#a0603a'] };
const MEADOW: TileColours = { top: '#a8bc70', lip: ['#8aa45a', '#7a944c'], faces: ['#8a5a36', '#6e4428'] };

/** The tile itself: its shadow, two earth faces with strata, a grass lip, and the top. */
function Tile({ colours = GRASS }: { colours?: TileColours }) {
  const [b, r, f, l] = [iso(0, 0), iso(1, 0), iso(1, 1), iso(0, 1)];
  const down = (p: Pt, d = DEPTH): Pt => [p[0], p[1] + d];
  return (
    <>
      <ellipse cx="80" cy={f[1] + DEPTH + 6} rx="44" ry="5" fill="#000000" opacity="0.14" />
      <path d={poly([l, f, down(f), down(l)])} fill={colours.faces[0]} />
      <path d={poly([f, r, down(r), down(f)])} fill={colours.faces[1]} />
      <path
        d={`M${l[0]} ${l[1] + 6} L${f[0]} ${f[1] + 6} L${r[0]} ${r[1] + 6} M${l[0]} ${l[1] + 10} L${f[0]} ${f[1] + 10} L${r[0]} ${r[1] + 10}`}
        stroke="#000000"
        strokeOpacity="0.15"
        strokeWidth="0.8"
        fill="none"
      />
      <path d={poly([l, f, down(f, 3), down(l, 3)])} fill={colours.lip[0]} />
      <path d={poly([f, r, down(r, 3), down(f, 3)])} fill={colours.lip[1]} />
      <path d={poly([b, r, f, l])} fill={colours.top} />
    </>
  );
}

/** A box standing on the tile, `base` pixels up: its two front faces and its top. */
function Box({ u, v, w, d, h, base = 0, top, left, right }: { u: number; v: number; w: number; d: number; h: number; base?: number; top: string; left: string; right: string }) {
  const p = (a: number, b: number, lift: number) => iso(a, b, base + lift);
  return (
    <>
      <path d={poly([p(u, v + d, h), p(u + w, v + d, h), p(u + w, v + d, 0), p(u, v + d, 0)])} fill={left} />
      <path d={poly([p(u + w, v, h), p(u + w, v + d, h), p(u + w, v + d, 0), p(u + w, v, 0)])} fill={right} />
      <path d={poly([p(u, v, h), p(u + w, v, h), p(u + w, v + d, h), p(u, v + d, h)])} fill={top} />
    </>
  );
}

/** A hipped roof on a box of the same footprint, `h` up, rising `rise` to its peak. */
function Roof({ u, v, w, d, h, rise, left, right }: { u: number; v: number; w: number; d: number; h: number; rise: number; left: string; right: string }) {
  const o = 0.03;
  const apex = iso(u + w / 2, v + d / 2, h + rise);
  const a = iso(u - o, v + d + o, h);
  const b = iso(u + w + o, v + d + o, h);
  const c = iso(u + w + o, v - o, h);
  return (
    <>
      <path d={poly([a, b, apex])} fill={left} />
      <path d={poly([b, c, apex])} fill={right} />
    </>
  );
}

/** A pond or pool on the tile: an ellipse traced in tile coordinates. */
function Pond({ u, v, r, fill, shine = '#bfe2f2' }: { u: number; v: number; r: number; fill: string; shine?: string }) {
  const edge = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return iso(u + r * Math.cos(a), v + r * 0.85 * Math.sin(a));
  });
  const [cx, cy] = iso(u, v);
  return (
    <>
      <path d={poly(edge)} fill={fill} />
      <path d={`M${cx - 8} ${cy} h7 M${cx + 2} ${cy + 3} h6`} stroke={shine} strokeWidth="0.9" />
    </>
  );
}

function Pine({ at, s = 1 }: { at: Pt; s?: number }) {
  const [x, y] = at;
  return (
    <>
      <rect x={x - 0.8 * s} y={y - 3 * s} width={1.6 * s} height={3 * s} fill="#5a3a22" />
      <path d={poly([[x - 5 * s, y - 3 * s], [x, y - 17 * s], [x, y - 3 * s]])} fill="#3f7a46" />
      <path d={poly([[x, y - 17 * s], [x + 5 * s, y - 3 * s], [x, y - 3 * s]])} fill="#2f5f38" />
    </>
  );
}

/** Things standing on the tile, drawn back to front so nearer ones overlap farther ones. */
function Standing({ items }: { items: { u: number; v: number; draw: (at: Pt) => ReactNode }[] }) {
  return (
    <>
      {[...items]
        .sort((a, b) => a.u + a.v - (b.u + b.v))
        .map((item, i) => (
          <g key={i}>{item.draw(iso(item.u, item.v))}</g>
        ))}
    </>
  );
}

const pine = (u: number, v: number, s = 1) => ({ u, v, draw: (at: Pt) => <Pine at={at} s={s} /> });

/** A band across the tile's top along a centre line of (u, v) points, `w` wide in u. */
function band(line: [number, number][], w: number): string {
  const left = line.map(([u, v]) => iso(u - w, v));
  const right = line.map(([u, v]) => iso(u + w, v)).reverse();
  return poly([...left, ...right]);
}

function Signpost({ at }: { at: Pt }) {
  const [x, y] = at;
  return (
    <>
      <rect x={x - 0.8} y={y - 16} width="1.6" height="16" fill="#6b4a2d" />
      <path d={`M${x} ${y - 15} h9 l2 2 l-2 2 h-9Z`} fill="#c08a4e" />
      <path d={`M${x} ${y - 10} h-8 l-2 2 l2 2 h8Z`} fill="#a06a3a" />
    </>
  );
}

function Tent({ at, fill = '#e8873a', door = '#3a2414' }: { at: Pt; fill?: string; door?: string }) {
  const [x, y] = at;
  return (
    <>
      <path d={poly([[x - 10, y], [x, y - 14], [x + 10, y]])} fill={fill} />
      <path d={poly([[x, y - 14], [x + 10, y], [x + 3, y]])} fill="#000000" opacity="0.18" />
      <path d={poly([[x - 3, y], [x, y - 7], [x + 3, y]])} fill={door} />
    </>
  );
}

function Fire({ at, s = 1 }: { at: Pt; s?: number }) {
  const [x, y] = at;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-4" r="9" fill="#ffb347" opacity="0.3" />
      <path d="M-5 0 L5 -1.6 M-5 -1.6 L5 0" stroke="#5a3a22" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M0 -10 C2.6 -7 3.4 -4 1.6 -1.6 L-1.6 -1.6 C-3.4 -4 -2.6 -7 0 -10Z" fill="#f28c28" />
      <path d="M0 -6.6 C1.2 -5 1.6 -3.4 0.8 -1.6 L-0.8 -1.6 C-1.6 -3.4 -1.2 -5 0 -6.6Z" fill="#fde28a" />
    </g>
  );
}

function Person({ at, fill, hat = false, s = 1 }: { at: Pt; fill: string; hat?: boolean; s?: number }) {
  const [x, y] = at;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <circle cx="0" cy="-10.5" r="1.6" />
      {hat ? <path d="M-2.8 -11.6 H2.8 L2.3 -11 H-2.3Z M-1.1 -11.6 L0 -13.4 L1.1 -11.6Z" /> : null}
      <path d="M-1.6 -8.8 H1.6 L1.9 -3.6 H-1.9Z" />
      <rect x="-1.6" y="-3.8" width="1.2" height="3.8" />
      <rect x="0.4" y="-3.8" width="1.2" height="3.8" />
    </g>
  );
}

function Stars({ count = 14, seed = 1 }: { count?: number; seed?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={(i * 37 + seed * 11) % 160} cy={(i * 13 + seed * 7) % 30} r={i % 4 === 0 ? 0.8 : 0.5} fill="#ffffff" opacity="0.85" />
      ))}
    </>
  );
}

const DAY = ['#cfe8f4', '#f4f0e2'];
const day = (k: Kit) => <Sky k={k} stops={DAY} />;

export const DIORAMA_SCENES: Record<SiteKind, ParkScene> = {
  trailhead: {
    view: 'a tile where a path sets out past a signpost',
    draw: (k) => (
      <>
        {day(k)}
        <Sun x={124} y={20} r={7} fill="#fff3cf" glow="#fff0c0" />
        <Cloud x={40} y={18} />
        <Tile />
        <path d={band([[0.92, 1], [0.78, 0.84], [0.62, 0.7], [0.52, 0.52], [0.4, 0.36], [0.3, 0.2], [0.24, 0.04]], 0.05)} fill="#e6d2a0" />
        <Standing
          items={[
            pine(0.15, 0.1),
            pine(0.75, 0.15),
            pine(0.9, 0.42),
            pine(0.12, 0.52),
            pine(0.28, 0.82),
            pine(0.45, 0.95),
            { u: 0.74, v: 0.66, draw: (at) => <Signpost at={at} /> },
          ]}
        />
      </>
    ),
  },
  'trail-end': {
    view: 'a tile with a tent and a campfire at dusk',
    draw: (k) => (
      <>
        <Sky k={k} stops={['#2b355e', '#7a5a86', '#e09a7a']} />
        <Stars />
        <Tile colours={DUSK_GRASS} />
        <Standing
          items={[
            pine(0.12, 0.12, 1.1),
            pine(0.85, 0.15),
            pine(0.1, 0.6),
            { u: 0.42, v: 0.42, draw: (at) => <Tent at={at} /> },
            { u: 0.72, v: 0.66, draw: (at) => <Fire at={at} s={1.1} /> },
            { u: 0.6, v: 0.82, draw: ([x, y]) => <rect x={x - 6} y={y - 2} width="12" height="2.6" rx="1.2" fill="#7a5232" /> },
          ]}
        />
      </>
    ),
  },
  forest: {
    view: 'a tile thick with pines',
    draw: (k) => (
      <>
        {day(k)}
        <Cloud x={118} y={16} />
        <Tile colours={{ ...GRASS, top: '#6fa85a' }} />
        <Standing
          items={[
            pine(0.12, 0.12, 1.1),
            pine(0.38, 0.1, 1.2),
            pine(0.66, 0.12, 1),
            pine(0.88, 0.16, 1.15),
            pine(0.2, 0.36, 1.2),
            pine(0.5, 0.34, 1.3),
            pine(0.78, 0.4, 1.1),
            pine(0.12, 0.62, 1),
            pine(0.38, 0.6, 1.15),
            pine(0.64, 0.64, 1.25),
            pine(0.88, 0.7, 1),
            pine(0.28, 0.86, 1.05),
            pine(0.56, 0.88, 1.1),
          ]}
        />
      </>
    ),
  },
  mountain: {
    view: 'a tile with a rocky peak rising from it',
    draw: (k) => {
      const apex = iso(0.5, 0.5, 40);
      const [l, f, r] = [iso(0.16, 0.84), iso(0.84, 0.84), iso(0.84, 0.16)];
      const mix = (a: Pt, b: Pt, t: number): Pt => [n(a[0] + (b[0] - a[0]) * t), n(a[1] + (b[1] - a[1]) * t)];
      return (
        <>
          <Sky k={k} stops={['#9ec6e8', '#eef2f2']} />
          <Cloud x={40} y={20} />
          <Tile colours={{ ...GRASS, top: '#9aab7a' }} />
          <path d={poly([l, f, apex])} fill="#8a8a96" />
          <path d={poly([f, r, apex])} fill="#6c6c78" />
          <path d={poly([mix(apex, l, 0.3), mix(apex, f, 0.3), apex])} fill="#f4f6f8" />
          <path d={poly([mix(apex, f, 0.3), mix(apex, r, 0.3), apex])} fill="#d8dce4" />
          <Standing items={[pine(0.12, 0.9, 0.9), pine(0.9, 0.9, 0.9), pine(0.92, 0.6, 0.8), pine(0.6, 0.94, 0.8)]} />
        </>
      );
    },
  },
  valley: {
    view: 'a tile with a river running across it and over its edge',
    draw: (k) => {
      const line: [number, number][] = Array.from({ length: 11 }, (_, i) => [0.5 + 0.1 * Math.sin(i * 0.5), i / 10]);
      const exit = iso(line[10][0], 1);
      return (
        <>
          <Sky k={k} stops={['#bfe0f2', '#eef4f2']} />
          <path d={land([[50, 40], [66, 16], [80, 26], [96, 12], [112, 40]], 44)} fill="#9aa6bc" />
          <path d="M96 12 l5 7 l-9 1Z M66 16 l4 6 l-8 0Z" fill="#ffffff" />
          <Tile />
          <path d={band(line, 0.07)} fill="#4f9ac4" />
          <path d={band(line.slice(2, 9), 0.015)} fill="#a8d4ec" />
          {/* The river pours over the front edge and down the tile's side. */}
          <path d={poly([[exit[0] - 3.5, exit[1] - 1.75], [exit[0] + 3.5, exit[1] + 1.75], [exit[0] + 3.5, exit[1] + 1.75 + DEPTH], [exit[0] - 3.5, exit[1] - 1.75 + DEPTH]])} fill="#a8d4ec" />
          <ellipse cx={exit[0]} cy={exit[1] + DEPTH + 3} rx="7" ry="2" fill="#4f9ac4" opacity="0.7" />
          <Standing items={[pine(0.12, 0.15), pine(0.85, 0.12), pine(0.18, 0.55), pine(0.9, 0.55), pine(0.82, 0.88), pine(0.15, 0.9)]} />
        </>
      );
    },
  },
  basin: {
    view: 'a sandy tile under a big sun, a mesa standing on it',
    draw: (k) => (
      <>
        <Sky k={k} stops={['#f2b25a', '#f8dca0']} />
        <Sun x={80} y={22} r={14} fill="#fff4c8" glow="#ffd97a" />
        <Tile colours={SAND} />
        <Box u={0.14} v={0.18} w={0.34} d={0.26} h={12} top="#d8925e" left="#c07a4a" right="#a8643a" />
        <path d={`M${iso(0.5, 0.7)[0] - 12} ${iso(0.5, 0.7)[1]} h10 M${iso(0.7, 0.5)[0] - 4} ${iso(0.7, 0.5)[1]} h12`} stroke="#f6ead0" strokeWidth="1.2" />
        <Standing
          items={[
            { u: 0.72, v: 0.3, draw: ([x, y]) => <path d={`M${x} ${y} v-9 M${x} ${y - 6} h-3 v-3 M${x} ${y - 4} h3 v-3`} stroke="#5f8a4e" strokeWidth="1.8" strokeLinecap="round" fill="none" /> },
            { u: 0.84, v: 0.78, draw: ([x, y]) => <ellipse cx={x} cy={y - 1.5} rx="4" ry="2" fill="#8a9a6a" /> },
            { u: 0.3, v: 0.8, draw: ([x, y]) => <ellipse cx={x} cy={y - 1.5} rx="3.4" ry="1.8" fill="#8a9a6a" /> },
          ]}
        />
      </>
    ),
  },
  waterfall: {
    view: 'a tile with a cliff at its back, a falls dropping to a pool',
    draw: (k) => {
      const h = 24;
      return (
        <>
          {day(k)}
          <Tile />
          <Box u={0} v={0} w={1} d={0.3} h={h} top="#7a9a5a" left="#6a6258" right="#5a5248" />
          <path d={poly([iso(0.42, 0.3, h), iso(0.58, 0.3, h), iso(0.58, 0.3), iso(0.42, 0.3)])} fill="#eaf5f8" />
          <path d={`M${iso(0.47, 0.3, h)[0]} ${iso(0.47, 0.3, h)[1]} V${iso(0.47, 0.3)[1]} M${iso(0.53, 0.3, h)[0]} ${iso(0.53, 0.3, h)[1]} V${iso(0.53, 0.3)[1]}`} stroke="#a9d0e0" strokeWidth="0.7" />
          <Pond u={0.5} v={0.56} r={0.2} fill="#4f9ac4" />
          <ellipse cx={iso(0.5, 0.34)[0]} cy={iso(0.5, 0.34)[1]} rx="8" ry="2.4" fill="#ffffff" opacity="0.8" />
          {[0.12, 0.3, 0.72, 0.9].map((u) => (
            <Pine key={u} at={iso(u, 0.12, h)} s={0.8} />
          ))}
          <Standing items={[pine(0.12, 0.8), pine(0.86, 0.72), pine(0.62, 0.92, 0.9)]} />
        </>
      );
    },
  },
  camera: {
    view: 'a viewpoint tile with a railing and a camera on its tripod',
    draw: (k) => {
      const [x, y] = iso(0.5, 0.5);
      return (
        <>
          <Sky k={k} stops={['#8fb4dc', '#f2dcc0']} />
          <path d={land([[36, 44], [56, 22], [74, 34], [94, 16], [124, 44]], 48)} fill="#8a86a0" />
          <path d="M94 16 l6 7 l-11 1Z M56 22 l5 6 l-9 0Z" fill="#f2f4f7" />
          <Tile />
          <path d={`M${x} ${y - 10} L${x - 6} ${y} M${x} ${y - 10} L${x + 6} ${y} M${x} ${y - 10} V${y + 1}`} stroke="#2a2a2a" strokeWidth="1.2" />
          <rect x={x - 6} y={y - 18} width="12" height="8" rx="1.4" fill="#2a2a2a" />
          <circle cx={x} cy={y - 14} r="2.6" fill="#5a6a7a" />
          <circle cx={x} cy={y - 14} r="1.2" fill="#9ab0c4" />
          {/* A railing along the two front edges. */}
          {[0.08, 0.3, 0.52, 0.74, 0.96].map((t) => (
            <g key={t}>
              <path d={`M${iso(t, 0.97)[0]} ${iso(t, 0.97)[1]} v-7`} stroke="#5a4636" strokeWidth="1.2" />
              <path d={`M${iso(0.97, t)[0]} ${iso(0.97, t)[1]} v-7`} stroke="#5a4636" strokeWidth="1.2" />
            </g>
          ))}
          <path d={`M${iso(0.08, 0.97)[0]} ${iso(0.08, 0.97)[1] - 6} L${iso(0.97, 0.97)[0]} ${iso(0.97, 0.97)[1] - 6} L${iso(0.97, 0.08)[0]} ${iso(0.97, 0.08)[1] - 6}`} stroke="#5a4636" strokeWidth="1.2" fill="none" />
        </>
      );
    },
  },
  'adv-wildcard': {
    view: 'a tile half pond, a wildlife hide among the reeds',
    draw: (k) => (
      <>
        {day(k)}
        <Bird x={52} y={20} s={1.1} />
        <Bird x={66} y={14} />
        <Bird x={108} y={22} />
        <Tile />
        <Pond u={0.64} v={0.58} r={0.3} fill="#6a9ab0" />
        <Box u={0.1} v={0.26} w={0.26} d={0.24} h={10} top="#6a4a2e" left="#7a5a3a" right="#5e4228" />
        <Roof u={0.1} v={0.26} w={0.26} d={0.24} h={10} rise={6} left="#5a3a22" right="#4a2e1a" />
        <path d={`M${iso(0.1, 0.5, 5)[0] + 2} ${iso(0.1, 0.5, 5)[1] + 1} L${iso(0.36, 0.5, 5)[0] - 2} ${iso(0.36, 0.5, 5)[1] - 1}`} stroke="#1e1612" strokeWidth="1.6" />
        {[
          [0.4, 0.86],
          [0.48, 0.92],
          [0.9, 0.36],
          [0.94, 0.48],
          [0.36, 0.76],
        ].map(([u, v]) => {
          const [x, y] = iso(u, v);
          return <path key={`${u}-${v}`} d={`M${x} ${y} q-1 -5 -1 -8 M${x + 2} ${y} q1 -5 2 -7 M${x - 2} ${y} q-1 -3 -3 -5`} stroke="#8a7a3a" strokeWidth="1" fill="none" />;
        })}
      </>
    ),
  },
  'adv-swap': {
    view: 'a tile with a log trading post and its barrels',
    draw: (k) => (
      <>
        {day(k)}
        <Tile colours={{ ...GRASS, top: '#a8b870' }} />
        <Standing items={[pine(0.1, 0.1), pine(0.88, 0.14), pine(0.12, 0.88, 0.9)]} />
        <Box u={0.28} v={0.3} w={0.42} d={0.36} h={12} top="#6a4222" left="#8a5a34" right="#6a4222" />
        <path
          d={[3, 6, 9].map((lift) => `M${iso(0.28, 0.66, lift)[0]} ${iso(0.28, 0.66, lift)[1]} L${iso(0.7, 0.66, lift)[0]} ${iso(0.7, 0.66, lift)[1]}`).join(' ')}
          stroke="#6a4222"
          strokeWidth="0.8"
        />
        <Roof u={0.28} v={0.3} w={0.42} d={0.36} h={12} rise={9} left="#5a3a22" right="#4a2e1a" />
        <path d={poly([iso(0.38, 0.66, 9.5), iso(0.6, 0.66, 9.5), iso(0.6, 0.66, 5.5), iso(0.38, 0.66, 5.5)])} fill="#e8d6aa" />
        <Standing
          items={[
            { u: 0.82, v: 0.76, draw: ([x, y]) => <><rect x={x - 3} y={y - 7} width="6" height="7" rx="1.6" fill="#7a4a24" /><ellipse cx={x} cy={y - 7} rx="3" ry="1.2" fill="#8a5a34" /></> },
            { u: 0.9, v: 0.66, draw: ([x, y]) => <><rect x={x - 2.6} y={y - 6} width="5.2" height="6" rx="1.4" fill="#6a4020" /><ellipse cx={x} cy={y - 6} rx="2.6" ry="1" fill="#7a4a24" /></> },
          ]}
        />
      </>
    ),
  },
  'adv-park': {
    view: 'a tile with the ranger station under its flag',
    draw: (k) => (
      <>
        {day(k)}
        <Cloud x={42} y={18} />
        <Tile />
        <Standing items={[pine(0.1, 0.12, 1.1), pine(0.12, 0.84), pine(0.86, 0.86, 0.9)]} />
        <Box u={0.3} v={0.32} w={0.4} d={0.34} h={12} top="#6e4a30" left="#7a5236" right="#5e3e26" />
        <path d={poly([iso(0.36, 0.66, 9), iso(0.46, 0.66, 9), iso(0.46, 0.66, 5), iso(0.36, 0.66, 5)])} fill="#e8d8a8" />
        <path d={poly([iso(0.54, 0.66, 9), iso(0.64, 0.66, 9), iso(0.64, 0.66, 5), iso(0.54, 0.66, 5)])} fill="#e8d8a8" />
        <path d={poly([iso(0.7, 0.44, 8), iso(0.7, 0.54, 8), iso(0.7, 0.54, 0), iso(0.7, 0.44, 0)])} fill="#3a2414" />
        <Roof u={0.3} v={0.32} w={0.4} d={0.34} h={12} rise={8} left="#3e5a3e" right="#2e4a30" />
        <Standing
          items={[
            {
              u: 0.84,
              v: 0.3,
              draw: ([x, y]) => (
                <>
                  <rect x={x - 0.6} y={y - 30} width="1.2" height="30" fill="#8a8a8a" />
                  <rect x={x + 0.6} y={y - 30} width="11" height="7" fill="#b8382a" />
                  <rect x={x + 0.6} y={y - 30} width="5" height="3.6" fill="#2a4a8a" />
                </>
              ),
            },
          ]}
        />
      </>
    ),
  },
  'adv-copy': {
    view: 'an overlook tile, binoculars on a deck above the view',
    draw: (k) => (
      <>
        <Sky k={k} stops={['#7ab0e0', '#e6eef0']} />
        <path d={land([[30, 46], [48, 30], [64, 40], [84, 22], [104, 38], [130, 46]], 50)} fill="#9aa0b8" />
        <Tile />
        <Box u={0.42} v={0.42} w={0.58} d={0.58} h={2} top="#a8865a" left="#8a6a44" right="#7a5a38" />
        <path
          d={[0.5, 0.62, 0.74, 0.86].map((t) => `M${iso(t, 0.42, 2)[0]} ${iso(t, 0.42, 2)[1]} L${iso(t, 1, 2)[0]} ${iso(t, 1, 2)[1]}`).join(' ')}
          stroke="#8a6a44"
          strokeWidth="0.6"
        />
        <Standing
          items={[
            pine(0.12, 0.14, 1.1),
            pine(0.14, 0.6),
            pine(0.6, 0.12),
            {
              u: 0.72,
              v: 0.72,
              draw: ([x, y]) => (
                <>
                  <rect x={x - 1} y={y - 14} width="2" height="12" fill="#3a4a5a" />
                  <rect x={x - 6} y={y - 20} width="12" height="7" rx="2.4" fill="#4a6a8a" />
                  <circle cx={x - 3.4} cy={y - 16.5} r="1.8" fill="#2a3a4a" />
                  <circle cx={x + 3.4} cy={y - 16.5} r="1.8" fill="#2a3a4a" />
                </>
              ),
            },
          ]}
        />
      </>
    ),
  },
  'adv-memory': {
    view: 'a tile with a red rock pillar at sunset, a photograph pinned to it',
    draw: (k) => {
      const h = 28;
      return (
        <>
          <Sky k={k} stops={['#6a5a9a', '#e88a7a', '#f6c88a']} />
          <Sun x={122} y={40} r={9} fill="#ffe0a0" />
          <Tile colours={{ top: '#d8a070', lip: ['#c08a5a', '#b07a4a'], faces: ['#a8603a', '#8a4a2a'] }} />
          <Box u={0.28} v={0.22} w={0.44} d={0.34} h={h} top="#c8703e" left="#b05a30" right="#8e4624" />
          <path d={`M${iso(0.28, 0.56, 10)[0]} ${iso(0.28, 0.56, 10)[1]} L${iso(0.72, 0.56, 10)[0]} ${iso(0.72, 0.56, 10)[1]} M${iso(0.72, 0.22, 16)[0]} ${iso(0.72, 0.22, 16)[1]} L${iso(0.72, 0.56, 16)[0]} ${iso(0.72, 0.56, 16)[1]}`} stroke="#7a3a1e" strokeWidth="0.8" />
          {/* The photo, pinned to the front face. */}
          <path d={poly([iso(0.38, 0.56, 23), iso(0.56, 0.56, 23), iso(0.56, 0.56, 12), iso(0.38, 0.56, 12)])} fill="#f8f4ea" />
          <path d={poly([iso(0.4, 0.56, 21.5), iso(0.54, 0.56, 21.5), iso(0.54, 0.56, 15), iso(0.4, 0.56, 15)])} fill="#6a98c8" />
          <path d={poly([iso(0.4, 0.56, 15), iso(0.45, 0.56, 18.5), iso(0.49, 0.56, 16.5), iso(0.54, 0.56, 15)])} fill="#4a6a4a" />
          <circle cx={iso(0.47, 0.56, 23.5)[0]} cy={iso(0.47, 0.56, 23.5)[1]} r="1.1" fill="#b8382a" />
        </>
      );
    },
  },
  'adv-bison': {
    view: 'a meadow tile where bison graze',
    draw: (k) => (
      <>
        <Sky k={k} stops={['#a8cfe8', '#eef2e6']} />
        <Cloud x={118} y={18} s={1.2} />
        <Tile colours={MEADOW} />
        <Standing
          items={[
            pine(0.1, 0.1),
            pine(0.9, 0.12, 0.9),
            { u: 0.36, v: 0.32, draw: ([x, y]) => <Bison x={x} y={y} s={1.5} /> },
            { u: 0.7, v: 0.42, draw: ([x, y]) => <Bison x={x} y={y} s={1.2} /> },
            { u: 0.52, v: 0.7, draw: ([x, y]) => <Bison x={x} y={y} s={1.8} /> },
          ]}
        />
        {Array.from({ length: 12 }, (_, i) => {
          const [x, y] = iso(((i * 0.37) % 0.9) + 0.05, ((i * 0.61) % 0.9) + 0.05);
          return <circle key={i} cx={x} cy={y} r="0.9" fill={['#b07bac', '#f2c14e', '#ffffff'][i % 3]} />;
        })}
      </>
    ),
  },
  'adv-lookout': {
    view: 'a tile with a fire lookout tower among the pines',
    draw: (k) => {
      const base = 28;
      const legs = [iso(0.38, 0.38), iso(0.62, 0.38), iso(0.62, 0.62), iso(0.38, 0.62)];
      const tops = [iso(0.44, 0.44, base), iso(0.56, 0.44, base), iso(0.56, 0.56, base), iso(0.44, 0.56, base)];
      return (
        <>
          {day(k)}
          <Tile />
          <Standing items={[pine(0.12, 0.12, 1.1), pine(0.4, 0.1), pine(0.12, 0.42)]} />
          <path d={legs.map((p, i) => `M${p[0]} ${p[1]} L${tops[i][0]} ${tops[i][1]}`).join(' ')} stroke="#5a4a3a" strokeWidth="1.4" />
          <path d={`M${iso(0.41, 0.62, 12)[0]} ${iso(0.41, 0.62, 12)[1]} L${iso(0.59, 0.62, 12)[0]} ${iso(0.59, 0.62, 12)[1]} L${iso(0.59, 0.41, 12)[0]} ${iso(0.59, 0.41, 12)[1]}`} stroke="#5a4a3a" strokeWidth="1" fill="none" />
          <Box u={0.42} v={0.42} w={0.16} d={0.16} h={9} base={base} top="#8a6a4a" left="#8a6a4a" right="#6e5038" />
          <path d={poly([iso(0.43, 0.58, base + 7.5), iso(0.57, 0.58, base + 7.5), iso(0.57, 0.58, base + 3.5), iso(0.43, 0.58, base + 3.5)])} fill="#dfeef4" />
          <path d={poly([iso(0.58, 0.43, base + 7.5), iso(0.58, 0.57, base + 7.5), iso(0.58, 0.57, base + 3.5), iso(0.58, 0.43, base + 3.5)])} fill="#c4d8e2" />
          <Roof u={0.42} v={0.42} w={0.16} d={0.16} h={base + 9} rise={6} left="#5a3a2a" right="#4a2e20" />
          <Standing items={[pine(0.86, 0.2), pine(0.88, 0.62, 1.1), pine(0.62, 0.9), pine(0.2, 0.84, 1.1)]} />
        </>
      );
    },
  },
  'adv-talk': {
    view: 'a tile at dusk, log benches round a campfire and the ranger',
    draw: (k) => (
      <>
        <Sky k={k} stops={['#3a3a6a', '#b86a6a', '#f2b27a']} />
        <Stars count={8} seed={3} />
        <Tile colours={DUSK_GRASS} />
        <Standing
          items={[
            pine(0.1, 0.12, 1.1),
            pine(0.88, 0.12),
            { u: 0.5, v: 0.3, draw: (at) => <Person at={at} fill="#1e1a18" hat s={1.3} /> },
            { u: 0.52, v: 0.52, draw: (at) => <Fire at={at} s={1.2} /> },
            ...[
              [0.26, 0.62],
              [0.5, 0.8],
              [0.76, 0.62],
            ].map(([u, v]) => ({
              u,
              v,
              draw: ([x, y]: Pt) => (
                <>
                  <rect x={x - 7} y={y - 2.4} width="14" height="2.8" rx="1.3" fill="#8a6a44" />
                  <circle cx={x - 3} cy={y - 5} r="1.8" fill="#1e1a18" />
                  <circle cx={x + 3} cy={y - 5} r="1.8" fill="#1e1a18" />
                </>
              ),
            })),
          ]}
        />
      </>
    ),
  },
};
