<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError } from '@/api/http'
import AuthFormError from '@/components/AuthFormError.vue'
import FieldError from '@/components/FieldError.vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const invitationCode = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)
const usernameFormat = 'Use até 30 letras sem acento, números ou sublinhados (_), sem espaços.'
const emailFormat = 'Use um endereço no formato nome@exemplo.com, com até 254 caracteres.'
const passwordLength = 'Use entre 8 e 128 caracteres na senha.'
const invitationLength = 'Confira o código recebido e use até 128 caracteres.'
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
  'invitation-code': {
    valueMissing: 'Digite o código de convite que você recebeu.',
    tooLong: invitationLength,
  },
})

async function submit(event: SubmitEvent): Promise<void> {
  const form = event.currentTarget as HTMLFormElement
  errorMessage.value = null
  if (submitting.value || !validate(form)) return
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
    const invalidFields = error instanceof ApiError ? error.problem?.errors : undefined
    if (error instanceof ApiError && error.message === 'Invalid invitation code') {
      fieldError(
        form,
        'invitation-code',
        'Código de convite inválido. Confira o código recebido e tente novamente.',
      )
    } else if (error instanceof ApiError && error.message === 'Username is already in use') {
      fieldError(form, 'username', 'Este nome de usuário já está em uso. Escolha outro.')
    } else if (error instanceof ApiError && error.message === 'Email is already in use') {
      fieldError(
        form,
        'email',
        'Este e-mail já está em uso. Entre na sua conta ou use outro e-mail.',
      )
    } else if (
      invalidFields?.username ||
      invalidFields?.email ||
      invalidFields?.password ||
      invalidFields?.invitationCode
    ) {
      if (invalidFields.username) fieldError(form, 'username', usernameFormat)
      if (invalidFields.email) fieldError(form, 'email', emailFormat)
      if (invalidFields.password) fieldError(form, 'password', passwordLength)
      if (invalidFields.invitationCode) fieldError(form, 'invitation-code', invitationLength)
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

        <label for="invitation-code">Código de convite</label>
        <input
          id="invitation-code"
          v-model="invitationCode"
          v-bind="fieldAttrs('invitation-code')"
          autocomplete="off"
          autocapitalize="none"
          :spellcheck="false"
          maxlength="128"
          required
        />
        <FieldError field="invitation-code" :message="errors['invitation-code']" />

        <AuthFormError :message="errorMessage" />
        <button class="primary-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Criando conta…' : 'Criar conta' }}
        </button>
      </form>

      <p class="form-footer">Já possui uma conta? <RouterLink to="/login">Entrar</RouterLink></p>
    </section>
  </main>
</template>
