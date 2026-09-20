import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    }
    mat-card {
      width: min(100%, 440px);
      padding: 28px;
    }
    form {
      display: grid;
      gap: 12px;
    }
    h1 {
      margin-top: 0;
    }
  `,
  template: ` <mat-card appearance="outlined"
    ><h1>{{ title }}</h1>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (!complete()) {
      <form [formGroup]="form" (ngSubmit)="submit()">
        @if (mode === 'register') {
          <mat-form-field
            ><mat-label>First name</mat-label
            ><input matInput formControlName="firstName" autocomplete="given-name"
          /></mat-form-field>
          <mat-form-field
            ><mat-label>Last name</mat-label
            ><input matInput formControlName="lastName" autocomplete="family-name"
          /></mat-form-field>
        }
        @if (mode === 'register' || mode === 'forgot' || mode === 'resend') {
          <mat-form-field
            ><mat-label>Email</mat-label
            ><input matInput type="email" formControlName="email" autocomplete="email"
          /></mat-form-field>
        }
        @if (mode === 'register' || mode === 'reset') {
          <mat-form-field
            ><mat-label>Password (12–72 characters)</mat-label
            ><input matInput type="password" formControlName="password" autocomplete="new-password"
          /></mat-form-field>
        }
        <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">
          {{ title }}
        </button>
      </form>
    }
    <a mat-button routerLink="/resend-confirmation">Resend confirmation email</a
    ><a mat-button routerLink="/login">Back to sign in</a>
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
    register: 'Create account',
    resend: 'Resend confirmation',
    forgot: 'Request password reset',
    reset: 'Set new password',
    confirm: 'Confirm email address',
    'confirm-new': 'Confirm new email address',
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
      if (!hash) throw new Error('This link is incomplete. Request a new email.');
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
            ['register', 'forgot', 'resend'].includes(this.mode)
              ? 'Check your inbox for the next step. If an account exists, you will receive an email.'
              : 'Your account has been updated. You can now sign in.',
          );
        },
        error: (error: unknown) =>
          this.error.set(
            error instanceof Error
              ? error.message
              : 'Unable to complete the request. Please try again.',
          ),
      });
  }
}
