const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'landing.spec.js',
  workers: 1,
  use: {
    baseURL: process.env.LANDING_URL || 'http://127.0.0.1:4381',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {},
  },
  webServer: process.env.LANDING_URL ? undefined : {
    command: 'python3 -m http.server 4381 --bind 127.0.0.1 --directory _site',
    url: 'http://127.0.0.1:4381',
    reuseExistingServer: false,
  },
});
