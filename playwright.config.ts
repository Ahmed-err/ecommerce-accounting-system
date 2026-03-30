import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  retries: process.env.CI ? 2 : 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-ar",
      use: { ...devices["Desktop Chrome"], locale: "ar" },
    },
    {
      name: "chromium-en",
      use: { ...devices["Desktop Chrome"], locale: "en" },
    },
    {
      name: "firefox-ar",
      use: { ...devices["Desktop Firefox"], locale: "ar" },
    },
    {
      name: "firefox-en",
      use: { ...devices["Desktop Firefox"], locale: "en" },
    },
    ...(process.env.PLAYWRIGHT_INCLUDE_WEBKIT === "1"
      ? [
          {
            name: "webkit-ar",
            use: { ...devices["Desktop Safari"], locale: "ar" },
          },
          {
            name: "webkit-en",
            use: { ...devices["Desktop Safari"], locale: "en" },
          },
        ]
      : []),
  ],
});
