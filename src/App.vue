<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/')
}
</script>

<template>
  <header class="site-header">
    <RouterLink class="brand" to="/">MyGameList</RouterLink>
    <nav aria-label="Navegação principal">
      <RouterLink to="/">Início</RouterLink>
      <RouterLink to="/games">Jogos</RouterLink>
      <RouterLink v-if="auth.isAuthenticated" to="/my-list">Minha lista</RouterLink>
      <template v-if="auth.isAuthenticated">
        <RouterLink class="username" :to="`/users/${auth.user?.username}`">
          @{{ auth.user?.username }}
        </RouterLink>
        <button class="text-button" type="button" @click="logout">Sair</button>
      </template>
      <template v-else>
        <RouterLink to="/login">Entrar</RouterLink>
        <RouterLink class="nav-cta" to="/register">Criar conta</RouterLink>
      </template>
    </nav>
  </header>

  <p v-if="auth.sessionStatus === 'unavailable'" class="session-notice" role="status">
    Não foi possível verificar sua sessão. Tente novamente em instantes.
  </p>

  <RouterView />
</template>

<style scoped>
.session-notice {
  padding: 0.75rem 1rem;
  text-align: center;
}
</style>
