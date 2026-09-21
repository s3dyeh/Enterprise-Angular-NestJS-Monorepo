import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { HttpErrorResponse } from '@angular/common/http';

export const SAAS_UI = [
  ReactiveFormsModule,
  RouterLink,
  MatButtonModule,
  MatIconModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  TranslocoPipe,
];

export function saasError(error: unknown): string {
  const known = [
    'memberInactive',
    'lastOwner',
    'ownerRequired',
    'alreadyMember',
    'workspaceLimit',
    'invitationLimit',
    'invitationInvalid',
    'invitationEmailMismatch',
  ];
  if (error instanceof HttpErrorResponse) {
    const message: unknown = error.error?.message;
    if (typeof message === 'string' && known.includes(message)) return `saas.errors.${message}`;
    if (error.status === 403) return 'saas.errors.forbidden';
    if (error.status === 404) return 'saas.errors.notFound';
  }
  return 'saas.errors.generic';
}
