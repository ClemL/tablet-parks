'use client';

import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

/**
 * A QR code drawn as one SVG path. A seat's link is long — it carries a sealed
 * handle — so the code uses the lowest error correction: a screen has no
 * creases or smudges to recover from, and the larger modules scan from
 * further away.
 */
export function QrCode({ value, label, size = 148 }: { value: string; label: string; size?: number }) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'L');
    qr.addData(value, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
    return { path: d, count: n };
  }, [value]);
  const quiet = 2;
  return (
    <svg
      className="qr"
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${count + quiet * 2} ${count + quiet * 2}`}
      shapeRendering="crispEdges"
    >
      <rect x={-quiet} y={-quiet} width={count + quiet * 2} height={count + quiet * 2} fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  );
}
