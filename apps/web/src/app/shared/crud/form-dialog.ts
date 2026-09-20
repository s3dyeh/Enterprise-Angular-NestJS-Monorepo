import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { defer, finalize } from 'rxjs';
import type { Observable } from 'rxjs';
import { UnsavedFormService } from '@app/core/services/unsaved-form.service';

/** Shared dialog lifecycle; fields and request payloads remain in each component. */
export function createFormDialog(form: FormGroup) {
  const ref = inject(MatDialogRef<unknown, boolean>);
  const destroyRef = inject(DestroyRef);
  const unsaved = inject(UnsavedFormService);
  const saving = signal(false);
  unsaved.begin(ref, form);
  destroyRef.onDestroy(() => unsaved.end(ref));

  return {
    saving: saving.asReadonly(),
    discard: () => {
      if (!saving()) unsaved.tryDiscard();
    },
    submit(request: () => Observable<unknown>): void {
      if (saving()) return;
      if (form.invalid) {
        form.markAllAsTouched();
        return;
      }
      saving.set(true);
      defer(request)
        .pipe(
          finalize(() => saving.set(false)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: () => {
            form.markAsPristine();
            ref.close(true);
          },
          // The HTTP interceptor presents API errors; keep the form open for correction.
          error: () => undefined,
        });
    },
  };
}
