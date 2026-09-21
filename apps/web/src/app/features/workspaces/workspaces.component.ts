import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import type { Workspace } from '@enterprise/contracts';
import { WorkspacesService } from './workspaces.service';
import { SAAS_UI, saasError } from '../starter/saas-ui';

@Component({
  selector: 'app-workspaces',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SAAS_UI],
  styleUrl: '../starter/saas-page.scss',
  template: `<div class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ 'saas.nav.workspace' | transloco }}</p>
        <h1>{{ 'saas.workspaces.title' | transloco }}</h1>
        <p class="intro">{{ 'saas.workspaces.subtitle' | transloco }}</p>
      </div>
    </header>
    @if (error()) {
      <p class="notice error" role="alert">{{ error() | transloco }}</p>
      <button mat-button (click)="load()">{{ 'list.retry' | transloco }}</button>
    }
    <section class="panel">
      <h2>{{ 'saas.workspaces.yours' | transloco }}</h2>
      @if (loading()) {
        <p role="status">{{ 'saas.loading' | transloco }}</p>
      }
      @for (workspace of workspaces(); track workspace.id) {
        <a class="item workspace-link" [routerLink]="['/workspaces', workspace.id]"
          ><span class="icon-box"><mat-icon>workspaces</mat-icon></span>
          <div>
            <h2>{{ workspace.name }}</h2>
            <span class="muted">{{ 'saas.roles.' + workspace.role | transloco }}</span>
          </div>
          <mat-icon>arrow_forward</mat-icon></a
        >
      } @empty {
        @if (!loading() && !error()) {
          <div class="empty">
            <mat-icon>workspaces</mat-icon>
            <h3>{{ 'saas.workspaces.empty' | transloco }}</h3>
            <p class="muted">{{ 'saas.workspaces.emptyBody' | transloco }}</p>
          </div>
        }
      }
    </section>
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>{{ 'saas.workspaces.create' | transloco }}</h2>
          <p>{{ 'saas.workspaces.createBody' | transloco }}</p>
        </div>
      </div>
      <form class="form-row" [formGroup]="form" (ngSubmit)="create()">
        <mat-form-field appearance="outline"
          ><mat-label>{{ 'saas.workspaces.name' | transloco }}</mat-label
          ><input
            matInput
            formControlName="name"
            maxlength="80"
            autocomplete="organization"
          /><mat-error>{{ 'saas.workspaces.nameError' | transloco }}</mat-error></mat-form-field
        ><button mat-flat-button [disabled]="form.invalid || busy()">
          {{ (busy() ? 'saas.saving' : 'saas.workspaces.create') | transloco }}
        </button>
      </form>
    </section>
  </div>`,
})
export class WorkspacesComponent {
  private readonly api = inject(WorkspacesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly workspaces = signal<Workspace[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });
  constructor() {
    this.load();
  }
  load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (rows) => this.workspaces.set(rows),
        error: (error) => this.error.set(saasError(error)),
      });
  }
  create() {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .create(this.form.getRawValue().name.trim())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (workspace) => {
          void this.router.navigate(['/workspaces', workspace.id]);
        },
        error: (error) => this.error.set(saasError(error)),
      });
  }
}
