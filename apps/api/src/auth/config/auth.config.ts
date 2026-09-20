import { registerAs } from '@nestjs/config';

import { Logger } from '@nestjs/common';
import {
  IsBooleanString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { AuthConfig } from './auth-config.type';
import ms from 'ms';

const PLACEHOLDER_SECRETS = {
  AUTH_JWT_SECRET: 'secret',
  AUTH_REFRESH_SECRET: 'secret_for_refresh',
  AUTH_FORGOT_SECRET: 'secret_for_forgot',
  AUTH_CONFIRM_EMAIL_SECRET: 'secret_for_confirm_email',
} as const;

function checkPlaceholderSecrets(): void {
  const placeholders = Object.entries(PLACEHOLDER_SECRETS)
    .filter(
      ([envVar, placeholder]) =>
        process.env[envVar] === placeholder ||
        process.env[envVar]?.startsWith('replace-with-'),
    )
    .map(([envVar]) => envVar);

  if (placeholders.length === 0) {
    return;
  }

  const message = `${placeholders.join(', ')} still use example values. Replace the secrets in .env; see README.md.`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  new Logger('AuthConfig').warn(message);
}

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  AUTH_JWT_SECRET: string;

  @IsString()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_REFRESH_SECRET: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_FORGOT_SECRET: string;

  @IsString()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_CONFIRM_EMAIL_SECRET: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: string;

  @IsBooleanString()
  @IsOptional()
  AUTH_UNIFORM_ERRORS: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  checkPlaceholderSecrets();
  if (process.env.NODE_ENV === 'production') {
    const secrets = Object.keys(PLACEHOLDER_SECRETS).map(
      (key) => process.env[key] || '',
    );
    if (
      secrets.some((secret) => secret.length < 32) ||
      new Set(secrets).size !== secrets.length
    )
      throw new Error(
        'Production authentication secrets must be distinct and at least 32 characters',
      );
  }

  for (const key of [
    'AUTH_JWT_TOKEN_EXPIRES_IN',
    'AUTH_REFRESH_TOKEN_EXPIRES_IN',
    'AUTH_FORGOT_TOKEN_EXPIRES_IN',
    'AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN',
  ]) {
    const duration = ms(process.env[key] as ms.StringValue);
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error(
        `${key} must be a positive duration, such as 15m or 30d.`,
      );
  }

  return {
    secret: process.env.AUTH_JWT_SECRET,
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshSecret: process.env.AUTH_REFRESH_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN as ms.StringValue,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env
      .AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN as ms.StringValue,
    uniformErrors: process.env.AUTH_UNIFORM_ERRORS === 'true',
  };
});
