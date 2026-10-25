import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 240000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: process.env.SCENT_TEST_BASE_URL || "http://localhost:3100", channel: process.env.SCENT_TEST_BROWSER_CHANNEL, headless: true, trace: "off" },
});
