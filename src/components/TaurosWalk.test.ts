import { describe, expect, it } from 'vitest';
import type { LogEntry } from '@/game/types';
import { walkFrames, walkMs, walkSince } from './TaurosWalk';

const entry = (id: number, extra: Partial<LogEntry> = {}): LogEntry => ({ id, season: 1, player: 0, text: `step ${id}`, ...extra });

describe('Tauros’s walk, read off the log', () => {
  it('finds nothing without a walk among the new entries', () => {
    const log = [entry(1), entry(2, { event: 'tauros-walk', walk: { from: 0, to: 1 } }), entry(3)];
    expect(walkSince(log, 2)).toBeNull();
  });

  it('walks from where the first walk left to where the last arrived', () => {
    const log = [
      entry(1),
      entry(2, { event: 'tauros-walk', walk: { from: 0, to: 1 }, player: 1 }),
      entry(3, { event: 'tauros-walk', walk: { from: 1, to: 2 }, player: 2 }),
    ];
    expect(walkSince(log, 1)).toEqual({ id: 3, player: 2, from: 0, to: 2, traded: false });
  });

  it('says when a trade came with it, so the trade plays first', () => {
    const log = [entry(5, { event: 'tauros', delta: { sun: -1, wild: 1 } }), entry(6, { event: 'tauros-walk', walk: { from: 2, to: 0 } })];
    expect(walkSince(log, 4)).toMatchObject({ from: 2, to: 0, traded: true });
  });

  it('skips a trip all the way round the row and back to the same card', () => {
    const log = [
      entry(1, { event: 'tauros-walk', walk: { from: 0, to: 1 } }),
      entry(2, { event: 'tauros-walk', walk: { from: 1, to: 2 } }),
      entry(3, { event: 'tauros-walk', walk: { from: 2, to: 0 } }),
    ];
    expect(walkSince(log, 0)).toBeNull();
  });
});

describe('the walk itself', () => {
  it('takes longer the more cards it crosses', () => {
    expect(walkMs({ from: 0, to: 2 })).toBeGreaterThan(walkMs({ from: 0, to: 1 }));
    expect(walkMs({ from: 2, to: 0 })).toBe(walkMs({ from: 0, to: 2 }));
  });

  it('starts at the old card, ends on the new one, and leans the way it walks', () => {
    const right = walkFrames(-180, 0);
    expect(right[0].transform).toContain('translate(-180.0px, 0.0px)');
    expect(right[right.length - 1].transform).toBe('translate(0px, 0px) scale(1, 1)');
    expect(right.map((f) => f.offset)).toEqual([...right.map((f) => f.offset)].sort((a, b) => Number(a) - Number(b)));
    // Walking right leans right (positive turn); walking left leans left.
    expect(String(right[1].transform)).toMatch(/rotate\(7deg\)/);
    expect(String(walkFrames(180, 0)[1].transform)).toMatch(/rotate\(-7deg\)/);
  });
});
