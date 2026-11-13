import { describe, expect, it } from 'vitest';
import { ABOVE, BELOW, MAX_STOP, MIN_STOP, SIDE, trailLayout } from './trailLayout';

/** The board left for the trail on a 1280×800 tablet, under the top bar and over the turn bar. */
const TABLET = { width: 1256, height: 600 };

describe('the drawn trail', () => {
  it('winds out along the top row and back along the next', () => {
    const { places, rows } = trailLayout(9, TABLET.width, TABLET.height);
    expect(rows).toBe(2);
    const top = places.slice(0, 5);
    const back = places.slice(5);
    for (let i = 1; i < top.length; i++) expect(top[i].x).toBeGreaterThan(top[i - 1].x);
    for (let i = 1; i < back.length; i++) expect(back[i].x).toBeLessThan(back[i - 1].x);
    // The trail turns down at the right-hand end, under the last stop of the first row.
    expect(back[0].x).toBeCloseTo(top[top.length - 1].x);
    expect(Math.min(...back.map((p) => p.y))).toBeGreaterThan(Math.max(...top.map((p) => p.y)));
  });

  it('makes the stops large on a tablet, for every trail length the game deals', () => {
    for (let count = 8; count <= 12; count++) {
      const { stop } = trailLayout(count, TABLET.width, TABLET.height);
      expect(stop, `${count} sites`).toBeGreaterThanOrEqual(165);
      expect(stop).toBeLessThanOrEqual(MAX_STOP);
    }
  });

  it('keeps every stop, its hikers and its label on the board, and clear of its neighbours', () => {
    for (const [width, height] of [
      [TABLET.width, TABLET.height],
      [776, 1000],
      [1000, 700],
    ]) {
      for (let count = 8; count <= 12; count++) {
        const { stop, places } = trailLayout(count, width, height);
        if (stop <= MIN_STOP) continue;
        for (const place of places) {
          expect(place.x - stop / 2).toBeGreaterThanOrEqual(0);
          expect(place.x + stop / 2).toBeLessThanOrEqual(width);
          expect(place.y - stop / 2 - ABOVE).toBeGreaterThanOrEqual(-10);
          expect(place.y + stop / 2 + BELOW).toBeLessThanOrEqual(height + 10);
        }
        for (let i = 0; i < places.length; i++) {
          for (let j = i + 1; j < places.length; j++) {
            const a = places[i];
            const b = places[j];
            const sameRow = Math.abs(a.y - b.y) < stop;
            if (sameRow) expect(Math.abs(a.x - b.x), `${count} sites at ${width}×${height}`).toBeGreaterThanOrEqual(stop + SIDE - 1);
          }
        }
      }
    }
  });

  it('turns to a third row on an upright screen, where it buys bigger stops', () => {
    const { rows } = trailLayout(12, 776, 1000);
    expect(rows).toBe(3);
  });

  it('draws one path from the first stop to the last', () => {
    const { path, places } = trailLayout(10, TABLET.width, TABLET.height);
    const first = places[0];
    const last = places[places.length - 1];
    expect(path.startsWith(`M${Math.round(first.x * 10) / 10} ${Math.round(first.y * 10) / 10}`)).toBe(true);
    expect(path.endsWith(`${Math.round(last.x * 10) / 10} ${Math.round(last.y * 10) / 10}`)).toBe(true);
    expect(path.match(/M/g)).toHaveLength(1);
  });

  it('draws nothing before the board has a size', () => {
    expect(trailLayout(9, 0, 0).places).toEqual([]);
  });
});
