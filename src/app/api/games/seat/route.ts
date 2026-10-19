import { bearer, fail } from '@/server/http';
import { previewSeat } from '@/server/service';

export const runtime = 'nodejs';

/** Which seat a QR code is for, before the phone takes it. */
export async function GET(request: Request) {
  try {
    return Response.json(await previewSeat(bearer(request)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error);
  }
}
