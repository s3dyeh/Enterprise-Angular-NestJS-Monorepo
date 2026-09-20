export interface ListParams {
  page_size: number;
  page: number;
  order_by?: string;
  direction?: string;
  select?: string;
  filter?: string;
}
