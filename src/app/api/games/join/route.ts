import { body, fail, limit } from '@/server/http';
import { joinGame } from '@/server/service';

export const runtime = 'nodejs';

/** A phone that scanned a seat's code, taking that seat. */
export async function POST(request: Request) {
  try {
    limit('join', request);
    const input = await body<{ ticket: string; name: string }>(request);
    return Response.json(await joinGame(typeof input.ticket === 'string' ? input.ticket : null, input.name));
  } catch (error) {
    return fail(error);
  }
}
