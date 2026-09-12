import { defineConfig, devices } from "@playwright/test";
// Override when another local server already holds 4173: RECALL_E2E_PORT=4273 npm run test:e2e
const port = Number(process.env.RECALL_E2E_PORT ?? 4173);
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // Fresh installs and multi-session flows can take several minutes on a busy machine.
  timeout: 300_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1050 },
      },
    },
  ],
  webServer: {
    command:
      `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
