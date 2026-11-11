import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEmprestimos, listEquipamentos, requestEmprestimo, type EquipmentPageDto } from './api/generated';
import { useAuth } from './auth';
import { categoryLabels, formatDate, isOverdue, normalizeSearch, statusLabels } from './domain';
import { Button } from './ui/button';

type Equipment = EquipmentPageDto['items'][number];
type Filter = 'todos' | Equipment['situacao'];
const catalogKey = (id: string | undefined) => ['catalogo', id] as const;
const loansKey = (id: string | undefined) => ['emprestimos', id] as const;
const filters: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' }, { value: 'disponivel', label: 'Disponíveis' },
  { value: 'emprestado', label: 'Emprestados' }, { value: 'manutencao', label: 'Em manutenção' },
];

function useLoans(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: loansKey(userId), initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listEmprestimos({ cursor: pageParam }, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
}
function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Tente novamente.';
}
function EquipmentPhoto({ item }: { item: Equipment }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return failedUrl === item.imageUrl
    ? <div className="equipment-photo photo-missing">Foto indisponível</div>
    : <img className="equipment-photo" src={item.imageUrl} alt={item.nome} width={800} height={600}
        loading="lazy" onError={() => setFailedUrl(item.imageUrl)} />;
}
function LoanDialog({ item, pending, onCancel, onConfirm }: {
  item: Equipment | null; pending: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (item && element && !element.open) element.showModal();
    if (!item && element?.open) element.close();
  }, [item]);
  return <dialog ref={dialog} className="loan-dialog" aria-labelledby="loan-dialog-title"
      onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}>
    <h2 id="loan-dialog-title">Confirmar empréstimo</h2>
    <p>{item?.nome} · {item?.patrimonio}</p>
    <p className="muted">Prazo de devolução de 14 dias corridos após a solicitação.</p>
    <div className="dialog-actions">
      <Button variant="secondary" disabled={pending} onClick={onCancel} autoFocus>Cancelar</Button>
      <Button disabled={pending} onClick={onConfirm}>{pending ? 'Solicitando…' : 'Confirmar'}</Button>
    </div>
  </dialog>;
}

export function Catalog() {
  const userId = useAuth(state => state.session?.user.id);
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [selected, setSelected] = useState<Equipment | null>(null);
  const catalog = useInfiniteQuery({
    queryKey: catalogKey(userId), initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listEquipamentos({ cursor: pageParam }, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const loans = useLoans(userId);
  const request = useMutation({
    mutationFn: (item: Equipment) => requestEmprestimo({ equipamentoId: item.id }),
    onSettled: async () => {
      setSelected(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: catalogKey(userId) }),
        cache.invalidateQueries({ queryKey: loansKey(userId) }),
      ]);
    },
  });
  const items = catalog.data?.pages.flatMap(page => page.items) ?? [];
  const open = loans.data?.pages.flatMap(page => page.items) ?? [];
  const overdue = open.some(loan => isOverdue(loan.dueAt));
  const blocked = overdue ? 'Você tem um empréstimo em atraso.' :
    open.length >= 3 ? 'Limite de 3 empréstimos em aberto atingido.' : '';
  const shown = items.filter(item =>
    (filter === 'todos' || item.situacao === filter) &&
    normalizeSearch(item.nome + ' ' + item.patrimonio).includes(normalizeSearch(search)));
  const available = items.filter(item => item.situacao === 'disponivel').length;

  return <main className="page">
    <header className="page-header">
      <div><h1 className="page-title">Catálogo</h1>
        {catalog.data && <p className="page-subtitle">{available} de {items.length} equipamentos disponíveis{catalog.hasNextPage ? ' nesta lista' : ''}.</p>}</div>
      <label className="field field-search"><span>Buscar equipamento</span>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou patrimônio" /></label>
    </header>
    <p className="credits"><a href="https://www.pexels.com/" target="_blank" rel="noreferrer">Fotos: Pexels</a></p>
    {blocked && <p role="status" className="notice notice-error">{blocked} <Link to="/meus-emprestimos">Ver meus empréstimos</Link></p>}
    {request.isError && <p role="alert" className="notice notice-error">{errorText(request.error)}</p>}
    {request.isSuccess && <p role="status" className="notice notice-success">Empréstimo solicitado. Devolução até {formatDate(request.data.dueAt)}.</p>}
    <div className="filters" role="group" aria-label="Filtrar por situação">
      {filters.map(choice => <Button key={choice.value} variant="secondary" aria-pressed={filter === choice.value}
        onClick={() => setFilter(choice.value)}>{choice.label}</Button>)}
    </div>
    {catalog.isPending && <p role="status">Carregando equipamentos…</p>}
    {catalog.isError && <div className="notice notice-error" role="alert">
      <p>{errorText(catalog.error)}</p><Button variant="secondary" onClick={() => void catalog.refetch()}>Tentar novamente</Button>
    </div>}
    {!catalog.isPending && !catalog.isError && shown.length === 0 && <p className="empty">Nenhum equipamento encontrado.</p>}
    <ul className="catalog-grid">
      {shown.map(item => {
        const own = open.some(loan => loan.equipment.id === item.id);
        const availableItem = item.situacao === 'disponivel';
        const label = own ? 'Está com você' : !availableItem ? 'Indisponível' :
          overdue ? 'Bloqueado por atraso' : blocked ? 'Limite de 3 itens' : 'Solicitar';
        return <li key={item.id} className="equipment">
          <EquipmentPhoto item={item} />
          <div className="equipment-content">
            <div className="card-meta"><span>{categoryLabels[item.categoria]}</span>
              <span className={`badge ${item.situacao}`}>{statusLabels[item.situacao]}</span></div>
            <h2>{item.nome}</h2><p className="card-id">{item.patrimonio}</p>
            <p className="credit">Foto de <a href={item.photoPage} target="_blank" rel="noreferrer">{item.photographer}</a>
              {' · '}<a href={item.licenseUrl} target="_blank" rel="noreferrer">Licença</a></p>
            <Button variant={availableItem ? 'primary' : 'secondary'} disabled={!availableItem || Boolean(blocked) || request.isPending}
              onClick={() => { request.reset(); setSelected(item); }}>{label}</Button>
          </div>
        </li>;
      })}
    </ul>
    {catalog.hasNextPage && <Button variant="secondary" disabled={catalog.isFetchingNextPage}
      onClick={() => void catalog.fetchNextPage()}>Carregar mais equipamentos</Button>}
    <LoanDialog item={selected} pending={request.isPending} onCancel={() => setSelected(null)}
      onConfirm={() => { if (selected) request.mutate(selected); }} />
  </main>;
}

export function MyLoans() {
  const userId = useAuth(state => state.session?.user.id);
  const loans = useLoans(userId);
  const items = loans.data?.pages.flatMap(page => page.items) ?? [];
  return <main className="page page-loans">
    <h1 className="page-title">Meus empréstimos</h1>
    {loans.data && <>
      <p className="page-subtitle">{items.length} de 3 itens em seu nome · prazo de 14 dias corridos.</p>
      <div className="loan-meter" aria-hidden="true">{[0, 1, 2].map(index =>
        <span key={index} className={index < items.length ? 'filled' : ''} />)}</div>
    </>}
    {loans.isPending && <p role="status">Carregando empréstimos…</p>}
    {loans.isError && <div className="notice notice-error" role="alert">
      <p>{errorText(loans.error)}</p><Button variant="secondary" onClick={() => void loans.refetch()}>Tentar novamente</Button>
    </div>}
    {loans.isSuccess && items.length === 0 && <div className="empty"><p>Você não tem empréstimos em aberto.</p>
      <Link className="btn btn-primary" to="/catalogo">Ir ao catálogo</Link></div>}
    <ul className="loan-list">
      {items.map(loan => {
        const late = isOverdue(loan.dueAt);
        return <li key={loan.id} className={`loan-row ${late ? 'late' : ''}`}>
          <h2>{loan.equipment.nome}<br /><span className="card-id">{loan.equipment.patrimonio}</span></h2>
          <dl><dt>Solicitado em</dt><dd><time dateTime={loan.requestedAt}>{formatDate(loan.requestedAt)}</time></dd></dl>
          <dl><dt>Devolver até</dt><dd><time dateTime={loan.dueAt}>{formatDate(loan.dueAt)}</time></dd></dl>
          <span className={`badge ${late ? 'atraso' : 'disponivel'}`}>{late ? 'Em atraso' : 'Em aberto'}</span>
        </li>;
      })}
    </ul>
    {loans.hasNextPage && <Button variant="secondary" disabled={loans.isFetchingNextPage}
      onClick={() => void loans.fetchNextPage()}>Carregar mais empréstimos</Button>}
  </main>;
}
