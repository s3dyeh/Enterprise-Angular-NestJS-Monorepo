import { MatListModule } from '@angular/material/list';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, EMPTY } from 'rxjs';
import { ApiEndpoints } from '@app/core/constants';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpService } from '@app/core/services/http.service';
import { ListStateComponent } from '@app/shared/crud/list-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cache',
  templateUrl: './cache.component.html',
  styleUrl: '../../../../shared/crud/crud-page.scss',
  styles: `
    .intro {
      min-width: 0;
    }

    h2 {
      margin: 0 0 4px;
      font-size: 1.25rem;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: var(--app-muted);
      font-size: 14px;
    }

    .empty {
      padding: 16px;
      color: var(--app-muted);
    }
  `,
  imports: [
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    TranslocoPipe,
    ListStateComponent,
  ],
})
export class CacheComponent implements OnInit {
  private readonly http = inject(HttpService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transloco = inject(TranslocoService);

  readonly keys = signal<string[]>([]);
  readonly selected = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadKeys();
  }

  loadKeys(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<string[]>(ApiEndpoints.CLEAR_CACHE_KEYS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.keys.set([]);
          this.selected.set('');
          this.loading.set(false);
          this.error.set(this.transloco.translate('list.loadError'));
          return EMPTY;
        }),
      )
      .subscribe((res) => {
        this.keys.set(Array.isArray(res) ? res.filter((key) => !!key?.trim()) : []);
        if (!this.keys().includes(this.selected())) {
          this.selected.set('');
        }
        this.loading.set(false);
      });
  }

  clear(): void {
    const key = this.selected().trim();
    if (!key) {
      return;
    }
    this.http
      .put(ApiEndpoints.CLEAR_CACHE, {}, encodeURIComponent(key))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
