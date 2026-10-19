'use client';

import { useEffect, useRef } from 'react';
import {
  canAffordPhoto,
  copyableSites,
  defaultDiscard,
  defaultPhotoPayment,
  photoCost,
  siteDef,
  tokenCount,
  tokensOverLimit,
  usableCampsites,
  validPhotoPayment,
} from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import type { GameAction, GameState, Resource } from '@/game/types';
import { COST_RESOURCES, RESOURCES } from '@/game/types';
import type { Edge, PublicSeat } from '@/room/room';
import { Pawn, RESOURCE_ICON, RESOURCE_LABEL, bagSize, tokensText } from '../bits';
import { TokenPicker } from '../TokenPicker';

/** The decisions a stop opens that are not about buying parks or gear (those are on the board). */
export function needsSheet(state: GameState): boolean {
  const kind = state.pending?.kind;
  return Boolean(kind && kind !== 'trail-end' && kind !== 'park-or-gear');
}

/**
 * A person's decision, answered on the tablet. The sheet turns to face the
 * edge where that person sits, and only shows their tokens when the choice is
 * about which tokens to give up.
 */
export function DecisionSheet({
  state,
  seat,
  edge,
  busy,
  onAction,
}: {
  state: GameState;
  seat: PublicSeat;
  edge: Edge;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const pending = state.pending!;
  const player = state.players[pending.player];
  const panel = useRef<HTMLDivElement>(null);
  const cost = photoCost(state, player.index);
  const pickerKey = `${pending.kind}:${pending.stage ?? ''}:${state.log.length}:${RESOURCES.map((r) => player.resources[r] ?? 0).join(',')}`;

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, [pickerKey]);

  const photoTerms = `A photo costs ${cost} token${cost === 1 ? '' : 's'} of any kind${
    state.expansions.nightfall ? ' (a wildcard covers two)' : ''
  } and scores 1 VP, or 2 with the Photo Album.`;

  const photoPicker = (type: 'camera-photo' | 'season-photo', decline: string) => (
    <TokenPicker
      key={pickerKey}
      held={player.resources}
      initial={defaultPhotoPayment(state, player.index) ?? {}}
      valid={(pay) => validPhotoPayment(state, player.index, pay)}
      confirmLabel={(pay) => `📸 Take the photo for ${tokensText(pay)}`}
      onConfirm={(pay) => onAction({ type, take: true, pay })}
      busy={busy}
    >
      <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type, take: false })}>
        <span className="choice__icon" aria-hidden="true">
          🚶
        </span>
        {decline}
      </button>
    </TokenPicker>
  );

  let title = '';
  let note: React.ReactNode = null;
  let body: React.ReactNode = null;
  const held = COST_RESOURCES.filter((r) => (player.resources[r] ?? 0) > 0);

  if (pending.kind === 'discard') {
    const over = tokensOverLimit(state, player.index);
    title = `Over the ${TOKEN_LIMIT}-token limit`;
    note = `Holding ${tokenCount(player)} tokens; a turn may end with ${TOKEN_LIMIT}. Choose ${over} to hand back.`;
    body = (
      <TokenPicker
        key={pickerKey}
        held={player.resources}
        initial={defaultDiscard(state, player.index)}
        valid={(pick) => bagSize(pick) === over}
        confirmLabel={(pick) => (bagSize(pick) === over ? `Hand back ${tokensText(pick)}` : `Pick ${over} (${bagSize(pick)} chosen)`)}
        onConfirm={(pick) => onAction({ type: 'discard', resources: pick })}
        busy={busy}
      />
    );
  } else if (pending.kind === 'season-photo') {
    title = 'The season is over';
    note = `Holding the camera, so one last photo before the season closes. ${photoTerms}`;
    body = photoPicker('season-photo', 'Put the camera away');
  } else if (pending.stage === 'take-photo') {
    title = 'Camera in hand';
    note = `${photoTerms} Hold the camera to the season’s end for one more.`;
    body = photoPicker('camera-photo', 'Keep walking');
  } else if (pending.kind === 'camera') {
    const holder = state.cameraHolder;
    title = 'Camera Point';
    note = `${
      holder === null
        ? 'The camera is sitting here.'
        : holder === player.index
          ? 'Already holding the camera.'
          : `${state.players[holder].name} has the camera — take it from them?`
    } With the camera a photo costs 1 token, and you may take one more when the season ends.`;
    body = (
      <div className="choices">
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'camera', option: 'take-camera' })}>
          <span className="choice__icon" aria-hidden="true">
            📷
          </span>
          Take the camera
          <span className="choice__sub">{canAffordPhoto(state, player.index) ? 'then shoot for 1 token if you like' : 'no tokens for a photo yet'}</span>
        </button>
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'camera', option: 'take-bottle' })}>
          <span className="choice__icon" aria-hidden="true">
            🧴
          </span>
          Leave it, take a bottle
          <span className="choice__sub">one more water conversion each season</span>
        </button>
      </div>
    );
  } else if (pending.kind === 'tent') {
    const site = siteDef(state.trail[pending.siteIndex]);
    title = 'Pitch a tent?';
    note = 'This site carries a tent. Take its own action, or camp instead — camping skips the site’s action and its season token.';
    body = (
      <div className="choices">
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'tent', option: 'site' })}>
          <span className="choice__icon" aria-hidden="true">
            {site.icon}
          </span>
          {site.name}
          <span className="choice__sub">{site.text}</span>
        </button>
        {usableCampsites(state, player.index).map((camp) => (
          <button key={camp.id} type="button" className="choice choice--camp" disabled={busy} onClick={() => onAction({ type: 'tent', option: 'camp', campsiteId: camp.id })}>
            <span className="choice__icon" aria-hidden="true">
              {camp.icon}
            </span>
            {camp.name}
            <span className="choice__sub">{camp.text}</span>
          </button>
        ))}
      </div>
    );
  } else if (pending.kind === 'bison') {
    title = 'The bison is here';
    note = 'Trade one resource for a wildcard 🐾, then the bison moves on to the next park.';
    body = (
      <div className="choices">
        {held.map((r: Resource) => (
          <button key={r} type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'bison', give: r })}>
            <span className="choice__icon" aria-hidden="true">
              {RESOURCE_ICON[r]}
            </span>
            Trade 1 {RESOURCE_LABEL[r]}
          </button>
        ))}
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'bison' })}>
          <span className="choice__icon" aria-hidden="true">
            🦬
          </span>
          Just watch it go
        </button>
      </div>
    );
  } else if (pending.kind === 'wild-swap') {
    title = 'Wildlife Hide';
    note = 'Hand over one resource for a wildcard 🐾, which pays for any resource.';
    body = (
      <div className="choices">
        {held.map((r: Resource) => (
          <button key={r} type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'swap-give', resource: r })}>
            <span className="choice__icon" aria-hidden="true">
              {RESOURCE_ICON[r]}
            </span>
            Trade 1 {RESOURCE_LABEL[r]}
            <span className="choice__sub">holding {player.resources[r]}</span>
          </button>
        ))}
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'swap-done' })}>
          <span className="choice__icon" aria-hidden="true">
            🚶
          </span>
          Trade nothing
        </button>
      </div>
    );
  } else if (pending.kind === 'token-swap') {
    const left = pending.swapsLeft ?? 1;
    const giving = pending.stage === 'get';
    title = `Trading Post — ${left} trade${left === 1 ? '' : 's'} left`;
    note = giving
      ? `Handed over 1 ${RESOURCE_LABEL[pending.give!]}. Take any other resource for it.`
      : 'Trade one resource for a different one, up to twice.';
    body = (
      <div className="choices">
        {giving
          ? COST_RESOURCES.filter((r) => r !== pending.give).map((r: Resource) => (
              <button key={r} type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'swap-get', resource: r })}>
                <span className="choice__icon" aria-hidden="true">
                  {RESOURCE_ICON[r]}
                </span>
                Take 1 {RESOURCE_LABEL[r]}
              </button>
            ))
          : held.map((r: Resource) => (
              <button key={r} type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'swap-give', resource: r })}>
                <span className="choice__icon" aria-hidden="true">
                  {RESOURCE_ICON[r]}
                </span>
                Give 1 {RESOURCE_LABEL[r]}
                <span className="choice__sub">holding {player.resources[r]}</span>
              </button>
            ))}
        {!giving ? (
          <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'swap-done' })}>
            <span className="choice__icon" aria-hidden="true">
              ✔️
            </span>
            Done trading
          </button>
        ) : null}
      </div>
    );
  } else if (pending.kind === 'copy-site') {
    title = 'Overlook';
    note = 'Pay 1 water to copy the action of any site holding a hiker. The copy does not take that site’s season token.';
    body = (
      <div className="choices">
        {copyableSites(state, player.index).map((index) => {
          const def = siteDef(state.trail[index]);
          const who = state.players.filter((p) => p.hikers.some((h) => !h.finished && h.position === index));
          return (
            <button key={index} type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'copy-site', siteIndex: index })}>
              <span className="choice__icon" aria-hidden="true">
                {def.icon}
              </span>
              {def.name}
              <span className="choice__sub">{who.map((p) => p.name).join(', ')}</span>
            </button>
          );
        })}
        <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type: 'copy-skip' })}>
          <span className="choice__icon" aria-hidden="true">
            🚶
          </span>
          Keep the water
        </button>
      </div>
    );
  }

  return (
    <div className="scrim" role="presentation">
      <div className={`sheet sheet--${edge}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={panel}>
        <header className="sheet__head">
          <Pawn seat={seat} size="md" />
          <div>
            <p className="eyebrow">{seat.name} decides</p>
            <h2 id="sheet-title">{title}</h2>
          </div>
        </header>
        {note ? <p className="sheet__note">{note}</p> : null}
        {body}
      </div>
    </div>
  );
}
