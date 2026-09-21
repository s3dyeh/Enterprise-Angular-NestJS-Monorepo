import { Reflector } from '@nestjs/core';
import { PermissionCode } from '@enterprise/contracts';
import { PermissionGuard, type AdminRequest } from './permission.guard';

describe('PermissionGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new PermissionGuard(reflector as unknown as Reflector);

  /**
   * Build a minimal execution context for guard evaluation.
   */
  function context(user: AdminRequest['user']) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  beforeEach(() => jest.resetAllMocks());

  it('denies when no permission metadata is attached', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(
      guard.canActivate(
        context({ id: 1, role: { id: 1 }, sessionId: 1, permissions: [] }),
      ),
    ).toBe(false);
  });

  it('allows built-in administrators for any permission', () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionCode.RoleWrite);
    expect(
      guard.canActivate(
        context({ id: 1, role: { id: 1 }, sessionId: 1, permissions: [] }),
      ),
    ).toBe(true);
  });

  it('blocks non-admins from privileged user and role writes', () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionCode.UserWrite);
    expect(
      guard.canActivate(
        context({
          id: 2,
          role: { id: 2 },
          sessionId: 1,
          permissions: [PermissionCode.UserWrite],
        }),
      ),
    ).toBe(false);
  });

  it('allows an exact permission grant', () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionCode.CityRead);
    expect(
      guard.canActivate(
        context({
          id: 2,
          role: { id: 2 },
          sessionId: 1,
          permissions: [PermissionCode.CityRead],
        }),
      ),
    ).toBe(true);
  });

  it('treats write grants as implying the matching read', () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionCode.CityRead);
    expect(
      guard.canActivate(
        context({
          id: 2,
          role: { id: 2 },
          sessionId: 1,
          permissions: [PermissionCode.CityWrite],
        }),
      ),
    ).toBe(true);
  });
});
