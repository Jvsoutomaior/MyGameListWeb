import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest, clearCsrfToken } from '@/api/http'

describe('apiRequest', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads CSRF and sends credentials on state-changing requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ token: 'csrf-value', headerName: 'X-XSRF-TOKEN' }))
      .mockResolvedValueOnce(Response.json({ id: 'user-id', username: 'player' }))

    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'player@example.com', password: 'password' }),
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/api/auth/csrf')

    const loginRequest = fetchMock.mock.calls[1]
    const options = loginRequest?.[1]
    const headers = new Headers(options?.headers)
    expect(loginRequest?.[0]).toBe('http://localhost:8080/api/auth/login')
    expect(options?.credentials).toBe('include')
    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf-value')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('turns Problem Detail responses into ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json(
        { title: 'Authentication required', detail: 'Authentication is required' },
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    )

    await expect(apiRequest('/api/auth/me')).rejects.toMatchObject({
      status: 401,
      message: 'Authentication is required',
    })
  })
})
