import { DisplayPreferencesComponent } from '@app/shared/components/display-preferences/display-preferences.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@app/core/services/auth.service';
import { LogoComponent } from '@app/shared/components/logo/logo.component';
import {
  ACCOUNTING_PERMISSIONS,
  ACCOUNT_PERMISSIONS,
  SETTINGS_PERMISSIONS,
} from '@app/core/nav/admin-nav';

const MOBILE_QUERY = '(max-width: 960px)';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
  imports: [
    DisplayPreferencesComponent,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    TranslocoPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LogoComponent,
  ],
})
export class SidenavComponent {
  private readonly auth = inject(AuthService);
  readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe(MOBILE_QUERY)
      .pipe(map(({ matches }) => matches)),
    { initialValue: false },
  );
  readonly opened = linkedSignal(() => !this.isMobile());
  operatorName =
    this.auth.getCurrentUser().fullName || this.auth.getCurrentUser().username || 'Admin';
  readonly canSettings = this.auth.hasAccess(SETTINGS_PERMISSIONS);
  readonly canAccounts = this.auth.hasAccess(ACCOUNT_PERMISSIONS);
  readonly canAccounting = this.auth.hasAccess(ACCOUNTING_PERMISSIONS);
  get initials(): string {
    return this.operatorName.trim().charAt(0).toUpperCase();
  }

  closeIfMobile(): void {
    if (this.isMobile()) {
      this.opened.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
