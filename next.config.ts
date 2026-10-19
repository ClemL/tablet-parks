import { randomBytes } from 'node:crypto';
import type { NextConfig } from 'next';
import pkg from './package.json';

/**
 * Next evaluates this file more than once per build (once per compilation), so
 * anything generated here is pinned on the first evaluation through
 * process.env and reused by the rest — otherwise the server and client could
 * disagree on the build time, and two route bundles on the sealing key.
 */
const BUILD_TIME = (process.env.NEXT_PUBLIC_BUILD_TIME ??= new Date().toISOString());

/**
 * The fallback sealing key when TABLE_SECRET is not set: random per build, and
 * read only by `src/server/seal.ts`, which is server-only, so it never reaches
 * a browser bundle. A redeploy mints a new one, which strands any game in
 * progress — set TABLE_SECRET on the deployment to avoid that.
 */
const BUILD_SECRET = (process.env.PARKS_BUILD_SECRET ??= randomBytes(32).toString('base64url'));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    PARKS_BUILD_SECRET: BUILD_SECRET,
  },
};

export default nextConfig;
