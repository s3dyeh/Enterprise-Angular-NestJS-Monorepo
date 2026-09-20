export interface ListResponse<T> {
  list: T[];
  count: number;
}

export interface Session {
  id?: number;
  lang?: string;
  username?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role_id?: number;
  resources?: string[];
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}

export interface Account {
  id: number;
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  type?: 'user' | 'customer';
  status: 'active' | 'in_active';
  role_id?: number;
}

export interface Role {
  id: number;
  name: string;
  resources: string;
}

export interface Region {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  region_id: number;
}

export interface AppSetting {
  id: number;
  property: string;
  value: string;
  description?: string;
}

export interface Activity {
  id: number;
  created_at?: string;
  event: string;
  operator_id?: number;
  username?: string;
  ip?: string;
  uri?: string;
  before?: string;
  after?: string;
}

export interface LoginBlock {
  key: string;
  attempts: number;
  stage: number;
  locked: boolean;
  locked_until?: string;
  retry_after_sec?: number;
}

export interface Currency {
  id: number;
  name: string;
  symbol: string;
}

export interface AccountCredit {
  id: number;
  currency_id: number;
  account_id: number;
  balance?: string | number;
  created_at?: string;
  updated_at?: string;
  currency?: string;
}
