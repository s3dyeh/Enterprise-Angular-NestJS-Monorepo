import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { hashPassword } from '../utils/password';
import { AuthProvider } from '../auth/auth-providers.enum';
import { FilesService } from '../files/files.service';
import { RoleId } from '../roles/roles.enum';
import { StatusId } from '../statuses/statuses.enum';
import { User } from './domain/user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './persistence/user.repository';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const data = await this.prepareChanges(dto);
    return this.usersRepository.create({
      ...data,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email ?? null,
      provider: dto.provider ?? AuthProvider.email,
    });
  }

  findManyWithPagination(
    options: Parameters<UserRepository['findManyWithPagination']>[0],
  ) {
    return this.usersRepository.findManyWithPagination(options);
  }

  findById(id: User['id']) {
    return this.usersRepository.findById(id);
  }
  findByEmail(email: User['email']) {
    return this.usersRepository.findByEmail(email);
  }
  async update(id: User['id'], dto: UpdateUserDto) {
    return this.usersRepository.update(id, await this.prepareChanges(dto, id));
  }
  async updateAtomically(
    id: User['id'],
    prepare: (current: User) => Promise<{
      updates: UpdateUserDto;
      revokeSessions?: { excludeSessionId?: number };
    }>,
  ): Promise<User> {
    try {
      return await this.usersRepository.updateAtomically(
        id,
        async (current) => {
          const mutation = await prepare(current);
          return {
            changes: await this.prepareChanges(mutation.updates, id),
            revokeSessions: mutation.revokeSessions,
          };
        },
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        this.invalidField('email', 'emailAlreadyExists');
      }
      throw error;
    }
  }
  remove(id: User['id']) {
    return this.usersRepository.remove(id);
  }

  private async prepareChanges(
    dto: UpdateUserDto,
    userId?: User['id'],
  ): Promise<Partial<User>> {
    const changes: Partial<User> = {};
    // Explicit fields prevent request-only properties from reaching persistence.
    for (const key of [
      'firstName',
      'lastName',
      'email',
      'provider',
      'socialId',
    ] as const) {
      const value = dto[key];
      if (value !== undefined) Object.assign(changes, { [key]: value });
    }
    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== userId)
        this.invalidField('email', 'emailAlreadyExists');
    }
    if (dto.password) {
      changes.password = await hashPassword(dto.password, () =>
        this.invalidField('password', 'passwordTooLong'),
      );
    }
    if (dto.photo === null) changes.photo = null;
    else if (dto.photo) {
      const photo = await this.filesService.findById(dto.photo.id);
      if (!photo) this.invalidField('photo', 'imageNotExists');
      changes.photo = photo;
    }
    if (dto.role != null) {
      const id = Number(dto.role.id);
      if (![RoleId.admin, RoleId.user].includes(id))
        this.invalidField('role', 'roleNotExists');
      changes.role = { id };
    }
    if (dto.status != null) {
      const id = Number(dto.status.id);
      if (
        ![
          StatusId.active,
          StatusId.inactive,
          StatusId.pendingVerification,
        ].includes(id)
      )
        this.invalidField('status', 'statusNotExists');
      changes.status = { id };
    }
    return changes;
  }

  private invalidField(field: string, error: string): never {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { [field]: error },
    });
  }
}
