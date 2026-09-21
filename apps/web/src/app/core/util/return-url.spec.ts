import { isAppReturnUrl, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('falls back when the url is empty', () => {
    expect(safeReturnUrl(null)).toBe('/start');
    expect(safeReturnUrl('')).toBe('/start');
  });

  it('rejects open redirects and login', () => {
    expect(safeReturnUrl('https://evil.test')).toBe('/start');
    expect(safeReturnUrl('//evil.test')).toBe('/start');
    expect(safeReturnUrl('/login')).toBe('/start');
    expect(safeReturnUrl('/login?x=1')).toBe('/start');
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
