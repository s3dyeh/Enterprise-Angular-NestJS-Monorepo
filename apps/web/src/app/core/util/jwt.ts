function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + '='.repeat(pad));
}

export function isTokenExpired(token: string | undefined, skewMs = 30_000): boolean {
  if (!token) {
    return true;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return false;
  }
}
