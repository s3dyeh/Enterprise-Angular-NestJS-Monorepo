import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, of, shareReplay, switchMap, timeout } from 'rxjs';
import { environment } from '@environments/environment';

interface Recaptcha {
  ready(callback: () => void): void;
  execute(key: string, options: { action: string }): Promise<string>;
}
interface PublicConfig {
  recaptcha: { enabled: boolean; siteKey: string | null };
}

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private script?: Observable<Recaptcha>;

  token(action: 'login' | 'register'): Observable<string | undefined> {
    // Fetch current server policy; disabling the client cannot bypass server verification.
    return this.http.get<PublicConfig>(`${environment.apiUrl}/auth/browser/config`).pipe(
      switchMap(({ recaptcha }) => {
        if (!recaptcha.enabled) return of(undefined);
        const siteKey = recaptcha.siteKey;
        if (!siteKey) throw new Error('Verification is not configured');
        this.script ??= this.load(siteKey).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        return this.script.pipe(
          switchMap((api) =>
            defer(() => api.execute(siteKey, { action })).pipe(
              timeout({
                first: 10000,
                with: () => {
                  throw new Error('Verification timed out. Please try again.');
                },
              }),
            ),
          ),
        );
      }),
    );
  }

  private load(siteKey: string): Observable<Recaptcha> {
    return new Observable<Recaptcha>((subscriber) => {
      const script = this.document.createElement('script');
      let loaded = false;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.onerror = () =>
        subscriber.error(new Error('Unable to load verification. Please try again.'));
      script.onload = () => {
        const api = (this.document.defaultView as (Window & { grecaptcha?: Recaptcha }) | null)
          ?.grecaptcha;
        if (!api) {
          subscriber.error(new Error('Verification unavailable'));
          return;
        }
        api.ready(() => {
          if (subscriber.closed) return;
          loaded = true;
          subscriber.next(api);
          subscriber.complete();
        });
      };
      this.document.head.appendChild(script);
      return () => {
        script.onload = null;
        script.onerror = null;
        if (!loaded) script.remove();
      };
    }).pipe(
      timeout({
        first: 10000,
        with: () => {
          throw new Error('Verification timed out. Please try again.');
        },
      }),
    );
  }
}
