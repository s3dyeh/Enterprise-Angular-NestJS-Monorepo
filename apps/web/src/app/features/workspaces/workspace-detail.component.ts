import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import type { MatSelectChange } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { finalize, switchMap } from 'rxjs';
import type { WorkspaceDetails, WorkspaceMember, WorkspaceRole } from '@enterprise/contracts';
import { AuthService } from '@app/core/services/auth.service';
import { WorkspacesService } from './workspaces.service';
import { SAAS_UI, saasError } from '../starter/saas-ui';

@Component({
  selector: 'app-workspace-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SAAS_UI, DatePipe],
  styleUrl: '../starter/saas-page.scss',
  template: `<div class="page">
    <a class="back" routerLink="/workspaces"
      ><mat-icon>arrow_back</mat-icon>{{ 'saas.workspaces.title' | transloco }}</a
    >
    @if (error()) {
      <p role="alert" class="notice error">{{ error() | transloco }}</p>
    }
    @if (loading()) {
      <p role="status">{{ 'saas.loading' | transloco }}</p>
    }
    @if (!details() && !loading()) {
      <button mat-stroked-button (click)="load()">{{ 'list.retry' | transloco }}</button>
    }
    @if (details(); as data) {
      <header class="page-header">
        <div>
          <p class="eyebrow">{{ 'saas.nav.workspace' | transloco }}</p>
          <h1>{{ data.workspace.name }}</h1>
          <p class="intro">{{ 'saas.workspaces.detailBody' | transloco }}</p>
        </div>
        <span class="badge">{{ 'saas.roles.' + data.workspace.role | transloco }}</span>
      </header>
      @if (notice()) {
        <p role="status" class="notice">{{ notice() | transloco }}</p>
      }
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>{{ 'saas.workspaces.members' | transloco }}</h2>
            <p>{{ 'saas.workspaces.rolesHint' | transloco }}</p>
          </div>
          <span class="badge">{{ data.members.length }}</span>
        </div>
        @for (member of data.members; track member.userId) {
          <div class="item">
            <span class="icon-box"><mat-icon>person</mat-icon></span>
            <div>
              <h3>
                {{ member.name || member.email }}
                @if (member.userId === userId) {
                  <span class="muted">({{ 'saas.workspaces.you' | transloco }})</span>
                }
              </h3>
              <p class="muted">
                <bdi>{{ member.email }}</bdi>
              </p>
            </div>
            <div class="actions">
              @if (data.workspace.role === 'owner') {
                <mat-form-field appearance="outline" subscriptSizing="dynamic"
                  ><mat-label>{{ 'saas.workspaces.role' | transloco }}</mat-label
                  ><mat-select
                    [value]="member.role"
                    [disabled]="busy()"
                    (selectionChange)="changeRole(member, $event)"
                  >
                    @for (role of roles; track role) {
                      <mat-option [value]="role">{{ 'saas.roles.' + role | transloco }}</mat-option>
                    }
                  </mat-select></mat-form-field
                >
              } @else {
                <span class="badge">{{ 'saas.roles.' + member.role | transloco }}</span>
              }
              @if (canRemove(member)) {
                <button mat-button [disabled]="busy()" (click)="removing.set(member.userId)">
                  {{
                    (member.userId === userId ? 'saas.workspaces.leave' : 'saas.workspaces.remove')
                      | transloco
                  }}
                </button>
              }
            </div>
          </div>
          @if (removing() === member.userId) {
            <div class="notice">
              <p>{{ 'saas.workspaces.removeConfirm' | transloco: { email: member.email } }}</p>
              <div class="actions">
                <button mat-flat-button [disabled]="busy()" (click)="remove(member)">
                  {{ 'saas.confirm' | transloco }}</button
                ><button mat-button (click)="removing.set(null)">
                  {{ 'saas.cancel' | transloco }}
                </button>
              </div>
            </div>
          }
        }
      </section>
      @if (data.workspace.role !== 'member') {
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>{{ 'saas.workspaces.invite' | transloco }}</h2>
              <p>{{ 'saas.workspaces.inviteBody' | transloco }}</p>
            </div>
          </div>
          <form class="form-row" [formGroup]="inviteForm" (ngSubmit)="invite()">
            <mat-form-field appearance="outline"
              ><mat-label>{{ 'login.email' | transloco }}</mat-label
              ><input
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
                dir="ltr"
              /><mat-error>{{
                'saas.workspaces.emailError' | transloco
              }}</mat-error></mat-form-field
            >
            <mat-form-field appearance="outline"
              ><mat-label>{{ 'saas.workspaces.role' | transloco }}</mat-label
              ><mat-select formControlName="role"
                ><mat-option value="member">{{ 'saas.roles.member' | transloco }}</mat-option>
                @if (data.workspace.role === 'owner') {
                  <mat-option value="admin">{{ 'saas.roles.admin' | transloco }}</mat-option>
                }
              </mat-select></mat-form-field
            >
            <button mat-flat-button [disabled]="busy() || inviteForm.invalid">
              {{ 'saas.workspaces.createLink' | transloco }}
            </button>
          </form>
          @if (inviteLink()) {
            <div class="notice">
              <p>{{ 'saas.workspaces.shareLink' | transloco }}</p>
              <mat-form-field appearance="outline" class="link-field"
                ><mat-label>{{ 'saas.workspaces.invitationLink' | transloco }}</mat-label
                ><input matInput readonly [value]="inviteLink()" dir="ltr" /></mat-form-field
              ><button mat-stroked-button (click)="copyLink()">
                {{ (copied() ? 'saas.workspaces.copied' : 'saas.workspaces.copy') | transloco }}
              </button>
            </div>
          }
          <h3>{{ 'saas.workspaces.pending' | transloco }}</h3>
          @for (invitation of data.invitations; track invitation.id) {
            <div class="item">
              <div>
                <h3>
                  <bdi>{{ invitation.email }}</bdi>
                </h3>
                <p class="muted">
                  {{ 'saas.roles.' + invitation.role | transloco }} ·
                  {{ 'saas.workspaces.expires' | transloco }}
                  {{ invitation.expiresAt | date: 'mediumDate' }}
                </p>
              </div>
              @if (data.workspace.role === 'owner' || invitation.role === 'member') {
                <button mat-button [disabled]="busy()" (click)="revoke(invitation.id)">
                  {{ 'saas.workspaces.revoke' | transloco }}
                </button>
              }
            </div>
          } @empty {
            <p class="muted">{{ 'saas.workspaces.noInvitations' | transloco }}</p>
          }
        </section>
        <section class="panel">
          <h2>{{ 'saas.workspaces.general' | transloco }}</h2>
          <form class="form-row" [formGroup]="nameForm" (ngSubmit)="rename()">
            <mat-form-field appearance="outline"
              ><mat-label>{{ 'saas.workspaces.name' | transloco }}</mat-label
              ><input matInput formControlName="name" maxlength="80" /><mat-error>{{
                'saas.workspaces.nameError' | transloco
              }}</mat-error></mat-form-field
            ><button mat-stroked-button [disabled]="busy() || nameForm.invalid">
              {{ 'saas.save' | transloco }}
            </button>
          </form>
        </section>
      }
    }
  </div>`,
})
export class WorkspaceDetailComponent {
  private readonly api = inject(WorkspacesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  readonly userId = inject(AuthService).getCurrentUser().userId;
  readonly roles: WorkspaceRole[] = ['owner', 'admin', 'member'];
  readonly details = signal<WorkspaceDetails | null>(null);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly inviteLink = signal('');
  readonly copied = signal(false);
  readonly removing = signal<number | null>(null);
  private readonly fb = inject(FormBuilder);
  readonly nameForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
  });
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    role: this.fb.nonNullable.control<'member' | 'admin'>('member'),
  });
  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          this.loading.set(true);
          this.details.set(null);
          this.error.set('');
          this.inviteLink.set('');
          return this.api.details(params.get('id')!);
        }),
      )
      .subscribe({
        next: (value) => {
          this.setDetails(value);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(saasError(error));
          this.loading.set(false);
        },
      });
  }
  private setDetails(value: WorkspaceDetails) {
    this.details.set(value);
    this.nameForm.patchValue({ name: value.workspace.name });
  }
  load() {
    this.loading.set(true);
    this.api
      .details(this.route.snapshot.paramMap.get('id')!)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (value) => this.setDetails(value),
        error: (error) => this.error.set(saasError(error)),
      });
  }
  private run<T>(request: Observable<T>, done?: (value: T) => boolean | void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (value) => {
          if (done?.(value) === false) return;
          this.notice.set('saas.saved');
          this.load();
        },
        error: (error) => {
          this.error.set(saasError(error));
          this.load();
        },
      });
  }
  rename() {
    if (this.nameForm.valid)
      this.run(
        this.api.rename(this.details()!.workspace.id, this.nameForm.getRawValue().name.trim()),
      );
  }
  invite() {
    if (this.inviteForm.invalid) return;
    const { email, role } = this.inviteForm.getRawValue();
    this.run(
      this.api.invite(this.details()!.workspace.id, email.trim().toLowerCase(), role),
      (value) => {
        this.inviteLink.set(`${location.origin}/join#token=${value.token}`);
        this.copied.set(false);
        this.inviteForm.reset({ email: '', role: 'member' });
      },
    );
  }
  copyLink() {
    this.copied.set(this.clipboard.copy(this.inviteLink()));
  }
  revoke(id: string) {
    this.run(this.api.revoke(this.details()!.workspace.id, id), () => this.inviteLink.set(''));
  }
  changeRole(member: WorkspaceMember, change: MatSelectChange) {
    const role = change.value as WorkspaceRole;
    change.source.value = member.role;
    this.run(this.api.changeRole(this.details()!.workspace.id, member.userId, role));
  }
  canRemove(member: WorkspaceMember) {
    const role = this.details()?.workspace.role;
    return (
      member.userId === this.userId ||
      role === 'owner' ||
      (role === 'admin' && member.role === 'member')
    );
  }
  remove(member: WorkspaceMember) {
    this.run(this.api.remove(this.details()!.workspace.id, member.userId), () => {
      this.removing.set(null);
      if (member.userId === this.userId) {
        void this.router.navigate(['/workspaces']);
        return false;
      }
      return true;
    });
  }
}
