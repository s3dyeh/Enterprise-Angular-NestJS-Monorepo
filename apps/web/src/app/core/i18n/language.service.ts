import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '@environments/environment';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';
import type { AppDir, AppLang } from './languages';
import { APP_LANGS, LANG_STORAGE_KEY, isAppLang, langDir } from './languages';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  readonly langs = APP_LANGS;
  readonly lang = signal<AppLang>('en');
  readonly dir = signal<AppDir>('ltr');

  constructor() {
    this.setLang(this.initialLang(), false);
  }

  setLang(lang: AppLang, persist = true): void {
    this.lang.set(lang);
    this.dir.set(langDir(lang));
    this.transloco.setActiveLang(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = langDir(lang);
    if (persist) {
      this.storage.set(LANG_STORAGE_KEY, lang);
    }
  }

  applySessionLang(value: string | undefined): void {
    if (this.storage.get(LANG_STORAGE_KEY) || !isAppLang(value)) {
      return;
    }
    this.setLang(value);
  }

  private initialLang(): AppLang {
    const saved = this.storage.get(LANG_STORAGE_KEY);
    if (isAppLang(saved)) {
      return saved;
    }
    const sessionLang = this.auth.getCurrentUser().language;
    if (isAppLang(sessionLang)) {
      return sessionLang;
    }
    return isAppLang(environment.defaultLang) ? environment.defaultLang : 'en';
  }
}
