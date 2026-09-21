import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '@app/core/services/auth.service';
import { WorkspacesService } from './workspaces.service';
import { SAAS_UI, saasError } from '../starter/saas-ui';

@Component({
  selector: 'app-join-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SAAS_UI],
  styleUrl: '../starter/saas-page.scss',
  template: ` <div class="page">
    <section class="panel">
      <p class="eyebrow">{{ 'saas.workspaces.invitation' | transloco }}</p>
      <h1>{{ 'saas.workspaces.join' | transloco }}</h1>
      <p class="intro">{{ 'saas.workspaces.joinBody' | transloco }}</p>
      <p>
        <bdi>{{ email }}</bdi>
      </p>
      @if (error()) {
        <p role="alert" class="notice error">{{ error() | transloco }}</p>
      }
      <div class="actions">
        <button mat-flat-button [disabled]="busy() || !token" (click)="accept()">
          {{ (busy() ? 'saas.saving' : 'saas.workspaces.accept') | transloco }}</button
        ><a mat-button routerLink="/workspaces">{{ 'saas.cancel' | transloco }}</a>
      </div>
    </section>
  </div>`,
})
export class JoinWorkspaceComponent {
  private readonly api = inject(WorkspacesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly email = inject(AuthService).getCurrentUser().email;
  readonly token = new URLSearchParams(inject(ActivatedRoute).snapshot.fragment ?? '').get('token');
  readonly busy = signal(false);
  readonly error = signal(this.token ? '' : 'saas.errors.invitationInvalid');
  accept() {
    if (!this.token || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .accept(this.token)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (value) => {
          void this.router.navigate(['/workspaces', value.workspaceId], { replaceUrl: true });
        },
        error: (error) => this.error.set(saasError(error)),
      });
  }
}
