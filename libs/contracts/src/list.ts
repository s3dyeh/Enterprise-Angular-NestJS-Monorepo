/**
 * Unwrapped administrative list payload after the API `{ data }` envelope is removed.
 */
export interface ListPage<T> {
  list: T[];
  count: number;
}

/**
 * Wire-level administrative list response matching Nest `Page<T>` / OpenAPI envelopes.
 */
export interface ListEnvelope<T> {
  data: ListPage<T>;
}

/**
 * Administrative list query parameters shared by Angular clients and API DTOs.
 */
export interface ListParams {
  page_size: number;
  page: number;
  order_by?: string;
  direction?: string;
  select?: string;
  filter?: string;
}
