import { bearer, body, fail } from '@/server/http';
import { choosePark } from '@/server/service';
import type { GameAction } from '@/game/types';

export const runtime = 'nodejs';

/** A phone answering its own seat's park decision. Only that seat's latest phone may send one. */
export async function POST(request: Request) {
  try {
    const input = await body<{ action: GameAction }>(request);
    return Response.json(await choosePark(bearer(request), input.action as GameAction));
  } catch (error) {
    return fail(error);
  }
}
