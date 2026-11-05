import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/device-review', workers: 1, timeout: 40000, retries: 0,
  reporter: [['list'], ['json', { outputFile: '/tmp/dm-device-browser.json' }]],
  outputDir: '/tmp/dm-device-browser-artifacts',
  use: { baseURL: 'http://127.0.0.1:5173', serviceWorkers: 'block', screenshot: 'off', trace: 'off', video: 'off' },
  projects: [
    { name: 'android-chromium', use: { browserName: 'chromium', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true } },
    { name: 'webkit-phone', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1365, height: 900 } } },
  ],
});
