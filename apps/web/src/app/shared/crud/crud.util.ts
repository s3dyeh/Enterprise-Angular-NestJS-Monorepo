import type { MatDialog } from '@angular/material/dialog';
import type { TranslocoService } from '@jsverse/transloco';
import type { ListParams } from '@app/core/interfaces/params';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { environment } from '@environments/environment';

export function defaultListParams(): ListParams {
  return {
    page_size: environment.perPageOptions[0],
    page: 1,
    order_by: 'id',
    direction: 'desc',
  };
}

export function likeOrFilter(_columns: string[], term: string): string {
  return term.trim().slice(0, 200);
}

export function dialogSize(width = '480px') {
  return {
    width,
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'calc(100dvh - 24px)',
    panelClass: 'app-dialog',
    disableClose: true,
    autoFocus: 'first-tabbable' as const,
  };
}

export function confirmDelete(dialog: MatDialog, transloco: TranslocoService) {
  return dialog
    .open(AlertMessageComponent, {
      ...dialogSize('420px'),
      data: {
        title: transloco.translate('dialog.deleteTitle'),
        body: transloco.translate('dialog.deleteBody'),
        submit: { status: true, title: transloco.translate('common.delete') },
        close: { status: true, title: transloco.translate('common.cancel') },
      },
    })
    .afterClosed();
}
