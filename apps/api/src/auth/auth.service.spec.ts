import { User } from '../users/domain/user';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SessionService } from '../session/session.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  const users = {
    findById: jest.fn(),
    update: jest.fn(),
    updateAtomically: jest.fn(),
    findByEmail: jest.fn(),
  };
  const sessions = {
    updateByHash: jest.fn(),
    deleteByUserId: jest.fn(),
    create: jest.fn(),
    deleteById: jest.fn(),
  };
  const mail = { forgotPassword: jest.fn() };
  const jwt = new JwtService();
  let service: AuthService;
  const config: Record<string, unknown> = {
    'auth.secret': 'test-access',
    'auth.refreshSecret': 'test-refresh',
    'auth.forgotSecret': 'test-forgot',
    'auth.confirmEmailSecret': 'test-confirm',
    'auth.confirmEmailExpires': '1d',
    'auth.expires': '15m',
    'auth.refreshExpires': '30d',
    'auth.uniformErrors': true,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    users.update.mockImplementation((id: number, changes: object) =>
      Promise.resolve({ id, ...changes }),
    );
    users.updateAtomically.mockImplementation(
      async (
        id: number,
        prepare: (
          user: User,
        ) => Promise<{ updates: object; revokeSessions?: object }>,
      ) => {
        const current = (await users.findById(id)) as User;
        const mutation = await prepare(current);
        if (mutation.revokeSessions)
          await sessions.deleteByUserId({ userId: id });
        return users.update(id, mutation.updates) as Promise<User>;
      },
    );
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: SessionService, useValue: sessions },
        { provide: MailService, useValue: mail },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => config[key] },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('treats links to missing accounts as invalid links', async () => {
    users.updateAtomically.mockRejectedValue(new NotFoundException());
    const hash = jwt.sign({ forgotUserId: 123 }, { secret: 'test' });
    await expect(
      service.resetPassword(hash, 'new-password'),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('does not mask database failures as invalid links', async () => {
    const outage = new Error('database unavailable');
    users.updateAtomically.mockRejectedValue(outage);
    const hash = jwt.sign({ forgotUserId: 123 }, { secret: 'test' });
    await expect(service.resetPassword(hash, 'new-password')).rejects.toBe(
      outage,
    );
  });

  it('rejects refresh replay when the stored hash no longer matches', async () => {
    sessions.updateByHash.mockResolvedValue(null);
    await expect(
      service.refreshToken({ sessionId: 1, hash: 'old' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rotates the refresh secret and signs tokens with the current role', async () => {
    sessions.updateByHash.mockResolvedValue({ id: 1, user: { id: 2 } });
    users.findById.mockResolvedValue({
      id: 2,
      role: { id: 2 },
      status: { id: 1 },
    });
    const result = await service.refreshToken({ sessionId: 1, hash: 'old' });
    const refresh = jwt.verify<{ hash: string; sessionId: number }>(
      result.refreshToken,
      { secret: 'test-refresh' },
    );
    expect(refresh.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions.updateByHash).toHaveBeenCalledWith(
      { id: 1, hash: 'old' },
      { hash: refresh.hash },
    );
    expect(
      jwt.verify<{ role: { id: number } }>(result.token, {
        secret: 'test-access',
      }).role.id,
    ).toBe(2);
  });

  it('makes password reset links unusable after the stored password changes', async () => {
    users.findById.mockResolvedValue({ id: 1, password: 'new-hash' });
    const token = jwt.sign(
      { forgotUserId: 1 },
      { secret: 'test-forgotold-hash', expiresIn: '1h' },
    );
    await expect(
      service.resetPassword(token, 'replacement'),
    ).rejects.toMatchObject({ status: 422 });
    expect(users.update).not.toHaveBeenCalled();
    expect(sessions.deleteByUserId).not.toHaveBeenCalled();
  });

  it('updates only the password and revokes sessions after verifying a reset link', async () => {
    users.findById.mockResolvedValue({
      id: 1,
      password: 'old-hash',
      email: 'existing@example.com',
    });
    const token = jwt.sign(
      { forgotUserId: 1 },
      { secret: 'test-forgotold-hash', expiresIn: '1h' },
    );
    await service.resetPassword(token, 'replacement');
    expect(users.update).toHaveBeenCalledWith(1, { password: 'replacement' });
    expect(sessions.deleteByUserId).toHaveBeenCalledWith({ userId: 1 });
  });

  it('does not mutate profile DTOs or persist request-only fields', async () => {
    users.findById.mockResolvedValue({ id: 1, email: 'existing@example.com' });
    const dto = Object.freeze({
      email: 'existing@example.com',
      firstName: 'Changed',
      oldPassword: 'unused',
    });
    await service.update(
      { id: 1, role: { id: 2 }, sessionId: 3, iat: 0, exp: 9999999999 },
      dto,
    );
    expect(users.update).toHaveBeenCalledWith(1, { firstName: 'Changed' });
  });

  it('conceals nonexistent email addresses when uniform errors are enabled', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.forgotPassword('missing@example.com'),
    ).resolves.toBeUndefined();
    expect(mail.forgotPassword).not.toHaveBeenCalled();
  });

  it('returns a uniform login error for unknown accounts', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.validateLogin({ email: 'missing@example.com', password: 'x' }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          email: 'incorrectEmailOrPassword',
          password: 'incorrectEmailOrPassword',
        },
      },
    });
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('logs out by deleting only the current session id', async () => {
    sessions.deleteById.mockResolvedValue(undefined);
    await service.logout({ sessionId: 44 });
    expect(sessions.deleteById).toHaveBeenCalledWith(44);
  });

  it('rejects confirmation links that are not pending verification', async () => {
    users.findById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password: 'hash',
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      status: { id: 1 },
    });
    users.updateAtomically.mockImplementation(
      async (
        id: number,
        prepare: (
          user: User,
        ) => Promise<{ updates: object; revokeSessions?: object }>,
      ) => {
        const current = (await users.findById(id)) as User;
        await prepare(current);
        return current;
      },
    );
    const token = jwt.sign(
      { confirmEmailUserId: 1 },
      {
        secret:
          'test-confirm' +
          JSON.stringify([
            1,
            'user@example.com',
            'hash',
            new Date('2024-01-01T00:00:00.000Z'),
          ]),
        expiresIn: '1h',
      },
    );
    await expect(service.confirmEmail(token)).rejects.toMatchObject({
      message: 'Invalid confirmation link',
    });
  });
});
