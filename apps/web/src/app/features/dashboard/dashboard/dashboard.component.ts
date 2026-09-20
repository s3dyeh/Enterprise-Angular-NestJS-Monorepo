import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '@app/shared/components/logo/logo.component';
import { HttpService } from '@app/core/services/http.service';
import { AuthService } from '@app/core/services/auth.service';

interface Summary {
  accounts: number;
  roles: number;
  regions: number;
  cities: number;
  activity: { id: number; event: string; created_at: string }[];
}
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [MatIconModule, MatCardModule, TranslocoPipe, LogoComponent, DatePipe],
})
export class DashboardComponent {
  readonly summary = signal<Summary | null>(null);
  readonly error = signal(false);
  readonly allowed = inject(AuthService).hasAccess('user:read');
  readonly stats = [
    { key: 'accounts', icon: 'manage_accounts' },
    { key: 'roles', icon: 'verified_user' },
    { key: 'regions', icon: 'map' },
    { key: 'cities', icon: 'location_city' },
  ] as const;
  constructor() {
    if (this.allowed)
      inject(HttpService)
        .get<Summary>('dashboard')
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (value) => this.summary.set(value),
          error: () => this.error.set(true),
        });
  }
}
