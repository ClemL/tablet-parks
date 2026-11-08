'use client';

import { useCallback, useEffect, useState } from 'react';
import { local } from './storage';

/**
 * How big this device draws the game: the text size and an overall scale,
 * chosen per device and remembered in localStorage. Text is set in rem
 * almost everywhere, so the root font size carries it; the scale is CSS
 * `zoom` on the root, with `--zoom` set alongside so the stylesheets can
 * divide viewport units by it (a zoomed `100dvh` would otherwise overflow).
 */

export type TextSize = 'small' | 'normal' | 'large' | 'larger';
export type Scale = 'compact' | 'normal' | 'roomy' | 'big';

export interface DisplayPrefs {
  text: TextSize;
  scale: Scale;
}

export const TEXT_SIZES: { id: TextSize; label: string; px: number }[] = [
  { id: 'small', label: 'Small', px: 14 },
  { id: 'normal', label: 'Normal', px: 16 },
  { id: 'large', label: 'Large', px: 18 },
  { id: 'larger', label: 'Larger', px: 20 },
];

export const SCALES: { id: Scale; label: string; zoom: number }[] = [
  { id: 'compact', label: '90%', zoom: 0.9 },
  { id: 'normal', label: '100%', zoom: 1 },
  { id: 'roomy', label: '110%', zoom: 1.1 },
  { id: 'big', label: '125%', zoom: 1.25 },
];

export const DEFAULT_DISPLAY: DisplayPrefs = { text: 'normal', scale: 'normal' };

const KEY = 'tablet-parks.display';

/** What this device saved, each field falling back to the default if missing or unknown. */
export function readDisplay(): DisplayPrefs {
  try {
    const saved = JSON.parse(local.get(KEY) ?? '{}') as Partial<DisplayPrefs>;
    return {
      text: TEXT_SIZES.some((t) => t.id === saved.text) ? saved.text! : DEFAULT_DISPLAY.text,
      scale: SCALES.some((s) => s.id === saved.scale) ? saved.scale! : DEFAULT_DISPLAY.scale,
    };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function applyDisplay(prefs: DisplayPrefs): void {
  const root = document.documentElement;
  const text = TEXT_SIZES.find((t) => t.id === prefs.text) ?? TEXT_SIZES[1];
  const zoom = SCALES.find((s) => s.id === prefs.scale)?.zoom ?? 1;
  root.style.fontSize = text.px === 16 ? '' : `${text.px}px`;
  root.style.setProperty('zoom', zoom === 1 ? '' : String(zoom));
  root.style.setProperty('--zoom', String(zoom));
}

/** The saved display settings, applied on mount, and a setter that applies and saves a change. */
export function useDisplay(): [DisplayPrefs, (next: DisplayPrefs) => void] {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULT_DISPLAY);
  useEffect(() => {
    const saved = readDisplay();
    setPrefs(saved);
    applyDisplay(saved);
  }, []);
  const change = useCallback((next: DisplayPrefs) => {
    setPrefs(next);
    applyDisplay(next);
    local.set(KEY, JSON.stringify(next));
  }, []);
  return [prefs, change];
}
