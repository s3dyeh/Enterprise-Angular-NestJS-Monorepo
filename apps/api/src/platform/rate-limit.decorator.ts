import { SetMetadata } from '@nestjs/common';

/** Metadata key for per-route rate-limit overrides. */
export const RATE_LIMIT_OPTIONS_KEY = 'rateLimitOptions';

/** Metadata key to bypass the global API rate limiter. */
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

export interface RateLimitOptions {
  /** Maximum requests allowed in the window (defaults to API_RATE_LIMIT). */
  limit?: number;
  /** Window length in seconds (defaults to API_RATE_WINDOW_SECONDS). */
  windowSeconds?: number;
  /** Isolate counters by name (default `api`). */
  bucket?: string;
}

/**
 * Override the default API rate limit for a route or controller.
 */
export const RateLimit = (options: RateLimitOptions = {}) =>
  SetMetadata(RATE_LIMIT_OPTIONS_KEY, options);

/**
 * Skip global API rate limiting (health probes, metrics scrapes, etc.).
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
