/*
 * Line icons for the table's own furniture — the camera, the first player
 * token, campfires, tents — drawn so they look the same on every device.
 * Decorative: whatever an icon stands for is also said in words or in a label.
 */
const PATHS = {
  camera: (
    <>
      <path d="M4 8h3.2l1.6-2.4h6.4L16.8 8H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8z" />
      <circle cx="12" cy="13.4" r="3.4" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 16l5-5 4 4 3-3 6 6" />
    </>
  ),
  flag: <path d="M5 21V4M5 4.5h11.5l-2.4 4 2.4 4H5" />,
  fire: <path d="M12 2.8c1 3.2 4.8 5.2 4.8 9.8a4.8 4.8 0 0 1-9.6 0c0-2 .9-3.4 2-4.6.3 1.6 1.1 2.6 2.1 3.1-.4-3 .1-5.6.7-8.3z" />,
  tent: <path d="M3 20L12 4l9 16zM12 20l-2.6-6h5.2z" />,
  swap: <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />,
  ticket: (
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4z" />
  ),
  pack: (
    <>
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M9 13h6" />
      <rect x="5" y="7" width="14" height="14" rx="3" />
    </>
  ),
  flask: <path d="M10 3h4M10.5 3v5.2L6 17.4A2.4 2.4 0 0 0 8.2 21h7.6a2.4 2.4 0 0 0 2.2-3.6l-4.5-9.2V3M8 15h8" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  cpu: (
    <>
      <rect x="5" y="7" width="14" height="12" rx="3" />
      <path d="M12 3v4M9.2 12.2h.01M14.8 12.2h.01M9.5 16h5" />
    </>
  ),
  boot: <path d="M7 3h5v8.5l6.2 2.4A3 3 0 0 1 20 16.7V19H5V3.8M5 16h15" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  rotate: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2M20 14v6h-6v-2" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7s-8.5-4.5-9.5-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeoff: (
    <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.6 3.8M6.3 6.4A13.4 13.4 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a9.6 9.6 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  ),
  warn: <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />,
  tablet: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 16h4" />
    </>
  ),
  buzz: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M4 8v8M20 8v8" />
    </>
  ),
  undo: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M8 7h8M8 11h6" />
    </>
  ),
  deck: (
    <>
      <rect x="6" y="3" width="12" height="16" rx="2" />
      <path d="M4 7v12a2 2 0 0 0 2 2h10" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

/** Filled rather than outlined: the campfire reads as a flame only when solid. */
const SOLID: ReadonlySet<IconName> = new Set<IconName>(['fire']);

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`ic${SOLID.has(name) ? ' ic--solid' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      // A style, not width/height attributes: the stylesheet's default size would beat those.
      style={{ width: size, height: size }}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
