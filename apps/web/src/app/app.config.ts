import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { environment } from '@environments/environment';
import { routes } from './app.routes';
import { APP_LANGS } from './core/i18n/languages';
import { GlobalErrorHandler } from './core/error/global-error.handler';
import { AppPaginatorIntl } from './core/i18n/paginator-intl';
import { AppTranslocoLoader } from './core/i18n/transloco-loader';
import { apiInterceptor } from './core/interceptor/http.interceptor';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideTransloco({
      config: {
        availableLangs: APP_LANGS.map(({ id }) => id),
        defaultLang: environment.defaultLang,
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: AppTranslocoLoader,
    }),
    { provide: MatPaginatorIntl, useClass: AppPaginatorIntl },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
