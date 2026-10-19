import { secretConfigured } from '@/server/seal';
import { storeMode } from '@/server/service';

export const runtime = 'nodejs';

/**
 * What this deployment will do with the next game, for the settings screen and
 * for diagnosing a deployment. Names whether each variable is present, never a
 * value.
 */
export async function GET(request: Request) {
  // Reading the request keeps this answered per request rather than at build time.
  void request.headers;
  return Response.json({
    ok: true,
    store: storeMode(),
    secretConfigured: secretConfigured(),
    sharedDatabase: Boolean(
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
        (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    ),
    deployment: {
      environment: process.env.VERCEL_ENV ?? 'self-hosted',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown').slice(0, 7),
    },
  });
}
