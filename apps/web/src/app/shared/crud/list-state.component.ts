import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-list-state',
  template: `
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (error(); as message) {
      <div class="list-state">
        <mat-icon>error_outline</mat-icon>
        <span>{{ message }}</span>
        <button mat-button color="primary" type="button" (click)="retry.emit()">
          {{ 'list.retry' | transloco }}
        </button>
      </div>
    }
  `,
  styles: [
    `
      .list-state {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 16px;
        color: var(--app-muted);
      }

      .list-state span {
        flex: 1 1 180px;
        min-width: 0;
      }
    `,
  ],
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, TranslocoPipe],
})
export class ListStateComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();
}
