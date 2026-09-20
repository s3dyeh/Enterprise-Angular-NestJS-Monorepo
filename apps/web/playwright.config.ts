import { defineConfig } from '@playwright/test';
const port = process.env['INTEGRATION_WEB_PORT'] || '4291';
const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:' + port;
export default defineConfig({
  testDir: './e2e', fullyParallel: false, timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/browser.xml' }]],
  use: { baseURL, channel: process.env['CHROME_BIN'] ? undefined : 'chrome', launchOptions: { executablePath: process.env['CHROME_BIN'] }, trace: 'retain-on-failure' },
  webServer: {
    command: 'node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port ' + port,
    url: baseURL, reuseExistingServer: !process.env['CI'], timeout: 180_000,
  },
});

