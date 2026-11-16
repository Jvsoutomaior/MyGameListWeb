<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError } from '@/api/http'
import AuthFormError from '@/components/AuthFormError.vue'
import FieldError from '@/components/FieldError.vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)
const { errors, fieldAttrs, validate } = useFormValidation({
  email: {
    valueMissing: 'Digite seu e-mail.',
    typeMismatch: 'Use um endereço no formato nome@exemplo.com.',
    tooLong: 'Use um endereço com até 254 caracteres.',
  },
  password: {
    valueMissing: 'Digite sua senha.',
    tooLong: 'Use uma senha com até 128 caracteres.',
  },
})

async function submit(event: SubmitEvent): Promise<void> {
  errorMessage.value = null
  if (submitting.value || !validate(event.currentTarget as HTMLFormElement)) return
  submitting.value = true

  try {
    await auth.login({ email: email.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/my-list'
    await router.push(redirect)
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.status === 401
        ? 'E-mail ou senha incorretos. Confira os dois campos e tente novamente.'
        : 'Não foi possível entrar. Tente novamente em instantes.'
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

      <form novalidate @submit.prevent="submit">
        <label for="email">E-mail</label>
        <input
          id="email"
          v-model="email"
          v-bind="fieldAttrs('email')"
          type="email"
          autocomplete="email"
          maxlength="254"
          required
        />
        <FieldError field="email" :message="errors.email" />

        <label for="password">Senha</label>
        <input
          id="password"
          v-model="password"
          v-bind="fieldAttrs('password')"
          type="password"
          autocomplete="current-password"
          maxlength="128"
          required
        />
        <FieldError field="password" :message="errors.password" />

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
