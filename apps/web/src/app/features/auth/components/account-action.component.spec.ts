import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '@environments/environment';
import { RecaptchaService } from '@app/core/services/recaptcha.service';
import { AccountActionComponent } from './account-action.component';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LanguageService } from '@app/core/i18n/language.service';

describe('AccountActionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AccountActionComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: { saas: { auth: { duplicateEmail: 'This email address is already registered.' } } },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            missingHandler: { logMissingKey: false },
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: LanguageService,
          useValue: { langs: [{ id: 'en', label: 'English' }], setLang: () => undefined },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { mode: 'register' }, queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: RecaptchaService,
          useValue: { token: () => of(undefined), emailVerificationRequired: () => true },
        },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('explains invalid required fields instead of only disabling submission', () => {
    const fixture = TestBed.createComponent(AccountActionComponent);
    fixture.componentInstance.form.markAllAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mat-error').length).toBe(4);
  });

  it('keeps email delivery failures visible and allows retry', () => {
    const fixture = TestBed.createComponent(AccountActionComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      firstName: 'Test',
      lastName: 'User',
      email: 'new@example.test',
      password: 'example-password-123',
    });
    component.submit();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/auth/email/register`)
      .flush(
        { errors: { mail: 'mailDeliveryUnavailable' } },
        { status: 503, statusText: 'Service Unavailable' },
      );
    fixture.detectChanges();
    expect(component.error()).toBe('saas.auth.mailUnavailable');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toBeTruthy();
    expect(component.busy()).toBeFalse();
    expect(component.complete()).toBeFalse();
  });

  it('shows duplicate email feedback and allows a corrected email to be submitted', () => {
    const fixture = TestBed.createComponent(AccountActionComponent);
    const component = fixture.componentInstance;
    const backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    component.form.setValue({
      firstName: 'Test',
      lastName: 'User',
      email: 'existing@example.com',
      password: 'example-password-123',
    });
    component.submit();
    backend
      .expectOne(`${environment.apiUrl}/auth/email/register`)
      .flush(
        { status: 422, errors: { email: 'emailAlreadyExists' } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-error')?.textContent).toContain(
      'This email address is already registered.',
    );
    expect(component.form.controls.email.touched).toBeTrue();
    expect(component.form.invalid).toBeTrue();
    expect(component.busy()).toBeFalse();
    expect(component.complete()).toBeFalse();

    component.form.controls.email.setValue('new@example.com');
    expect(component.form.valid).toBeTrue();
    component.submit();
    const retry = backend.expectOne(`${environment.apiUrl}/auth/email/register`);
    expect(retry.request.body.email).toBe('new@example.com');
    retry.flush({});
    expect(component.complete()).toBeTrue();
  });

  it('shows a safe fallback for other HTTP failures', () => {
    const fixture = TestBed.createComponent(AccountActionComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      firstName: 'Test',
      lastName: 'User',
      email: 'new@example.com',
      password: 'example-password-123',
    });
    component.submit();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/auth/email/register`)
      .flush({}, { status: 500, statusText: 'Internal Server Error' });
    expect(component.error()).toBe('saas.auth.generic');
    expect(component.busy()).toBeFalse();
    expect(component.complete()).toBeFalse();
  });
});
