import { bearer, body, fail } from '@/server/http';
import { controlGame, type TableCommand } from '@/server/service';

export const runtime = 'nodejs';

/** The tablet's commands: settings, seats, the deal, the season break. */
export async function POST(request: Request) {
  try {
    const input = await body<{ command: TableCommand }>(request);
    return Response.json(await controlGame(bearer(request), input.command as TableCommand));
  } catch (error) {
    return fail(error);
  }
}
