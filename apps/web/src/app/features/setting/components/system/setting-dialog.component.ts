import { createFormDialog } from '@app/shared/crud/form-dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiEndpoints } from '@app/core/constants';
import type { AppSetting } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpService } from '@app/core/services/http.service';
import { ValidatorService } from '@app/core/services/validator.service';
import { ErrorHandlingComponent } from '@app/shared/components/error-handling/error-handling.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-setting-dialog',
  templateUrl: './setting-dialog.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatDialogModule,
    MatFormFieldModule,
    TranslocoPipe,
    ReactiveFormsModule,
    ErrorHandlingComponent,
  ],
})
export class SettingDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpService);
  private readonly validator = inject(ValidatorService);

  readonly data = inject<{ row?: AppSetting }>(MAT_DIALOG_DATA);
  readonly form = this.createForm();
  readonly dialog = createFormDialog(this.form);

  private createForm() {
    const row = this.data?.row;
    return this.fb.nonNullable.group({
      property: [{ value: row?.property || '', disabled: true }],
      value: [row?.value || '', this.validator.required],
      description: [row?.description || ''],
    });
  }

  save(): void {
    if (!this.data.row?.id) {
      return;
    }
    const payload = {
      property: this.data.row.property,
      value: this.form.value.value,
      description: this.form.value.description,
    };
    this.dialog.submit(() => this.http.put(ApiEndpoints.SETTINGS, payload, this.data.row!.id));
  }
}
