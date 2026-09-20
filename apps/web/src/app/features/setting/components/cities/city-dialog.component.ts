import { createFormDialog } from '@app/shared/crud/form-dialog';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ApiEndpoints } from '@app/core/constants';
import type { City, Region } from '@app/core/models/models';
import { MatButtonModule } from '@angular/material/button';
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
  selector: 'app-city-dialog',
  templateUrl: './city-dialog.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  imports: [
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
    MatFormFieldModule,
    TranslocoPipe,
    ReactiveFormsModule,
    ErrorHandlingComponent,
  ],
})
export class CityDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpService);
  private readonly validator = inject(ValidatorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly regions = signal<Region[]>([]);

  readonly data = inject<{ row?: City; regions?: Region[] }>(MAT_DIALOG_DATA);
  readonly form = this.createForm();
  readonly dialog = createFormDialog(this.form);

  get isEdit(): boolean {
    return !!this.data?.row?.id;
  }

  private createForm() {
    return this.fb.nonNullable.group({
      name: [this.data?.row?.name || '', this.validator.name],
      region_id: [this.data?.row?.region_id || null, this.validator.required],
    });
  }

  ngOnInit(): void {
    this.regions.set(this.data?.regions || []);
    if (!this.regions().length) {
      this.http
        .get<Region[]>(`all/${ApiEndpoints.REGIONS}`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((res) => {
          this.regions.set(Array.isArray(res) ? res : []);
        });
    }
  }

  save(): void {
    const request = this.isEdit
      ? this.http.put(ApiEndpoints.CITIES, this.form.value, this.data.row!.id)
      : this.http.post(ApiEndpoints.CITIES, this.form.value);
    this.dialog.submit(() => request);
  }
}
