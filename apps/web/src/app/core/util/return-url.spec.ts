import { isAppReturnUrl, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('falls back when the url is empty', () => {
    expect(safeReturnUrl(null)).toBe('/dashboard');
    expect(safeReturnUrl('')).toBe('/dashboard');
  });

  it('rejects open redirects and login', () => {
    expect(safeReturnUrl('https://evil.test')).toBe('/dashboard');
    expect(safeReturnUrl('//evil.test')).toBe('/dashboard');
    expect(safeReturnUrl('/login')).toBe('/dashboard');
    expect(safeReturnUrl('/login?x=1')).toBe('/dashboard');
  });

  it('keeps in-app paths', () => {
    expect(safeReturnUrl('/settings/cities')).toBe('/settings/cities');
  });

  it('accepts a custom fallback', () => {
    expect(safeReturnUrl(null, '/home')).toBe('/home');
  });
});

describe('isAppReturnUrl', () => {
  it('allows relative app urls only', () => {
    expect(isAppReturnUrl('/settings/cities')).toBeTrue();
    expect(isAppReturnUrl('/login')).toBeFalse();
    expect(isAppReturnUrl('//evil.test')).toBeFalse();
    expect(isAppReturnUrl(undefined)).toBeFalse();
  });
});
