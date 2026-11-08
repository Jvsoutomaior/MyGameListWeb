<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError } from '@/api/http'
import AuthFormError from '@/components/AuthFormError.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const invitationCode = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)

async function submit(): Promise<void> {
  errorMessage.value = null
  submitting.value = true

  try {
    await auth.register({
      username: username.value,
      email: email.value,
      password: password.value,
      invitationCode: invitationCode.value,
    })
    await router.push('/my-list')
  } catch (error) {
    if (error instanceof ApiError && error.message === 'Invalid invitation code') {
      errorMessage.value = 'Código de convite inválido. Confira o código recebido e tente novamente.'
    } else if (error instanceof ApiError && error.status === 503) {
      errorMessage.value = 'O cadastro está indisponível no momento. Tente novamente mais tarde.'
    } else {
      errorMessage.value =
        error instanceof ApiError ? error.message : 'Não foi possível criar a conta.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="eyebrow">Comece sua lista</p>
      <h1>Crie sua conta</h1>
      <p class="supporting-text">
        Registre o que jogou e compartilhe sua lista com outras pessoas. Para criar uma conta, você
        precisa de um código de convite.
      </p>

      <form @submit.prevent="submit">
        <label for="username">Nome de usuário</label>
        <input id="username" v-model="username" autocomplete="username" maxlength="30" required />

        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required />

        <label for="password">Senha</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="8"
          required
        />

        <label for="invitation-code">Código de convite</label>
        <input
          id="invitation-code"
          v-model="invitationCode"
          autocomplete="off"
          autocapitalize="none"
          :spellcheck="false"
          maxlength="128"
          pattern=".*\S.*"
          title="Informe o código de convite recebido."
          required
        />

        <AuthFormError :message="errorMessage" />
        <button class="primary-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Criando conta…' : 'Criar conta' }}
        </button>
      </form>

      <p class="form-footer">Já possui uma conta? <RouterLink to="/login">Entrar</RouterLink></p>
    </section>
  </main>
</template>
