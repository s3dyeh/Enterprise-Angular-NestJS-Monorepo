import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

/** Legacy domain examples are not part of the SaaS platform's public API. */
export function businessExamplesEnabled(): boolean {
  return process.env.ENABLE_BUSINESS_EXAMPLES === 'true';
}

@Injectable()
export class BusinessExamplesGuard implements CanActivate {
  canActivate(): boolean {
    if (!businessExamplesEnabled()) throw new NotFoundException();
    return true;
  }
}
