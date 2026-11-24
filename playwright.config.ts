import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a CARE frontend that has this plugin enabled and a
 * CARE backend loaded with `load_fixtures`.
 *
 * REACT_CARE_FE_URL   CARE frontend, default http://localhost:4000
 * REACT_CARE_API_URL  CARE backend,  default http://localhost:9000
 */
export const CARE_FE_URL =
  process.env.REACT_CARE_FE_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["list"]]
    : [["html", { open: "never" }]],
  use: {
    baseURL: CARE_FE_URL,
    trace: "on-first-retry",
    video: "on-first-retry",
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
