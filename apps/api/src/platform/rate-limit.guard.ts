import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { RedisService } from './redis.service';
import {
  RATE_LIMIT_OPTIONS_KEY,
  SKIP_RATE_LIMIT_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator';

/**
 * Shared Redis/in-memory API rate limiter keyed by client IP (and user when present).
 * Auth routes keep the stricter AuthProtectionGuard in addition to this guard.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_OPTIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};

    const limit = options.limit ?? this.redis.config.apiRateLimit;
    const windowSeconds =
      options.windowSeconds ?? this.redis.config.apiRateWindowSeconds;
    if (limit <= 0) return true;

    const request = context.switchToHttp().getRequest<
      Request & { user?: { id?: number } }
    >();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = createHash('sha256')
      .update(request.ip || request.socket.remoteAddress || 'unknown')
      .digest('hex');
    const userPart =
      typeof request.user?.id === 'number' ? `:u${request.user.id}` : '';
    const bucket = options.bucket ?? 'api';
    const window = await this.redis.consume(
      `${bucket}:${ip}${userPart}`,
      windowSeconds,
    );

    const remaining = Math.max(0, limit - window.count);
    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(remaining));
    response.setHeader('X-RateLimit-Reset', String(window.retryAfter));

    if (window.count > limit) {
      response.setHeader('Retry-After', String(window.retryAfter));
      throw new HttpException('Too many requests. Please try again later.', 429);
    }
    return true;
  }
}
