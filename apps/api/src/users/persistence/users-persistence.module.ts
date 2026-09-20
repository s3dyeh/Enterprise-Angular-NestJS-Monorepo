import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [
    {
      provide: UserRepository,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [UserRepository],
})
export class UsersPersistenceModule {}
