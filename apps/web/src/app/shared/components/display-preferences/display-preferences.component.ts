import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '@app/core/i18n/language.service';
import { ThemeService } from '@app/core/services/theme.service';

@Component({
  selector: 'app-display-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  template: `
    <button
      mat-icon-button
      type="button"
      [matMenuTriggerFor]="languages"
      [attr.aria-label]="'nav.language' | transloco"
    >
      <mat-icon>translate</mat-icon>
    </button>
    <mat-menu #languages="matMenu">
      @for (language of i18n.langs; track language.id) {
        <button mat-menu-item type="button" (click)="i18n.setLang(language.id)">
          {{ language.label }}
        </button>
      }
    </mat-menu>
    <button
      mat-icon-button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="(theme.dark() ? 'theme.light' : 'theme.dark') | transloco"
    >
      <mat-icon>{{ theme.dark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `,
})
export class DisplayPreferencesComponent {
  readonly i18n = inject(LanguageService);
  readonly theme = inject(ThemeService);
}
