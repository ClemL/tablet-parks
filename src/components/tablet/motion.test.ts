import { describe, expect, it } from 'vitest';
import { gaitFrames, pickGait, tripMs } from './motion';

describe('hikers on the move', () => {
  it('walk short trips, and only sometimes hop, skip or roll a long one', () => {
    for (const roll of [0, 0.5, 0.99]) expect(pickGait(2, roll)).toBe('walk');
    expect(pickGait(4, 0.1)).toBe('walk');
    expect(pickGait(4, 0.5)).toBe('hop');
    expect(pickGait(4, 0.7)).toBe('skip');
    expect(pickGait(4, 0.9)).toBe('roll');
  });

  it('take longer the further they go, up to a cap', () => {
    expect(tripMs('walk', 2)).toBeGreaterThan(tripMs('walk', 1));
    expect(tripMs('walk', 40)).toBe(3200);
  });

  it('pass through every stop on the way and end on the last one', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 50 },
    ];
    for (const gait of ['walk', 'hop', 'skip', 'roll'] as const) {
      const frames = gaitFrames(gait, points);
      expect(frames[0].offset).toBe(0);
      expect(frames.at(-1)!.offset).toBe(1);
      const offsets = frames.map((f) => f.offset as number);
      expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
      expect(String(frames.at(-1)!.transform)).toContain('translate(200.0px, 50.0px)');
      expect(frames.some((f) => String(f.transform).includes('translate(100.0px, 0.0px)'))).toBe(true);
    }
  });
});
