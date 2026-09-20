import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';

import { UsersService } from './users.service';
import { UsersPersistenceModule } from './persistence/users-persistence.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [UsersPersistenceModule, FilesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, UsersPersistenceModule],
})
export class UsersModule {}
