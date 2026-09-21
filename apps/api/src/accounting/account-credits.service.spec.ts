import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AdminMutationService } from '../admin/admin-mutation.service';
import { AccountCreditsService } from './account-credits.service';
import { AccountCreditEntity } from './persistence/account-credit.entity';

describe('AccountCreditsService adjustments', () => {
  const creditsRepo = { createQueryBuilder: jest.fn() };
  const mutations = { mutate: jest.fn(), audit: jest.fn() };
  let service: AccountCreditsService;

  /**
   * Build a transactional repository facade for credit and ledger tables.
   * @param options Branch outcomes for insert claim and existence checks.
   */
  function managerRepos(options: {
    insertedIds?: { id: string }[];
    existsBy?: boolean;
    balance?: string;
  }) {
    const creditInsert = {
      values: jest.fn().mockReturnThis(),
      updateEntity: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const entryInsert = {
      values: jest.fn().mockReturnThis(),
      updateEntity: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest
        .fn()
        .mockResolvedValue({ raw: options.insertedIds ?? [{ id: '1' }] }),
    };
    const credits = {
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue(creditInsert),
      }),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ id: 7, balance: options.balance ?? '10.0000' }),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    const entries = {
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue(entryInsert),
      }),
      existsBy: jest.fn().mockResolvedValue(options.existsBy ?? false),
    };
    return {
      getRepository: jest.fn((entity: unknown) =>
        entity === AccountCreditEntity ? credits : entries,
      ),
      credits,
      entries,
    };
  }

  beforeEach(async () => {
    jest.resetAllMocks();
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work({} as EntityManager),
    );
    const module = await Test.createTestingModule({
      providers: [
        AccountCreditsService,
        {
          provide: getRepositoryToken(AccountCreditEntity),
          useValue: creditsRepo,
        },
        { provide: AdminMutationService, useValue: mutations },
      ],
    }).compile();
    service = module.get(AccountCreditsService);
  });

  it('rejects zero-value adjustments before opening a transaction', () => {
    expect(() =>
      service.adjust(
        {
          account_id: 1,
          currency_id: 1,
          amount: '0.0000',
          reason: 'noop',
          idempotency_key: '11111111-1111-4111-8111-111111111111',
        },
        9,
      ),
    ).toThrow(BadRequestException);
    expect(mutations.mutate).not.toHaveBeenCalled();
  });

  it('increments the balance and audits when the idempotency key is new', async () => {
    const facade = managerRepos({
      insertedIds: [{ id: '12' }],
      balance: '35.5000',
    });
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(facade as unknown as EntityManager),
    );
    await expect(
      service.adjust(
        {
          account_id: 1,
          currency_id: 2,
          amount: '25.5000',
          reason: 'Approved credit',
          idempotency_key: '22222222-2222-4222-8222-222222222222',
        },
        9,
      ),
    ).resolves.toEqual({ data: { balance: '35.5000', replayed: false } });
    expect(facade.credits.increment).toHaveBeenCalledWith(
      { id: 7 },
      'balance',
      '25.5000',
    );
    expect(mutations.audit).toHaveBeenCalledWith(
      facade,
      9,
      'credit.adjusted',
      7,
    );
  });

  it('replays matching adjustments without incrementing again', async () => {
    const facade = managerRepos({
      insertedIds: [],
      existsBy: true,
      balance: '10.0000',
    });
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(facade as unknown as EntityManager),
    );
    await expect(
      service.adjust(
        {
          account_id: 1,
          currency_id: 2,
          amount: '25.5000',
          reason: 'Approved credit',
          idempotency_key: '33333333-3333-4333-8333-333333333333',
        },
        9,
      ),
    ).resolves.toEqual({ data: { balance: '10.0000', replayed: true } });
    expect(facade.credits.increment).not.toHaveBeenCalled();
    expect(mutations.audit).not.toHaveBeenCalled();
  });

  it('conflicts when an idempotency key was reused with different payload', async () => {
    const facade = managerRepos({ insertedIds: [], existsBy: false });
    mutations.mutate.mockImplementation(
      async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(facade as unknown as EntityManager),
    );
    await expect(
      service.adjust(
        {
          account_id: 1,
          currency_id: 2,
          amount: '1.0000',
          reason: 'Different',
          idempotency_key: '44444444-4444-4444-8444-444444444444',
        },
        9,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
