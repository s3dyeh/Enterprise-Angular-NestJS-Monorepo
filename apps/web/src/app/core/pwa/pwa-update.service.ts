import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { VersionReadyEvent } from '@angular/service-worker';
import { SwUpdate } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { filter, interval } from 'rxjs';
import { LanguageService } from '../i18n/language.service';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  constructor() {
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) {
      return;
    }

    const snackBar = inject(MatSnackBar);
    const transloco = inject(TranslocoService);
    const i18n = inject(LanguageService);

    const promptReload = () => {
      snackBar
        .open(transloco.translate('pwa.updateReady'), transloco.translate('pwa.reload'), {
          duration: 0,
          verticalPosition: 'top',
          horizontalPosition: i18n.dir() === 'rtl' ? 'start' : 'end',
        })
        .onAction()
        .subscribe(() => document.location.reload());
    };

    updates.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => promptReload());
    updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => promptReload());
    void updates.checkForUpdate().catch(() => false);
    interval(60 * 60 * 1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => void updates.checkForUpdate().catch(() => false));
  }
}
