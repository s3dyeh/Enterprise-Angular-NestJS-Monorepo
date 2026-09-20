import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hashPassword } from '../../utils/password';
import { RoleEntity } from '../../roles/persistence/role.entity';
import { RoleId } from '../../roles/roles.enum';
import { StatusEntity } from '../../statuses/persistence/status.entity';
import { StatusId } from '../../statuses/statuses.enum';
import { UserEntity } from '../../users/persistence/user.entity';

@Injectable()
export class SeedService {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const accounts = [
      {
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
        role: RoleId.admin,
      },
      {
        email: process.env.SEED_USER_EMAIL,
        password: process.env.SEED_USER_PASSWORD,
        role: RoleId.user,
      },
    ];
    for (const account of accounts) {
      if (Boolean(account.email) !== Boolean(account.password))
        throw new Error('Seed email and password must be supplied together.');
      if (account.password && account.password.length < 12)
        throw new Error('Seed passwords must contain at least 12 characters.');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.upsert(
        RoleEntity,
        [
          { id: RoleId.admin, name: 'Admin' },
          { id: RoleId.user, name: 'User' },
        ],
        ['id'],
      );
      await manager.upsert(
        StatusEntity,
        [
          { id: StatusId.active, name: 'Active' },
          { id: StatusId.inactive, name: 'Inactive' },
        ],
        ['id'],
      );
      for (const account of accounts) {
        if (!account.email || !account.password) continue;
        const email = account.email.trim().toLowerCase();
        if (await manager.existsBy(UserEntity, { email })) continue;
        await manager.save(
          UserEntity,
          manager.create(UserEntity, {
            email,
            password: await hashPassword(account.password, () => {
              throw new Error('Seed password exceeds 72 bytes');
            }),
            firstName: account.role === RoleId.admin ? 'Admin' : 'User',
            lastName: 'Account',
            role: { id: account.role },
            status: { id: StatusId.active },
          }),
        );
      }
    });
  }
}
