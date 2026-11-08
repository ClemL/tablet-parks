import { bearer, body, fail } from '@/server/http';
import { chooseFlasks } from '@/server/service';

export const runtime = 'nodejs';

/** A phone arming its own seat's flasks, in the order they should fill. */
export async function POST(request: Request) {
  try {
    const input = await body<{ order: string[] }>(request);
    return Response.json(await chooseFlasks(bearer(request), input.order));
  } catch (error) {
    return fail(error);
  }
}
