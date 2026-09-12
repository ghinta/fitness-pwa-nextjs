import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4187/fitness-pwa-nextjs/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4187/fitness-pwa-nextjs/",
    reuseExistingServer: false,
  },
});
