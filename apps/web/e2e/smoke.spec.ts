import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
const credentials = existsSync('../../.verification/browser-session.json')
  ? (JSON.parse(readFileSync('../../.verification/browser-session.json', 'utf8')) as {
      email: string;
      password: string;
    })
  : undefined;

test('guest navigation, Arabic, theme and mobile layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
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

test('real login, reload recovery, platform routes and persistent workspace', async ({ page }) => {
  test.skip(!credentials, 'Start the integration environment first.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(credentials!.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(credentials!.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some(
        (value: unknown) =>
          typeof value === 'string' && (value.includes('refresh_token') || value.includes('eyJ')),
      ),
    ),
  ).toBe(false);
  for (const path of [
    '/admin/users',
    '/admin/roles',
    '/admin/security',
    '/admin/configuration',
    '/admin/activity',
    '/admin/maintenance',
    '/profile',
    '/workspaces',
  ]) {
    await page.goto(path);
    await expect(page.locator('app-sidenav mat-toolbar')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  }
  const name = 'Integration workspace ' + Date.now();
  await page.getByRole('textbox', { name: 'Workspace name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === 'refresh')?.httpOnly).toBe(true);
  expect(errors).toEqual([]);
});
