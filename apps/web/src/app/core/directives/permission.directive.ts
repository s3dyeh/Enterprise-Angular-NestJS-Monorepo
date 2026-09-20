import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appPermission]',
})
export class PermissionDirective {
  private readonly authService = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  appPermission = input.required<string | string[]>();

  constructor() {
    effect(() => {
      const key = this.appPermission();
      this.viewContainer.clear();
      const keys = Array.isArray(key) ? key : [key];
      if (keys.some((item) => this.authService.hasAccess(item))) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
