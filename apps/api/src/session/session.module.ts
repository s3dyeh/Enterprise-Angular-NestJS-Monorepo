import { Module } from '@nestjs/common';
import { SessionsPersistenceModule } from './persistence/session-persistence.module';
import { SessionService } from './session.service';

@Module({
  imports: [SessionsPersistenceModule],
  providers: [SessionService],
  exports: [SessionService, SessionsPersistenceModule],
})
export class SessionModule {}
