import type { ComponentType } from '@angular/cdk/portal';
import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import type { PageEvent } from '@angular/material/paginator';
import type { Sort } from '@angular/material/sort';
import { TranslocoService } from '@jsverse/transloco';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { HttpService } from '@app/core/services/http.service';
import { environment } from '@environments/environment';
import { confirmDelete, defaultListParams, dialogSize, likeOrFilter } from './crud.util';

export interface ListPageOptions<T> {
  endpoint: string;
  searchColumns: string[];
  dialog?: ComponentType<unknown>;
  dialogWidth?: string;
  dialogData?: (row?: T) => unknown;
  canDelete?: boolean;
}

export function createListPage<T extends { id: number } | { key: string }>(
  options: ListPageOptions<T>,
): ListPage<T> {
  return new ListPage(
    options,
    inject(HttpService),
    inject(MatDialog),
    inject(DestroyRef),
    inject(TranslocoService),
  );
}

export class ListPage<T extends { id: number } | { key: string }> {
  readonly rows = signal<T[]>([]);
  readonly count = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  search = '';
  params = defaultListParams();
  perPageOptions = environment.perPageOptions;

  private reload$ = new Subject<void>();

  constructor(
    private options: ListPageOptions<T>,
    private http: HttpService,
    private dialog: MatDialog,
    private destroyRef: DestroyRef,
    private transloco: TranslocoService,
  ) {
    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.http.list<T>(this.options.endpoint, this.params).pipe(
            catchError(() => {
              this.rows.set([]);
              this.count.set(0);
              this.loading.set(false);
              this.error.set(this.transloco.translate('list.loadError'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.rows.set(res?.list ?? []);
        this.count.set(res?.count ?? 0);
        this.loading.set(false);
      });
  }

  load(): void {
    this.reload$.next();
  }

  applySearch(): void {
    this.params.page = 1;
    this.params.filter = likeOrFilter(this.options.searchColumns, this.search);
    this.load();
  }

  sortChange(sort: Sort): void {
    this.params.order_by = sort.active;
    this.params.direction = sort.direction;
    this.params.page = 1;
    this.load();
  }

  pageChange(event: PageEvent): void {
    this.params.page_size = event.pageSize;
    this.params.page = event.pageIndex + 1;
    this.load();
  }

  openDialog(row?: T): void {
    if (!this.options.dialog) {
      return;
    }
    this.dialog
      .open(this.options.dialog, {
        ...dialogSize(this.options.dialogWidth ?? '480px'),
        data: this.options.dialogData?.(row) ?? { row },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  remove(row: T): void {
    if (this.options.canDelete === false || !('id' in row)) {
      return;
    }
    confirmDelete(this.dialog, this.transloco)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.http
          .delete(this.options.endpoint, row.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.load() });
      });
  }
}
