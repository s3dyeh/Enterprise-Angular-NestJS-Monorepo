import { isTokenExpired } from './jwt';

function token(payload: object): string {
  const json = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${json}.sig`;
}

describe('isTokenExpired', () => {
  it('treats a missing token as expired', () => {
    expect(isTokenExpired(undefined)).toBeTrue();
    expect(isTokenExpired('')).toBeTrue();
  });

  it('does not expire opaque non-JWT tokens', () => {
    expect(isTokenExpired('opaque-session-token')).toBeFalse();
  });

  it('does not expire a JWT without exp', () => {
    expect(isTokenExpired(token({ sub: '1' }))).toBeFalse();
  });

  it('expires a JWT whose exp is in the past', () => {
    expect(isTokenExpired(token({ exp: 1 }))).toBeTrue();
  });

  it('keeps a JWT whose exp is in the future', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(token({ exp }))).toBeFalse();
  });

  it('treats a malformed JWT payload as not expired', () => {
    expect(isTokenExpired('a.not-json.b')).toBeFalse();
  });
});
