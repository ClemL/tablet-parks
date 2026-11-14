'use client';

import { createContext, useContext } from 'react';
import type { SiteKind } from '../game/types';
import { DIORAMA_SCENES } from './diorama';
import { SceneSvg } from './illustrated';
import { CAMPSITE_SCENES, SITE_SCENES } from './sites';

const DioramaStops = createContext(false);

/** Set once per screen from the table's "Diorama stops" setting; every trail site's picture below follows it. */
export const DioramaProvider = DioramaStops.Provider;

/**
 * The picture behind a trail site tile or on a campsite card: the round
 * poster scene, or with diorama stops on, the site's little tile. Campsites
 * keep their scenes. Decorative: the tile already says what it is in words.
 */
export function SiteArt({ id, className = 'site-art' }: { id: string; className?: string }) {
  const diorama = useContext(DioramaStops);
  const scene = (diorama ? DIORAMA_SCENES[id as SiteKind] : undefined) ?? SITE_SCENES[id as keyof typeof SITE_SCENES] ?? CAMPSITE_SCENES[id];
  if (!scene) return null;
  return (
    <span className={className} aria-hidden="true">
      <SceneSvg scene={scene} label={scene.view} className="site-art-svg" />
    </span>
  );
}
