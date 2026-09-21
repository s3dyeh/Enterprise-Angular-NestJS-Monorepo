import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService, type ApiUser } from '@app/core/services/auth.service';
import { LOCAL_FEEDBACK } from '@app/core/interceptor/local-feedback';
import { DisplayPreferencesComponent } from '@app/shared/components/display-preferences/display-preferences.component';
import { SAAS_UI } from '../starter/saas-ui';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SAAS_UI, DisplayPreferencesComponent],
  styleUrl: '../starter/saas-page.scss',
  template: ` <div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ 'saas.nav.personal' | transloco }}</p>
        <h1>{{ 'saas.profile.title' | transloco }}</h1>
        <p class="intro">{{ 'saas.profile.subtitle' | transloco }}</p>
      </div>
    </header>
    @if (error()) {
      <p class="notice error" role="alert">{{ error() | transloco }}</p>
    }
    @if (notice()) {
      <p class="notice" role="status">{{ notice() | transloco }}</p>
    }
    @if (loading()) {
      <p role="status">{{ 'saas.loading' | transloco }}</p>
    }
    <div class="columns">
      <div>
        <section class="panel">
          <h2>{{ 'saas.profile.details' | transloco }}</h2>
          <p class="muted">
            <bdi>{{ email() }}</bdi>
          </p>
          <form class="form-stack" [formGroup]="form" (ngSubmit)="saveProfile()">
            <div class="form-grid">
              <mat-form-field appearance="outline"
                ><mat-label>{{ 'saas.auth.firstName' | transloco }}</mat-label
                ><input
                  matInput
                  formControlName="firstName"
                  autocomplete="given-name"
                  maxlength="80"
                /><mat-error>{{ 'saas.profile.nameError' | transloco }}</mat-error></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{ 'saas.auth.lastName' | transloco }}</mat-label
                ><input
                  matInput
                  formControlName="lastName"
                  autocomplete="family-name"
                  maxlength="80"
                /><mat-error>{{ 'saas.profile.nameError' | transloco }}</mat-error></mat-form-field
              >
            </div>
            <div>
              <button mat-flat-button [disabled]="loading() || busy() || form.invalid">
                {{ 'saas.save' | transloco }}
              </button>
            </div>
          </form>
        </section>
        <section class="panel">
          <h2>{{ 'saas.profile.security' | transloco }}</h2>
          <p class="muted">{{ 'saas.profile.securityBody' | transloco }}</p>
          <form class="form-stack" [formGroup]="passwordForm" (ngSubmit)="savePassword()">
            <mat-form-field appearance="outline"
              ><mat-label>{{ 'saas.profile.currentPassword' | transloco }}</mat-label
              ><input
                matInput
                type="password"
                formControlName="oldPassword"
                autocomplete="current-password"
              /><mat-error>{{
                'saas.profile.currentPasswordError' | transloco
              }}</mat-error></mat-form-field
            >
            <mat-form-field appearance="outline"
              ><mat-label>{{ 'saas.profile.newPassword' | transloco }}</mat-label
              ><input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
              /><mat-error>{{ 'saas.auth.passwordHint' | transloco }}</mat-error
              ><mat-hint>{{ 'saas.auth.passwordHint' | transloco }}</mat-hint></mat-form-field
            >
            <div>
              <button mat-stroked-button [disabled]="busy() || passwordForm.invalid">
                {{ 'saas.profile.updatePassword' | transloco }}
              </button>
            </div>
          </form>
        </section>
      </div>
      <aside class="panel">
        <h2>{{ 'saas.profile.preferences' | transloco }}</h2>
        <p class="muted">{{ 'saas.profile.preferencesBody' | transloco }}</p>
        <app-display-preferences />
      </aside>
    </div>
  </div>`,
})
export class ProfileComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly email = signal('');
  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    oldPassword: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
  });
  private options() {
    return { context: new HttpContext().set(LOCAL_FEEDBACK, true) };
  }
  constructor() {
    this.http
      .get<ApiUser>(`${environment.apiUrl}/auth/me`, this.options())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (user) => {
          this.form.patchValue({ firstName: user.firstName ?? '', lastName: user.lastName ?? '' });
          this.email.set(user.email);
        },
        error: () => this.error.set('saas.errors.generic'),
      });
  }
  saveProfile() {
    if (this.form.valid) this.save(this.form.getRawValue(), false);
  }
  savePassword() {
    if (this.passwordForm.valid) this.save(this.passwordForm.getRawValue(), true);
  }
  private save(body: object, password: boolean) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.http
      .patch<ApiUser>(`${environment.apiUrl}/auth/me`, body, this.options())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (user) => {
          this.auth.updateCurrentUser(user);
          this.notice.set(password ? 'saas.profile.passwordSaved' : 'saas.saved');
          if (password) this.passwordForm.reset();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.error?.errors?.oldPassword) {
            this.passwordForm.controls.oldPassword.setErrors({ server: true });
            this.passwordForm.controls.oldPassword.markAsTouched();
          } else this.error.set('saas.errors.generic');
        },
      });
  }
}
