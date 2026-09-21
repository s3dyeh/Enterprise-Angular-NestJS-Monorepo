import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService limits', () => {
  const source = { transaction: jest.fn(), query: jest.fn() };
  let service: WorkspacesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [WorkspacesService, { provide: DataSource, useValue: source }],
    }).compile();
    service = module.get(WorkspacesService);
  });

  it('rejects creating more than twenty owned workspaces', async () => {
    source.transaction.mockImplementation(
      async (work: (manager: { query: jest.Mock }) => Promise<unknown>) => {
        const manager = {
          query: jest
            .fn()
            .mockResolvedValueOnce([{ id: 1 }])
            .mockResolvedValueOnce([{ count: 20 }]),
        };
        return work(manager);
      },
    );
    await expect(service.create(3, 'Ops')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires an owner to invite administrators', async () => {
    source.transaction.mockImplementation(
      async (work: (manager: { query: jest.Mock }) => Promise<unknown>) => {
        const manager = {
          query: jest
            .fn()
            .mockResolvedValueOnce([{ id: 'w1' }])
            .mockResolvedValueOnce([{ id: 'w1', name: 'Ops', role: 'admin' }]),
        };
        return work(manager);
      },
    );
    await expect(
      service.invite('w1', 3, { email: 'a@example.com', role: 'admin' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
