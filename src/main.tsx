import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { router } from './routes';
import { configuration } from './env';
import '../styles.css';
import './ui/app.css';

if (configuration.success && configuration.data.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: configuration.data.VITE_SENTRY_DSN, sendDefaultPii: false });
}
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>
  </React.StrictMode>,
);
