import { test, expect } from '@playwright/test'

const game = {
  id: 'fd2c77a8-8f21-4eef-8de1-8b7696c29cc8',
  source: 'TEST',
  externalId: 'witcher-3',
  title: 'The Witcher 3',
  coverUrl: null,
  releaseDate: '2015-05-19',
  synchronizedAt: '2026-09-02T12:00:00Z',
}

test('shows the home page and navigates to login', async ({ page }) => {
  await page.route('http://localhost:8080/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Authentication required' }),
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Registre cada mundo que você explorou.',
  )

  await page.getByRole('link', { name: 'Já tenho uma conta' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entre na sua conta')
})

test('allows a visitor to search and asks for login before adding', async ({ page }) => {
  await page.route('http://localhost:8080/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  )
  await page.route('http://localhost:8080/api/games?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ content: [game], page: 0, size: 20, totalElements: 1 }),
    }),
  )

  await page.goto('/games')
  await page.getByLabel('Nome do jogo').fill('Witcher')
  await page.getByRole('button', { name: 'Pesquisar' }).click()
  await expect(page.getByRole('heading', { name: game.title })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await expect(page).toHaveURL('/login?redirect=/games')
})

test('adds a catalog game to the authenticated user list', async ({ page }) => {
  await page.context().addCookies([
    { name: 'XSRF-TOKEN', value: 'csrf-value', domain: 'localhost', path: '/' },
  ])
  await page.route('http://localhost:8080/api/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-id', username: 'player', bio: null }),
    }),
  )
  await page.route('http://localhost:8080/api/games?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ content: [game], page: 0, size: 20, totalElements: 1 }),
    }),
  )
  await page.route('http://localhost:8080/api/auth/csrf', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ token: 'csrf-value', headerName: 'X-XSRF-TOKEN' }),
    }),
  )
  await page.route('http://localhost:8080/api/me/games', async (route) => {
    const request = route.request()
    expect(request.headers()['x-xsrf-token']).toBe('csrf-value')
    expect(request.postDataJSON()).toMatchObject({
      gameId: game.id,
      status: 'PLAYING',
      score: 9,
      comment: 'Ótimo RPG',
    })
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'entry-id', game, status: 'PLAYING', score: 9 }),
    })
  })

  await page.goto('/games')
  await page.getByLabel('Nome do jogo').fill('Witcher')
  await page.getByRole('button', { name: 'Pesquisar' }).click()
  await page.getByRole('button', { name: 'Adicionar à lista' }).click()
  await page.getByLabel('Status').selectOption('PLAYING')
  await page.getByLabel('Nota (opcional)').fill('9')
  await page.getByLabel('Comentário (opcional)').fill('Ótimo RPG')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()

  await expect(page.getByRole('status')).toHaveText('The Witcher 3 foi adicionado à sua lista.')
})

test('edits and removes an entry from the authenticated user list', async ({ page }) => {
  const entry = {
    id: 'entry-id',
    game,
    status: 'PLAN_TO_PLAY',
    score: null,
    comment: null,
    createdAt: '2026-09-02T12:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
  }

  await page.context().addCookies([
    { name: 'XSRF-TOKEN', value: 'csrf-value', domain: 'localhost', path: '/' },
  ])
  await page.route('http://localhost:8080/api/auth/me', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-id', username: 'player', bio: null }),
    }),
  )
  await page.route('http://localhost:8080/api/auth/csrf', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ token: 'masked-value', headerName: 'X-XSRF-TOKEN' }),
    }),
  )
  await page.route('http://localhost:8080/api/me/games', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ content: [entry], page: 0, size: 20, totalElements: 1 }),
    }),
  )
  await page.route(`http://localhost:8080/api/me/games/${game.id}`, async (route) => {
    const request = route.request()
    expect(request.headers()['x-xsrf-token']).toBe('csrf-value')

    if (request.method() === 'PATCH') {
      expect(request.postDataJSON()).toMatchObject({
        status: 'COMPLETED',
        score: 10,
        comment: 'Finalizado',
      })
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ...entry,
          status: 'COMPLETED',
          score: 10,
          comment: 'Finalizado',
        }),
      })
      return
    }

    await route.fulfill({ status: 204 })
  })

  await page.goto('/my-list')
  await expect(page.getByRole('heading', { name: game.title })).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Status').selectOption('COMPLETED')
  await page.getByLabel('Nota (opcional)').fill('10')
  await page.getByLabel('Comentário (opcional)').fill('Finalizado')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()

  await expect(page.getByText('Concluído')).toBeVisible()
  await expect(page.getByText('10/10')).toBeVisible()
  await expect(page.getByText('Finalizado')).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).click()
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Remover The Witcher 3 da sua lista?')
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Remover' }).click()
  await expect(page.getByRole('heading', { name: 'Sua lista ainda está vazia' })).toBeVisible()
})
