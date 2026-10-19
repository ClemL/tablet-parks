import { SceneSvg } from './illustrated';
import { CAMPSITE_SCENES, SITE_SCENES } from './sites';

/**
 * The picture behind a trail site tile or on a campsite card. Decorative: the
 * tile already says what it is in words.
 */
export function SiteArt({ id, className = 'site-art' }: { id: string; className?: string }) {
  const scene = SITE_SCENES[id as keyof typeof SITE_SCENES] ?? CAMPSITE_SCENES[id];
  if (!scene) return null;
  return (
    <span className={className} aria-hidden="true">
      <SceneSvg scene={scene} label={scene.view} className="site-art-svg" />
    </span>
  );
}
