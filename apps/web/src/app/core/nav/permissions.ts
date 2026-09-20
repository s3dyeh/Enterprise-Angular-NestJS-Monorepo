export const APP_RESOURCES = [
  'activity:read',
  'setting:write',
  'city:write',
  'city:read',
  'region:write',
  'region:read',
  'account:write',
  'account:read',
  'role:write',
  'role:read',
  'user:write',
  'user:read',
  'currency:write',
  'currency:read',
  'account-credit:write',
  'account-credit:read',
] as const;

export type AppResource = (typeof APP_RESOURCES)[number];

export function mergeResources(api: string[] | null | undefined): string[] {
  const extra = (api ?? []).map((item) => item.trim()).filter(Boolean);
  return [...new Set([...APP_RESOURCES, ...extra])];
}
