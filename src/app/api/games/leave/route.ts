import { bearer, fail } from '@/server/http';
import { leaveGame } from '@/server/service';

export const runtime = 'nodejs';

/** A phone giving up its seat. */
export async function POST(request: Request) {
  try {
    await leaveGame(bearer(request));
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
