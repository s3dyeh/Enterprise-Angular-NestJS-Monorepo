import { Injectable, signal } from '@angular/core';
import { Validators } from '@angular/forms';

export interface InvalidParam {
  field?: string;
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class ValidatorService {
  private readonly errors = signal<InvalidParam[]>([]);

  get fieldErrors(): InvalidParam[] {
    return this.errors();
  }
  set fieldErrors(value: InvalidParam[]) {
    this.errors.set(value);
  }

  name = [
    Validators.required,
    Validators.minLength(3),
    Validators.maxLength(30),
    Validators.pattern(/^[\p{L}\p{M}0-9 _-]+$/u),
  ];
  fullName = [Validators.required, Validators.minLength(3), Validators.maxLength(45)];
  email = [Validators.required, Validators.email];
  optionalPhone = [Validators.pattern(/^$|^964\d{10}$/)];
  username = [Validators.required, Validators.maxLength(30)];
  password = [
    Validators.required,
    Validators.minLength(12),
    Validators.maxLength(72),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
  ];
  optionalPassword = [
    Validators.minLength(12),
    Validators.maxLength(72),
    Validators.pattern(/^$|^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
  ];
  required = [Validators.required];
  symbol = [Validators.required, Validators.maxLength(12)];

  setFieldErrors(invalidFields: InvalidParam[]): void {
    this.fieldErrors = invalidFields ?? [];
  }

  hasFieldError(field: string): boolean {
    return this.fieldErrors.some((el) => el.field === field);
  }

  getErrorMessage(field: string): string {
    return this.fieldErrors.find((el) => el.field === field)?.reason ?? '';
  }
}
