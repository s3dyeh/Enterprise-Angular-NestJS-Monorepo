import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { AdminMutationService } from './admin-mutation.service';
import { AdminStore } from './admin-store.service';
import { regions } from './catalog-resources';

describe('AdminStore writable allowlist', () => {
  const source = { getRepository: jest.fn() };
  const mutations = { mutate: jest.fn(), audit: jest.fn() };
  let store: AdminStore;

  beforeEach(async () => {
    jest.resetAllMocks();
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work({} as EntityManager),
    );
    const module = await Test.createTestingModule({
      providers: [
        AdminStore,
        { provide: DataSource, useValue: source },
        { provide: AdminMutationService, useValue: mutations },
      ],
    }).compile();
    store = module.get(AdminStore);
  });

  it('rejects saves that supply no allowlisted changes', async () => {
    await expect(
      store.save(regions, { id: 1, secret: 'x' }, 3),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mutations.mutate).not.toHaveBeenCalled();
  });

  it('persists only writable columns and audits the mutation', async () => {
    const insert = {
      values: jest.fn().mockReturnThis(),
      updateEntity: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [{ id: 5, name: 'North' }] }),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue(insert),
      }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager as unknown as EntityManager),
    );

    await expect(
      store.save(regions, { name: 'North', rogue: true }, 3),
    ).resolves.toEqual({ data: { id: 5, name: 'North' } });
    expect(insert.values).toHaveBeenCalledWith({ name: 'North' });
    expect(mutations.audit).toHaveBeenCalledWith(
      manager,
      3,
      'regions.created',
      5,
    );
  });

  it('treats missing update targets as not found', async () => {
    const update = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [] }),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue(update),
      }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager as unknown as EntityManager),
    );

    await expect(
      store.save(regions, { name: 'Gone' }, 3, 99),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
