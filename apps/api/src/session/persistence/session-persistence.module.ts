import { Module } from '@nestjs/common';
import { SessionRepository } from './session.repository';
import { TypeOrmSessionRepository } from './typeorm-session.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SessionEntity])],
  providers: [
    {
      provide: SessionRepository,
      useClass: TypeOrmSessionRepository,
    },
  ],
  exports: [SessionRepository],
})
export class SessionsPersistenceModule {}
