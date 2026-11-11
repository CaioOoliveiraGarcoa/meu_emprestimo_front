import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createBrowserRouter, Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, useAuth } from './auth';
import { Button } from './ui/button';
import { Catalog, MyLoans } from './screens';

const login = z.object({ email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.') });

function Brand() {
  return <Link className="brand-row" to="/" aria-label="EMPREST.AI, início">
    <span className="brand-mark" aria-hidden="true" />
    <span className="brand-word">EMPREST<span className="brand-accent">.AI</span></span>
  </Link>;
}
function SessionBoundary() {
  const setSession = useAuth(state => state.setSession);
  const cache = useQueryClient();
  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    let identity: string | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id;
      if (identity !== next) cache.clear();
      identity = next;
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [cache, setSession]);
  return <Outlet />;
}
function Landing() {
  return <main className="landing">
    <div className="landing-top"><Brand /><Link to="/login" className="btn btn-secondary">Entrar</Link></div>
    <section className="landing-hero">
      <p className="eyebrow">TI interno</p>
      <h1>Empréstimo de equipamentos de TI</h1>
      <p>Consulte a disponibilidade de notebooks, monitores, cabos e câmeras. Solicite um item e acompanhe o prazo de devolução.</p>
      <Link to="/login" className="btn btn-primary">Acessar sistema</Link>
    </section>
  </main>;
}
function Login() {
  const navigate = useNavigate();
  const session = useAuth(state => state.session);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<z.infer<typeof login>>({ resolver: zodResolver(login) });
  if (session) return <Navigate to="/catalogo" replace />;
  const enter = handleSubmit(async values => {
    setError('');
    if (!supabase) { setError('O acesso ainda precisa ser configurado.'); return; }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) { setError('Não foi possível entrar. Confira seu e-mail e sua senha.'); return; }
      navigate('/catalogo', { replace: true });
    } catch {
      setError('Não foi possível conectar ao sistema. Tente novamente.');
    }
  });
  return <div className="login-shell">
    <aside className="login-visual">
      <Brand />
      <div><h1>Equipamentos de TI</h1><p className="lead">Consulte o catálogo e acompanhe seus empréstimos.</p></div>
      <div className="stats"><div className="stat-item"><strong>3</strong><span>itens por pessoa</span></div>
        <div className="stat-item"><strong>14</strong><span>dias corridos</span></div></div>
      <footer>Operações · TI interno</footer>
    </aside>
    <main className="login-panel">
      <div className="form-wrap"><h2>Entrar</h2><p className="panel-text">Acesse com a sua conta.</p>
        <form onSubmit={enter} noValidate className="grid gap-4">
          <label className="field"><span>E-mail</span><input type="email" autoComplete="username" {...register('email')} />
            {formState.errors.email && <small role="alert">{formState.errors.email.message}</small>}</label>
          <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" {...register('password')} />
            {formState.errors.password && <small role="alert">{formState.errors.password.message}</small>}</label>
          <Button type="submit" disabled={formState.isSubmitting}>{formState.isSubmitting ? 'Entrando…' : 'Entrar'}</Button>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
        </form>
      </div>
    </main>
  </div>;
}
function PrivateArea() {
  const { session, ready } = useAuth();
  const [error, setError] = useState('');
  if (!ready) return <main className="page"><p role="status">Carregando sessão…</p></main>;
  if (!session) return <Navigate to="/login" replace />;
  return <div className="app-frame">
    <header className="app-nav">
      <Brand />
      <nav aria-label="Área do colaborador"><NavLink to="/catalogo">Catálogo</NavLink>
        <NavLink to="/meus-emprestimos">Meus empréstimos</NavLink></nav>
      <Button variant="secondary" onClick={async () => {
        setError('');
        const result = await supabase?.auth.signOut({ scope: 'local' });
        if (result?.error) setError('Não foi possível encerrar a sessão.');
      }}>Sair</Button>
    </header>
    {error && <p role="alert" className="notice notice-error">{error}</p>}
    <Outlet />
  </div>;
}
export const router = createBrowserRouter([{
  element: <SessionBoundary />,
  children: [
    { path: '/', element: <Landing /> },
    { path: '/login', element: <Login /> },
    { element: <PrivateArea />, children: [
      { path: '/catalogo', element: <Catalog /> },
      { path: '/meus-emprestimos', element: <MyLoans /> },
    ] },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}]);
