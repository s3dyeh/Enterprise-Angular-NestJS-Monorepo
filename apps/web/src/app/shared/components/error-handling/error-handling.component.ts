import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { FormGroup } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { merge, switchMap } from 'rxjs';
import { ValidatorService } from '@app/core/services/validator.service';

@Component({
  selector: 'app-error-handling',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ errorMessage() }}',
})
export class ErrorHandlingComponent {
  readonly formGroup = input.required<FormGroup>();
  readonly field = input('');
  readonly message = input('');
  readonly condition = input<string | number>('');
  private readonly validation = inject(ValidatorService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = toSignal(merge(this.transloco.langChanges$, this.transloco.events$));
  private readonly formEvents = toSignal(
    toObservable(this.formGroup).pipe(switchMap((form) => form.events)),
  );

  readonly errorMessage = computed(() => {
    this.formEvents();
    this.language();
    const errors = this.formGroup().get(this.field())?.errors;
    const field = this.transloco.translate(this.message() || this.field());
    for (const key of ['required', 'pattern', 'email', 'minlength', 'maxlength']) {
      if (errors?.[key]) {
        const name = key === 'pattern' || key === 'email' ? 'invalid' : key;
        return this.transloco.translate('validation.' + name, {
          field,
          count: this.condition() || errors[key]?.requiredLength,
        });
      }
    }
    return this.validation.getErrorMessage(this.field());
  });
}
