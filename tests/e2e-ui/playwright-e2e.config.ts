import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 30_000 },

  outputDir: "../../test-results-e2e",

  reporter: [
    ["html", { outputFolder: "../../playwright-report-e2e", open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github" as const]] : []),
  ],

  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--log-level=3",
      ],
      env: {
        DBUS_SESSION_BUS_ADDRESS: "/dev/null",
      },
    },
  },

  projects: [
    {
      name: "e2e-ui",
      testMatch: "**/*.spec.ts",
    },
  ],
});
