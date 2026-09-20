import { AccountResponseDto } from './account-response.dto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { hashPassword } from '../utils/password';
import { applySearch, paginateRaw } from './admin-query';
import { UserEntity } from '../users/persistence/user.entity';
import { revokeUserSessions } from '../session/persistence/revoke-user-sessions';
import { RoleId } from '../roles/roles.enum';
import { StatusId } from '../statuses/statuses.enum';
import { RoleEntity } from '../roles/persistence/role.entity';
import { AdminQueryDto } from './admin-query.dto';
import { AdminMutationService } from './admin-mutation.service';
import { AdminAccountDto, UpdateAdminAccountDto } from './accounts.dto';

type AccountType = 'user' | 'customer';

const fullName = "concat_ws(' ', account.firstName, account.lastName)";
const status = `CASE WHEN account.statusId = ${StatusId.active} THEN 'active' ELSE 'in_active' END`;
const sortColumns: Readonly<Record<string, string>> = {
  id: 'account.id',
  email: 'account.email',
  username: 'account.username',
  phone: 'account.phone',
  full_name: fullName,
  status,
};

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly accounts: Repository<UserEntity>,
    private readonly mutations: AdminMutationService,
  ) {}

  private selection(repository: Repository<UserEntity>) {
    // Explicit projections keep passwords and authentication metadata out of admin responses.
    return repository
      .createQueryBuilder('account')
      .select('account.id', 'id')
      .addSelect(fullName, 'full_name')
      .addSelect('account.username', 'username')
      .addSelect('account.email', 'email')
      .addSelect('account.phone', 'phone')
      .addSelect('account.accountType', 'type')
      .addSelect('account.roleId', 'role_id')
      .addSelect(status, 'status');
  }

  async list(type: AccountType, query: AdminQueryDto) {
    const builder = this.selection(this.accounts).where(
      'account.accountType = :type',
      { type },
    );
    applySearch(
      builder,
      [fullName, 'account.username', 'account.email', 'account.phone'],
      query.search,
    );
    return paginateRaw<AccountResponseDto, UserEntity>(
      builder,
      query,
      sortColumns,
      'account.id',
    );
  }

  // Every administrative account mutation takes this stable row lock first.
  // Locking only the target account would allow two admins to remove each other.
  private async lockAdministration(manager: EntityManager) {
    await manager
      .getRepository(RoleEntity)
      .createQueryBuilder('role')
      .select('role.id')
      .where('role.id = :id', { id: RoleId.admin })
      .setLock('pessimistic_write')
      .getOneOrFail();
  }

  private async lockAccount(
    repository: Repository<UserEntity>,
    type: AccountType,
    id: number,
  ) {
    const account = await repository
      .createQueryBuilder('account')
      .select(['account.id', 'account.roleId', 'account.statusId'])
      .where('account.id = :id AND account.accountType = :type', { id, type })
      .setLock('pessimistic_write')
      .getOne();
    if (!account) throw new NotFoundException();
    return account;
  }

  async save(
    type: AccountType,
    dto: AdminAccountDto | UpdateAdminAccountDto,
    actor: number,
    id?: number,
  ) {
    const creating = id === undefined;
    if (id === actor && dto.status !== undefined && dto.status !== 'active')
      throw new BadRequestException('You cannot disable yourself');
    const changes: Partial<UserEntity> = {};
    if (dto.full_name !== undefined) {
      const name = dto.full_name.trim();
      if (name.length < 2)
        throw new BadRequestException(
          'Full name must contain at least two characters',
        );
      const [first, ...last] = name.split(/\s+/);
      changes.firstName = first;
      changes.lastName = last.join(' ');
    }
    if (dto.username !== undefined) changes.username = dto.username;
    if (dto.phone !== undefined) changes.phone = dto.phone;
    if (dto.email !== undefined) changes.email = dto.email.trim().toLowerCase();
    if (dto.password)
      changes.password = await hashPassword(dto.password, () => {
        throw new BadRequestException('Password exceeds 72 bytes');
      });
    if (dto.status !== undefined)
      changes.statusId =
        dto.status === 'active' ? StatusId.active : StatusId.inactive;
    if (dto.role_id != null && type === 'user') changes.roleId = dto.role_id;
    if (!Object.keys(changes).length)
      throw new BadRequestException('No changes supplied');
    if (type === 'customer') changes.roleId = RoleId.user;
    if (id === undefined) {
      changes.accountType = type;
      changes.roleId ??= RoleId.user;
    }
    return this.mutations.mutate(async (manager) => {
      await this.lockAdministration(manager);
      const accounts = manager.getRepository(UserEntity);
      if (id !== undefined) {
        const existing = await this.lockAccount(accounts, type, id);
        if (
          id === actor &&
          changes.roleId !== undefined &&
          changes.roleId !== existing.roleId
        )
          throw new BadRequestException('You cannot change your own role');
        if (changes.roleId === existing.roleId) delete changes.roleId;
        if (
          existing.roleId === RoleId.admin &&
          existing.statusId === StatusId.active &&
          ((changes.roleId !== undefined && changes.roleId !== RoleId.admin) ||
            changes.statusId === StatusId.inactive)
        ) {
          const admins = await accounts.countBy({
            roleId: RoleId.admin,
            statusId: StatusId.active,
          });
          if (admins <= 1)
            throw new BadRequestException(
              'At least one active administrator is required',
            );
        }
        if (Object.keys(changes).length) await accounts.update(id, changes);
      } else {
        const account = await accounts.save(accounts.create(changes));
        id = account.id;
      }
      if (
        !creating &&
        (dto.password ||
          changes.roleId !== undefined ||
          dto.status === 'in_active')
      ) {
        await revokeUserSessions(manager, id);
      }
      await this.mutations.audit(
        manager,
        actor,
        `${type}.${creating ? 'created' : 'updated'}`,
        id,
      );
      const account = await this.selection(accounts)
        .where('account.id = :id', { id })
        .getRawOne<AccountResponseDto>();
      if (!account) throw new NotFoundException();
      return { data: account };
    });
  }

  async remove(type: AccountType, id: number, actor: number) {
    if (id === actor)
      throw new BadRequestException('You cannot delete yourself');
    return this.mutations.mutate(async (manager) => {
      await this.lockAdministration(manager);
      const accounts = manager.getRepository(UserEntity);
      const account = await this.lockAccount(accounts, type, id);
      if (account.roleId === RoleId.admin)
        throw new BadRequestException(
          'Reassign the administrator role before deleting the account',
        );
      await accounts.softDelete(id);
      await revokeUserSessions(manager, id);
      await this.mutations.audit(manager, actor, `${type}.deleted`, id);
    });
  }
}
