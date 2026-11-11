import { defineConfig } from 'orval';

export default defineConfig({
  emprestai: {
    input: './openapi.json',
    output: {
      target: './src/api/generated.ts',
      client: 'fetch',
      override: {
        fetch: { includeHttpResponseReturnType: false },
        mutator: { path: './src/api/http.ts', name: 'apiFetch' },
      },
    },
  },
});
