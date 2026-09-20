/** Same-origin API. The dev server uses proxy_local.cjs and API_PROXY_TARGET. */
export const environment = {
  production: false,
  localStorageKey: 'operator-web',
  apiUrl: '/api/v1',
  snackBarDuration: 8000,
  perPageOptions: [10, 25, 50, 100],
  defaultLang: 'en',
};
