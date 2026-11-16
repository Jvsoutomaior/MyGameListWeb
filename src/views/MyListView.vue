<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { ApiError, apiRequest } from '@/api/http'
import type { GameListEntry, GameStatus, Page } from '@/api/types'
import AuthFormError from '@/components/AuthFormError.vue'
import FieldError from '@/components/FieldError.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { gameStatusLabels, gameStatusOptions } from '@/domain/game-status'

const entries = ref<GameListEntry[]>([])
const listPage = ref<Page<GameListEntry> | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const selectedEntry = ref<GameListEntry | null>(null)
const editStatus = ref<GameStatus>('PLAN_TO_PLAY')
const editScore = ref<number | '' | null>(null)
const editComment = ref('')
const saving = ref(false)
const deleting = ref(false)
const actionError = ref<string | null>(null)
const scoreMessage = 'Use um número inteiro de 1 a 10 ou deixe a nota em branco.'
const { errors, fieldAttrs, validate, clear } = useFormValidation({
  'edit-score': {
    rangeUnderflow: scoreMessage,
    rangeOverflow: scoreMessage,
    stepMismatch: scoreMessage,
    badInput: scoreMessage,
  },
  'edit-comment': { tooLong: 'Reduza o comentário para até 5.000 caracteres.' },
})

onMounted(() => loadList(0))

async function loadList(pageNumber: number): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const page = await apiRequest<Page<GameListEntry>>(`/api/me/games?page=${pageNumber}&size=20`)
    listPage.value = page
    entries.value = page.content
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Não foi possível carregar sua lista.'
  } finally {
    loading.value = false
  }
}

function openEdit(entry: GameListEntry): void {
  clear()
  selectedEntry.value = entry
  editStatus.value = entry.status
  editScore.value = entry.score
  editComment.value = entry.comment ?? ''
  actionError.value = null
}

function closeEdit(): void {
  selectedEntry.value = null
  actionError.value = null
}

async function saveEntry(event: SubmitEvent): Promise<void> {
  if (!selectedEntry.value || saving.value || deleting.value) return
  if (!validate(event.currentTarget as HTMLFormElement)) return

  saving.value = true
  actionError.value = null

  try {
    const updatedEntry = await apiRequest<GameListEntry>(
      `/api/me/games/${selectedEntry.value.game.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus.value,
          score: editScore.value === '' ? null : editScore.value,
          comment: editComment.value || null,
        }),
      },
    )
    const index = entries.value.findIndex((entry) => entry.id === updatedEntry.id)
    if (index !== -1) entries.value[index] = updatedEntry
    closeEdit()
  } catch (error) {
    actionError.value =
      error instanceof ApiError ? error.message : 'Não foi possível atualizar este jogo.'
  } finally {
    saving.value = false
  }
}

async function removeEntry(): Promise<void> {
  if (!selectedEntry.value) return
  if (!window.confirm(`Remover ${selectedEntry.value.game.title} da sua lista?`)) return

  deleting.value = true
  actionError.value = null

  try {
    const entryId = selectedEntry.value.id
    await apiRequest<void>(`/api/me/games/${selectedEntry.value.game.id}`, {
      method: 'DELETE',
    })
    entries.value = entries.value.filter((entry) => entry.id !== entryId)
    closeEdit()
  } catch (error) {
    actionError.value =
      error instanceof ApiError ? error.message : 'Não foi possível remover este jogo.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="content-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Sua biblioteca</p>
        <h1>Minha lista</h1>
      </div>
    </header>

    <p v-if="loading" class="state-message">Carregando sua lista…</p>
    <p v-else-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <section v-else-if="entries.length === 0" class="empty-state">
      <h2>Sua lista ainda está vazia</h2>
      <p>Pesquise o catálogo para adicionar seu primeiro jogo.</p>
      <RouterLink class="primary-button" to="/games">Explorar jogos</RouterLink>
    </section>
    <ul v-else class="game-list">
      <li v-for="entry in entries" :key="entry.id" class="game-row">
        <div class="game-row-main">
          <div class="game-cover-small" aria-hidden="true">
            <img v-if="entry.game.coverUrl" :src="entry.game.coverUrl" alt="" />
            <span v-else>MGL</span>
          </div>
          <div>
            <h2>{{ entry.game.title }}</h2>
            <p>{{ gameStatusLabels[entry.status] }}</p>
            <p v-if="entry.comment" class="game-comment">{{ entry.comment }}</p>
          </div>
        </div>
        <div class="game-row-actions">
          <strong>{{ entry.score === null ? 'Sem nota' : `${entry.score}/10` }}</strong>
          <button class="secondary-button" type="button" @click="openEdit(entry)">Editar</button>
        </div>
      </li>
    </ul>
    <PaginationControls
      v-if="listPage"
      :page="listPage.page"
      :total-pages="listPage.totalPages"
      :disabled="loading"
      @change="loadList"
    />

    <div v-if="selectedEntry" class="dialog-backdrop" @click.self="closeEdit">
      <section class="list-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <button class="dialog-close" type="button" aria-label="Fechar" @click="closeEdit">×</button>
        <p class="eyebrow">Editar entrada</p>
        <h2 id="edit-title">{{ selectedEntry.game.title }}</h2>

        <form novalidate @submit.prevent="saveEntry">
          <label for="edit-status">Status</label>
          <select id="edit-status" v-model="editStatus">
            <option v-for="option in gameStatusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <label for="edit-score">Nota <span>(opcional)</span></label>
          <input
            id="edit-score"
            v-model="editScore"
            v-bind="fieldAttrs('edit-score')"
            type="number"
            min="1"
            max="10"
            step="1"
          />
          <FieldError field="edit-score" :message="errors['edit-score']" />

          <label for="edit-comment">Comentário <span>(opcional)</span></label>
          <textarea
            id="edit-comment"
            v-model="editComment"
            v-bind="fieldAttrs('edit-comment')"
            maxlength="5000"
            rows="4"
          />
          <FieldError field="edit-comment" :message="errors['edit-comment']" />

          <AuthFormError :message="actionError" />
          <div class="dialog-actions">
            <button
              class="danger-button"
              type="button"
              :disabled="saving || deleting"
              @click="removeEntry"
            >
              {{ deleting ? 'Removendo…' : 'Remover' }}
            </button>
            <button class="primary-button" type="submit" :disabled="saving || deleting">
              {{ saving ? 'Salvando…' : 'Salvar alterações' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
</template>
