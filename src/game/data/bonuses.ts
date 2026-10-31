import type { BonusCard, BonusProgress, ParkTag, PlayerScoringView } from '../types';

const countTag = (tag: ParkTag) => (v: { parks: { tags: ParkTag[] }[] }) =>
  v.parks.filter((p) => p.tags.includes(tag)).length;

/** A count, with its unit worded for that number. */
const counted = (count: number, one: string, many: string, goal?: number): BonusProgress => ({
  count,
  ...(goal !== undefined ? { goal } : {}),
  unit: (goal ?? count) === 1 ? one : many,
});

const tagged = (tag: ParkTag) => (v: PlayerScoringView) => counted(countTag(tag)(v), `${tag} park`, `${tag} parks`);
const regions = (v: PlayerScoringView) => new Set(v.parks.map((p) => p.region)).size;
const leftover = (v: PlayerScoringView) => Object.values(v.resources).reduce((a, b) => a + (b ?? 0), 0);

/** Each player is dealt two of these at setup. They stay hidden until scoring. */
export const BONUS_CARDS: BonusCard[] = [
  {
    id: 'shutterbug',
    name: 'Shutterbug',
    text: '2 VP for every photo you took.',
    score: (v) => v.photos * 2,
    progress: (v) => counted(v.photos, 'photo', 'photos'),
  },
  {
    id: 'completionist',
    name: 'Completionist',
    text: '10 VP for 4+ parks, 5 VP for exactly 3.',
    score: (v) => (v.parks.length >= 4 ? 10 : v.parks.length === 3 ? 5 : 0),
    progress: (v) => counted(v.parks.length, 'park', 'parks', v.parks.length >= 3 ? 4 : 3),
  },
  {
    id: 'mountaineer',
    name: 'Mountaineer',
    text: '3 VP per mountain park.',
    score: (v) => countTag('mountain')(v) * 3,
    progress: tagged('mountain'),
  },
  {
    id: 'forest-bather',
    name: 'Forest Bather',
    text: '3 VP per forest park.',
    score: (v) => countTag('forest')(v) * 3,
    progress: tagged('forest'),
  },
  {
    id: 'river-runner',
    name: 'River Runner',
    text: '3 VP per water park.',
    score: (v) => countTag('water')(v) * 3,
    progress: tagged('water'),
  },
  {
    id: 'desert-wanderer',
    name: 'Desert Wanderer',
    text: '3 VP per desert park.',
    score: (v) => countTag('desert')(v) * 3,
    progress: tagged('desert'),
  },
  {
    id: 'canyoneer',
    name: 'Canyoneer',
    text: '3 VP per canyon park.',
    score: (v) => countTag('canyon')(v) * 3,
    progress: tagged('canyon'),
  },
  {
    id: 'wildlife-watcher',
    name: 'Wildlife Watcher',
    text: '3 VP per wildlife park.',
    score: (v) => countTag('wildlife')(v) * 3,
    progress: tagged('wildlife'),
  },
  {
    id: 'gear-head',
    name: 'Gear Head',
    text: '3 VP per gear card you own.',
    score: (v) => v.gear.length * 3,
    progress: (v) => counted(v.gear.length, 'gear card', 'gear cards'),
  },
  {
    id: 'provisioner',
    name: 'Provisioner',
    text: '1 VP per 2 leftover resources.',
    score: (v) => Math.floor(leftover(v) / 2),
    progress: (v) => counted(leftover(v), 'resource left', 'resources left'),
  },
  {
    id: 'coast-to-coast',
    name: 'Coast to Coast',
    text: '6 VP if your parks cover 3+ regions.',
    score: (v) => (regions(v) >= 3 ? 6 : 0),
    progress: (v) => counted(regions(v), 'region', 'regions', 3),
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    text: '5 VP if you claimed a park in season 1 or 2.',
    score: (v) => (v.claimedInSeason.some((s) => s <= 2) ? 5 : 0),
    progress: (v) => counted(v.claimedInSeason.filter((s) => s <= 2).length, 'a park visited in spring or summer', 'a park visited in spring or summer', 1),
  },
  {
    id: 'big-ticket',
    name: 'Big Ticket',
    text: '4 VP per park worth 5 or more VP.',
    score: (v) => v.parks.filter((p) => p.vp >= 5).length * 4,
    progress: (v) => counted(v.parks.filter((p) => p.vp >= 5).length, 'park worth 5+', 'parks worth 5+'),
  },
  {
    id: 'firekeeper',
    name: 'Firekeeper',
    text: '3 VP if you end the game with an unspent campfire token.',
    score: (v) => (v.campfires > 0 ? 3 : 0),
    progress: (v) => counted(v.campfires, 'a campfire unspent', 'a campfire unspent', 1),
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster',
    text: '2 VP per bottle card you hold.',
    score: (v) => v.bottles.length * 2,
    progress: (v) => counted(v.bottles.length, 'bottle', 'bottles'),
  },
  {
    id: 'planner',
    name: 'Planner',
    text: '3 VP per park you reserved but never visited, plus 3 VP if you hold the camera.',
    score: (v) => v.reserved.length * 3 + (v.hasCamera ? 3 : 0),
    progress: (v) => counted(v.reserved.length, 'park reserved', 'parks reserved'),
  },
];
