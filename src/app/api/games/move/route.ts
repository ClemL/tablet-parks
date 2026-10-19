import { bearer, body, fail } from '@/server/http';
import { playMove } from '@/server/service';
import type { GameAction } from '@/game/types';

export const runtime = 'nodejs';

/** A move made on the tablet, for the seat on the clock. Only the tablet's handle may send one. */
export async function POST(request: Request) {
  try {
    const input = await body<{ seat: number; action: GameAction }>(request);
    return Response.json(await playMove(bearer(request), Number(input.seat), input.action as GameAction));
  } catch (error) {
    return fail(error);
  }
}
