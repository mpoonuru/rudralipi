import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  forbidOnly: true,
  fullyParallel: false,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          height: 900,
          width: 1440,
        },
      },
    },
  ],
  reporter: [['list']],
  retries: 1,
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:42739',
    colorScheme: 'light',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'corepack yarn workspace @rudralipi/playground dev --host 127.0.0.1 --port 42739 --strictPort',
    reuseExistingServer: false,
    timeout: 120_000,
    url: 'http://127.0.0.1:42739',
  },
})
