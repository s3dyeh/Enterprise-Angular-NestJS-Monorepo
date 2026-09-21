import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import ms from 'ms';
import { AuthService } from './auth.service';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import {
  AuthProtectionGuard,
  CaptchaAction,
} from '../platform/auth-protection.guard';
import { RecaptchaService } from '../platform/recaptcha.service';
import { RuntimeConfig } from '../platform/runtime.config';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller({ path: 'auth/browser', version: '1' })
export class BrowserAuthController {
  private readonly runtime: RuntimeConfig;
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly captcha: RecaptchaService,
  ) {
    this.runtime = config.getOrThrow<RuntimeConfig>('runtime');
  }

  @Get('config')
  configuration(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return {
      recaptcha: this.captcha.publicConfig(),
      emailVerificationRequired: this.config.getOrThrow<boolean>(
        'auth.emailVerificationRequired',
      ),
    };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthProtectionGuard)
  @CaptchaAction('login')
  @SerializeOptions({ groups: ['me'] })
  async login(
    @Body() body: AuthEmailLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    return this.setSession(response, await this.auth.validateLogin(body));
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(AuthProtectionGuard)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    const payload = await this.readSession(request);
    return this.setSession(response, await this.auth.refreshToken(payload));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    const token = await this.readSession(request).catch(() => null);
    response.clearCookie(this.cookieName, this.cookieOptions);
    response.setHeader('Cache-Control', 'no-store');
    if (token) await this.auth.logout({ sessionId: token.sessionId });
  }

  private checkOrigin(request: Request) {
    if (!this.runtime.origins.includes(request.headers.origin || ''))
      throw new ForbiddenException('Untrusted request origin');
  }

  private get cookieName() {
    return this.runtime.production ? '__Host-refresh' : 'refresh';
  }
  private get cookieOptions() {
    return {
      httpOnly: true,
      secure: this.runtime.production,
      sameSite: 'strict' as const,
      path: '/',
    };
  }

  private async readSession(request: Request): Promise<JwtRefreshPayloadType> {
    const cookie = request.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${this.cookieName}=`));
    if (!cookie) throw new ForbiddenException('Session unavailable');
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayloadType>(
        decodeURIComponent(cookie.slice(this.cookieName.length + 1)),
        {
          secret: this.config.getOrThrow<string>('auth.refreshSecret'),
          algorithms: ['HS256'],
        },
      );
      if (!payload.sessionId || !payload.hash)
        throw new Error('Invalid session');
      return payload;
    } catch {
      throw new ForbiddenException('Session unavailable');
    }
  }

  private setSession(
    response: Response,
    data: Omit<LoginResponseDto, 'user'> &
      Partial<Pick<LoginResponseDto, 'user'>>,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.cookie(this.cookieName, data.refreshToken, {
      ...this.cookieOptions,
      maxAge: ms(this.config.getOrThrow<ms.StringValue>('auth.refreshExpires')),
    });
    return {
      token: data.token,
      tokenExpires: data.tokenExpires,
      ...(data.user ? { user: data.user } : {}),
    };
  }
}
