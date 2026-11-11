import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54447',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-local-fixture',
      VITE_API_URL: 'http://127.0.0.1:54448/v1',
    },
  },
});
