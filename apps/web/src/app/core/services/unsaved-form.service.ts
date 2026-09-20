import { Injectable, inject } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import type { MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@jsverse/transloco';
import type { Observable } from 'rxjs';
import { Subject, filter, map, of, takeUntil, tap } from 'rxjs';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { dialogSize } from '@app/shared/crud/crud.util';

@Injectable({ providedIn: 'root' })
export class UnsavedFormService {
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);
  private active?: { ref: MatDialogRef<unknown>; form: FormGroup };
  private stop$ = new Subject<void>();

  begin(ref: MatDialogRef<unknown>, form: FormGroup): void {
    this.stop$.next();
    this.active = { ref, form };
    ref
      .keydownEvents()
      .pipe(
        filter((event) => event.key === 'Escape'),
        takeUntil(this.stop$),
      )
      .subscribe(() => this.tryDiscard());
  }

  end(ref: MatDialogRef<unknown>): void {
    if (this.active?.ref !== ref) {
      return;
    }
    this.stop$.next();
    this.active = undefined;
  }

  tryDiscard(): void {
    this.confirmLeave().subscribe((ok) => {
      if (ok) {
        this.active?.form.markAsPristine();
        this.active?.ref.close(false);
      }
    });
  }

  canDeactivate(): Observable<boolean> {
    return this.confirmLeave().pipe(
      tap((ok) => {
        if (ok && this.active) {
          this.active.form.markAsPristine();
          this.active.ref.close(false);
        }
      }),
    );
  }

  private confirmLeave(): Observable<boolean> {
    if (!this.active?.form.dirty) {
      return of(true);
    }
    return this.dialog
      .open(AlertMessageComponent, {
        ...dialogSize('420px'),
        data: {
          title: this.transloco.translate('dialog.unsavedTitle'),
          body: this.transloco.translate('dialog.unsavedBody'),
          submit: { status: true, title: this.transloco.translate('common.leave') },
          close: { status: true, title: this.transloco.translate('common.stay') },
        },
      })
      .afterClosed()
      .pipe(map((ok) => !!ok));
  }
}
