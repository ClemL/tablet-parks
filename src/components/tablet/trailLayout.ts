/**
 * Where each stop of the drawn trail sits on the board, and the path that
 * joins them. The trail winds back and forth across the board in two or three
 * rows — out along the top, back along the next row — and the stops get as
 * big as the board allows, so a site and the hikers on it are easy to tap.
 *
 * Pure: the board measures itself and passes its size in.
 */

export interface StopPlace {
  x: number;
  y: number;
}

export interface TrailLayout {
  /** A stop's diameter in pixels. */
  stop: number;
  rows: number;
  places: StopPlace[];
  /** An SVG path through every stop in trail order. */
  path: string;
}

/** Room above a stop for the hikers standing on it. */
export const ABOVE = 34;
/** Room under a stop for its name, what it pays and the walk-here chip. */
export const BELOW = 106;
/** Space between neighbouring stops' labels. */
export const SIDE = 56;
export const MIN_STOP = 84;
export const MAX_STOP = 168;

export function trailLayout(count: number, width: number, height: number): TrailLayout {
  if (count <= 0 || width <= 0 || height <= 0) return { stop: MIN_STOP, rows: 1, places: [], path: '' };

  // Fewer rows mean wider stops on a short trail; more rows win on a long one
  // or an upright screen. Ties go to fewer rows: an easier path to follow.
  let best = { rows: 1, size: -Infinity };
  for (const rows of [2, 3]) {
    if (rows > count) continue;
    const cols = Math.ceil(count / rows);
    const size = Math.min(width / cols - SIDE, height / rows - ABOVE - BELOW);
    if (size > best.size + 4) best = { rows, size };
  }
  if (best.size === -Infinity) best = { rows: 1, size: Math.min(width / count - SIDE, height - ABOVE - BELOW) };

  const rows = best.rows;
  const cols = Math.ceil(count / rows);
  const stop = Math.round(Math.min(MAX_STOP, Math.max(MIN_STOP, best.size)));
  const band = height / rows;
  const slack = Math.max(0, band - (ABOVE + stop + BELOW));
  const colWidth = width / cols;
  // A gentle rise and fall from stop to stop, where there is height to spare.
  const wave = Math.min(10, slack / 2);

  const places: StopPlace[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const along = i % cols;
    // Every other row runs back the way the trail came.
    const col = row % 2 === 0 ? along : cols - 1 - along;
    places.push({
      x: (col + 0.5) * colWidth,
      y: row * band + ABOVE + stop / 2 + slack / 2 + (col % 2 === 0 ? -wave : wave),
    });
  }

  return { stop, rows, places, path: pathThrough(places, cols, colWidth) };
}

/**
 * A smooth curve through the stops, swinging out past the board's edge column
 * where the trail turns from one row into the next.
 */
function pathThrough(places: StopPlace[], cols: number, colWidth: number): string {
  if (places.length === 0) return '';
  const points: StopPlace[] = [];
  places.forEach((place, i) => {
    points.push(place);
    const next = places[i + 1];
    if (next && Math.floor(i / cols) !== Math.floor((i + 1) / cols)) {
      const outward = Math.floor(i / cols) % 2 === 0 ? 1 : -1;
      points.push({ x: place.x + outward * colWidth * 0.4, y: (place.y + next.y) / 2 });
    }
  });
  if (points.length === 1) return `M${round(points[0].x)} ${round(points[0].y)}`;

  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
