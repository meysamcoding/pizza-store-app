import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemBrowser = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './e2e-pages',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174/pizza-store-app/',
    headless: true,
    launchOptions: systemBrowser ? { executablePath: systemBrowser } : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:pages && node scripts/serve-pages.mjs',
    url: 'http://127.0.0.1:4174/pizza-store-app/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
