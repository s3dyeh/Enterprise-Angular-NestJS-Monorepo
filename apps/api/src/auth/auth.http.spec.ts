import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { User } from '../users/domain/user';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { ResolvePromisesInterceptor } from '../utils/serializer.interceptor';
import validationOptions from '../utils/validation-options';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DataSource } from 'typeorm';
import { AuthProtectionGuard } from '../platform/auth-protection.guard';

describe('Authentication HTTP contract', () => {
  let app: INestApplication;
  const jwt = new JwtService();
  const user = Object.assign(new User(), {
    id: 1,
    email: 'test@example.com',
    password: 'private-hash',
    firstName: 'Test',
    role: { id: 1 },
  });
  const users = { findById: jest.fn().mockResolvedValue(user) };
  const auth = {
    validateLogin: jest.fn().mockResolvedValue({ user, token: 'token' }),
  };
  const token = (role: number) =>
    jwt.sign(
      { id: 1, role: { id: role }, sessionId: role },
      { secret: 'http-test-secret', expiresIn: '1h' },
    );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController, UsersController],
      providers: [
        JwtStrategy,
        {
          provide: DataSource,
          useValue: {
            getRepository: () => ({
              createQueryBuilder: () => {
                let roleId: number;
                const builder = {
                  innerJoin: () => builder,
                  select: () => builder,
                  where: (
                    _condition: string,
                    params: { sessionId: number },
                  ) => {
                    roleId = params.sessionId;
                    return builder;
                  },
                  getRawOne: () => Promise.resolve({ roleId, resources: '' }),
                };
                return builder;
              },
            }),
          },
        },
        { provide: AuthService, useValue: auth },
        { provide: UsersService, useValue: users },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'http-test-secret' },
        },
      ],
    })
      .overrideGuard(AuthProtectionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe(validationOptions));
    app.useGlobalInterceptors(
      new ResolvePromisesInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('normalizes email and strips password fields from login responses', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/login')
      .send({ email: ' TEST@example.com ', password: 'password' })
      .expect(200);
    expect(auth.validateLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('rejects invalid login bodies with the existing validation envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/email/login')
      .send({ email: 42 })
      .expect(422);
    expect(response.body.errors.email).toBeDefined();
  });

  it('protects administration routes with JWT and role guards', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/1').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/users/1')
      .auth(token(2), { type: 'bearer' })
      .expect(403);
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/1')
      .auth(token(1), { type: 'bearer' })
      .expect(200);
    expect(users.findById).toHaveBeenCalledWith(1);
    expect(response.body).not.toHaveProperty('password');
  });

  it('rejects invalid identifiers before querying persistence', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/invalid')
      .auth(token(1), { type: 'bearer' })
      .expect(400);
  });
});
