import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { VersionReadyEvent } from '@angular/service-worker';
import { SwUpdate } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { Subject, of } from 'rxjs';
import { LanguageService } from '../i18n/language.service';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  it('prompts to reload when a new version is ready', () => {
    const versionUpdates = new Subject<VersionReadyEvent>();
    const snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    snack.open.and.returnValue({ onAction: () => new Subject<void>().asObservable() });

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdates.asObservable(),
            unrecoverable: of(),
            checkForUpdate: () => Promise.resolve(false),
          },
        },
        { provide: MatSnackBar, useValue: snack },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        { provide: LanguageService, useValue: { dir: () => 'ltr' } },
      ],
    });

    TestBed.inject(PwaUpdateService);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });

    expect(snack.open).toHaveBeenCalledWith('pwa.updateReady', 'pwa.reload', jasmine.any(Object));
  });
});
