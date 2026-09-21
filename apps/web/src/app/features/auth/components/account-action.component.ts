import { authError } from '../auth-error';
import { TranslocoPipe } from '@jsverse/transloco';
import { DisplayPreferencesComponent } from '@app/shared/components/display-preferences/display-preferences.component';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, finalize, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '@environments/environment';
import { RecaptchaService } from '@app/core/services/recaptcha.service';

@Component({
  selector: 'app-account-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    DisplayPreferencesComponent,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 24px;
      background: var(--app-bg);
    }
    mat-card {
      width: min(100%, 440px);
      padding: 28px;
      border-radius: 20px;
      border-block-start: 4px solid var(--app-primary);
      background: var(--app-surface);
    }
    [role='alert'] {
      padding: 16px;
      border-inline-start: 4px solid var(--mat-sys-error);
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      line-height: 1.6;
    }
    form {
      display: grid;
      gap: 12px;
    }
    h1 {
      margin-block: 20px;
      font-size: 28px;
      line-height: 1.3;
      letter-spacing: -0.025em;
    }
  `,
  template: ` <mat-card appearance="outlined"
    ><app-display-preferences />
    <h1>{{ title | transloco }}</h1>
    @if (message()) {
      <p role="status">{{ message() | transloco }}</p>
    }
    @if (error()) {
      <p role="alert">{{ error() | transloco }}</p>
    }
    @if (!complete()) {
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (mode === 'register') {
          <mat-form-field
            ><mat-label>{{ 'saas.auth.firstName' | transloco }}</mat-label
            ><input matInput formControlName="firstName" autocomplete="given-name" /><mat-error>{{
              'saas.auth.nameRequired' | transloco
            }}</mat-error></mat-form-field
          >
          <mat-form-field
            ><mat-label>{{ 'saas.auth.lastName' | transloco }}</mat-label
            ><input matInput formControlName="lastName" autocomplete="family-name" /><mat-error>{{
              'saas.auth.nameRequired' | transloco
            }}</mat-error></mat-form-field
          >
        }
        @if (mode === 'register' || mode === 'forgot' || mode === 'resend') {
          <mat-form-field
            ><mat-label>{{ 'login.email' | transloco }}</mat-label
            ><input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.hasError('emailAlreadyExists')) {
              <mat-error>{{ 'saas.auth.duplicateEmail' | transloco }}</mat-error>
            } @else {
              <mat-error>{{ 'saas.auth.emailInvalid' | transloco }}</mat-error>
            }
          </mat-form-field>
        }
        @if (mode === 'register' || mode === 'reset') {
          <mat-form-field
            ><mat-label>{{ 'login.password' | transloco }}</mat-label
            ><input
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            /><mat-hint>{{ 'saas.auth.passwordHint' | transloco }}</mat-hint
            ><mat-error>{{ 'saas.auth.passwordHint' | transloco }}</mat-error></mat-form-field
          >
        }
        <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">
          {{ (busy() ? 'saas.auth.submitting' : title) | transloco }}
        </button>
      </form>
    }
    <a mat-button routerLink="/resend-confirmation">{{ 'saas.auth.resendLink' | transloco }}</a
    ><a mat-button routerLink="/login" queryParamsHandling="preserve">{{
      'saas.auth.back' | transloco
    }}</a>
  </mat-card>`,
})
export class AccountActionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly captcha = inject(RecaptchaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly mode = this.route.snapshot.data['mode'] as
    'register' | 'resend' | 'forgot' | 'reset' | 'confirm' | 'confirm-new';
  readonly title = {
    register: 'saas.auth.register',
    resend: 'saas.auth.resend',
    forgot: 'saas.auth.forgot',
    reset: 'saas.auth.reset',
    confirm: 'saas.auth.confirm',
    'confirm-new': 'saas.auth.confirmNew',
  }[this.mode];
  readonly busy = signal(false);
  readonly complete = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: [
      '',
      this.mode === 'register' ? [Validators.required, Validators.maxLength(80)] : [],
    ],
    lastName: ['', this.mode === 'register' ? [Validators.required, Validators.maxLength(80)] : []],
    email: [
      '',
      ['register', 'forgot', 'resend'].includes(this.mode)
        ? [Validators.required, Validators.email]
        : [],
    ],
    password: [
      '',
      ['register', 'reset'].includes(this.mode)
        ? [Validators.required, Validators.minLength(12), Validators.maxLength(72)]
        : [],
    ],
  });

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    defer(() => {
      const values = this.form.getRawValue();
      const hash = this.route.snapshot.queryParamMap.get('hash');
      if (this.mode === 'register' || this.mode === 'resend') {
        const path = this.mode === 'register' ? 'email/register' : 'email/resend';
        const body = this.mode === 'register' ? values : { email: values.email };
        return this.captcha
          .token('register')
          .pipe(map((recaptchaToken) => ({ path, body: { ...body, recaptchaToken } })));
      }
      if (this.mode === 'forgot') {
        return of({ path: 'forgot/password', body: { email: values.email } });
      }
      if (!hash) throw new Error('saas.auth.invalidLink');
      const path =
        this.mode === 'reset'
          ? 'reset/password'
          : this.mode === 'confirm'
            ? 'email/confirm'
            : 'email/confirm/new';
      return of({
        path,
        body: this.mode === 'reset' ? { hash, password: values.password } : { hash },
      });
    })
      .pipe(
        switchMap(({ path, body }) => this.http.post(`${environment.apiUrl}/auth/${path}`, body)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.complete.set(true);
          this.message.set(
            this.mode === 'register' && !this.captcha.emailVerificationRequired()
              ? 'saas.auth.readyToSignIn'
              : ['register', 'forgot', 'resend'].includes(this.mode)
                ? 'saas.auth.inbox'
                : 'saas.auth.updated',
          );
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 422 &&
            error.error?.errors?.email === 'emailAlreadyExists'
          ) {
            const email = this.form.controls.email;
            email.setErrors({ ...email.errors, emailAlreadyExists: true });
            email.markAsTouched();
            return;
          }
          this.error.set(
            error instanceof Error && error.message === 'saas.auth.invalidLink'
              ? 'saas.auth.invalidLink'
              : authError(error),
          );
        },
      });
  }
}
