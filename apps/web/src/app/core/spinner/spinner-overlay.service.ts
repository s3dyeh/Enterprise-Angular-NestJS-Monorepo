import type { OverlayRef } from '@angular/cdk/overlay';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { Subject, distinctUntilChanged, map, scan } from 'rxjs';
import { SpinnerOverlayComponent } from './spinner-overlay.component';

@Injectable({ providedIn: 'root' })
export class SpinnerOverlayService {
  private readonly overlay = inject(Overlay);
  private spinnerTopRef: OverlayRef = this.overlay.create({
    hasBackdrop: true,
    positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
  });
  private spin$ = new Subject<number>();

  constructor() {
    this.spin$
      .pipe(
        scan((acc, next) => {
          if (!next) {
            return 0;
          }
          return acc + next >= 0 ? acc + next : 0;
        }, 0),
        map((val) => val > 0),
        distinctUntilChanged(),
      )
      .subscribe((show) => {
        if (show) {
          this.spinnerTopRef.attach(new ComponentPortal(SpinnerOverlayComponent));
        } else if (this.spinnerTopRef.hasAttached()) {
          this.spinnerTopRef.detach();
        }
      });
  }

  show(): void {
    this.spin$.next(1);
  }

  hide(): void {
    this.spin$.next(-1);
  }
}
