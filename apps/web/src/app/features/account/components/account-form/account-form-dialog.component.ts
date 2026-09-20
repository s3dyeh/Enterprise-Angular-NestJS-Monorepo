import { createFormDialog } from '@app/shared/crud/form-dialog';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiEndpoints } from '@app/core/constants';
import type { Account, Role } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpService } from '@app/core/services/http.service';
import { ValidatorService } from '@app/core/services/validator.service';
import { ErrorHandlingComponent } from '@app/shared/components/error-handling/error-handling.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-account-form-dialog',
  templateUrl: './account-form-dialog.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
    MatFormFieldModule,
    TranslocoPipe,
    ReactiveFormsModule,
    ErrorHandlingComponent,
  ],
})
export class AccountFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpService);
  private readonly validator = inject(ValidatorService);
  private readonly destroyRef = inject(DestroyRef);

  hide = true;
  readonly roles = signal<Role[]>([]);
  readonly statuses = [
    { id: 'active', name: 'account.active' },
    { id: 'in_active', name: 'account.inactive' },
  ];

  readonly data = inject<{ row?: Account; kind: 'user' | 'customer' }>(MAT_DIALOG_DATA);
  readonly form = this.createForm();
  readonly dialog = createFormDialog(this.form);

  get isEdit(): boolean {
    return !!this.data?.row?.id;
  }

  get isUser(): boolean {
    return this.data.kind === 'user';
  }

  get endpoint(): string {
    return this.isUser ? ApiEndpoints.USERS : ApiEndpoints.CUSTOMERS;
  }

  private createForm() {
    const row = this.data?.row;
    return this.fb.nonNullable.group({
      full_name: [row?.full_name || '', this.validator.fullName],
      username: [row?.username || '', this.validator.username],
      password: ['', this.isEdit ? this.validator.optionalPassword : this.validator.password],
      email: [row?.email || '', this.validator.email],
      phone: [row?.phone || '', this.validator.optionalPhone],
      status: [row?.status || 'active', this.validator.required],
      role_id: [row?.role_id || null, this.isUser ? this.validator.required : []],
    });
  }

  ngOnInit(): void {
    if (this.isUser) {
      this.http
        .get<Role[]>(`all/${ApiEndpoints.ROLES}`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          this.roles.set(Array.isArray(res) ? res : []);
        });
    }
  }

  save(): void {
    const payload = { ...this.form.value };
    if (!payload.password) {
      delete payload.password;
    }
    if (!this.isUser) {
      delete payload.role_id;
    }
    const request = this.isEdit
      ? this.http.put(this.endpoint, payload, this.data.row!.id)
      : this.http.post(this.endpoint, payload);
    this.dialog.submit(() => request);
  }
}
