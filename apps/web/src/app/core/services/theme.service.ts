import { DOCUMENT } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { StorageService } from './storage.service';

export const THEME_STORAGE_KEY = 'web-color-scheme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);
  private readonly preference = signal(this.storage.get(THEME_STORAGE_KEY));
  private readonly systemDark = toSignal(
    inject(BreakpointObserver)
      .observe('(prefers-color-scheme: dark)')
      .pipe(map(({ matches }) => matches)),
    { initialValue: false },
  );
  readonly dark = computed(() => {
    const preference = this.preference();
    return preference === 'dark' || (preference !== 'light' && this.systemDark());
  });

  constructor() {
    effect(() => this.document.documentElement.classList.toggle('dark-theme', this.dark()));
  }

  toggle(): void {
    const preference = this.dark() ? 'light' : 'dark';
    this.preference.set(preference);
    this.storage.set(THEME_STORAGE_KEY, preference);
  }
}
