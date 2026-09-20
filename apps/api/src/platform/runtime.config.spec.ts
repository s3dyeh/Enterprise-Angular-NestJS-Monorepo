import { loadRuntimeConfig } from './runtime.config';
describe('Runtime feature configuration', () => {
  const original = process.env;
  beforeEach(() => {
    process.env = { NODE_ENV: 'test' };
  });
  afterEach(() => {
    process.env = original;
  });
  it('disables optional integrations without loading credentials', () => {
    expect(loadRuntimeConfig()).toMatchObject({
      recaptchaEnabled: false,
      redisMode: 'disabled',
    });
  });
  it('rejects enabled captcha without server policy', () => {
    process.env.RECAPTCHA_ENABLED = 'true';
    expect(() => loadRuntimeConfig()).toThrow(/reCAPTCHA requires/);
  });
  it('rejects typo flags instead of silently disabling protection', () => {
    process.env.RECAPTCHA_ENABLED = 'yes';
    expect(() => loadRuntimeConfig()).toThrow(/true or false/);
  });
  it('validates cluster seeds and keeps credentials separate', () => {
    process.env.REDIS_MODE = 'cluster';
    process.env.REDIS_CLUSTER_NODES =
      'redis://redis-a:6379,redis://redis-b:6379';
    expect(loadRuntimeConfig().redisNodes).toEqual([
      { host: 'redis-a', port: 6379 },
      { host: 'redis-b', port: 6379 },
    ]);
    process.env.REDIS_CLUSTER_NODES = 'redis://user:password@redis-a:6379';
    expect(() => loadRuntimeConfig()).toThrow(/without embedded credentials/);
  });
});
