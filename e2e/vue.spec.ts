import { test, expect } from '@playwright/test'

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
