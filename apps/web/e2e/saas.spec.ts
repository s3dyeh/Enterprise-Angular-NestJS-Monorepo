import { expect, test } from '@playwright/test';

test('invitation survives sign-in and workspace membership never grants platform access', async ({
  page,
  request,
}) => {
  test.skip(!process.env['SAAS_MEMBER_EMAIL'], 'Use the SaaS verification runner.');
  test.setTimeout(120_000);
  const login = await request.post('/api/v1/auth/email/login', {
    data: { email: process.env['SAAS_TEST_EMAIL'], password: process.env['SAAS_TEST_PASSWORD'] },
  });
  expect(login.status()).toBe(200);
  const token = stringField(await login.json(), 'token');
  const headers = { Authorization: `Bearer ${token}` };
  const created = await request.post('/api/v1/workspaces', {
    headers,
    data: { name: process.env['SAAS_TEST_WORKSPACE'] + ' invitations' },
  });
  expect(created.status()).toBe(201);
  const workspace: unknown = await created.json();
  const workspaceId = stringField(workspace, 'id');
  const workspaceName = stringField(workspace, 'name');
  const other = await request.post('/api/v1/workspaces', {
    headers,
    data: { name: process.env['SAAS_TEST_WORKSPACE'] + ' isolation' },
  });
  const otherWorkspaceId = stringField(await other.json(), 'id');
  const invite = await request.post(`/api/v1/workspaces/${workspaceId}/invitations`, {
    headers,
    data: { email: process.env['SAAS_MEMBER_EMAIL'], role: 'member' },
  });
  expect(invite.status()).toBe(201);
  const invitationToken = stringField(await invite.json(), 'token');
  await page.goto(`/join#token=${invitationToken}`);
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill(process.env['SAAS_MEMBER_EMAIL']!);
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(process.env['SAAS_MEMBER_PASSWORD']!);
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/auth/browser/login') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const memberSession: unknown = await (await response).json();
  const memberToken = stringField(memberSession, 'token');
  const memberId = numberField(field(memberSession, 'user'), 'id');
  await expect(page.getByRole('button', { name: 'Accept invitation', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
  await expect(page.getByRole('heading', { name: workspaceName, exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('button', { name: 'Create invitation link' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Platform administration' })).toHaveCount(0);
  const memberHeaders = { Authorization: `Bearer ${memberToken}` };
  expect(
    (
      await request.get(`/api/v1/workspaces/${otherWorkspaceId}`, { headers: memberHeaders })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.patch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, {
        headers: memberHeaders,
        data: { role: 'owner' },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get('/api/v1/admin/users', { headers: memberHeaders })).status()).toBe(403);
  expect((await request.get('/api/v1/admin/currencies', { headers })).status()).toBe(404);
  expect((await request.get('/api/v1/admin/customers', { headers })).status()).toBe(404);
  expect((await request.get('/api/v1/admin/regions', { headers })).status()).toBe(404);
  expect(
    (
      await request.post('/api/v1/workspaces/accept-invitation', {
        headers: memberHeaders,
        data: { token: invitationToken },
      })
    ).status(),
  ).toBe(404);
  await page.getByRole('button', { name: 'Leave workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page).toHaveURL(/\/workspaces$/);
});

test('SaaS workspace flow, Arabic direction, mobile navigation and profile', async ({ page }) => {
  test.skip(
    !process.env['SAAS_TEST_EMAIL'] || !process.env['SAAS_TEST_PASSWORD'],
    'Provide a seeded local test account.',
  );
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/login');
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill(process.env['SAAS_TEST_EMAIL']!);
  await page
    .getByRole('textbox', { name: 'Password', exact: true })
    .fill(process.env['SAAS_TEST_PASSWORD']!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(
    page.getByRole('heading', { name: 'Write your business code today. Deploy tomorrow.' }),
  ).toBeVisible();
  await expect(page.locator('mat-sidenav a[href="/accounting"]')).toHaveCount(0);
  await expect(page.locator('mat-sidenav a[href="/accounts"]')).toHaveCount(0);
  await expect(page.locator('.product-mark')).toHaveText('SaaS Foundation');
  await expect(page.locator('mat-sidenav a[href="/admin/users"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: '../../.verification/saas-start-en.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitem', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(
    page.getByRole('heading', { name: 'اكتب كود مشروعك اليوم. وأطلقه غدًا.' }),
  ).toBeVisible();
  const drawer = await page.locator('mat-sidenav').boundingBox();
  expect(drawer!.x).toBeGreaterThan(1000);
  const content = await page.locator('mat-sidenav-content').boundingBox();
  expect(content!.x + content!.width).toBeLessThanOrEqual(drawer!.x + 1);
  await page.screenshot({ path: '../../.verification/saas-start-ar.png', fullPage: true });
  await page.getByRole('button', { name: 'اللغة', exact: true }).click();
  await page.getByRole('menuitem', { name: 'English', exact: true }).click();
  await page.locator('mat-sidenav').getByRole('link', { name: 'Workspaces', exact: true }).click();
  const workspaceName = process.env['SAAS_TEST_WORKSPACE'] || `Browser verification ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Workspace name', exact: true }).fill(workspaceName);
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: workspaceName, exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('invited@example.test');
  await page.getByRole('button', { name: 'Create invitation link' }).click();
  await expect(page.getByRole('textbox', { name: 'Invitation link', exact: true })).toHaveValue(
    /\/join#token=[a-f0-9]{64}$/,
  );
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(page.getByText('No pending invitations.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Leave workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('A workspace needs an active owner.');
  await page.reload();
  await expect(page.getByRole('heading', { name: workspaceName, exact: true })).toBeVisible();
  await page.screenshot({ path: '../../.verification/saas-workspace-en.png', fullPage: true });
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Profile & security', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'First name', exact: true })).not.toHaveValue('');
  await page.goto('/start');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitem', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'إظهار القائمة', exact: true }).click();
  await expect(page.locator('mat-sidenav')).toBeVisible();
  await expect(
    page.locator('mat-sidenav').getByRole('link', { name: 'مساحات العمل', exact: true }),
  ).toHaveCSS('visibility', 'visible');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: '../../.verification/saas-mobile-ar.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .locator('mat-sidenav')
    .getByRole('link', { name: 'مساحات العمل', exact: true })
    .click();
  await expect(page.locator('mat-sidenav')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'التبديل إلى الوضع الداكن', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark-theme/);
  await page.screenshot({ path: '../../.verification/saas-mobile-ar-dark.png', fullPage: true });
  await page.setViewportSize({ width: 812, height: 375 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    throw new Error(`Response is missing ${key}`);
  }
  return Reflect.get(value, key) as unknown;
}
function stringField(value: unknown, key: string): string {
  const result = field(value, key);
  if (typeof result !== 'string') throw new Error(`Expected string field ${key}`);
  return result;
}
function numberField(value: unknown, key: string): number {
  const result = field(value, key);
  if (typeof result !== 'number') throw new Error(`Expected number field ${key}`);
  return result;
}
