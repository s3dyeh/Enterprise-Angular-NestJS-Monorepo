import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from './config/database-config.type';

export function createDatabaseOptions(
  config: DatabaseConfig,
): DataSourceOptions {
  return {
    type: 'postgres',
    ...(config.url
      ? { url: config.url }
      : {
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          database: config.name,
        }),
    synchronize: config.synchronize,
    logging: false,
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
    extra: {
      max: config.maxConnections,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    },
    ssl: config.sslEnabled
      ? {
          rejectUnauthorized: config.rejectUnauthorized,
          ca: config.ca || undefined,
          key: config.key || undefined,
          cert: config.cert || undefined,
        }
      : false,
  };
}
