import { HttpErrorResponse } from '@angular/common/http';
import type { ErrorHandler } from '@angular/core';
import { Injectable, Injector, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from '../services/message.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    const unwrapped = unwrapError(error);
    if (unwrapped instanceof HttpErrorResponse) {
      return;
    }
    console.error(unwrapped);
    const messages = this.injector.get(MessageService);
    const transloco = this.injector.get(TranslocoService);
    messages.raise(0, transloco.translate('messages.unexpected'));
  }
}

function unwrapError(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const wrapped = error as { ngOriginalError?: unknown; rejection?: unknown };
    return wrapped.ngOriginalError ?? wrapped.rejection ?? error;
  }
  return error;
}
