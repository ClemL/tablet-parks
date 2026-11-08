/**
 * A Nightfall tent, drawn rather than an icon: an orange canvas ridge tent
 * with its door open on a warm lantern glow, guy lines pegged out, on a strip
 * of ground. It marks the tent sites on the trail, where it has to read at a
 * glance from across the table.
 */
export function TentArt({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`tent-art${className ? ` ${className}` : ''}`} viewBox="0 0 48 48" style={{ width: size, height: size }} aria-hidden="true" focusable="false">
      <path d="M4 40.5h40" stroke="#2f4a36" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 40 L13 31 M42 40 L35 31" stroke="#d9cfb4" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 7 L41 40 H7 Z" fill="#e8873a" stroke="#5a2e12" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M24 7 L33 40 H24 Z" fill="#c4672a" />
      <path d="M24 17 L30 40 H18 Z" fill="#ffd27a" stroke="#5a2e12" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M24 17 L18 40 H22.5 Z" fill="#f5b450" />
      <circle cx="24" cy="33.5" r="2.2" fill="#fff4cf" />
      <path d="M24 7 V3.5" stroke="#5a2e12" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 3.8 L29 5.4 L24 7" fill="#7fb685" stroke="#2f4a36" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}
