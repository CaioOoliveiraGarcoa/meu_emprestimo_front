import { expect, test, type Locator } from '@playwright/test';

const user = { id: '2675376d-c6e9-4d56-a7e8-5cf18b1d46c1', email: 'colaborador.teste@example.invalid',
  aud: 'authenticated', app_metadata: { tenant_id: 'suporte_ti' }, user_metadata: {} };

test('CA-E01/02/05/08/11 login, catálogo, solicitação e meus empréstimos', async ({ page }) => {
  const item = { id: '0e8d7411-0159-4c8f-8eba-aec57044bd63', patrimonio: 'TI-0001', nome: 'Notebook 14 polegadas',
    categoria: 'notebook', situacao: 'disponivel', imageUrl: 'http://127.0.0.1:54448/photo.jpg',
    photoPage: 'https://www.pexels.com/photo/fixture-1/', photographer: 'Fixture local', licenseUrl: 'https://www.pexels.com/license/' };
  const maintenance = { ...item, id: '11883570-18a8-4e2f-9ea2-58c29dd54000', patrimonio: 'TI-0010',
    nome: 'Cabo de rede 3 m', categoria: 'cabo', situacao: 'manutencao' };
  const loan = { id: 'b8b9bf66-8278-4bc7-a683-dc175dc80b63', equipment: item,
    requestedAt: '2026-11-11T15:00:00Z', dueAt: '2026-11-25T15:00:00Z' };
  let requested = false;
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  await page.route('http://127.0.0.1:54447/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (!route.request().url().includes('/token?')) return route.fulfill({ status: 200, headers, json: {} });
    const credentials = route.request().postDataJSON();
    expect(credentials.email).toBe(user.email);
    return route.fulfill({ status: 200, headers, json: { access_token: 'fixture-token', token_type: 'bearer',
      refresh_token: 'fixture-refresh', expires_in: 3600, user } });
  });
  await page.route('http://127.0.0.1:54448/**', async route => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.url().endsWith('/photo.jpg')) return route.fulfill({ status: 404, headers });
    expect(req.headers().authorization).toBe('Bearer fixture-token');
    if (req.url().includes('/equipamentos'))
      return route.fulfill({ headers, json: { items: [item, maintenance], nextCursor: null } });
    if (req.method() === 'POST') {
      expect(req.postDataJSON()).toEqual({ equipamentoId: item.id });
      item.situacao = 'emprestado';
      requested = true;
      return route.fulfill({ status: 201, headers, json: loan });
    }
    return route.fulfill({ headers, json: { items: requested ? [loan] : [], nextCursor: null } });
  });

  await page.goto('/catalogo');
  await expect(page).toHaveURL(/\/login$/);
  const email = page.getByLabel('E-mail');
  const password = page.getByLabel('Senha');
  // Modo DOM para ambientes headless sem entrada nativa de teclado ou layout.
  const dom = process.env.PLAYWRIGHT_DOM_MODE === '1';
  const activate = (element: Locator) => dom ? element.dispatchEvent('click') : element.click();
  const enterText = (field: Locator, value: string) => !dom ? field.fill(value) : field.evaluate((element, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, text);
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }, value);
  await enterText(email, user.email);
  await enterText(password, 'fixture-password');
  await expect(email).toHaveValue(user.email);
  await expect(password).toHaveValue('fixture-password');
  await activate(page.getByRole('button', { name: 'Entrar', exact: true }));
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toHaveText('Catálogo');
  await expect(page.getByRole('link', { name: 'Fotos: Pexels' })).toHaveAttribute('href', 'https://www.pexels.com/');
  const cable = page.locator('li.equipment').filter({ hasText: 'TI-0010' });
  await expect(cable.getByRole('button', { name: 'Indisponível' })).toBeDisabled();
  await activate(page.getByRole('button', { name: 'Solicitar', exact: true }));
  await activate(page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }));
  await expect(page.getByText(/Empréstimo solicitado/)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Está com você' })).toBeDisabled();
  await activate(page.getByRole('link', { name: 'Meus empréstimos' }));
  await expect(page.getByRole('heading', { name: 'Meus empréstimos' })).toHaveText('Meus empréstimos');
  await expect(page.getByRole('heading', { name: /Notebook 14 polegadas/ })).toHaveCount(1);
  await expect(page.locator('time[datetime="2026-11-25T15:00:00Z"]')).toHaveText(/25\/11\/2026.*12:00/);
});
