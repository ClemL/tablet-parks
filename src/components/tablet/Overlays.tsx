'use client';

import { useState } from 'react';
import { bonusCardById, seasonsIn } from '@/game/engine';
import type { FinalScore, GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { IllustratedParkArt, SceneSvg } from '@/art/illustrated';
import { SITE_SCENES } from '@/art/sites';
import { Pawn, seasonName, seatStyle } from '../bits';
import { Icon } from '../Icon';
import { Token, TokenBag } from '../Token';
import { seasonRecap } from './seasonRecap';

/**
 * Between seasons: night falls on the Trail End, everyone round the fire.
 * It says what carries into the next season and who leads it, and can turn
 * to how the season just walked went for each player before the next begins.
 */
export function SeasonBreak({
  state,
  seats,
  busy,
  automatic,
  onContinue,
}: {
  state: GameState;
  seats: PublicSeat[];
  busy: boolean;
  /** A table of computers turns its own seasons. */
  automatic: boolean;
  onContinue: () => void;
}) {
  const [recap, setRecap] = useState(false);
  const lead = state.firstPlayer;
  const now = seasonName(state.season);
  const next = seasonName(state.season + 1);
  return (
    <div className="season-night" role="dialog" aria-modal="true" aria-labelledby="season-title">
      <div className="season-night__art" aria-hidden="true">
        <SceneSvg scene={SITE_SCENES['trail-end']} label="The Trail End at dusk" className="season-night__svg" />
      </div>
      <div className="season-night__shade" aria-hidden="true" />
      <div className="season-night__camp" aria-hidden="true">
        {seats.map((seat) => (
          <Pawn key={seat.seat} seat={seat} size="xl" />
        ))}
      </div>

      <div className={`season-night__body${recap ? ' season-night__body--wide' : ''}`}>
        <p className="season-night__eyebrow">
          Season {state.season} of {seasonsIn(state)}
        </p>
        <h2 id="season-title">{recap ? `How ${now} went` : `${now} is over`}</h2>
        {recap ? (
          <SeasonRecapCards state={state} seats={seats} />
        ) : (
          <>
            <p className="season-night__lede">Every hiker is home for the night. Here is what {next} starts with.</p>
            <ul className="season-night__list">
              <li>
                <span className="season-night__icon">
                  <Token r="sun" size="sm" decorative />
                  <Token r="water" size="sm" decorative />
                  <Token r="forest" size="sm" decorative />
                  <Token r="mountain" size="sm" decorative />
                </span>
                <span>
                  <b>Packs stay packed.</b> Every resource carries over.
                </span>
              </li>
              <li>
                <span className="season-night__icon">
                  <Icon name="fire" size={26} />
                </span>
                <span>
                  <b>Campfires relight</b> and empty bottles refill.
                </span>
              </li>
              <li>
                <span className="season-night__icon">
                  <span className="season-night__mystery">?</span>
                </span>
                <span>
                  <b>The trail grows</b> by one advanced stop, shown when it is laid. {next}’s card turns over then too.
                </span>
              </li>
            </ul>
          </>
        )}
      </div>

      <footer className="season-night__foot">
        <p className="season-night__lead" style={seatStyle(seats[lead])}>
          <Pawn seat={seats[lead]} size="md" />
          <span>
            <b>{state.players[lead].name}</b> holds the first player token and leads {next}.
          </span>
        </p>
        <div className="season-night__actions">
          <button type="button" className="btn btn--ghost" aria-pressed={recap} onClick={() => setRecap((open) => !open)}>
            {recap ? 'What carries over' : `How ${now} went`}
          </button>
          {automatic ? (
            <p className="season-night__auto">The computers will carry on in a moment.</p>
          ) : (
            <button type="button" className="btn btn--primary btn--big" disabled={busy} onClick={onContinue} autoFocus>
              Begin {next}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/** One card per player for the season just walked: the parks they visited, what they collected, the photos they took. */
function SeasonRecapCards({ state, seats }: { state: GameState; seats: PublicSeat[] }) {
  const rows = seasonRecap(state.log, state.season, state.players.length);
  return (
    <ol className="season-recap" style={{ '--count': rows.length } as React.CSSProperties}>
      {rows.map((row) => {
        const seat = seats[row.player];
        const gained = Object.keys(row.collected).length > 0;
        return (
          <li key={row.player} className="season-recap__card" style={seatStyle(seat)}>
            <p className="season-recap__who">
              <Pawn seat={seat} size="md" />
              <b>{state.players[row.player].name}</b>
            </p>
            <p className="season-recap__label">Visited</p>
            {row.visited.length ? (
              <span className="season-recap__parks">
                {row.visited.map((park) => (
                  <span key={park.id} className="season-recap__park" title={park.name}>
                    <IllustratedParkArt park={park} />
                  </span>
                ))}
              </span>
            ) : (
              <span className="season-recap__none">No park this season</span>
            )}
            <p className="season-recap__label">Collected</p>
            {gained ? <TokenBag bag={row.collected} sign size="sm" /> : <span className="season-recap__none">Nothing this season</span>}
            <p className="season-recap__foot">
              {row.photos === 0 ? 'No photos' : row.photos === 1 ? '1 photo' : `${row.photos} photos`}
              {row.visited.length ? ` · ${row.visited.reduce((sum, park) => sum + park.vp, 0)} park points` : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

const ORDINALS = ['Winner', '2nd', '3rd', '4th', '5th'];

/**
 * The end of the game: everyone's points as hikers along a trail, the winner
 * furthest along, and under it each player's journal opened as a scorecard —
 * their parks, photos, objectives and the rest, adding up to the total.
 */
export function FinalScores({ state, seats, onNewGame }: { state: GameState; seats: PublicSeat[]; onNewGame: () => void }) {
  const scores = state.finalScores ?? [];
  const [first, second] = scores;
  const name = (score: FinalScore) => state.players[score.player].name;
  const gap = first && second ? first.total - second.total : null;
  const margin =
    gap === null
      ? null
      : gap === 0
        ? `Level with ${name(second)} on points, and ahead on the tiebreak.`
        : `${gap === 1 ? 'One point' : `${gap} points`} ahead of ${name(second)}.`;
  return (
    <div className="final" role="dialog" aria-modal="true" aria-labelledby="final-title">
      <div className="final__inner">
        <p className="final__eyebrow">{seasonsIn(state) === 2 ? 'Two seasons walked' : 'Four seasons walked'} · every journal open</p>
        <h2 id="final-title">{first ? `${name(first)} wins with ${first.total}` : 'Final scores'}</h2>
        {margin ? <p className="final__margin">{margin}</p> : null}
        <ScoreTrail state={state} seats={seats} scores={scores} />
        <ol className="final__cards" style={{ '--count': scores.length } as React.CSSProperties}>
          {scores.map((score, rank) => (
            <Scorecard key={score.player} state={state} seats={seats} score={score} rank={rank} />
          ))}
        </ol>
        <button type="button" className="btn btn--primary btn--big final__new" onClick={onNewGame} autoFocus>
          New game
        </button>
      </div>
    </div>
  );
}

/**
 * The totals as a trail: each player's pawn stands at their score along a
 * marked track. Pawns too close to share a spot step up a row.
 */
function ScoreTrail({ state, seats, scores }: { state: GameState; seats: PublicSeat[]; scores: FinalScore[] }) {
  const best = scores[0]?.total ?? 0;
  const top = Math.max(30, Math.ceil((best + 2) / 5) * 5);
  const placed: { score: FinalScore; at: number; row: number }[] = [];
  for (const score of [...scores].sort((a, b) => a.total - b.total)) {
    const at = (score.total / top) * 100;
    let row = 0;
    while (placed.some((p) => p.row === row && Math.abs(p.at - at) < 6)) row += 1;
    placed.push({ score, at, row });
  }
  const rows = Math.max(0, ...placed.map((p) => p.row)) + 1;
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5);
  return (
    <div
      className="score-trail"
      role="img"
      aria-label={`The scores along a trail: ${scores.map((s) => `${state.players[s.player].name} ${s.total}`).join(', ')}`}
      style={{ height: 98 + rows * 62 }}
    >
      <div className="score-trail__bed" />
      {ticks.map((v) => (
        <span key={v} className="score-trail__tick" style={{ left: `${(v / top) * 100}%` }}>
          {v}
        </span>
      ))}
      {placed.map(({ score, at, row }) => (
        <span
          key={score.player}
          className={`score-trail__hiker${score === scores[0] ? ' is-winner' : ''}`}
          style={{ left: `${at}%`, '--row': row, ...seatStyle(seats[score.player]) } as React.CSSProperties}
        >
          <span className="score-trail__total">{score.total}</span>
          <Pawn seat={seats[score.player]} size="lg" />
          <i className="score-trail__stem" />
        </span>
      ))}
    </div>
  );
}

/** One player's journal at the end: the total and every part of it, parks shown as the parks themselves. */
function Scorecard({ state, seats, score, rank }: { state: GameState; seats: PublicSeat[]; score: FinalScore; rank: number }) {
  const player = state.players[score.player];
  const seat = seats[score.player];
  const objectives = player.bonusCards
    .map((id) => {
      const card = bonusCardById(id);
      if (!card) return null;
      return `${card.name} ${score.bonusBreakdown.find((b) => b.name === card.name)?.vp ?? 0}`;
    })
    .filter((line): line is string => line !== null);
  const shown = player.parks.slice(0, 6);
  return (
    <li className={`scorecard${rank === 0 ? ' scorecard--winner' : ''}`} style={{ ...seatStyle(seat), '--rank': rank } as React.CSSProperties}>
      <header className="scorecard__head">
        <Pawn seat={seat} size="lg" />
        <span>
          <b className="scorecard__name">{player.name}</b>
          <span className="scorecard__rank">
            {ORDINALS[rank] ?? `${rank + 1}th`}
            {seat?.kind === 'cpu' ? ' · computer' : ''}
          </span>
        </span>
      </header>
      <p className="scorecard__total">
        <b>{score.total}</b> points
      </p>
      <div className="scorecard__row">
        <span>Parks · {player.parks.length}</span>
        <b>{score.parkVp}</b>
      </div>
      {shown.length ? (
        <span className="scorecard__parks">
          {shown.map((park) => (
            <span key={park.id} className="scorecard__park" title={park.name}>
              <IllustratedParkArt park={park} />
            </span>
          ))}
          {player.parks.length > shown.length ? <span className="scorecard__more">+{player.parks.length - shown.length}</span> : null}
        </span>
      ) : null}
      <div className="scorecard__row">
        <span>Photos · {player.photos}</span>
        <b>{score.photoVp}</b>
      </div>
      <div className="scorecard__row">
        <span>Objectives</span>
        <b>{score.bonusVp}</b>
      </div>
      {objectives.length ? <p className="scorecard__note">{objectives.join(' · ')}</p> : null}
      {score.firstPlayerVp ? (
        <div className="scorecard__row">
          <span>First player</span>
          <b>{score.firstPlayerVp}</b>
        </div>
      ) : null}
      {score.leftoverVp ? (
        <div className="scorecard__row scorecard__row--dim">
          <span>Left over</span>
          <b>{score.leftoverVp}</b>
        </div>
      ) : null}
    </li>
  );
}
