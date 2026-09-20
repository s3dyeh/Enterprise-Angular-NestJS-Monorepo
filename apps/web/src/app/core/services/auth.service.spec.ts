import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';

describe('AuthService browser sessions', () => {
  let auth: AuthService;
  let backend: HttpTestingController;
  const router = { url: '/settings/cities', navigate: jasmine.createSpy('navigate') };
  const token = 'h.' + btoa(JSON.stringify({ exp: 4102444800 })) + '.s';
  beforeEach(() => {
    localStorage.setItem(environment.localStorageKey, 'legacy-secret');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: MessageService, useValue: { raise: jasmine.createSpy('raise') } },
      ],
    });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });
  function login(resources = '', role = 2) {
    auth.login({ email: 'user@example.com', password: 'password' }).subscribe();
    const request = backend.expectOne('/api/v1/auth/browser/login');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({
      token,
      tokenExpires: 4102444800000,
      user: {
        id: 3,
        email: 'user@example.com',
        firstName: 'Ada',
        role: { id: role, resources },
      },
    });
  }
  it('removes legacy persistent credentials and starts logged out', () => {
    expect(localStorage.getItem(environment.localStorageKey)).toBeNull();
    expect(auth.isLoggedIn()).toBeFalse();
  });
  it('stores access credentials only in memory', () => {
    login();
    expect(auth.isLoggedIn()).toBeTrue();
    expect(auth.getCurrentUser().fullName).toBe('Ada');
    expect(localStorage.getItem(environment.localStorageKey)).toBeNull();
  });
  it('denies empty permissions', () => {
    login();
    expect(auth.hasAccess('city:read')).toBeFalse();
  });
  it('allows writes to satisfy reads', () => {
    login('city:write');
    expect(auth.hasAccess('city:read')).toBeTrue();
    expect(auth.hasAccess('user:write')).toBeFalse();
  });
  it('allows the built-in administrator', () => {
    login('', 1);
    expect(auth.hasAccess('user:write')).toBeTrue();
  });
  it('coalesces concurrent refresh requests and loads current permissions', () => {
    const values: string[] = [];
    auth.refreshAccessToken().subscribe((value) => values.push(value));
    auth.refreshAccessToken().subscribe((value) => values.push(value));
    const refresh = backend.expectOne('/api/v1/auth/browser/refresh');
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ token, tokenExpires: 4102444800000 });
    const profile = backend.expectOne('/api/v1/auth/me');
    expect(profile.request.headers.get('Authorization')).toBe('Bearer ' + token);
    profile.flush({ id: 3, email: 'user@example.com', role: { id: 2, resources: 'city:read' } });
    expect(values).toEqual([token, token]);
    expect(auth.hasAccess('city:read')).toBeTrue();
  });
  it('does not restore a session after logout during recovery', () => {
    auth.refreshAccessToken().subscribe();
    auth.logout(false);
    backend.expectOne('/api/v1/auth/browser/refresh').flush({ token });
    backend.expectOne('/api/v1/auth/me').flush({ id: 3, role: { id: 1 } });
    expect(auth.isLoggedIn()).toBeFalse();
  });
  it('revokes the HttpOnly session on manual logout', () => {
    login();
    auth.logout();
    const request = backend.expectOne('/api/v1/auth/browser/logout');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
    expect(auth.getToken()).toBeUndefined();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {});
  });
});
