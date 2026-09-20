import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { ErrorMessages } from '../constants';
import type { AppMessage } from '../interfaces/message';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly transloco = inject(TranslocoService);
  readonly message$ = new Subject<AppMessage>();

  raise(statusCode: number, message?: unknown): void {
    const text = this.toText(message);
    switch (statusCode) {
      case 200:
        this.message$.next({ message: text || this.t('messages.success'), type: 'success' });
        return;
      case 401:
        this.message$.next({ message: text || this.t(ErrorMessages.Unauthorized), type: 'error' });
        return;
      case 403:
        this.message$.next({ message: text || this.t('error.403Title'), type: 'error' });
        return;
      case 404:
        this.message$.next({ message: text || this.t(ErrorMessages.NotFound), type: 'error' });
        return;
      case 504:
        this.message$.next({ message: text || this.t(ErrorMessages.Timeout), type: 'error' });
        return;
      default:
        this.message$.next({ message: text || this.t(ErrorMessages.Generic), type: 'error' });
    }
  }

  private t(key: string): string {
    return this.transloco.translate(key);
  }

  private toText(message: unknown): string {
    if (typeof message === 'string') {
      return this.transloco.translate(message).slice(0, 120);
    }
    if (message && typeof message === 'object' && 'message' in message) {
      return String((message as { message: unknown }).message ?? '').slice(0, 120);
    }
    return '';
  }
}
