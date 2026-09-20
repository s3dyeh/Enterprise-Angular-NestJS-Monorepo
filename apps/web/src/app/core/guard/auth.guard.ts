import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import type { AdminTab } from '../nav/admin-nav';
import { AuthService } from '../services/auth.service';
import { isAppReturnUrl, safeReturnUrl } from '../util/return-url';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  const intended = [state.url, router.currentNavigation()?.extractedUrl?.toString() ?? '']
    .map((url) => url.split('?')[0])
    .find((url) => isAppReturnUrl(url));
  return auth.ensureSession().pipe(
    map(
      (loggedIn) =>
        loggedIn ||
        router.createUrlTree(['/login'], {
          queryParams: intended ? { returnUrl: intended } : undefined,
        }),
    ),
  );
};

export const guestGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')));
};

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permission = route.data['permission'] as string | string[] | undefined;
  if (!permission || auth.hasAccess(permission)) {
    return true;
  }
  return router.createUrlTree(['/403']);
};

export function firstTabGuard(tabs: readonly AdminTab[], section: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const tab = tabs.find((item) => auth.hasAccess(item.permission));
    if (!tab) {
      return router.createUrlTree(['/403']);
    }
    return router.createUrlTree(['/', section, tab.path]);
  };
}
