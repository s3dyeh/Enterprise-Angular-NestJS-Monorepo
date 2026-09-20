import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SeedService } from './seed.service';

describe('Database seeds', () => {
  const originalEnv = process.env;
  const manager = {
    upsert: jest.fn(),
    existsBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((work: (value: typeof manager) => Promise<void>) =>
      work(manager),
    ),
  };
  let service: SeedService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SEED_ADMIN_EMAIL: '',
      SEED_ADMIN_PASSWORD: '',
      SEED_USER_EMAIL: '',
      SEED_USER_PASSWORD: '',
    };
    const module = await Test.createTestingModule({
      providers: [SeedService, { provide: DataSource, useValue: dataSource }],
    }).compile();
    service = module.get(SeedService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('seeds reference data without creating default accounts', async () => {
    await service.run();
    expect(manager.upsert).toHaveBeenCalledTimes(2);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('fails before opening a transaction for incomplete account settings', async () => {
    process.env.SEED_ADMIN_EMAIL = 'admin@example.com';
    await expect(service.run()).rejects.toThrow('supplied together');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('preserves existing accounts instead of resetting passwords', async () => {
    process.env.SEED_ADMIN_EMAIL = 'ADMIN@example.com';
    process.env.SEED_ADMIN_PASSWORD = 'long-test-password';
    manager.existsBy.mockResolvedValue(true);
    await service.run();
    expect(manager.existsBy).toHaveBeenCalledWith(expect.any(Function), {
      email: 'admin@example.com',
    });
    expect(manager.save).not.toHaveBeenCalled();
  });
});
