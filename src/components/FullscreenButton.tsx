'use client';

import { useFullscreen } from '@/client/fullscreen';
import { Icon } from './Icon';

/**
 * Puts the page full screen, or takes it out again, so the browser's bars stop
 * eating into the board. It shows nothing where the browser cannot do it; with
 * `onlyToEnter`, it also hides once the page is full screen, for places where
 * a way out would only be clutter.
 */
export function FullscreenButton({ className = '', onlyToEnter = false }: { className?: string; onlyToEnter?: boolean }) {
  const { available, on, toggle } = useFullscreen();
  if (!available || (on && onlyToEnter)) return null;
  return (
    <button type="button" className={`btn${className ? ` ${className}` : ''}`} onClick={toggle}>
      <Icon name={on ? 'shrink' : 'expand'} size={18} />
      {on ? 'Leave full screen' : 'Full screen'}
    </button>
  );
}
