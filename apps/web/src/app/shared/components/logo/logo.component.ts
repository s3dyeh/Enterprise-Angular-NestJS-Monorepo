import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-logo',
  template: `<img
    src="brand.svg"
    alt="Enterprise"
    [style.width.px]="size()"
    [style.height.px]="size()"
  />`,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }

      img {
        display: block;
        object-fit: contain;
      }
    `,
  ],
})
export class LogoComponent {
  readonly size = input(40);
}
