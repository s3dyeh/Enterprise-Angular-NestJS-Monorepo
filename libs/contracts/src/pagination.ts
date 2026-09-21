/**
 * Shared administrative list pagination limits.
 * API DTOs enforce these; the Angular client offers matching page-size options.
 */
export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_MIN = 1;
export const SEARCH_MAX_LENGTH = 200;

/** Page-size choices shown in Material paginators (must stay within PAGE_SIZE_MAX). */
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
