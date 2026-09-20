import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { AdminTab } from '@app/core/nav/admin-nav';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-section-tabs',
  templateUrl: './section-tabs.component.html',
  styleUrl: './section-tabs.component.scss',
  imports: [
    MatIconModule,
    MatTabsModule,
    TranslocoPipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
})
export class SectionTabsComponent {
  private readonly auth = inject(AuthService);
  readonly tabs = ((inject(ActivatedRoute).snapshot.data['tabs'] ?? []) as AdminTab[]).filter(
    (tab) => this.auth.hasAccess(tab.permission),
  );
}
