import type { Edge, PublicSeat } from '@/room/room';

/**
 * Lays a screen out the way people sit round a tablet lying flat: something
 * for each seat on the edge nearest that person, turned to face them, and the
 * board in the middle. Things on the left and right are turned a quarter, the
 * top a half; `upright` keeps them all reading from the bottom, for a tablet
 * on a stand.
 *
 * Two shapes. Tags (the lobby) are a fixed size, so each sits in a slot sized
 * for it after the turn — a rotated box keeps its unrotated footprint. Rails
 * (the board) run the whole length of their edge, shared between the seats on
 * it; upright, every rail moves to the bottom edge, where all of them read.
 */
export function EdgeFrame({
  seats,
  tag,
  width = 0,
  height = 0,
  rails = false,
  upright = false,
  children,
  className = '',
}: {
  seats: PublicSeat[];
  tag: (seat: PublicSeat) => React.ReactNode;
  /** A tag's own size, read the right way up. Rails ignore it. */
  width?: number;
  height?: number;
  rails?: boolean;
  upright?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const edgeOf = (seat: PublicSeat): Edge => (rails && upright ? 'bottom' : seat.edge);
  const style = { '--tw': `${width}px`, '--th': `${height}px` } as React.CSSProperties;
  const edge = (where: Edge) => {
    const here = seats.filter((s) => edgeOf(s) === where);
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
    <div className={`edge-frame${rails ? ' edge-frame--rails' : ''}${upright ? ' edge-frame--upright' : ''} ${className}`} style={style}>
      {edge('top')}
      {edge('left')}
      <div className="edge-center">{children}</div>
      {edge('right')}
      {edge('bottom')}
    </div>
  );
}
