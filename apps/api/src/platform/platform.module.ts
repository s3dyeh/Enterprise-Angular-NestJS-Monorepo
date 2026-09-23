import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RedisService } from './redis.service';
import { RecaptchaService } from './recaptcha.service';
import { AuthProtectionGuard } from './auth-protection.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Global()
@Module({
  providers: [
    RedisService,
    RecaptchaService,
    AuthProtectionGuard,
    RateLimitGuard,
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [
    RedisService,
    RecaptchaService,
    AuthProtectionGuard,
    RateLimitGuard,
  ],
})
export class PlatformModule {}
