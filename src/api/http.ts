const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type ProblemDetail = {
  detail?: string
  title?: string
  errors?: Record<string, string>
}

type CsrfTokenResponse = {
  token: string
  headerName: string
}

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetail

  constructor(status: number, problem?: ProblemDetail) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

let csrfToken: CsrfTokenResponse | undefined

async function loadCsrfToken(): Promise<CsrfTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    credentials: 'include',
  })

  if (!response.ok) throw await createApiError(response)

  const responseToken = (await response.json()) as CsrfTokenResponse
  const cookieToken = readCookie('XSRF-TOKEN')
  if (!cookieToken) {
    throw new Error('The XSRF-TOKEN cookie was not provided by the API')
  }

  csrfToken = { ...responseToken, token: cookieToken }
  return csrfToken
}

export function clearCsrfToken(): void {
  csrfToken = undefined
}

export async function refreshCsrfToken(): Promise<void> {
  clearCsrfToken()
  await loadCsrfToken()
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken ?? (await loadCsrfToken())
    headers.set(token.headerName, token.token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: 'include',
  })

  if (!response.ok) throw await createApiError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

async function createApiError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('Content-Type') ?? ''
  const problem = contentType.includes('json')
    ? ((await response.json()) as ProblemDetail)
    : undefined
  return new ApiError(response.status, problem)
}

function readCookie(name: string): string | undefined {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}
