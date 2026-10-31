'use client';

import { useCallback, useEffect, useRef } from 'react';

const HOLD_MS = 450;
/** A finger that drifts further than this is scrolling or dragging, not holding. */
const SLOP_PX = 10;

/**
 * Press-and-hold for touch screens, where there is no hover to show a tooltip.
 * `bind(onHold)` gives an element the handlers; a hold that fires swallows the
 * tap that would otherwise follow it, so holding a lit site reads its rules
 * without walking there.
 */
export function useLongPress() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);
  useEffect(() => clear, [clear]);

  return useCallback(
    (onHold: () => void) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          fired.current = true;
          timer.current = null;
          onHold();
        }, HOLD_MS);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const from = start.current;
        if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > SLOP_PX) clear();
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      // A long press on Android otherwise opens the browser's own menu.
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (!fired.current) return;
        fired.current = false;
        e.preventDefault();
        e.stopPropagation();
      },
    }),
    [clear],
  );
}
