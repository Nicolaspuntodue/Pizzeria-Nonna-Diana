import { defineConfig, devices } from "@playwright/test";

// Mobile QA: WebKit (the Safari engine) on an emulated iPhone, against the production build.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  reporter: [["list"]],
  outputDir: "tests/artifacts/results",
  use: {
    baseURL: "http://localhost:4178",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
    { name: "iphone-se-webkit", use: { ...devices["iPhone SE"] } },
  ],
  webServer: {
    command: "npm run build && npx vite preview --port 4178 --strictPort",
    url: "http://localhost:4178",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
