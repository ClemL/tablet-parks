import { body, fail, limit } from '@/server/http';
import { createGame } from '@/server/service';
import type { RoomSettings } from '@/room/room';

export const runtime = 'nodejs';
// Provisioning a database and waiting for its DNS can take a while.
export const maxDuration = 60;

/** The tablet opening a new game: a fresh database, a lobby, and the tablet's own handle. */
export async function POST(request: Request) {
  try {
    limit('create', request);
    const input = await body<{ settings: Partial<RoomSettings> }>(request);
    return Response.json(await createGame(input.settings));
  } catch (error) {
    return fail(error);
  }
}
