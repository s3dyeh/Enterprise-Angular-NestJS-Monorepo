import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { RedisService } from './redis.service';
import { RecaptchaService } from './recaptcha.service';
import { DataSource } from 'typeorm';
import { LoginBlockEntity } from './persistence/login-block.entity';

export const CaptchaAction = (action: 'login' | 'register') =>
  SetMetadata('captchaAction', action);

@Injectable()
export class AuthProtectionGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly captcha: RecaptchaService,
    private readonly reflector: Reflector,
    private readonly database: DataSource,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const key = createHash('sha256')
      .update(request.ip || request.socket.remoteAddress || 'unknown')
      .digest('hex');
    const window = await this.redis.consume(
      `auth:${key}`,
      this.redis.config.rateWindowSeconds,
    );
    if (window.count > this.redis.config.rateLimit) {
      if (window.count === this.redis.config.rateLimit + 1) {
        await this.database
          .getRepository(LoginBlockEntity)
          .createQueryBuilder()
          .insert()
          .values({
            key,
            generation: randomUUID(),
            attempts: window.count,
            locked_until: () => "now() + :retryAfter * interval '1 second'",
          })
          .setParameter('retryAfter', window.retryAfter)
          .orUpdate(['attempts', 'locked_until', 'generation'], ['key'])
          .execute();
      }
      response.setHeader('Retry-After', window.retryAfter);
      throw new HttpException(
        'Too many authentication attempts. Please try again later.',
        429,
      );
    }
    const action = this.reflector.get<'login' | 'register' | undefined>(
      'captchaAction',
      context.getHandler(),
    );
    if (action)
      await this.captcha.verify(
        (request.body as Record<string, unknown> | undefined)?.recaptchaToken,
        action,
      );
    return true;
  }
}
