import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-list-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
  ],
  template: `
    <ng-content />
    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      <mat-label>{{ 'list.search' | transloco }}</mat-label>
      <input
        matInput
        [ngModel]="search()"
        (ngModelChange)="search.set($event)"
        (keyup.enter)="searchSubmitted.emit()"
      />
      <button
        mat-icon-button
        matSuffix
        type="button"
        (click)="searchSubmitted.emit()"
        [attr.aria-label]="'list.search' | transloco"
      >
        <mat-icon>search</mat-icon>
      </button>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-block-end: 20px;
    }
    mat-form-field {
      margin-inline-start: auto;
      width: min(100%, 320px);
    }
    @media (max-width: 600px) {
      :host {
        align-items: stretch;
        flex-direction: column;
      }
      mat-form-field {
        width: 100%;
      }
    }
  `,
})
export class ListToolbarComponent {
  readonly search = model('');
  readonly searchSubmitted = output<void>();
}
