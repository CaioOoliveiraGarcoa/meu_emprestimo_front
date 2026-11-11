import { z } from 'zod';

const env = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_API_URL: z.string().url().refine(value => new URL(value).pathname.replace(/\/$/, '') === '/v1', 'Inclua /v1'),
  VITE_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
});
export const configuration = env.safeParse(import.meta.env);
