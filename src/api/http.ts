import { supabase } from '../auth';
import { configuration } from '../env';

export class ApiProblem extends Error {
  constructor(readonly status: number, readonly code: string, detail: string) {
    super(detail);
    this.name = 'ApiProblem';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!configuration.success || !supabase) throw new Error('Configuração do site indisponível.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApiProblem(401, 'AUTH_REQUIRED', 'Entre para continuar.');

  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer ' + session.access_token);
  const origin = new URL(configuration.data.VITE_API_URL).origin;
  const response = await fetch(origin + path, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiProblem(response.status, typeof body?.code === 'string' ? body.code : 'HTTP_ERROR',
      typeof body?.detail === 'string' ? body.detail : 'Não foi possível acessar o sistema. Tente novamente.');
  }
  return body as T;
}
