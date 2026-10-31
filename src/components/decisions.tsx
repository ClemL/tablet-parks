import {
  canAffordPhoto,
  copyableSites,
  photoCost,
  siteDef,
  tokenCount,
  tokensOverLimit,
  usableCampsites,
  type ActionPreview,
} from '@/game/engine';
import { TOKEN_LIMIT } from '@/game/data/sites';
import type { DecisionKind, GameAction, GameState } from '@/game/types';
import { COST_RESOURCES } from '@/game/types';
import { SiteArt } from '@/art/siteArt';
import { RESOURCE_LABEL } from './bits';
import { Icon } from './Icon';
import { Token, TokenBag } from './Token';

/*
 * A pending decision, described once for both screens that show it: the
 * tablet, where it is answered, and the deciding player's phone, which shows
 * the same choices and what each would do, read-only.
 */

export interface Choice {
  key: string;
  label: string;
  sub?: string;
  /** Drawn: a token, an icon or the site's picture. */
  icon: React.ReactNode;
  action: GameAction;
}

/** The heading and the one-line explanation for the decision now pending. */
export function decisionText(state: GameState): { title: string; note: string } {
  const pending = state.pending!;
  const player = state.players[pending.player];
  const cost = photoCost(state, player.index);
  const photoTerms = `A photo costs ${cost} token${cost === 1 ? '' : 's'} of any kind${
    state.expansions.nightfall ? ' (a wildcard covers two)' : ''
  } and scores 1 VP, or 2 with the Photo Album.`;

  switch (pending.kind) {
    case 'discard':
      return {
        title: `Over the ${TOKEN_LIMIT}-token limit`,
        note: `Holding ${tokenCount(player)} tokens; a turn may end with ${TOKEN_LIMIT}. Choose ${tokensOverLimit(state, player.index)} to hand back.`,
      };
    case 'season-photo':
      return { title: 'The season is over', note: `Holding the camera, so one last photo before the season closes. ${photoTerms}` };
    case 'camera': {
      if (pending.stage === 'take-photo') return { title: 'Camera in hand', note: `${photoTerms} Hold the camera to the season’s end for one more.` };
      const holder = state.cameraHolder;
      const where =
        holder === null ? 'The camera is sitting here.' : holder === player.index ? 'Already holding the camera.' : `${state.players[holder].name} has the camera — take it from them?`;
      return { title: 'Camera Point', note: `${where} With the camera a photo costs 1 token, and you may take one more when the season ends.` };
    }
    case 'tent':
      return { title: 'Pitch a tent?', note: 'This site carries a tent. Take its own action, or camp instead — camping skips the site’s action and its season token.' };
    case 'bison':
      return { title: 'The bison is here', note: 'Trade one resource for a wildcard, then the bison moves on to the next park.' };
    case 'wild-swap':
      return { title: 'Wildlife Hide', note: 'Hand over one resource for a wildcard, which pays for any resource.' };
    case 'token-swap': {
      const left = pending.swapsLeft ?? 1;
      return {
        title: `Trading Post — ${left} trade${left === 1 ? '' : 's'} left`,
        note: pending.stage === 'get' ? `Handed over 1 ${RESOURCE_LABEL[pending.give!]}. Take any other resource for it.` : 'Trade one resource for a different one, up to twice.',
      };
    }
    case 'copy-site':
      return { title: 'Overlook', note: 'Pay 1 water to copy the action of any site holding a hiker. The copy does not take that site’s season token.' };
    default:
      return { title: siteDef(state.trail[pending.siteIndex]).name, note: '' };
  }
}

/**
 * The answers to the pending decision when it is a plain choice. Null when it
 * asks which tokens to pay or hand back instead (a photo, the token limit), or
 * when it is a park decision, which the board's shop answers.
 */
export function decisionChoices(state: GameState): Choice[] | null {
  const pending = state.pending;
  if (!pending) return null;
  const player = state.players[pending.player];
  const held = COST_RESOURCES.filter((r) => (player.resources[r] ?? 0) > 0);
  const walkOn = <Icon name="boot" size={26} />;

  switch (pending.kind) {
    case 'camera':
      if (pending.stage === 'take-photo') return null;
      return [
        {
          key: 'camera',
          label: 'Take the camera',
          sub: canAffordPhoto(state, player.index) ? 'then shoot for 1 token if you like' : 'no tokens for a photo yet',
          icon: <Icon name="camera" size={26} />,
          action: { type: 'camera', option: 'take-camera' },
        },
        { key: 'bottle', label: 'Leave it, take a bottle', sub: 'one more water conversion each season', icon: <Icon name="flask" size={26} />, action: { type: 'camera', option: 'take-bottle' } },
      ];
    case 'tent': {
      const site = state.trail[pending.siteIndex];
      return [
        { key: 'site', label: siteDef(site).name, sub: siteDef(site).text, icon: <SiteArt id={site} className="choice__art" />, action: { type: 'tent', option: 'site' } },
        ...usableCampsites(state, player.index).map((camp) => ({
          key: camp.id,
          label: camp.name,
          sub: camp.text,
          icon: <SiteArt id={camp.id} className="choice__art" />,
          action: { type: 'tent', option: 'camp', campsiteId: camp.id } as GameAction,
        })),
      ];
    }
    case 'bison':
      return [
        ...held.map((r) => ({ key: r, label: `Trade 1 ${RESOURCE_LABEL[r]}`, icon: <Token r={r} size="lg" decorative />, action: { type: 'bison', give: r } as GameAction })),
        { key: 'watch', label: 'Just watch it go', icon: walkOn, action: { type: 'bison' } },
      ];
    case 'wild-swap':
      return [
        ...held.map((r) => ({
          key: r,
          label: `Trade 1 ${RESOURCE_LABEL[r]}`,
          sub: `holding ${player.resources[r]}`,
          icon: <Token r={r} size="lg" decorative />,
          action: { type: 'swap-give', resource: r } as GameAction,
        })),
        { key: 'none', label: 'Trade nothing', icon: walkOn, action: { type: 'swap-done' } },
      ];
    case 'token-swap':
      if (pending.stage === 'get') {
        return COST_RESOURCES.filter((r) => r !== pending.give).map((r) => ({
          key: r,
          label: `Take 1 ${RESOURCE_LABEL[r]}`,
          icon: <Token r={r} size="lg" decorative />,
          action: { type: 'swap-get', resource: r } as GameAction,
        }));
      }
      return [
        ...held.map((r) => ({
          key: r,
          label: `Give 1 ${RESOURCE_LABEL[r]}`,
          sub: `holding ${player.resources[r]}`,
          icon: <Token r={r} size="lg" decorative />,
          action: { type: 'swap-give', resource: r } as GameAction,
        })),
        { key: 'done', label: 'Done trading', icon: <Icon name="check" size={26} />, action: { type: 'swap-done' } },
      ];
    case 'copy-site':
      return [
        ...copyableSites(state, player.index).map((index) => {
          const who = state.players.filter((p) => p.hikers.some((h) => !h.finished && h.position === index));
          return {
            key: String(index),
            label: siteDef(state.trail[index]).name,
            sub: who.map((p) => p.name).join(', '),
            icon: <SiteArt id={state.trail[index]} className="choice__art" />,
            action: { type: 'copy-site', siteIndex: index } as GameAction,
          };
        }),
        { key: 'skip', label: 'Keep the water', icon: walkOn, action: { type: 'copy-skip' } },
      ];
    default:
      return null;
  }
}

/** What a decision still asks after this answer, in a few words. */
const THEN: Partial<Record<DecisionKind, string>> = {
  camera: 'then a photo, if you like',
  'trail-end': 'then the Trail End',
  'park-or-gear': 'then the Ranger Station',
  'wild-swap': 'then a trade for a wildcard',
  'copy-site': 'then a site to copy',
  bison: 'then the bison',
};

/**
 * What one answer would do, as chips: the tokens gained and spent, and what
 * else on the sheet changes. Answers that change nothing say so.
 */
export function Outcome({ preview, action }: { preview: ActionPreview | null; action: GameAction }) {
  if (!preview) return null;
  const extras: string[] = [];
  const count = (n: number, one: string, many = `${one}s`) => {
    if (n !== 0) extras.push(`${n > 0 ? '+' : '−'}${Math.abs(n)} ${Math.abs(n) === 1 ? one : many}`);
  };
  if (preview.camera) extras.push('the camera');
  count(preview.photos, 'photo');
  count(preview.bottles, 'bottle');
  count(preview.campfires, 'campfire');
  count(preview.parks, 'park');
  count(preview.gear, 'gear card');
  count(preview.reserved, 'reservation');
  const gained = Object.values(preview.gain).some((n) => n !== 0);
  const then =
    preview.next === 'token-swap'
      ? action.type === 'swap-give'
        ? 'then pick what you take'
        : 'then one more trade, if you like'
      : preview.next
        ? THEN[preview.next] ?? null
        : null;
  if (!gained && extras.length === 0 && !then) return <span className="outcome outcome--none">Nothing changes</span>;
  return (
    <span className="outcome">
      {gained ? <TokenBag bag={preview.gain} sign size="xs" /> : null}
      {extras.map((text) => (
        <span key={text} className="outcome__chip">
          {text}
        </span>
      ))}
      {then ? <span className="outcome__then">{then}</span> : null}
      {preview.over > 0 ? (
        <span className="outcome__warn">
          <Icon name="warn" size={13} />
          {preview.tokens} of {TOKEN_LIMIT}: hand {preview.over} back
        </span>
      ) : null}
    </span>
  );
}
