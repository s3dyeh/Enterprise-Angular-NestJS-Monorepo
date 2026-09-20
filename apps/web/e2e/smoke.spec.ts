import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const credentials = JSON.parse(readFileSync('../../.verification/browser-session.json', 'utf8')) as { email: string; password: string };

test('guest navigation, Arabic, theme and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/regions');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitem', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('textbox', { name: 'البريد الإلكتروني' })).toBeVisible();
  await page.getByRole('button', { name: 'التبديل إلى الوضع الداكن' }).click();
  await expect(page.locator('html')).toHaveClass(/dark-theme/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('real login, reload recovery, all business routes and persistent CRUD', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('refresh_token') || value.includes('eyJ')))).toBe(false);
  for (const path of ['/accounts/users', '/accounts/customers', '/accounts/roles', '/accounts/login-blocks',
    '/accounting/currencies', '/accounting/account-credits', '/settings/system', '/settings/activities', '/settings/cache', '/settings/cities', '/settings/regions']) {
    await page.goto(path);
    await expect(page.locator('app-sidenav mat-toolbar')).toBeVisible();
    await expect(page.locator('app-section-tabs nav')).toBeVisible();
  }
  const name = 'Browser region ' + Date.now();
  await page.getByRole('button', { name: 'Add region', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find(cookie => cookie.name === 'refresh')?.httpOnly).toBe(true);
  expect(errors).toEqual([]);
});


