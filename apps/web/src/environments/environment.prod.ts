/** Production Nginx proxies /api to the API Service on the same origin. */
export const environment = {
  production: true,
  localStorageKey: 'operator-web',
  apiUrl: '/api/v1',
  snackBarDuration: 8000,
  perPageOptions: [10, 25, 50, 100],
  defaultLang: 'en',
};
