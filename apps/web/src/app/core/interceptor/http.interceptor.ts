import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { HttpContextToken, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@environments/environment';
import type { Observable } from 'rxjs';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import { ApiEndpoints } from '../constants';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../services/message.service';
import { ValidatorService } from '../services/validator.service';
import { SpinnerOverlayService } from '../spinner/spinner-overlay.service';
import { isTokenExpired } from '../util/jwt';

const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
const retried = new HttpContextToken(() => false);

function isAuthPublic(url: string): boolean {
  return (
    url.includes('/auth/browser/') ||
    [
      '/auth/email/register',
      '/auth/email/resend',
      '/auth/email/confirm',
      '/auth/email/confirm/new',
      '/auth/forgot/password',
      '/auth/reset/password',
    ].some((path) => url.endsWith(path))
  );
}

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl.replace(/\/$/, '');
  if (req.url !== apiUrl && !req.url.startsWith(apiUrl + '/')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const messages = inject(MessageService);
  const validations = inject(ValidatorService);
  const spinner = inject(SpinnerOverlayService);
  const publicAuth = isAuthPublic(req.url);

  if (req.url.includes('assets/i18n')) {
    return next(req);
  }

  const canRefresh = !publicAuth;
  const accessExpired = !publicAuth && isTokenExpired(auth.getToken());

  if (accessExpired && !canRefresh) {
    messages.raise(401, 'errors.sessionExpired');
    auth.logout(false);
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
  }

  const withToken = (token: string | undefined, markRetry: boolean) =>
    publicAuth
      ? req
      : req.clone({
          setHeaders: { Authorization: `Bearer ${token ?? auth.getToken() ?? ''}` },
          context: markRetry ? req.context.set(retried, true) : req.context,
        });

  validations.fieldErrors = [];
  const isRefresh = req.url.endsWith(`/${ApiEndpoints.REFRESH}`);
  const showSpinner = mutating.includes(req.method) && !isRefresh;

  const sessionExpired = () => {
    messages.raise(401, 'errors.sessionExpired');
    auth.logout(false);
    return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
  };

  const send = (outgoing = withToken(undefined, false)): Observable<HttpEvent<unknown>> => {
    if (showSpinner) {
      spinner.show();
    }
    return next(outgoing).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status === 200 && showSpinner && !publicAuth) {
          messages.raise(200, 'messages.saved');
        }
      }),
      catchError((error) => {
        const payload = error?.error?.message ?? error?.error?.error;
        if (publicAuth) return throwError(() => error);
        if (error.status === 401 && !publicAuth && canRefresh && !outgoing.context.get(retried)) {
          return auth.refreshAccessToken().pipe(
            catchError(() => sessionExpired()),
            switchMap((token) => send(withToken(token, true))),
          );
        }
        if (error.status === 401) {
          messages.raise(error.status, payload);
          auth.logout(false);
        } else if (error.status === 403) {
          messages.raise(error.status, payload);
        } else if (error?.error?.errors) {
          validations.fieldErrors = Object.entries(error.error.errors).map(([name, reason]) => ({
            field: name,
            reason: String(reason),
          }));
          messages.raise(error.status, 'Please check the highlighted fields.');
        } else if (payload?.invalid_params?.length) {
          validations.fieldErrors = payload.invalid_params;
          messages.raise(error.status, payload.invalid_params[0]?.reason);
        } else {
          messages.raise(error.status, payload ?? error.message);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        if (showSpinner) {
          spinner.hide();
        }
      }),
    );
  };

  if (accessExpired && canRefresh) {
    return auth.refreshAccessToken().pipe(
      catchError(() => sessionExpired()),
      switchMap((token) => send(withToken(token, true))),
    );
  }

  return send();
};
