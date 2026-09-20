import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';

@Injectable()
export class AppPaginatorIntl extends MatPaginatorIntl {
  private readonly transloco = inject(TranslocoService);

  constructor() {
    super();
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => this.translate());
    this.transloco.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'translationLoadSuccess') {
        this.translate();
      }
    });
    this.translate();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const of = this.transloco.translate('paginator.of');
    if (length === 0 || pageSize === 0) {
      return `0 ${of} ${length}`;
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return `${start} – ${end} ${of} ${length}`;
  };

  private translate(): void {
    this.itemsPerPageLabel = this.transloco.translate('paginator.itemsPerPage');
    this.nextPageLabel = this.transloco.translate('paginator.nextPage');
    this.previousPageLabel = this.transloco.translate('paginator.previousPage');
    this.firstPageLabel = this.transloco.translate('paginator.firstPage');
    this.lastPageLabel = this.transloco.translate('paginator.lastPage');
    this.changes.next();
  }
}
