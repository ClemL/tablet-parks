import { bearer, fail } from '@/server/http';
import { abandonGame } from '@/server/service';

export const runtime = 'nodejs';

/** The tablet walking away: the game's data is deleted now. */
export async function POST(request: Request) {
  try {
    await abandonGame(bearer(request));
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
