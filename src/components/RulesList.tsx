import { campsiteDef, gearCost, siteDef } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import type { GameState } from '@/game/types';

/**
 * The rules on a phone: how a turn goes, then everything on this season's
 * board — the season card, each site in trail order, the campsites and the
 * gear. Each player reads them in their own hand, so the tablet's board stays
 * clear.
 */
export function RulesList({ state }: { state: GameState }) {
  const seen = new Set<string>();
  const sites = state.trail.filter((kind) => !seen.has(kind) && seen.add(kind));
  return (
    <div className="rules-list">
      <section>
        <h3>How a turn goes</h3>
        <ul className="rules-list__how">
          <li>Walk one of your hikers forward to any stop ahead, and take what that stop gives.</li>
          <li>A stop holds one hiker. Sharing one spends your campfire, which lights again at the Trail End.</li>
          <li>
            At the Trail End, do one thing: visit a park, reserve one, or buy gear. A wildcard pays for any one resource
            {state.expansions.nightfall ? ', or two' : ''}.
          </li>
          <li>Hold no more than {TOKEN_LIMIT} tokens at the end of a turn.</li>
          <li>A season ends once every hiker reaches the Trail End. After four seasons, the most points win: parks, photos and your secret objectives.</li>
        </ul>
      </section>
      {state.seasonCard ? (
        <section>
          <h3>This season: {state.seasonCard.name}</h3>
          <p>{state.seasonCard.text}</p>
        </section>
      ) : null}
      <section>
        <h3>The trail</h3>
        <dl>
          {sites.map((kind) => (
            <div key={kind}>
              <dt>{siteDef(kind).name}</dt>
              <dd>{siteDef(kind).text}</dd>
            </div>
          ))}
        </dl>
      </section>
      {state.campsites.length > 0 ? (
        <section>
          <h3>Campsites</h3>
          <dl>
            {state.campsites.map((camp) => (
              <div key={camp.id}>
                <dt>{campsiteDef(camp.id).name}</dt>
                <dd>{campsiteDef(camp.id).text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <section>
        <h3>REI</h3>
        <dl>
          {state.gearRow.map((card) => (
            <div key={card.id}>
              <dt>
                {card.name} · {gearCost(state, card)} sun
              </dt>
              <dd>{card.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
