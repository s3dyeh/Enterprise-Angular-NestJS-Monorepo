import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { AdminMutationService } from './admin-mutation.service';
import { UserEntity } from '../users/persistence/user.entity';

describe('AccountsService safeguards', () => {
  const accounts = {};
  const mutations = { mutate: jest.fn(), audit: jest.fn() };
  let service: AccountsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: getRepositoryToken(UserEntity), useValue: accounts },
        { provide: AdminMutationService, useValue: mutations },
      ],
    }).compile();
    service = module.get(AccountsService);
  });

  it('rejects self-disable before opening a transaction', async () => {
    await expect(
      service.save('user', { status: 'in_active' }, 7, 7),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mutations.mutate).not.toHaveBeenCalled();
  });

  it('rejects self-delete before opening a transaction', async () => {
    await expect(service.remove('user', 7, 7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mutations.mutate).not.toHaveBeenCalled();
  });

  it('rejects empty updates before opening a transaction', async () => {
    await expect(service.save('user', {}, 1, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mutations.mutate).not.toHaveBeenCalled();
  });
});
