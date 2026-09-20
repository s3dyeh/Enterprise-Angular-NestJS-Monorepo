import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/i18n/language.service';
import { PwaUpdateService } from './core/pwa/pwa-update.service';
import { MessageService } from './core/services/message.service';
import { ThemeService } from './core/services/theme.service';
import { environment } from '@environments/environment';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(ThemeService);
    inject(PwaUpdateService);
    const language = inject(LanguageService);
    const snackBar = inject(MatSnackBar);
    inject(MessageService)
      .message$.pipe(takeUntilDestroyed())
      .subscribe(({ message, type }) => {
        snackBar.open(message, undefined, {
          duration: environment.snackBarDuration,
          horizontalPosition: language.dir() === 'rtl' ? 'start' : 'end',
          panelClass: 'notification-' + type,
        });
      });
  }
}
