<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError, apiRequest } from '@/api/http'
import type { Game, GameListEntry, GameStatus, Page } from '@/api/types'
import AuthFormError from '@/components/AuthFormError.vue'
import { gameStatusOptions } from '@/domain/game-status'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const query = ref('')
const games = ref<Game[]>([])
const searched = ref(false)
const searching = ref(false)
const searchError = ref<string | null>(null)
const selectedGame = ref<Game | null>(null)
const status = ref<GameStatus>('PLAN_TO_PLAY')
const score = ref<number | null>(null)
const comment = ref('')
const adding = ref(false)
const addError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

async function search(): Promise<void> {
  const normalizedQuery = query.value.trim()
  if (!normalizedQuery) return

  searching.value = true
  searched.value = true
  searchError.value = null
  successMessage.value = null

  try {
    const params = new URLSearchParams({ query: normalizedQuery, page: '0', size: '20' })
    const page = await apiRequest<Page<Game>>(`/api/games?${params}`)
    games.value = page.content
  } catch (error) {
    games.value = []
    searchError.value =
      error instanceof ApiError ? error.message : 'Não foi possível pesquisar o catálogo.'
  } finally {
    searching.value = false
  }
}

async function chooseGame(game: Game): Promise<void> {
  if (!auth.isAuthenticated) {
    await router.push({ name: 'login', query: { redirect: '/games' } })
    return
  }

  selectedGame.value = game
  status.value = 'PLAN_TO_PLAY'
  score.value = null
  comment.value = ''
  addError.value = null
  successMessage.value = null
}

function closeForm(): void {
  selectedGame.value = null
  addError.value = null
}

async function addToList(): Promise<void> {
  if (!selectedGame.value) return

  adding.value = true
  addError.value = null

  try {
    await apiRequest<GameListEntry>('/api/me/games', {
      method: 'POST',
      body: JSON.stringify({
        gameId: selectedGame.value.id,
        status: status.value,
        score: score.value,
        comment: comment.value || null,
      }),
    })
    successMessage.value = `${selectedGame.value.title} foi adicionado à sua lista.`
    closeForm()
  } catch (error) {
    addError.value =
      error instanceof ApiError ? error.message : 'Não foi possível adicionar este jogo.'
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <main class="content-page catalog-page">
    <header class="page-heading">
      <p class="eyebrow">Catálogo compartilhado</p>
      <h1>Encontre seu próximo jogo.</h1>
      <form class="search-form" role="search" @submit.prevent="search">
        <label class="sr-only" for="game-query">Nome do jogo</label>
        <input
          id="game-query"
          v-model="query"
          type="search"
          placeholder="Ex.: The Witcher 3"
          required
        />
        <button class="primary-button" type="submit" :disabled="searching">
          {{ searching ? 'Pesquisando…' : 'Pesquisar' }}
        </button>
      </form>
    </header>

    <p v-if="searchError" class="form-error" role="alert">{{ searchError }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <section
      v-if="searched && !searching && games.length === 0 && !searchError"
      class="empty-state"
    >
      <h2>Nenhum jogo encontrado</h2>
      <p>O catálogo ainda é pequeno e será conectado a uma fonte externa futuramente.</p>
    </section>

    <ul v-if="games.length" class="catalog-grid">
      <li v-for="game in games" :key="game.id" class="game-card">
        <div class="cover-placeholder" :class="{ 'has-cover': game.coverUrl }">
          <img v-if="game.coverUrl" :src="game.coverUrl" :alt="`Capa de ${game.title}`" />
          <span v-else aria-hidden="true">MGL</span>
        </div>
        <div class="game-card-content">
          <p>{{ game.releaseDate?.slice(0, 4) ?? 'Ano desconhecido' }}</p>
          <h2>{{ game.title }}</h2>
          <button class="secondary-button" type="button" @click="chooseGame(game)">
            Adicionar à lista
          </button>
        </div>
      </li>
    </ul>

    <div v-if="selectedGame" class="dialog-backdrop" @click.self="closeForm">
      <section class="list-dialog" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <button class="dialog-close" type="button" aria-label="Fechar" @click="closeForm">×</button>
        <p class="eyebrow">Adicionar à lista</p>
        <h2 id="add-title">{{ selectedGame.title }}</h2>

        <form @submit.prevent="addToList">
          <label for="status">Status</label>
          <select id="status" v-model="status">
            <option v-for="option in gameStatusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <label for="score">Nota <span>(opcional)</span></label>
          <input id="score" v-model="score" type="number" min="1" max="10" />

          <label for="comment">Comentário <span>(opcional)</span></label>
          <textarea id="comment" v-model="comment" maxlength="5000" rows="4" />

          <AuthFormError :message="addError" />
          <button class="primary-button" type="submit" :disabled="adding">
            {{ adding ? 'Adicionando…' : 'Adicionar' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
