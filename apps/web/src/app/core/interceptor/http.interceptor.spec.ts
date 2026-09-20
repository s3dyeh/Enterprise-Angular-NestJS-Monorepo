import type { HttpErrorResponse } from '@angular/common/http';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { apiInterceptor } from './http.interceptor';
import { AuthService } from '../services/auth.service';
import { MessageService } from '../services/message.service';
import { ValidatorService } from '../services/validator.service';
import { SpinnerOverlayService } from '../spinner/spinner-overlay.service';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let messages: jasmine.SpyObj<MessageService>;
  let spinner: jasmine.SpyObj<SpinnerOverlayService>;
  let validations: ValidatorService;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'logout', 'refreshAccessToken']);
    messages = jasmine.createSpyObj('MessageService', ['raise']);
    spinner = jasmine.createSpyObj('SpinnerOverlayService', ['show', 'hide']);
    auth.getToken.and.returnValue('valid.token.value');
    auth.refreshAccessToken.and.returnValue(throwError(() => new Error('No session')));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        ValidatorService,
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messages },
        { provide: SpinnerOverlayService, useValue: spinner },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    validations = TestBed.inject(ValidatorService);
  });

  afterEach(() => backend.verify());

  it('skips auth for translation files', () => {
    http.get('assets/i18n/en.json').subscribe();
    const req = backend.expectOne('assets/i18n/en.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('never sends session credentials to unrelated URLs', () => {
    http.get('https://example.com/data').subscribe();
    const request = backend.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(auth.getToken).not.toHaveBeenCalled();
    request.flush({});
  });

  it('preserves a validation error after a successful refresh without logging out', () => {
    auth.getToken.and.returnValue(`h.${btoa(JSON.stringify({ exp: 1 })).replace(/=+$/, '')}.s`);
    auth.refreshAccessToken.and.returnValue(of('new-access'));
    let status: number | undefined;
    http.post('/api/v1/admin/regions', {}).subscribe({
      error: (error: HttpErrorResponse) => {
        status = error.status;
      },
    });
    backend
      .expectOne('/api/v1/admin/regions')
      .flush(
        { error: { invalid_params: [{ field: 'name', reason: 'taken' }] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(status).toBe(422);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(validations.fieldErrors[0].reason).toBe('taken');
  });

  it('does not attach a bearer token on login', () => {
    http.post('/api/v1/auth/browser/login', { username: 'a' }).subscribe();
    const req = backend.expectOne('/api/v1/auth/browser/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(spinner.show).toHaveBeenCalled();
    req.flush({ data: {} });
    expect(spinner.hide).toHaveBeenCalled();
    expect(messages.raise).not.toHaveBeenCalledWith(200, 'messages.saved');
  });

  it('attaches a bearer token and toasts on a mutating success', () => {
    http.post('/api/v1/admin/regions', { name: 'Erbil' }).subscribe();
    const req = backend.expectOne('/api/v1/admin/regions');
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid.token.value');
    req.flush({ data: {} });
    expect(messages.raise).toHaveBeenCalledWith(200, 'messages.saved');
  });

  it('logs out when the token is already expired', () => {
    auth.getToken.and.returnValue(`h.${btoa(JSON.stringify({ exp: 1 })).replace(/=+$/, '')}.s`);
    let error: HttpErrorResponse | undefined;
    http.get('/api/v1/admin/regions').subscribe({ error: (err) => (error = err) });
    backend.expectNone('/api/v1/admin/regions');
    expect(messages.raise).toHaveBeenCalledWith(401, 'errors.sessionExpired');
    expect(auth.logout).toHaveBeenCalledWith(false);
    expect(error?.status).toBe(401);
  });

  it('refreshes an expired access token then retries', () => {
    auth.getToken.and.returnValue(`h.${btoa(JSON.stringify({ exp: 1 })).replace(/=+$/, '')}.s`);
    auth.refreshAccessToken.and.returnValue(of('new-access'));
    http.get('/api/v1/admin/regions').subscribe();
    const req = backend.expectOne('/api/v1/admin/regions');
    expect(req.request.headers.get('Authorization')).toBe('Bearer new-access');
    req.flush({ data: { list: [], count: 0 } });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('maps validation errors and logs out on 401', () => {
    http.post('/api/v1/admin/regions', {}).subscribe({ error: () => undefined });
    const req = backend.expectOne('/api/v1/admin/regions');
    req.flush(
      { error: { invalid_params: [{ field: 'name', reason: 'taken' }] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(validations.fieldErrors[0].field).toBe('name');
    expect(messages.raise).toHaveBeenCalledWith(422, 'taken');

    http.get('/api/v1/admin/regions').subscribe({ error: () => undefined });
    backend
      .expectOne('/api/v1/admin/regions')
      .flush({ error: { message: 'no' } }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledWith(false);
  });
});
