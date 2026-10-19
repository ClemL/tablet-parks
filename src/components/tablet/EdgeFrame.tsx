import type { Edge, PublicSeat } from '@/room/room';

/**
 * Lays a screen out the way people sit round a tablet lying flat: one name tag
 * per seat on the edge nearest that person, turned to face them, and the board
 * in the middle. Tags on the left and right are turned a quarter, the top a
 * half; `upright` keeps them all reading from the bottom, for a tablet on a
 * stand.
 *
 * A rotated box keeps its unrotated footprint in layout, so each tag sits in a
 * slot sized for it after the turn — width and height swapped on the sides.
 */
export function EdgeFrame({
  seats,
  tag,
  width,
  height,
  upright = false,
  children,
  className = '',
}: {
  seats: PublicSeat[];
  tag: (seat: PublicSeat) => React.ReactNode;
  /** The tag's own size, read the right way up. */
  width: number;
  height: number;
  upright?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const on = (edge: Edge) => seats.filter((s) => s.edge === edge);
  const style = { '--tw': `${width}px`, '--th': `${height}px` } as React.CSSProperties;
  const edge = (where: Edge) => {
    const here = on(where);
    // The left edge is read bottom-up and the top right-to-left, so list them
    // in the order the seats go round the table.
    const ordered = where === 'left' || where === 'top' ? [...here].reverse() : here;
    return (
      <div className={`edge edge--${where}`}>
        {ordered.map((seat) => (
          <div key={seat.seat} className="edge__slot">
            <div className="edge__tag">{tag(seat)}</div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className={`edge-frame ${upright ? 'edge-frame--upright' : ''} ${className}`} style={style}>
      {edge('top')}
      {edge('left')}
      <div className="edge-center">{children}</div>
      {edge('right')}
      {edge('bottom')}
    </div>
  );
}
