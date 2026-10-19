import { bearer, fail } from '@/server/http';
import { readGame } from '@/server/service';

export const runtime = 'nodejs';

/** The poll: the game as the holder of the handle may see it, or a bare version when nothing moved. */
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('since');
    const since = raw === null ? undefined : Number(raw);
    return Response.json(await readGame(bearer(request), Number.isFinite(since) ? since : undefined), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return fail(error);
  }
}
