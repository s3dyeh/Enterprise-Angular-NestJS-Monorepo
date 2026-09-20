import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/persistence/user.entity';
import { AdminCoreModule } from './admin-core.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AdminRolesController } from './roles.controller';

@Module({
  imports: [AdminCoreModule, TypeOrmModule.forFeature([UserEntity])],
  controllers: [AccountsController, AdminRolesController],
  providers: [AccountsService],
})
export class AdminModule {}
