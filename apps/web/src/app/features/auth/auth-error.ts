import { HttpErrorResponse } from '@angular/common/http';

/** Return public translation keys, never raw infrastructure errors. */
export function authError(error: unknown, fallback = 'saas.auth.generic'): string {
  if (!(error instanceof HttpErrorResponse)) return 'saas.auth.verificationUnavailable';
  if (error.status === 0) return 'saas.auth.offline';
  if (error.status === 429) return 'saas.auth.rateLimited';
  if (error.status === 503 && error.error?.errors?.mail === 'mailDeliveryUnavailable') {
    return 'saas.auth.mailUnavailable';
  }
  if (error.status >= 500) return 'saas.auth.generic';
  return fallback;
}
