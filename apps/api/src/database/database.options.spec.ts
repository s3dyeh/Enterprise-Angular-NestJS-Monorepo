import { createDatabaseOptions } from './database.options';

describe('Database options', () => {
  it('uses the database URL without overriding it with host defaults', () => {
    const options = createDatabaseOptions({
      url: 'postgres://localhost/example',
      host: 'wrong-host',
      maxConnections: 10,
    });
    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgres://localhost/example',
      logging: false,
      extra: { max: 10 },
    });
    expect(options).not.toHaveProperty('host');
  });

  it('preserves explicit TLS settings and ignores empty certificate paths', () => {
    expect(
      createDatabaseOptions({
        maxConnections: 10,
        sslEnabled: true,
        rejectUnauthorized: true,
        ca: '',
      }),
    ).toMatchObject({
      ssl: {
        rejectUnauthorized: true,
        ca: undefined,
        key: undefined,
        cert: undefined,
      },
    });
  });
});
