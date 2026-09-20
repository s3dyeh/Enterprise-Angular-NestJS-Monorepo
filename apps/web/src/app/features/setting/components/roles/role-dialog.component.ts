import { createFormDialog } from '@app/shared/crud/form-dialog';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiEndpoints } from '@app/core/constants';
import type { Role } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoPipe } from '@jsverse/transloco';
import { mergeResources } from '@app/core/nav/permissions';
import { HttpService } from '@app/core/services/http.service';
import { ValidatorService } from '@app/core/services/validator.service';
import { ErrorHandlingComponent } from '@app/shared/components/error-handling/error-handling.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-role-dialog',
  templateUrl: './role-dialog.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    MatButtonModule,
    MatListModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
    MatFormFieldModule,
    TranslocoPipe,
    ReactiveFormsModule,
    ErrorHandlingComponent,
  ],
})
export class RoleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpService);
  private readonly validator = inject(ValidatorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly resources = signal<string[]>([]);

  readonly data = inject<{ row?: Role }>(MAT_DIALOG_DATA);
  readonly form = this.createForm();
  readonly dialog = createFormDialog(this.form);

  get isEdit(): boolean {
    return !!this.data?.row?.id;
  }

  private createForm() {
    const row = this.data?.row;
    const selected = (row?.resources || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return this.fb.nonNullable.group({
      name: [row?.name || '', this.validator.name],
      resources: [selected, Validators.required],
    });
  }

  ngOnInit(): void {
    this.http
      .get<string[]>(ApiEndpoints.RESOURCES)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.resources.set(mergeResources(Array.isArray(res) ? res : []));
        },
        error: () => {
          this.resources.set(mergeResources([]));
        },
      });
  }

  save(): void {
    const payload = {
      name: this.form.value.name,
      resources: (this.form.value.resources || []).join(','),
    };
    const request = this.isEdit
      ? this.http.put(ApiEndpoints.ROLES, payload, this.data.row!.id)
      : this.http.post(ApiEndpoints.ROLES, payload);
    this.dialog.submit(() => request);
  }
}
