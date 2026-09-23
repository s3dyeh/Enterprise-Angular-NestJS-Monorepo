import { Reflector } from '@nestjs/core';
import { HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';
import type { RuntimeConfig } from './runtime.config';
import {
  RATE_LIMIT_OPTIONS_KEY,
  SKIP_RATE_LIMIT_KEY,
} from './rate-limit.decorator';

describe('RateLimitGuard', () => {
  const redis = {
    config: {
      apiRateLimit: 3,
      apiRateWindowSeconds: 60,
    } as RuntimeConfig,
    consume: jest.fn(),
  };
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RateLimitGuard(
    redis as unknown as RedisService,
    reflector as unknown as Reflector,
  );
  const headers = new Map<string, string>();
  const response = {
    setHeader: (name: string, value: string) => headers.set(name, value),
  };

  /**
   * Build a minimal HTTP execution context for guard checks.
   */
  function context(path = '/api/v1/admin/users') {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
          path,
          user: undefined,
        }),
        getResponse: () => response,
      }),
    } as never;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    headers.clear();
    redis.config = {
      apiRateLimit: 3,
      apiRateWindowSeconds: 60,
    } as RuntimeConfig;
  });

  it('skips routes marked with SkipRateLimit', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === SKIP_RATE_LIMIT_KEY ? true : undefined,
    );
    await expect(guard.canActivate(context('/health/live'))).resolves.toBe(true);
    expect(redis.consume).not.toHaveBeenCalled();
  });

  it('allows traffic under the configured limit and sets headers', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    redis.consume.mockResolvedValue({ count: 2, retryAfter: 45 });
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(headers.get('X-RateLimit-Limit')).toBe('3');
    expect(headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(headers.get('X-RateLimit-Reset')).toBe('45');
  });

  it('rejects over-limit traffic with Retry-After', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    redis.consume.mockResolvedValue({ count: 4, retryAfter: 30 });
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(headers.get('Retry-After')).toBe('30');
  });

  it('honors per-route RateLimit overrides', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === RATE_LIMIT_OPTIONS_KEY
        ? { limit: 1, windowSeconds: 10, bucket: 'invite' }
        : undefined,
    );
    redis.consume.mockResolvedValue({ count: 1, retryAfter: 10 });
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(redis.consume).toHaveBeenCalledWith(
      expect.stringMatching(/^invite:/),
      10,
    );
  });
});
