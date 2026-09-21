import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SAAS_UI } from './saas-ui';
@Component({
  selector: 'app-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SAAS_UI],
  styleUrls: ['./saas-page.scss', './start.component.scss'],
  template: `<div class="page">
    <header class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">{{ 'saas.start.eyebrow' | transloco }}</p>
        <h1>
          {{ 'saas.start.title' | transloco }}
          <span class="launch-line">{{ 'saas.start.launch' | transloco }}</span>
        </h1>
        <p class="intro">{{ 'saas.start.subtitle' | transloco }}</p>
        <a mat-flat-button routerLink="/workspaces"
          >{{ 'saas.start.cta' | transloco }}<mat-icon iconPositionEnd>arrow_forward</mat-icon></a
        >
      </div>
      <div class="welcome-art" aria-hidden="true">
        <div class="art-orbit"></div>
        <div class="art-tile tile-back"><mat-icon>group</mat-icon></div>
        <div class="art-tile tile-main">
          <mat-icon>workspaces</mat-icon><span></span><span></span>
        </div>
        <div class="art-tile tile-front"><mat-icon>check</mat-icon></div>
      </div>
    </header>
    <section class="getting-started">
      <h2>{{ 'saas.start.next' | transloco }}</h2>
      <div class="setup-grid">
        @for (step of steps; track step.key; let i = $index) {
          <div class="step">
            <span class="icon-box"
              ><mat-icon>{{ step.icon }}</mat-icon></span
            >
            <span class="step-index" aria-hidden="true">0{{ i + 1 }}</span>
            <div>
              <h3>{{ 'saas.start.' + step.key + 'Title' | transloco }}</h3>
              <p>{{ 'saas.start.' + step.key + 'Body' | transloco }}</p>
              <a mat-stroked-button [routerLink]="step.path">{{
                'saas.start.' + step.key + 'Action' | transloco
              }}</a>
            </div>
          </div>
        }
      </div>
    </section>
    <section class="foundation">
      <div class="foundation-heading">
        <span class="badge">{{ 'saas.start.included' | transloco }}</span>
        <h2>{{ 'saas.start.foundation' | transloco }}</h2>
      </div>
      <div class="feature-grid">
        @for (feature of features; track feature.key) {
          <div class="feature">
            <mat-icon>{{ feature.icon }}</mat-icon>
            <div>
              <h3>{{ 'saas.start.' + feature.key + 'Title' | transloco }}</h3>
              <p>{{ 'saas.start.' + feature.key + 'Body' | transloco }}</p>
            </div>
          </div>
        }
      </div>
    </section>
  </div>`,
})
export class StartComponent {
  readonly steps = [
    { key: 'workspace', path: '/workspaces', icon: 'workspaces' },
    { key: 'profile', path: '/profile', icon: 'person_outline' },
  ];
  readonly features = [
    { key: 'auth', icon: 'lock' },
    { key: 'team', icon: 'group' },
    { key: 'languages', icon: 'translate' },
  ];
}
