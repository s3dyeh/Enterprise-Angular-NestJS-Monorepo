import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-spinner-overlay',
  template: `<mat-spinner diameter="80" color="primary" strokeWidth="2"></mat-spinner>`,
  imports: [MatProgressSpinnerModule],
})
export class SpinnerOverlayComponent {}
