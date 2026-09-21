import { CORE_PERMISSIONS, type Permission } from '@enterprise/contracts';

/** @deprecated Prefer Permission from @enterprise/contracts. */
export type AppResource = Permission;

/**
 * Merge API-reported role resources with the shared permission catalog.
 * Extra strings stay available for forward-compatible role definitions.
 */
export function mergeResources(api: string[] | null | undefined): string[] {
  const extra = (api ?? []).map((item) => item.trim()).filter(Boolean);
  return [...new Set([...CORE_PERMISSIONS, ...extra])];
}
