export const statusLabels = {
  disponivel: 'Disponível', manutencao: 'Em manutenção', emprestado: 'Emprestado',
} as const;
export const categoryLabels = {
  notebook: 'Notebook', monitor: 'Monitor', cabo: 'Cabo', camera: 'Câmera',
} as const;

const formatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
});
export const formatDate = (iso: string) => formatter.format(new Date(iso));
export const isOverdue = (iso: string, now = Date.now()) => Date.parse(iso) < now;
export const normalizeSearch = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
