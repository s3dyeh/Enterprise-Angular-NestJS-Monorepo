import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailTransportService } from './mail-transport.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService, MailTransportService],
  exports: [MailService],
})
export class MailModule {}
