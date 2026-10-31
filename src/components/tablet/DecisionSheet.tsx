'use client';

import { useEffect, useRef } from 'react';
import { defaultDiscard, defaultPhotoPayment, previewAction, tokensOverLimit, validPhotoPayment } from '@/game/engine';
import type { GameAction, GameState } from '@/game/types';
import { RESOURCES } from '@/game/types';
import type { Edge, PublicSeat } from '@/room/room';
import { Pawn, bagSize, tokensText } from '../bits';
import { Icon } from '../Icon';
import { TokenPicker } from '../TokenPicker';
import { Outcome, decisionChoices, decisionText } from '../decisions';

/** The decisions a stop opens that are not about buying parks or gear (those are on the board). */
export function needsSheet(state: GameState): boolean {
  const kind = state.pending?.kind;
  return Boolean(kind && kind !== 'trail-end' && kind !== 'park-or-gear');
}

/**
 * A person's decision, answered on the tablet. The sheet turns to face the
 * edge where that person sits, says under each answer what it would do to
 * their sheet, and only shows their tokens when the choice is about which
 * tokens to give up.
 */
export function DecisionSheet({
  state,
  seat,
  edge,
  busy,
  onAction,
  undo,
}: {
  state: GameState;
  seat: PublicSeat;
  edge: Edge;
  busy: boolean;
  onAction: (action: GameAction) => void;
  /** Taking back the tap that opened this decision, while that is still allowed. */
  undo?: { label: string; seconds: number; onUndo: () => void } | null;
}) {
  const pending = state.pending!;
  const player = state.players[pending.player];
  const panel = useRef<HTMLDivElement>(null);
  const pickerKey = `${pending.kind}:${pending.stage ?? ''}:${state.log.length}:${RESOURCES.map((r) => player.resources[r] ?? 0).join(',')}`;

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('.choices button:not([disabled])')?.focus();
  }, [pickerKey]);

  const { title, note } = decisionText(state);
  const choices = decisionChoices(state);

  const photoPicker = (type: 'camera-photo' | 'season-photo', decline: string) => (
    <TokenPicker
      key={pickerKey}
      held={player.resources}
      initial={defaultPhotoPayment(state, player.index) ?? {}}
      valid={(pay) => validPhotoPayment(state, player.index, pay)}
      confirmLabel={(pay) => `Take the photo for ${tokensText(pay)}`}
      onConfirm={(pay) => onAction({ type, take: true, pay })}
      busy={busy}
    >
      <button type="button" className="choice" disabled={busy} onClick={() => onAction({ type, take: false })}>
        <span className="choice__icon" aria-hidden="true">
          <Icon name="boot" size={26} />
        </span>
        {decline}
      </button>
    </TokenPicker>
  );

  let body: React.ReactNode;
  if (choices) {
    body = (
      <div className="choices">
        {choices.map((choice) => (
          <button key={choice.key} type="button" className="choice" disabled={busy} onClick={() => onAction(choice.action)}>
            <span className="choice__icon" aria-hidden="true">
              {choice.icon}
            </span>
            <span className="choice__label">{choice.label}</span>
            {choice.sub ? <span className="choice__sub">{choice.sub}</span> : null}
            <Outcome preview={previewAction(state, choice.action)} action={choice.action} />
          </button>
        ))}
      </div>
    );
  } else if (pending.kind === 'discard') {
    const over = tokensOverLimit(state, player.index);
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
    body = photoPicker('season-photo', 'Put the camera away');
  } else {
    body = photoPicker('camera-photo', 'Keep walking');
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
          {undo ? (
            <button type="button" className="btn btn--ghost btn--sm undo-btn" disabled={busy} onClick={undo.onUndo} aria-label={`Take back: ${undo.label}`}>
              <Icon name="undo" size={16} />
              Undo · {undo.seconds}
            </button>
          ) : null}
        </header>
        {note ? <p className="sheet__note">{note}</p> : null}
        {body}
      </div>
    </div>
  );
}
