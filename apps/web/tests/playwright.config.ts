import { defineConfig } from '@playwright/test';

const port = 4323;
/** The site as it is before launch, bundled into its own folder by `bundle:pre-launch`. */
export const preLaunchUrl = 'http://127.0.0.1:4324';

// Runs against the bundled site, served as static files: `pnpm --filter @scootch/web build` for
// the site, and the `test:site` script bundles the pre-launch variant before the tests start.
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: 'chromium' },
  webServer: [
    {
      command: 'node tests/serve-site.mjs',
      cwd: '..',
      env: { PORT: String(port) },
      url: `http://127.0.0.1:${port}/`,
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: 'node tests/serve-site.mjs',
      cwd: '..',
      env: { PORT: '4324', SITE_ROOT: 'dist-pre-launch/client' },
      url: `${preLaunchUrl}/`,
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
