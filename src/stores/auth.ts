import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest, clearCsrfToken, refreshCsrfToken } from '@/api/http'
import type { User } from '@/api/types'

type LoginCredentials = { email: string; password: string }
type Registration = LoginCredentials & { username: string; invitationCode: string }
type SessionStatus = 'pending' | 'verified' | 'unavailable'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const sessionStatus = ref<SessionStatus>('pending')
  const isAuthenticated = computed(() => user.value !== null)

  async function initialize(): Promise<void> {
    if (sessionStatus.value === 'verified') return

    try {
      const sessionUser = await apiRequest<User>('/api/auth/me')
      if (
        !sessionUser ||
        typeof sessionUser.id !== 'string' ||
        typeof sessionUser.username !== 'string'
      ) {
        sessionStatus.value = 'unavailable'
        return
      }

      user.value = sessionUser
      sessionStatus.value = 'verified'
    } catch (error) {
      user.value = null
      sessionStatus.value =
        error instanceof ApiError && error.status === 401 ? 'verified' : 'unavailable'
    }
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    user.value = await apiRequest<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    await refreshCsrfToken()
    sessionStatus.value = 'verified'
  }

  async function register(registration: Registration): Promise<void> {
    await apiRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(registration),
    })
    await login({ email: registration.email, password: registration.password })
  }

  async function logout(): Promise<void> {
    await apiRequest<void>('/api/auth/logout', { method: 'POST' })
    user.value = null
    clearCsrfToken()
    sessionStatus.value = 'verified'
  }

  return { user, sessionStatus, isAuthenticated, initialize, login, register, logout }
})
