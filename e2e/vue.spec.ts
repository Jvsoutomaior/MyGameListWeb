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
