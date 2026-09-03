<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError } from '@/api/http'
import AuthFormError from '@/components/AuthFormError.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)

async function submit(): Promise<void> {
  errorMessage.value = null
  submitting.value = true

  try {
    await auth.login({ email: email.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/my-list'
    await router.push(redirect)
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Não foi possível entrar.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="eyebrow">Bem-vindo de volta</p>
      <h1>Entre na sua conta</h1>
      <p class="supporting-text">Continue organizando os jogos que fazem parte da sua história.</p>

      <form @submit.prevent="submit">
        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required />

        <label for="password">Senha</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />

        <AuthFormError :message="errorMessage" />
        <button class="primary-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p class="form-footer">
        Ainda não tem uma conta? <RouterLink to="/register">Cadastre-se</RouterLink>
      </p>
    </section>
  </main>
</template>
