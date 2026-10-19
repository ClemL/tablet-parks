import { bonusCardById } from '@/game/engine';
import type { GameState } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn } from './bits';

/** The final scores, best first, with every part of each total and the objectives behind it. */
export function Scoreboard({ state, seats, highlight }: { state: GameState; seats: PublicSeat[]; highlight?: number }) {
  const scores = state.finalScores ?? [];
  const best = scores[0]?.total;
  return (
    <table className="scores">
      <thead>
        <tr>
          <th scope="col">Hiker</th>
          <th scope="col">Parks</th>
          <th scope="col">Photos</th>
          <th scope="col">Objectives</th>
          <th scope="col">🥇</th>
          <th scope="col">Left over</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score) => {
          const player = state.players[score.player];
          return (
            <tr key={score.player} className={`${score.total === best ? 'is-winner' : ''}${highlight === score.player ? ' is-you' : ''}`}>
              <th scope="row">
                <Pawn seat={seats[score.player]} size="sm" /> {player.name}
                {score.total === best ? <span className="scores__crown"> · wins</span> : null}
              </th>
              <td>
                {score.parkVp}
                <span className="muted"> ({player.parks.length})</span>
              </td>
              <td>{score.photoVp}</td>
              <td>
                {score.bonusVp}
                <span className="scores__bonus">
                  {player.bonusCards.map((id) => {
                    const card = bonusCardById(id);
                    const vp = score.bonusBreakdown.find((b) => b.name === card?.name)?.vp ?? 0;
                    return card ? (
                      <span key={id}>
                        {card.name} {vp}
                      </span>
                    ) : null;
                  })}
                </span>
              </td>
              <td>{score.firstPlayerVp}</td>
              <td>{score.leftoverVp}</td>
              <td className="scores__total">{score.total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
