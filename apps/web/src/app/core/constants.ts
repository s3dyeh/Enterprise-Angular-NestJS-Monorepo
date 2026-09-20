export enum ErrorMessages {
  Generic = 'errors.generic',
  Timeout = 'errors.timeout',
  NotFound = 'errors.notFound',
  Unauthorized = 'errors.auth',
}

export enum ApiEndpoints {
  LOGIN = 'auth/browser/login',
  REFRESH = 'auth/browser/refresh',
  SETTINGS = 'settings',
  ACTIVITIES = 'activities',
  CLEAR_CACHE = 'clear-cache',
  CLEAR_CACHE_KEYS = 'clear-cache/keys',
  LOGIN_BLOCKS = 'login-blocks',
  CITIES = 'cities',
  REGIONS = 'regions',
  ROLES = 'roles',
  RESOURCES = 'resources',
  USERS = 'users',
  CUSTOMERS = 'customers',
  CURRENCIES = 'currencies',
  ACCOUNT_CREDITS = 'account-credits',
}
