import { defineConfig, devices } from "@playwright/test";

const VISUAL_PORT = 5199;

export default defineConfig({
  testDir: "./e2e/visual",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: `http://127.0.0.1:${VISUAL_PORT}`,
    trace: "off",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `VITE_VISUAL_FIXTURE=1 npx vite --port ${VISUAL_PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${VISUAL_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
