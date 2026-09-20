import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { AdminMutationService } from './admin-mutation.service';

describe('administrative transaction boundary', () => {
  const source = { transaction: jest.fn() };
  let service: AdminMutationService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AdminMutationService,
        { provide: DataSource, useValue: source },
      ],
    }).compile();
    service = module.get(AdminMutationService);
  });

  it.each([
    ['23505', ConflictException],
    ['23503', ConflictException],
    ['23514', BadRequestException],
    ['22003', BadRequestException],
  ])(
    'translates database constraint %s consistently',
    async (code, exception) => {
      source.transaction.mockRejectedValue(
        new QueryFailedError(
          'query',
          [],
          Object.assign(new Error('driver details'), { code }),
        ),
      );
      await expect(
        service.mutate(() => Promise.resolve(null)),
      ).rejects.toBeInstanceOf(exception);
    },
  );

  it('preserves application errors instead of treating arbitrary code properties as SQL errors', async () => {
    const error = Object.assign(new Error('application failure'), {
      code: '23505',
    });
    source.transaction.mockRejectedValue(error);
    await expect(service.mutate(() => Promise.resolve(null))).rejects.toBe(
      error,
    );
  });

  it('runs the callback with the transaction manager and returns its result', async () => {
    const manager = new EntityManager({} as DataSource);
    source.transaction.mockImplementation(
      (work: (manager: EntityManager) => Promise<string>) => work(manager),
    );
    const work = jest.fn((received: EntityManager) =>
      Promise.resolve(received === manager ? 'saved' : 'wrong manager'),
    );
    await expect(service.mutate(work)).resolves.toBe('saved');
  });
});
