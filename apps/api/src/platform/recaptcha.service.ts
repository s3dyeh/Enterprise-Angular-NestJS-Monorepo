import {
  Injectable,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RuntimeConfig } from './runtime.config';

@Injectable()
export class RecaptchaService {
  private readonly config: RuntimeConfig;
  constructor(config: ConfigService) {
    this.config = config.getOrThrow<RuntimeConfig>('runtime');
  }

  publicConfig() {
    return {
      enabled: this.config.recaptchaEnabled,
      siteKey: this.config.recaptchaEnabled ? this.config.siteKey : null,
    };
  }

  async verify(token: unknown, action: 'login' | 'register'): Promise<void> {
    if (!this.config.recaptchaEnabled) return;
    if (typeof token !== 'string' || token.length < 1 || token.length > 8192)
      throw new ForbiddenException('Verification required');
    let result: {
      success?: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      challenge_ts?: string;
    };
    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          body: new URLSearchParams({
            secret: this.config.secretKey,
            response: token,
          }),
          signal: AbortSignal.timeout(4000),
        },
      );
      if (!response.ok) throw new Error('Verification service unavailable');
      result = (await response.json()) as typeof result;
    } catch {
      throw new ServiceUnavailableException(
        'Verification is temporarily unavailable. Please try again.',
      );
    }
    const age = Date.now() - Date.parse(result.challenge_ts || '');
    if (
      !result.success ||
      result.action !== action ||
      typeof result.score !== 'number' ||
      result.score < this.config.minScore ||
      !this.config.hostnames.includes(result.hostname || '') ||
      !Number.isFinite(age) ||
      age < -10000 ||
      age > 120000
    ) {
      throw new ForbiddenException(
        'Verification failed. Please try again or contact support.',
      );
    }
  }
}
