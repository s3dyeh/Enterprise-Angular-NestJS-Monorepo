import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { UnsavedFormService } from '../services/unsaved-form.service';

export const unsavedFormGuard: CanDeactivateFn<unknown> = () => {
  return inject(UnsavedFormService).canDeactivate();
};
