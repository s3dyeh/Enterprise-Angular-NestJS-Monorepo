import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@app/core/services/auth.service';
import { RecaptchaService } from '@app/core/services/recaptcha.service';
import { MessageService } from '@app/core/services/message.service';
import { safeReturnUrl } from '@app/core/util/return-url';
import { LogoComponent } from '@app/shared/components/logo/logo.component';
import { DisplayPreferencesComponent } from '@app/shared/components/display-preferences/display-preferences.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [
    DisplayPreferencesComponent,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    TranslocoPipe,
    ReactiveFormsModule,
    LogoComponent,
  ],
})
export class LoginComponent {
  private readonly captcha = inject(RecaptchaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly error = signal('');
  readonly submitting = signal(false);
  hide = true;
  readonly loginForm = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  doLogin(): void {
    if (this.loginForm.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    this.captcha
      .token('login')
      .pipe(
        switchMap((recaptchaToken) =>
          this.auth.login({ ...this.loginForm.getRawValue(), recaptchaToken }),
        ),
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.messages.raise(200, 'messages.loggedIn');
          void this.router.navigateByUrl(
            safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
          );
        },
        error: (error: unknown) => {
          const response = error as { error?: { message?: string } };
          this.error.set(
            response.error?.message ||
              'Sign-in failed. Check your credentials and confirm your email address.',
          );
        },
      });
  }
}
