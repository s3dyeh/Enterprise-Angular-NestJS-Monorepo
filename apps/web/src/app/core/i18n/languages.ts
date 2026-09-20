export const APP_LANGS = [
  { id: 'en', label: 'English', dir: 'ltr' },
  { id: 'ar', label: 'العربية', dir: 'rtl' },
] as const;

export type AppLang = (typeof APP_LANGS)[number]['id'];
export type AppDir = 'ltr' | 'rtl';

export const LANG_STORAGE_KEY = 'web-lang';

export function isAppLang(value: string | null | undefined): value is AppLang {
  return APP_LANGS.some((lang) => lang.id === value);
}

export function langDir(lang: AppLang): AppDir {
  return APP_LANGS.find((item) => item.id === lang)?.dir ?? 'ltr';
}
