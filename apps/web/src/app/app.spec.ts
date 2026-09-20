import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { App } from './app';
import { LanguageService } from './core/i18n/language.service';
import { PwaUpdateService } from './core/pwa/pwa-update.service';
import { MessageService } from './core/services/message.service';
import { ThemeService } from './core/services/theme.service';
import type { AppMessage } from './core/interfaces/message';

describe('App', () => {
  it('renders the route outlet and delivers notifications', () => {
    const messages = new Subject<AppMessage>();
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ThemeService, useValue: {} },
        { provide: PwaUpdateService, useValue: {} },
        { provide: LanguageService, useValue: { dir: () => 'ltr' } },
        { provide: MessageService, useValue: { message$: messages } },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    messages.next({ message: 'Saved', type: 'success' });
    expect(snackBar.open).toHaveBeenCalledWith(
      'Saved',
      undefined,
      jasmine.objectContaining({ panelClass: 'notification-success' }),
    );
    fixture.destroy();
    messages.next({ message: 'After destroy', type: 'success' });
    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });
});
