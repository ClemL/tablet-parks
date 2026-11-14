import type { ParkCard, ParkTag } from '@/game/types';
import { parkFact } from '@/game/data/parkFacts';
import type { Pokemon } from '@/room/names';
import { IllustratedParkArt } from '@/art/illustrated';
import { PokemonHead, TaurosToken } from '@/art/pokemon';
import { usePokemonTheme } from './gearTheme';

/*
 * The top of every park card, drawn as a trail poster: the park's own
 * illustration edge to edge, its name across a dark banner with the state and
 * the year it became a national park, a points medallion on the bottom edge,
 * and, on a table dressed in Pokémon, one visiting from the bottom-left
 * corner. The park the Wildlife
 * expansion's bison stands on also carries its token, drawn as Tauros.
 */

/** Who visits which kind of park, by the park's first tag. */
const VISITORS: Record<ParkTag, Pokemon[]> = {
  water: ['Squirtle', 'Psyduck', 'Poliwag', 'Marill', 'Piplup', 'Mudkip', 'Slowpoke'],
  coastal: ['Piplup', 'Squirtle', 'Slowpoke'],
  forest: ['Bulbasaur', 'Pikachu', 'Eevee', 'Togepi'],
  mountain: ['Clefairy', 'Diglett', 'Snorlax', 'Growlithe'],
  desert: ['Diglett', 'Vulpix', 'Meowth'],
  canyon: ['Diglett', 'Growlithe', 'Vulpix'],
  volcanic: ['Vulpix', 'Growlithe'],
  wildlife: ['Eevee', 'Pikachu', 'Meowth', 'Jigglypuff'],
};

const FALLBACK: Pokemon[] = ['Ditto', 'Mew', 'Jigglypuff'];

const TAUROS_HERE = 'Tauros is here: visiting this park offers a wildcard trade';

/**
 * The Pokémon visiting a park: one suited to its first tag, picked from the
 * park's id so the same park always has the same visitor and neighbouring
 * parks of one kind do not all get the same one.
 */
export function parkVisitor(park: Pick<ParkCard, 'id' | 'tags'>): Pokemon {
  const pool = VISITORS[park.tags[0]] ?? FALLBACK;
  let hash = 0;
  for (const ch of park.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

/** The poster art at the top of a park card. Its size comes from the card around it (`--poster-h`). */
export function ParkPoster({ park, badge, bison = false }: { park: ParkCard; badge?: string; bison?: boolean }) {
  const fact = parkFact(park.id);
  const visitor = usePokemonTheme() ? parkVisitor(park) : null;
  return (
    <div className="poster">
      <div className="poster__art">
        <IllustratedParkArt park={park} />
      </div>
      <div className="poster__banner">
        <span className="poster__name">{park.name}</span>
        <span className="poster__where">
          {park.state}
          {fact ? ` · Est. ${fact.year}` : ''}
        </span>
      </div>
      {bison ? (
        <span className="poster__tauros" role="img" aria-label={TAUROS_HERE} title={TAUROS_HERE}>
          <TaurosToken />
        </span>
      ) : null}
      {badge ? <span className="poster__badge">{badge}</span> : null}
      {visitor ? (
        <span className="poster__visitor" title={`${visitor} is visiting`}>
          <PokemonHead name={visitor} />
        </span>
      ) : null}
      <span className="poster__vp" aria-hidden="true">
        <b>{park.vp}</b>
        <small>VP</small>
      </span>
    </div>
  );
}
