import { expect, test } from '@playwright/test';

test('registration without email verification directs the user to sign in', async ({ page }) => {
  await page.route('**/auth/browser/config', (route) =>
    route.fulfill({ json: { recaptcha: { enabled: false }, emailVerificationRequired: false } }),
  );
  await page.route('**/auth/email/register', (route) => route.fulfill({ status: 204 }));
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'First name', exact: true }).fill('Test');
  await page.getByRole('textbox', { name: 'Last name', exact: true }).fill('User');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('test@example.test');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('example-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Your account is ready. You can sign in now.');
  await expect(page.getByRole('link', { name: 'Back to sign in', exact: true })).toBeVisible();
});

test('registration shows validation and mail errors, then recovers', async ({ page }) => {
  await page.route('**/auth/browser/config', (route) =>
    route.fulfill({ json: { recaptcha: { enabled: false } } }),
  );
  let attempts = 0;
  await page.route('**/auth/email/register', (route) => {
    attempts++;
    return route.fulfill(
      attempts === 1
        ? { status: 503, json: { errors: { mail: 'mailDeliveryUnavailable' } } }
        : { status: 204 },
    );
  });
  await page.goto('/register');
  const email = page.getByRole('textbox', { name: 'Email', exact: true });
  await email.fill('invalid');
  await email.blur();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'First name', exact: true }).fill('Test');
  await page.getByRole('textbox', { name: 'Last name', exact: true }).fill('User');
  await email.fill('test@example.test');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('example-password-123');
  const submit = page.getByRole('button', { name: 'Create account', exact: true });
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t send the email.');
  await expect(submit).toBeEnabled();
  await page.screenshot({ path: '../../.verification/auth-mail-error.png' });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status')).toBeVisible();
});

test('login shows connection failure and Arabic feedback', async ({ page }) => {
  await page.route('**/auth/browser/config', (route) => route.abort('connectionrefused'));
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('test@example.test');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('example-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to reach the server.');
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByRole('menuitem', { name: 'العربية', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('تعذّر الاتصال بالخادم');
});
