import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { HttpService } from '@app/core/services/http.service';
import { createFormDialog } from '@app/shared/crud/form-dialog';

@Component({
  selector: 'app-credit-adjustment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Adjust account credit</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <p>
          Enter a positive credit or a negative debit. Every adjustment is recorded permanently.
        </p>
        <mat-form-field
          ><mat-label>Account ID</mat-label
          ><input matInput type="number" formControlName="account_id" min="1"
        /></mat-form-field>
        <mat-form-field
          ><mat-label>Currency ID</mat-label
          ><input matInput type="number" formControlName="currency_id" min="1"
        /></mat-form-field>
        <mat-form-field
          ><mat-label>Amount</mat-label
          ><input matInput formControlName="amount" inputmode="decimal" /><mat-hint
            >Up to four decimal places</mat-hint
          ></mat-form-field
        >
        <mat-form-field
          ><mat-label>Reason</mat-label
          ><textarea matInput formControlName="reason" maxlength="300"></textarea>
        </mat-form-field>
        @if (form.invalid && form.touched) {
          <p role="alert">
            Enter valid account and currency IDs, a nonzero amount, and a reason of at least five
            characters.
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button mat-button type="button" [disabled]="dialog.saving()" (click)="dialog.discard()">
          Cancel</button
        ><button mat-flat-button type="submit" [disabled]="dialog.saving()">
          Record adjustment
        </button></mat-dialog-actions
      >
    </form>
  `,
  styles: 'mat-form-field { display: block; margin-top: 8px; }',
})
export class CreditAdjustmentComponent {
  private readonly http = inject(HttpService);
  private readonly key = crypto.randomUUID();
  readonly form = inject(FormBuilder).nonNullable.group({
    account_id: [0, [Validators.required, Validators.min(1)]],
    currency_id: [0, [Validators.required, Validators.min(1)]],
    amount: [
      '',
      [
        Validators.required,
        Validators.pattern(/^-?\d{1,15}(\.\d{1,4})?$/),
        (control: { value: string }) => (Number(control.value) === 0 ? { nonzero: true } : null),
      ],
    ],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
  });
  readonly dialog = createFormDialog(this.form);
  private submitted?: ReturnType<typeof this.form.getRawValue>;
  save(): void {
    this.dialog.submit(() => {
      // A timeout may hide a committed response. Retries use the original payload and key.
      this.submitted ??= this.form.getRawValue();
      this.form.disable();
      return this.http.post('account-credits/adjustments', {
        ...this.submitted,
        idempotency_key: this.key,
      });
    });
  }
}
