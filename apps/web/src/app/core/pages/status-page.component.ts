import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-status-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink, TranslocoPipe],
  template: `
    <main>
      <p>{{ code }}</p>
      <h1>{{ 'error.' + code + 'Title' | transloco }}</h1>
      <a mat-flat-button routerLink="/">{{ 'common.home' | transloco }}</a>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-block-size: min(80dvh, 640px);
      padding: 24px;
      text-align: center;
    }
    p {
      margin: 0;
      font-size: clamp(64px, 16vw, 112px);
      font-weight: 600;
      letter-spacing: -0.06em;
      color: var(--app-muted);
    }
    h1 {
      margin: 12px 0 28px;
      font-size: clamp(20px, 4vw, 28px);
      font-weight: 500;
    }
  `,
})
export class StatusPageComponent {
  readonly code = inject(ActivatedRoute).snapshot.data['statusCode'] ?? 404;
}
