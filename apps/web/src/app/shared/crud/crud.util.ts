import { PAGE_SIZE_DEFAULT, SEARCH_MAX_LENGTH } from '@enterprise/contracts';
import type { ListParams } from '@app/core/interfaces/params';
import type { MatDialog } from '@angular/material/dialog';
import type { TranslocoService } from '@jsverse/transloco';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

/**
 * Default administrative list query params aligned with API AdminQueryDto defaults.
 */
export function defaultListParams(): ListParams {
  return {
    page_size: PAGE_SIZE_DEFAULT,
    page: 1,
    order_by: 'id',
    direction: 'desc',
  };
}

/**
 * Trim and bound a free-text search term for the API `search` query parameter.
 */
export function likeOrFilter(_columns: string[], term: string): string {
  return term.trim().slice(0, SEARCH_MAX_LENGTH);
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
