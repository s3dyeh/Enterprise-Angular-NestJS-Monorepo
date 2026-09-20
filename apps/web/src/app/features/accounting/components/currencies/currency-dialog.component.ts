import { createFormDialog } from '@app/shared/crud/form-dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiEndpoints } from '@app/core/constants';
import type { Currency } from '@app/core/models/models';
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
  selector: 'app-currency-dialog',
  templateUrl: './currency-dialog.component.html',
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
export class CurrencyDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpService);
  private readonly validator = inject(ValidatorService);

  readonly data = inject<{ row?: Currency }>(MAT_DIALOG_DATA);
  readonly form = this.createForm();
  readonly dialog = createFormDialog(this.form);

  get isEdit(): boolean {
    return !!this.data?.row?.id;
  }

  private createForm() {
    return this.fb.nonNullable.group({
      name: [this.data?.row?.name || '', this.validator.name],
      symbol: [this.data?.row?.symbol || '', this.validator.symbol],
    });
  }

  save(): void {
    const request = this.isEdit
      ? this.http.put(ApiEndpoints.CURRENCIES, this.form.value, this.data.row!.id)
      : this.http.post(ApiEndpoints.CURRENCIES, this.form.value);
    this.dialog.submit(() => request);
  }
}
