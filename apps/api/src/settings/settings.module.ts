import { LoginUnblockService } from './login-unblock.service';
import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, LoginUnblockService],
})
export class SettingsModule {}
