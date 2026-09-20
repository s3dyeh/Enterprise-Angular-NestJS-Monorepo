const FALLBACK = '/dashboard';

export function safeReturnUrl(url: string | null | undefined, fallback = FALLBACK): string {
  if (!url) {
    return fallback;
  }
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/login')) {
    return fallback;
  }
  return url;
}

export function isAppReturnUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login');
}
