<script setup lang="ts">
import { ref } from 'vue'

import { ApiError, apiRequest } from '@/api/http'
import AuthFormError from '@/components/AuthFormError.vue'
import FieldError from '@/components/FieldError.vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { useAuthStore, type PendingRegistration } from '@/stores/auth'

const auth = useAuthStore()
const username = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)
const pending = ref<PendingRegistration | null>(null)
const code = ref('')
const confirmationError = ref<string | null>(null)
const confirmed = ref(false)
const confirming = ref(false)
const resending = ref(false)
const verification = useFormValidation({
  'confirmation-code': {
    valueMissing: 'Digite o código recebido por e-mail.',
    patternMismatch: 'Digite os 8 números do código mais recente.',
  },
})

async function confirmEmail(event: SubmitEvent): Promise<void> {
  if (!pending.value || confirming.value || resending.value) return
  if (!verification.validate(event.currentTarget as HTMLFormElement)) return
  confirmationError.value = null
  confirming.value = true
  try {
    await apiRequest<void>('/api/users/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email: pending.value.email, code: code.value }),
    })
    confirmed.value = true
    password.value = ''
    code.value = ''
  } catch (error) {
    confirmationError.value =
      error instanceof ApiError && error.status === 400
        ? 'Código incorreto, expirado ou sem tentativas disponíveis. Confira o último e-mail ou solicite um novo código.'
        : 'Não foi possível confirmar agora. Tente novamente em instantes.'
  } finally {
    confirming.value = false
  }
}

async function resendCode(): Promise<void> {
  if (!pending.value || resending.value || confirming.value) return
  confirmationError.value = null
  resending.value = true
  try {
    pending.value = await apiRequest<PendingRegistration>('/api/users/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email: pending.value.email, password: password.value }),
    })
    code.value = ''
    verification.clear()
  } catch (error) {
    confirmationError.value =
      error instanceof ApiError && error.status === 429
        ? `Aguarde ${Math.ceil((error.retryAfterSeconds ?? 60) / 60)} minuto(s) antes de solicitar outro código.`
        : 'Não foi possível reenviar o código. Tente novamente em instantes.'
  } finally {
    resending.value = false
  }
}
const usernameFormat = 'Use até 30 letras sem acento, números ou sublinhados (_), sem espaços.'
const emailFormat = 'Use um endereço no formato nome@exemplo.com, com até 254 caracteres.'
const passwordLength = 'Use entre 8 e 128 caracteres na senha.'
const { errors, fieldAttrs, validate, fieldError } = useFormValidation({
  username: {
    valueMissing: 'Digite um nome de usuário.',
    patternMismatch: usernameFormat,
    tooLong: usernameFormat,
  },
  email: { valueMissing: 'Digite seu e-mail.', typeMismatch: emailFormat, tooLong: emailFormat },
  password: {
    valueMissing: 'Digite uma senha.',
    tooShort: passwordLength,
    tooLong: passwordLength,
  },
})

async function submit(event: SubmitEvent): Promise<void> {
  const form = event.currentTarget as HTMLFormElement
  errorMessage.value = null
  if (submitting.value || !validate(form)) return
  submitting.value = true

  try {
    pending.value = await auth.register({
      username: username.value,
      email: email.value,
      password: password.value,
    })
  } catch (error) {
    const invalidFields = error instanceof ApiError ? error.problem?.errors : undefined
    if (error instanceof ApiError && error.message === 'Username is already in use') {
      fieldError(form, 'username', 'Este nome de usuário já está em uso. Escolha outro.')
    } else if (error instanceof ApiError && error.message === 'Email is already in use') {
      fieldError(
        form,
        'email',
        'Este e-mail já está em uso. Entre na sua conta ou use outro e-mail.',
      )
    } else if (invalidFields?.username || invalidFields?.email || invalidFields?.password) {
      if (invalidFields.username) fieldError(form, 'username', usernameFormat)
      if (invalidFields.email) fieldError(form, 'email', emailFormat)
      if (invalidFields.password) fieldError(form, 'password', passwordLength)
    } else if (error instanceof ApiError && error.status === 429) {
      const minutes = Math.ceil((error.retryAfterSeconds ?? 60) / 60)
      errorMessage.value = `Muitas tentativas de cadastro. Aguarde ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e tente novamente.`
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
      <template v-if="confirmed">
        <h1>E-mail confirmado</h1>
        <p>Sua conta foi ativada. Entre para começar sua lista.</p>
        <RouterLink class="primary-button" to="/login">Entrar</RouterLink>
      </template>
      <template v-else-if="pending">
        <h1>Confirme seu e-mail</h1>
        <p class="supporting-text">
          Confirme o código enviado para {{ pending.email }}. Ele vale por até 10 minutos. Confira
          também a pasta de spam.
        </p>
        <p v-if="!pending.emailSent" class="form-error" role="alert">
          Não conseguimos enviar o e-mail agora. Aguarde um minuto e tente reenviar.
        </p>
        <form novalidate @submit.prevent="confirmEmail">
          <label for="confirmation-code">Código de confirmação</label>
          <input
            id="confirmation-code"
            v-model="code"
            v-bind="verification.fieldAttrs('confirmation-code')"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]{8}"
            maxlength="8"
            required
          />
          <FieldError
            field="confirmation-code"
            :message="verification.errors['confirmation-code']"
          />
          <AuthFormError :message="confirmationError" />
          <button class="primary-button" type="submit" :disabled="confirming || resending">
            {{ confirming ? 'Confirmando…' : 'Confirmar cadastro' }}
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="confirming || resending"
            @click="resendCode"
          >
            {{ resending ? 'Reenviando…' : 'Reenviar código' }}
          </button>
          <button
            class="text-button"
            type="button"
            :disabled="confirming || resending"
            @click="pending = null"
          >
            Voltar ao cadastro
          </button>
        </form>
      </template>
      <template v-else>
        <p class="eyebrow">Comece sua lista</p>
        <h1>Crie sua conta</h1>
        <p class="supporting-text">
          Registre o que jogou e compartilhe sua lista com outras pessoas. Confirme seu e-mail para
          ativar a conta.
        </p>

        <form novalidate @submit.prevent="submit">
          <label for="username">Nome de usuário</label>
          <input
            id="username"
            v-model="username"
            v-bind="fieldAttrs('username')"
            autocomplete="username"
            pattern="[A-Za-z0-9_]+"
            maxlength="30"
            required
          />
          <FieldError field="username" :message="errors.username" />

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
            autocomplete="new-password"
            minlength="8"
            maxlength="128"
            required
          />
          <FieldError field="password" :message="errors.password" />

          <AuthFormError :message="errorMessage" />
          <button class="primary-button" type="submit" :disabled="submitting">
            {{ submitting ? 'Criando conta…' : 'Criar conta' }}
          </button>
        </form>

        <p class="form-footer">Já possui uma conta? <RouterLink to="/login">Entrar</RouterLink></p>
      </template>
    </section>
  </main>
</template>
