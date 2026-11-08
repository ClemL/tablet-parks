'use client';

import { claimableParks, legalMoves, pendingLabel, previewAction, previewMove, siteDef, type MovePreview } from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import type { ReactNode } from 'react';
import type { DecisionKind, GameState, Hiker } from '@/game/types';
import type { PublicSeat } from '@/room/room';
import { Pawn, hikerName } from '../bits';
import { Icon } from '../Icon';
import { TokenBag } from '../Token';
import { Outcome as ChoiceOutcome, decisionChoices, decisionText } from '../decisions';
import { useGearName } from '../gearTheme';

/** What a stop asks of the player next, for sites whose worth is a choice rather than a payout. */
const DECISION: Partial<Record<DecisionKind, string>> = {
  camera: 'Take the camera, or a bottle',
  'wild-swap': 'Swap 1 for a wildcard',
  'token-swap': 'Swap a token, up to twice',
  'park-or-gear': 'Visit or reserve a park',
  'copy-site': 'Copy a site for 1 water',
  bison: 'Trade with Tauros',
};

/**
 * On your turn, your phone works out what each move would hand you — from your
 * own sheet, which only this phone may read — so you can choose before you
 * reach for the tablet. It only reads: the move is still made on the tablet.
 */
export function TurnPreview({
  state,
  seat,
  hikers: names,
  seats,
  fallback = null,
}: {
  state: GameState;
  seat: number;
  /** What this seat calls its two hikers, in the order of the player's hikers. */
  hikers: readonly string[];
  /** Everyone at the table, to show who already stands where a campfire would share. */
  seats: readonly PublicSeat[];
  /** Shown when there is nothing of this player's to preview. */
  fallback?: ReactNode;
}) {
  const me = state.players[seat];
  const gearName = useGearName();
  if (state.current !== seat || state.phase !== 'playing') return <>{fallback}</>;

  if (state.pending) {
    if (state.pending.player !== seat) return <>{fallback}</>;
    const shopping = state.pending.kind === 'trail-end' || state.pending.kind === 'park-or-gear';
    const parks = shopping ? claimableParks(state, seat) : [];
    const choices = shopping ? null : decisionChoices(state, gearName);
    return (
      <section className="preview" aria-labelledby="preview-title">
        <h2 id="preview-title" className="preview__title">
          {shopping ? `At the ${pendingLabel(state)}: choose in Parks or on the tablet` : `Decide on the tablet: ${decisionText(state).title}`}
        </h2>
        {shopping ? (
          <p className="preview__note">
            {parks.length > 0 ? `Your pack covers ${listOr(parks.map((p) => `${p.name} (${p.vp} VP)`))}.` : 'Your pack covers none of the parks on offer: reserve one, or pass.'}
          </p>
        ) : choices ? (
          <ul className="preview__list">
            {choices.map((choice) => (
              <li key={choice.key} className="reach">
                <span className="reach__name">{choice.label}</span>
                <span className="reach__what">
                  <ChoiceOutcome preview={previewAction(state, choice.action)} action={choice.action} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="preview__note">Pick the tokens on the sheet turned toward you.</p>
        )}
      </section>
    );
  }

  const moves = legalMoves(state);
  const movable = me.hikers.filter((h) => !h.finished && moves.some((m) => m.hikerId === h.id)).sort((a, b) => a.position - b.position);
  // Two hikers on one site can reach the same places: list them once.
  const hikers = movable.filter((h, i) => movable.findIndex((o) => o.position === h.position) === i);
  if (hikers.length === 0) return <>{fallback}</>;
  const nameOf = (hiker: Hiker) => names[me.hikers.findIndex((h) => h.id === hiker.id)] ?? 'Hiker';

  return (
    <section className="preview" aria-labelledby="preview-title">
      <h2 id="preview-title" className="preview__title">
        Where your hikers can go
      </h2>
      {hikers.map((hiker, i) => (
        <HikerOptions
          key={hiker.id}
          state={state}
          seat={seat}
          hiker={hiker}
          name={movable.length > hikers.length ? movable.map(nameOf).join(' and ') : nameOf(hiker)}
          rear={i === 0 && hikers.length > 1}
          seats={seats}
        />
      ))}
    </section>
  );
}

/**
 * One hiker's reachable stops, nearest first. A stop someone already holds
 * shows who is there; one that needs the campfire to share says so with a
 * flame — listed only while the campfire is lit, since only then can the
 * hiker go there.
 */
function HikerOptions({
  state,
  seat,
  hiker,
  name,
  rear,
  seats,
}: {
  state: GameState;
  seat: number;
  hiker: Hiker;
  name: string;
  rear: boolean;
  seats: readonly PublicSeat[];
}) {
  const moves = legalMoves(state)
    .filter((m) => m.hikerId === hiker.id)
    .sort((a, b) => a.to - b.to);
  const end = state.trail.length - 1;
  const from = siteDef(state.trail[hiker.position]).name;
  const parks = claimableParks(state, seat);
  return (
    <div className="preview__group">
      <h3 className="preview__from">
        {name}
        {rear ? <span className="muted"> (rear)</span> : null} at the {from}
      </h3>
      <ul className="preview__list">
        {moves.map((move) => {
          const preview = previewMove(state, move);
          if (!preview) return null;
          const kind = state.trail[move.to];
          // The Trail End holds everyone; anywhere else, whoever stands there is in the way.
          const there =
            move.to === end
              ? []
              : state.players.flatMap((p) => p.hikers.filter((h) => !h.finished && h.position === move.to && h.id !== hiker.id));
          return (
            <li key={`${move.to}${move.useCampfire ? 'f' : ''}`} className={`reach${move.useCampfire ? ' reach--fire' : ''}`}>
              <span className="reach__name">
                {siteDef(kind).name}
                {there.length > 0 ? (
                  <span className="reach__who" aria-label={`Taken by ${there.map((h) => seats[h.owner]?.name ?? 'a hiker').join(', ')}`}>
                    {there.map((h) =>
                      seats[h.owner] ? (
                        <Pawn key={h.id} seat={seats[h.owner]} size="xs" hiker={hikerName(seats[h.owner], state.players[h.owner].hikers, h.id)} />
                      ) : null,
                    )}
                  </span>
                ) : null}
                {move.useCampfire ? (
                  <span className="reach__fire" title="Spends your campfire to share">
                    <Icon name="fire" size={15} />
                  </span>
                ) : null}
              </span>
              <span className="reach__what">
                {kind === 'trail-end' ? (
                  parks.length > 0 ? (
                    `Visit ${listOr(parks.map((p) => p.name))}, or buy gear`
                  ) : (
                    'Reserve a park or buy gear'
                  )
                ) : (
                  <Outcome preview={preview} />
                )}
              </span>
              {move.useCampfire ? <span className="reach__note reach__note--fire">Spends your campfire to share the stop</span> : null}
              {preview.over > 0 ? (
                <span className="reach__warn">
                  <Icon name="warn" size={14} />
                  {preview.tokens} of {TOKEN_LIMIT}: you would hand {preview.over} back
                </span>
              ) : preview.tent ? (
                <span className="reach__note">or pitch a tent instead</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Outcome({ preview }: { preview: MovePreview }) {
  const gained = Object.values(preview.gain).some((n) => n !== 0);
  const decision = preview.decision ? DECISION[preview.decision] : null;
  if (!gained && !decision) return <>Nothing to collect</>;
  return (
    <>
      {gained ? <TokenBag bag={preview.gain} sign size="xs" /> : null}
      {gained && decision ? ' · ' : null}
      {decision}
    </>
  );
}

function listOr(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}
