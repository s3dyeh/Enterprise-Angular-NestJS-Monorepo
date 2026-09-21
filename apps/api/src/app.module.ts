import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import path from 'node:path';
import { ConditionalModule, ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { HomeModule } from './home/home.module';
import { AppConfiguration } from './config/config.type';
import runtimeConfig from './platform/runtime.config';
import { PlatformModule } from './platform/platform.module';
import { AdminModule } from './admin/admin.module';
import { GeographyModule } from './geography/geography.module';
import { AccountingModule } from './accounting/accounting.module';
import { SettingsModule } from './settings/settings.module';
import { ObservabilityModule } from './observability/observability.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { businessExamplesEnabled } from './platform/business-examples.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        runtimeConfig,
      ],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AppConfiguration>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: {
          path: path.join(__dirname, 'i18n'),
          watch:
            configService.getOrThrow('app.nodeEnv', { infer: true }) ===
            'development',
        },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AppConfiguration>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    WorkspacesModule,
    PlatformModule,
    ObservabilityModule,
    AdminModule,
    ConditionalModule.registerWhen(GeographyModule, businessExamplesEnabled),
    ConditionalModule.registerWhen(AccountingModule, businessExamplesEnabled),
    SettingsModule,
    FilesModule,
    AuthModule,
    HomeModule,
  ],
})
export class AppModule {}
