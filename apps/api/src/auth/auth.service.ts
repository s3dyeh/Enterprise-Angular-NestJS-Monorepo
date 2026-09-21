import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import ms from 'ms';
import crypto from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthProvider } from './auth-providers.enum';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseDto } from './dto/login-response.dto';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { AppConfiguration } from '../config/config.type';
import { MailService } from '../mail/mail.service';
import { RoleId } from '../roles/roles.enum';
import { Session } from '../session/domain/session';
import { SessionService } from '../session/session.service';
import { StatusId } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<AppConfiguration>,
  ) {}

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw this.invalidLoginException({
        email: 'notFound',
      });
    }

    if (user.provider !== AuthProvider.email) {
      throw this.invalidLoginException({
        email: `needLoginViaProvider:${user.provider}`,
      });
    }

    if (!user.password) {
      throw this.invalidLoginException({
        password: 'incorrectPassword',
      });
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw this.invalidLoginException({
        password: 'incorrectPassword',
      });
    }

    if (Number(user.status?.id) !== StatusId.active) {
      throw this.invalidLoginException({
        email: 'emailNotConfirmedOrAccountInactive',
      });
    }

    const hash = crypto.randomBytes(32).toString('hex');

    const session = await this.sessionService.create({
      user,
      hash,
    });

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
      hash,
    });

    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const verificationRequired =
      this.configService.getOrThrow('auth.emailVerificationRequired', {
        infer: true,
      }) !== false;
    const user = await this.usersService.create({
      ...dto,
      email: dto.email,
      role: {
        id: RoleId.user,
      },
      status: {
        id: verificationRequired
          ? StatusId.pendingVerification
          : StatusId.active,
      },
    });

    if (!verificationRequired) return;

    const hash = await this.jwtService.signAsync(
      {
        confirmEmailUserId: user.id,
      },
      {
        secret: this.confirmationSecret(user),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );

    await this.mailService.userSignUp({
      to: dto.email,
      data: {
        hash,
      },
    });
  }

  async confirmEmail(hash: string): Promise<void> {
    const id = this.linkSubject(hash, 'confirmEmailUserId');
    await this.consumeLink(id, async (user) => {
      const { newEmail } = await this.readConfirmation(hash, user);
      if (newEmail || Number(user.status?.id) !== StatusId.pendingVerification)
        throw new UnprocessableEntityException('Invalid confirmation link');
      return { updates: { status: { id: StatusId.active } } };
    });
  }

  async confirmNewEmail(hash: string): Promise<void> {
    const id = this.linkSubject(hash, 'confirmEmailUserId');
    await this.consumeLink(id, async (user) => {
      const { newEmail } = await this.readConfirmation(hash, user);
      if (!newEmail || Number(user.status?.id) !== StatusId.active)
        throw new UnprocessableEntityException('Invalid confirmation link');
      return { updates: { email: newEmail }, revokeSessions: {} };
    });
  }

  private linkSubject(
    hash: string,
    field: 'confirmEmailUserId' | 'forgotUserId',
  ): number {
    try {
      const decoded = this.jwtService.decode<Record<string, unknown>>(hash);
      const id = decoded?.[field];
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
        throw new Error('Invalid subject');
      return id;
    } catch {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { hash: 'invalidHash' },
      });
    }
  }

  async resendConfirmation(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || Number(user.status?.id) !== StatusId.pendingVerification)
      return;
    const hash = await this.jwtService.signAsync(
      { confirmEmailUserId: user.id },
      {
        secret: this.confirmationSecret(user),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      },
    );
    await this.mailService.userSignUp({ to: email, data: { hash } });
  }

  private confirmationSecret(user: User): string {
    return (
      this.configService.getOrThrow('auth.confirmEmailSecret', {
        infer: true,
      }) + JSON.stringify([user.id, user.email, user.password, user.updatedAt])
    );
  }

  private async readConfirmation(
    hash: string,
    user: User,
  ): Promise<{ newEmail?: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ newEmail?: string }>(
        hash,
        {
          secret: this.confirmationSecret(user),
          algorithms: ['HS256'],
        },
      );
      return { newEmail: payload.newEmail };
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: 'invalidHash' },
      });
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      const uniformErrors = this.configService.getOrThrow(
        'auth.uniformErrors',
        { infer: true },
      );

      // With uniform errors enabled we do not reveal whether the email is
      // registered: respond exactly like the success case and skip the mail.
      if (uniformErrors) {
        return;
      }

      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'emailNotExists',
        },
      });
    }

    const tokenExpiresIn = this.configService.getOrThrow('auth.forgotExpires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const hash = await this.jwtService.signAsync(
      {
        forgotUserId: user.id,
      },
      {
        secret: this.getForgotSecret(user),
        expiresIn: tokenExpiresIn,
      },
    );

    await this.mailService.forgotPassword({
      to: email,
      data: {
        hash,
        tokenExpires,
      },
    });
  }

  async resetPassword(hash: string, password: string): Promise<void> {
    const id = this.linkSubject(hash, 'forgotUserId');
    await this.consumeLink(id, async (user) => {
      try {
        await this.jwtService.verifyAsync(hash, {
          secret: this.getForgotSecret(user),
          algorithms: ['HS256'],
        });
      } catch {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { hash: 'invalidHash' },
        });
      }
      return { updates: { password }, revokeSessions: {} };
    });
  }

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findById(userJwtPayload.id);
  }

  private async consumeLink(
    id: number,
    prepare: Parameters<UsersService['updateAtomically']>[1],
  ): Promise<void> {
    try {
      await this.usersService.updateAtomically(id, prepare);
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new UnprocessableEntityException({
          status: 422,
          errors: { hash: 'invalidHash' },
        });
      throw error;
    }
  }

  async update(
    userJwtPayload: JwtPayloadType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    let newEmail: string | undefined;
    const updated = await this.usersService.updateAtomically(
      userJwtPayload.id,
      async (currentUser) => {
        if (userDto.password) {
          if (!userDto.oldPassword) {
            throw new UnprocessableEntityException({
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: {
                oldPassword: 'missingOldPassword',
              },
            });
          }

          if (!currentUser.password) {
            throw new UnprocessableEntityException({
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: {
                oldPassword: 'incorrectOldPassword',
              },
            });
          }

          const isValidOldPassword = await bcrypt.compare(
            userDto.oldPassword,
            currentUser.password,
          );

          if (!isValidOldPassword) {
            throw new UnprocessableEntityException({
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: {
                oldPassword: 'incorrectOldPassword',
              },
            });
          }
        }

        newEmail =
          userDto.email && userDto.email !== currentUser.email
            ? userDto.email
            : undefined;
        if (newEmail) {
          const existing = await this.usersService.findByEmail(newEmail);
          if (existing && existing.id !== currentUser.id)
            throw new UnprocessableEntityException({
              status: HttpStatus.UNPROCESSABLE_ENTITY,
              errors: { email: 'emailExists' },
            });
        }
        const updates = { ...userDto };
        delete updates.email;
        delete updates.oldPassword;
        return {
          updates,
          revokeSessions: userDto.password
            ? { excludeSessionId: Number(userJwtPayload.sessionId) }
            : undefined,
        };
      },
    );
    if (newEmail) {
      const hash = await this.jwtService.signAsync(
        { confirmEmailUserId: updated.id, newEmail },
        {
          secret: this.confirmationSecret(updated),
          expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
            infer: true,
          }),
        },
      );
      await this.mailService.confirmNewEmail({ to: newEmail, data: { hash } });
    }
    return updated;
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId' | 'hash'>,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const hash = crypto.randomBytes(32).toString('hex');

    const session = await this.sessionService.updateByHash(
      { id: data.sessionId, hash: data.hash },
      { hash },
    );

    if (!session) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findById(session.user.id);

    if (!user?.role || Number(user.status?.id) !== StatusId.active) {
      throw new UnauthorizedException();
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: {
        id: user.role.id,
      },
      sessionId: session.id,
      hash,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async softDelete(userJwtPayload: JwtPayloadType): Promise<void> {
    if (Number(userJwtPayload.role?.id) === RoleId.admin)
      throw new UnprocessableEntityException(
        'Administrators must be reassigned by another administrator before deletion',
      );
    await this.usersService.remove(userJwtPayload.id);
  }

  async logout(data: Pick<JwtPayloadType, 'sessionId'>) {
    return this.sessionService.deleteById(data.sessionId);
  }

  private invalidLoginException(
    errors: Record<string, string>,
  ): UnprocessableEntityException {
    const uniformErrors = this.configService.getOrThrow('auth.uniformErrors', {
      infer: true,
    });

    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: uniformErrors
        ? {
            email: 'incorrectEmailOrPassword',
            password: 'incorrectEmailOrPassword',
          }
        : errors,
    });
  }

  private getForgotSecret(user: User): string {
    // The secret embeds the current password hash, so every outstanding
    // reset link stops verifying as soon as the password changes — this is
    // what makes reset links single-use without storing anything extra.
    const forgotSecret = this.configService.getOrThrow('auth.forgotSecret', {
      infer: true,
    });

    return `${forgotSecret}${user.password ?? ''}`;
  }

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
    hash: Session['hash'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }
}
