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

test('shows game covers below search on the first visit', async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  )
  await page.route('**/cover.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="14"><rect width="10" height="14"/></svg>',
    }),
  )
  await page.route('**/api/games/recent/pages?*', (route) => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page'))
    const content =
      currentPage === 0
        ? [
            { ...game, coverUrl: '/cover.svg' },
            { ...game, id: 'second-game', title: 'Celeste', coverUrl: '/cover.svg' },
          ]
        : [{ ...game, id: 'third-game', title: 'Hades', coverUrl: '/cover.svg' }]
    return route.fulfill({ json: { content, page: currentPage, totalPages: 2 } })
  })

  await page.goto('/games')
  const recent = page.getByRole('region', { name: 'Jogos recentes' })
  await expect(recent.getByRole('heading', { name: game.title })).toBeVisible()
  const covers = recent.locator('img')
  await expect.poll(() => covers.first().evaluate((img) => img.naturalWidth)).toBe(10)

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeInViewport()
    const gridLayout = await recent.getByRole('listitem').evaluateAll((cards) => ({
      columns: new Set(cards.map((card) => card.getBoundingClientRect().left)).size,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(gridLayout).toEqual({ columns: 2, scrollWidth: width })
  }

  const pagination = recent.getByRole('navigation', { name: 'Paginação' })
  const previous = pagination.getByRole('button', { name: 'Anterior' })
  const next = pagination.getByRole('button', { name: 'Próxima' })
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(recent.getByRole('heading', { name: 'Hades' })).toBeVisible()
  await expect(recent.getByRole('heading', { name: game.title })).toHaveCount(0)
  await expect(pagination).toContainText('Página 2 de 2')
  await expect(next).toBeDisabled()
  await previous.click()
  await expect(recent.getByRole('heading', { name: game.title })).toBeVisible()
  await expect(pagination).toContainText('Página 1 de 2')

  await recent.getByRole('button', { name: 'Adicionar à lista' }).first().click()
  await expect(page).toHaveURL('/login?redirect=/games')
})

test('opens public routes and retries session checks after an HTML response', async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>MyGameList</title>' }),
  )

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Não foi possível verificar sua sessão')

  await page.goto('/my-list')
  await expect(page).toHaveURL('/login?redirect=/my-list')
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()

  await page.unroute('**/api/auth/me')
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  )
  const sessionResponse = page.waitForResponse('**/api/auth/me')
  await page.getByRole('link', { name: 'Cadastre-se' }).click()
  await sessionResponse
  await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('explains invalid registration fields and an email already in use', async ({ page }) => {
  await page.context().addCookies([
    { name: 'XSRF-TOKEN', value: 'csrf-value', domain: 'localhost', path: '/' },
  ])
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  )
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{}' }),
  )
  await page.route('**/api/users', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      username: 'player',
      email: 'player@example.com',
      password: 'password123',
    })
    await route.fulfill({
      status: 409,
      contentType: 'application/problem+json',
      body: JSON.stringify({ detail: 'Email is already in use' }),
    })
  })

  await page.goto('/register')
  const username = page.getByLabel('Nome de usuário')
  const email = page.getByLabel('E-mail', { exact: true })
  const password = page.getByLabel('Senha', { exact: true })
  const submit = page.getByRole('button', { name: 'Criar conta', exact: true })

  await username.fill('usuário teste')
  await email.fill('player')
  await password.fill('123')
  await submit.click()
  await expect(username).toBeFocused()
  await expect(username).toHaveAccessibleDescription(/sem acento/)
  await expect(email).toHaveAccessibleDescription(/nome@exemplo.com/)
  await expect(password).toHaveAccessibleDescription(/8 e 128 caracteres/)

  await username.fill('player')
  await email.fill('player@example.com')
  await password.fill('password123')
  await expect(username).not.toHaveAttribute('aria-invalid', 'true')
  await submit.click()
  await expect(email).toHaveAccessibleDescription(/Este e-mail já está em uso/)
  await email.fill('player@example.com')
  await page.route('**/api/users', (route) =>
    route.fulfill({
      status: 429,
      headers: { 'Retry-After': '125', 'Access-Control-Expose-Headers': 'Retry-After' },
      json: { title: 'Too many registration attempts' },
    }),
  )
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText(
    'Muitas tentativas de cadastro. Aguarde 3 minutos e tente novamente.',
  )
  await expect(email).toHaveValue('player@example.com')
  await expect(page).toHaveURL('/register')
})

test('confirms registration by email before offering login', async ({ page }) => {
  await page.context().addCookies([
    { name: 'XSRF-TOKEN', value: 'csrf-value', domain: 'localhost', path: '/' },
  ])
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: {} }),
  )
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { token: 'csrf-value', headerName: 'X-XSRF-TOKEN' } }),
  )
  const pending = {
    email: 'player@example.com',
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    emailSent: true,
  }
  await page.route('**/api/users', (route) =>
    route.fulfill({ status: 202, json: pending }),
  )
  await page.route('**/api/users/resend-code', (route) =>
    route.fulfill({ status: 202, json: pending }),
  )
  let confirmations = 0
  await page.route('**/api/users/verify-email', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: pending.email,
      code: confirmations === 0 ? '11111111' : '22222222',
    })
    confirmations++
    return confirmations === 1
      ? route.fulfill({ status: 400, json: { detail: 'Invalid or expired verification code' } })
      : route.fulfill({ status: 204 })
  })
  await page.goto('/register')
  await page.getByLabel('Nome de usuário').fill('player')
  await page.getByLabel('E-mail', { exact: true }).fill(pending.email)
  await page.getByLabel('Senha', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Confirme seu e-mail' })).toBeVisible()
  await page.getByLabel('Código de confirmação').fill('11111111')
  await page.getByRole('button', { name: 'Confirmar cadastro' }).click()
  await expect(page.getByRole('alert')).toContainText('Código incorreto')
  await page.getByRole('button', { name: 'Reenviar código' }).click()
  await expect(page.getByLabel('Código de confirmação')).toHaveValue('')
  await page.getByLabel('Código de confirmação').fill('22222222')
  await page.getByRole('button', { name: 'Confirmar cadastro' }).click()
  await expect(page.getByRole('heading', { name: 'E-mail confirmado' })).toBeVisible()
  await page.locator('main').getByRole('link', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/login')
})

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
      body: JSON.stringify({
        content: [game],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
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
      body: JSON.stringify({
        content: [game],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
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
  const score = page.getByLabel('Nota (opcional)')
  await score.fill('9.5')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await expect(score).toHaveAccessibleDescription(/número inteiro de 1 a 10/)
  await expect(score).toBeFocused()
  await score.fill('9')
  await expect(score).not.toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Comentário (opcional)').fill('Ótimo RPG')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()

  await expect(page.getByRole('status')).toHaveText('The Witcher 3 foi adicionado à sua lista.')
})

test('edits and removes an entry from the authenticated user list', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 })
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
  await page.route('http://localhost:8080/api/me/games?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        content: [entry],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
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
  await expect(page.getByRole('link', { name: '@player' })).toBeInViewport()
  await expect(page.getByRole('heading', { name: game.title })).toBeVisible()
  await page.getByRole('button', { name: 'Editar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeInViewport()
  expect(await dialog.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
    await dialog.evaluate((element) => element.clientHeight),
  )
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

test('finds and displays another user public profile', async ({ page }) => {
  await page.route('http://localhost:8080/api/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/problem+json', body: '{}' }),
  )
  await page.route('http://localhost:8080/api/users/playerone', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-id',
        username: 'playerone',
        bio: 'Jogando um pouco de tudo.',
        createdAt: '2025-01-15T12:00:00Z',
      }),
    }),
  )
  await page.route('http://localhost:8080/api/users/playerone/games?*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          {
            id: 'entry-id',
            game,
            status: 'COMPLETED',
            score: 10,
            comment: 'Um dos meus favoritos.',
            createdAt: '2025-01-15T12:00:00Z',
            updatedAt: '2025-01-15T12:00:00Z',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    }),
  )

  await page.goto('/')
  await page.getByLabel('Nome de usuário').fill('playerone')
  await page.getByRole('button', { name: 'Visitar perfil' }).click()

  await expect(page).toHaveURL('/users/playerone')
  await expect(page.getByRole('heading', { name: '@playerone' })).toBeVisible()
  await expect(page.getByText('Jogando um pouco de tudo.')).toBeVisible()
  await expect(page.getByRole('heading', { name: game.title })).toBeVisible()
  await expect(page.getByText('Concluído')).toBeVisible()
  await expect(page.getByText('10/10')).toBeVisible()
  await expect(page.getByText('Um dos meus favoritos.')).toBeVisible()
})
