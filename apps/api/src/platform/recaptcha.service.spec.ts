import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';

describe('reCAPTCHA verification', () => {
  const originalFetch = global.fetch;
  const good = {
    success: true,
    score: 0.9,
    action: 'login',
    hostname: 'example.com',
    challenge_ts: new Date().toISOString(),
  };
  const create = (enabled = true) =>
    new RecaptchaService(
      new ConfigService({
        runtime: {
          recaptchaEnabled: enabled,
          siteKey: 'public',
          secretKey: 'private',
          hostnames: ['example.com'],
          minScore: 0.5,
        },
      }),
    );
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('does not load or verify tokens when disabled', async () => {
    global.fetch = jest.fn();
    await create(false).verify(undefined, 'login');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('verifies server-side and exposes no secret in public configuration', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(good) });
    await create().verify('token', 'login');
    expect(create().publicConfig()).toEqual({
      enabled: true,
      siteKey: 'public',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it.each([
    { score: 0.1 },
    { action: 'register' },
    { hostname: 'attacker.example' },
    { success: false },
    { challenge_ts: 'invalid' },
    { challenge_ts: new Date(Date.now() - 180000).toISOString() },
  ])('rejects invalid verification %j', async (invalid) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...good, ...invalid }),
    });
    await expect(create().verify('token', 'login')).rejects.toMatchObject({
      status: 403,
    });
  });
  it('fails closed when the provider is unavailable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));
    await expect(create().verify('token', 'login')).rejects.toMatchObject({
      status: 503,
    });
  });
});
