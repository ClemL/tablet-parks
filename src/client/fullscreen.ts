'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Whether this browser can put the page full screen, whether it is now, and a
 * toggle. The state follows the browser rather than the toggle, because
 * leaving full screen also happens outside the page: Escape, the back
 * gesture, a swipe from the edge.
 */
export function useFullscreen(): { available: boolean; on: boolean; toggle: () => void } {
  // Read after mount: the server render cannot know, and guessing would mismatch on hydration.
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setAvailable(Boolean(document.fullscreenEnabled));
    const sync = () => setOn(document.fullscreenElement !== null);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(() => {
    const change = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    // A refusal (no tap behind it, or a browser policy) leaves the page as it was; there is nothing to undo.
    change.catch(() => {});
  }, []);

  return { available, on, toggle };
}
