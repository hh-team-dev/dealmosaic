import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 35_000, retries: 0,
  reporter: [['list'], ['json', { outputFile: '/tmp/dm-interactions.json' }]],
  outputDir: '/tmp/dm-playwright-results',
  use: { baseURL: 'http://127.0.0.1:5173', screenshot: 'off', trace: 'off', video: 'off' },
  projects: [{ name: 'phone', use: { viewport: { width: 390, height: 844 } } }, { name: 'desktop', use: { viewport: { width: 1365, height: 900 } } }],
});
