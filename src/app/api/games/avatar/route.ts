import { bearer, body, fail } from '@/server/http';
import { chooseAvatar } from '@/server/service';

export const runtime = 'nodejs';

/** A phone trading its seat's Pokémon for another one nobody at the table wears. */
export async function POST(request: Request) {
  try {
    const input = await body<{ avatar: string }>(request);
    return Response.json(await chooseAvatar(bearer(request), input.avatar));
  } catch (error) {
    return fail(error);
  }
}
