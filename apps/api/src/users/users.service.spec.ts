import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { FilesService } from '../files/files.service';
import { UsersService } from './users.service';
import { UserRepository } from './persistence/user.repository';

describe('UsersService', () => {
  const repository = {
    create: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
  };
  const files = { findById: jest.fn() };
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: repository },
        { provide: FilesService, useValue: files },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('preserves omitted fields during profile updates', async () => {
    await service.update(1, { firstName: 'Updated' });
    expect(repository.update).toHaveBeenCalledWith(1, { firstName: 'Updated' });
  });

  it('hashes new passwords before persistence', async () => {
    await service.update(1, { password: 'new-password' });
    const changes = repository.update.mock.calls[0][1] as { password: string };
    expect(changes.password).not.toBe('new-password');
    expect(await bcrypt.compare('new-password', changes.password)).toBe(true);
  });

  it('permits the current email and rejects another account email', async () => {
    repository.findByEmail.mockResolvedValue({ id: 1 });
    await expect(
      service.update(1, { email: 'same@example.com' }),
    ).resolves.toBeUndefined();
    repository.findByEmail.mockResolvedValue({ id: 2 });
    await expect(
      service.update(1, { email: 'taken@example.com' }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('rejects enum names and unknown relation IDs', async () => {
    await expect(
      service.update(1, { role: { id: 'admin' } }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      service.update(1, { status: { id: 0 } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('clears a photo explicitly and rejects nonexistent files', async () => {
    await service.update(1, { photo: null });
    expect(repository.update).toHaveBeenCalledWith(1, { photo: null });
    files.findById.mockResolvedValue(null);
    await expect(
      service.update(1, { photo: { id: 'missing', path: '' } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('creates email accounts with a hashed password', async () => {
    await service.create({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'password',
    });
    const changes = repository.create.mock.calls[0][0] as {
      password: string;
      provider: string;
    };
    expect(changes.provider).toBe('email');
    expect(await bcrypt.compare('password', changes.password)).toBe(true);
  });
});
