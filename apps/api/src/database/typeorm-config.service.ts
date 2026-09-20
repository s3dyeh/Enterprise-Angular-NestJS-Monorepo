import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AppConfiguration } from '../config/config.type';
import { createDatabaseOptions } from './database.options';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(
    private readonly configService: ConfigService<AppConfiguration>,
  ) {}

  createTypeOrmOptions() {
    return createDatabaseOptions(
      this.configService.getOrThrow('database', { infer: true }),
    );
  }
}
