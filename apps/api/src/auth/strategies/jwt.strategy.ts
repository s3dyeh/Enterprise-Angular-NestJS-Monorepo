import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadType } from './types/jwt-payload.type';
import { AppConfiguration } from '../../config/config.type';
import { DataSource } from 'typeorm';
import { SessionEntity } from '../../session/persistence/session.entity';
import { StatusId } from '../../statuses/statuses.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AppConfiguration>,
    private readonly source: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('auth.secret', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  public async validate(
    payload: JwtPayloadType,
  ): Promise<JwtPayloadType & { permissions: string[] }> {
    if (
      !Number.isSafeInteger(payload.id) ||
      !Number.isSafeInteger(payload.sessionId)
    ) {
      throw new UnauthorizedException();
    }
    // TypeORM applies soft-delete filters to both the session and joined user.
    const account = await this.source
      .getRepository(SessionEntity)
      .createQueryBuilder('session')
      .innerJoin('session.user', 'user')
      .innerJoin('user.role', 'role')
      .select(['user.roleId AS "roleId"', 'role.resources AS resources'])
      .where(
        'session.id = :sessionId AND user.id = :userId AND user.statusId = :status',
        {
          sessionId: payload.sessionId,
          userId: payload.id,
          status: StatusId.active,
        },
      )
      .getRawOne<{ roleId: number; resources: string }>();
    if (!account) throw new UnauthorizedException();
    return {
      ...payload,
      role: { id: account.roleId },
      permissions: account.resources.split(',').filter(Boolean),
    };
  }
}
