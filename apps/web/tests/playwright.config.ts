import { defineConfig } from '@playwright/test';

const port = 4323;

// Runs against the bundled site (`pnpm --filter @scootch/web build` first), served as static files.
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium' },
  webServer: {
    command: 'node tests/serve-site.mjs',
    cwd: '..',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env['CI'],
  },
});
