import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/hospitality",
  workers: 1,
  timeout: 40000,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "/tmp/dm-hospitality-browser.json" }],
  ],
  outputDir: "/tmp/dm-hospitality-browser-artifacts",
  use: {
    baseURL: "http://127.0.0.1:5173",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium-320",
      use: { browserName: "chromium", viewport: { width: 320, height: 740 } },
    },
    {
      name: "chromium-desktop",
      use: { browserName: "chromium", viewport: { width: 1365, height: 900 } },
    },
    {
      name: "webkit-390",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 } },
    },
  ],
});
