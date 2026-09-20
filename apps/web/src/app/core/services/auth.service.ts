import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment as env } from '@environments/environment';
import type { SessionUser } from '../interfaces/session-user';
import type { Session } from '../models/models';
import { isTokenExpired } from '../util/jwt';
import { isAppReturnUrl } from '../util/return-url';
import { MessageService } from './message.service';

export interface ApiUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role?: { id: number; resources?: string };
}
export interface BrowserSession {
  token: string;
  tokenExpires: number;
  user?: ApiUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly http = inject(HttpClient);
  // Session recovery must not recursively invoke the authentication interceptor.
  private readonly sessionHttp = new HttpClient(inject(HttpBackend));
  private session: Session = {};
  private refresh$?: Observable<string>;
  private generation = 0;

  constructor() {
    localStorage.removeItem(env.localStorageKey);
  }

  getCurrentUser(): SessionUser {
    const user = this.session;
    return {
      userId: user.id,
      language: user.lang,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      roleId: user.role_id,
      resources: user.resources,
    };
  }
  getToken(): string | undefined {
    return this.session.token;
  }
  isLoggedIn(): boolean {
    return !!this.session.token && !isTokenExpired(this.session.token);
  }
  checkPermission(permission: string): boolean {
    return this.hasAccess(permission);
  }
  hasAccess(permission: string | string[]): boolean {
    if (this.session.role_id === 1) return true;
    const resources = this.session.resources ?? [];
    return (Array.isArray(permission) ? permission : [permission]).some(
      (key) =>
        resources.includes(key) ||
        (key.endsWith(':read') && resources.includes(key.replace(':read', ':write'))),
    );
  }

  login(body: {
    email: string;
    password: string;
    recaptchaToken?: string;
  }): Observable<BrowserSession> {
    return this.http
      .post<BrowserSession>(`${env.apiUrl}/auth/browser/login`, body, { withCredentials: true })
      .pipe(tap((value) => this.applySession(value)));
  }

  ensureSession(): Observable<boolean> {
    if (this.isLoggedIn()) return of(true);
    return this.refreshAccessToken().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  refreshAccessToken(): Observable<string> {
    if (this.refresh$) return this.refresh$;
    const generation = this.generation;
    this.refresh$ = this.sessionHttp
      .post<BrowserSession>(`${env.apiUrl}/auth/browser/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((value) => {
          if (generation === this.generation) this.session.token = value.token;
        }),
        switchMap((value) =>
          this.sessionHttp
            .get<ApiUser>(`${env.apiUrl}/auth/me`, {
              headers: { Authorization: `Bearer ${value.token}` },
            })
            .pipe(map((user) => ({ ...value, user }))),
        ),
        tap((value) => {
          if (generation === this.generation) this.applySession(value);
        }),
        map((value) => value.token),
        finalize(() => {
          this.refresh$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refresh$;
  }

  logout(notify = true): void {
    const returnUrl = this.router.url;
    this.generation++;
    this.session = {};
    this.refresh$ = undefined;
    if (notify)
      this.http
        .post(`${env.apiUrl}/auth/browser/logout`, {}, { withCredentials: true })
        .subscribe({ error: () => undefined });
    void this.router.navigate(
      ['/login'],
      !notify && isAppReturnUrl(returnUrl) ? { queryParams: { returnUrl } } : {},
    );
    if (notify) this.messages.raise(200, 'messages.loggedOut');
  }

  private applySession(value: BrowserSession): void {
    const user = value.user;
    this.session = {
      token: value.token,
      id: user?.id,
      email: user?.email,
      username: user?.email,
      full_name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
      role_id: user?.role?.id,
      resources: user?.role?.resources?.split(',').filter(Boolean) ?? [],
    };
  }
}
