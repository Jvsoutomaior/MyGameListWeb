import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest, clearCsrfToken, refreshCsrfToken } from '@/api/http'
import type { User } from '@/api/types'

type LoginCredentials = { email: string; password: string }
type Registration = LoginCredentials & { username: string }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => user.value !== null)

  async function initialize(): Promise<void> {
    if (initialized.value) return

    try {
      user.value = await apiRequest<User>('/api/auth/me')
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    user.value = await apiRequest<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    await refreshCsrfToken()
    initialized.value = true
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
    initialized.value = true
  }

  return { user, initialized, isAuthenticated, initialize, login, register, logout }
})
