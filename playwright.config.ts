import { defineConfig, devices } from "@playwright/test";

function defaultWebPort() {
  const repoName = process.cwd().split(/[/\\]/).pop() ?? "kirby-hidden-characters";
  let hash = 0;

  for (const character of repoName) {
    hash = (hash * 33 + character.charCodeAt(0)) % 1000;
  }

  return 8700 + hash;
}

const WEB_HOST = process.env.PLAYWRIGHT_WEB_HOST ?? "127.0.0.1";
const WEB_PORT = Number(process.env.PLAYWRIGHT_WEB_PORT ?? String(defaultWebPort()));
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${WEB_HOST}:${WEB_PORT}`;

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
const READY_URL =
  process.env.PLAYWRIGHT_READY_URL ?? `${BASE_URL}/panel/login`;
const SERVER_OUTPUT: "pipe" | "ignore" =
  process.env.PLAYWRIGHT_SERVER_LOGS === "1" ? "pipe" : "ignore";

export default defineConfig({
  testDir: "tests/browser",
  globalSetup: "./tests/browser/global-setup.mjs",
  globalTeardown: "./tests/browser/global-teardown.mjs",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  // The suite shares one seeded Kirby playground and PHP development server.
  // Keep it serial and stop after the first failure for focused diagnostics.
  workers: 1,
  maxFailures: 1,
  reporter: [
    ["dot"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  webServer: {
    command: `php -S ${WEB_HOST}:${WEB_PORT} -t playground playground/kirby/router.php`,
    url: READY_URL,
    timeout: 120_000,
    reuseExistingServer,
    stdout: SERVER_OUTPUT,
    stderr: SERVER_OUTPUT,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
