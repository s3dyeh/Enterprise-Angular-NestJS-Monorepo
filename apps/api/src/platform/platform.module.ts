import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RecaptchaService } from './recaptcha.service';
import { AuthProtectionGuard } from './auth-protection.guard';

@Global()
@Module({
  providers: [RedisService, RecaptchaService, AuthProtectionGuard],
  exports: [RedisService, RecaptchaService, AuthProtectionGuard],
})
export class PlatformModule {}
