<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ApiError, apiRequest } from '@/api/http'
import type { Game, GameListEntry, GameStatus, Page } from '@/api/types'
import AuthFormError from '@/components/AuthFormError.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { gameStatusOptions } from '@/domain/game-status'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const query = ref('')
const games = ref<Game[]>([])
const recentGames = ref<Game[]>([])
const loadingRecent = ref(true)
const recentError = ref(false)
const brokenCovers = ref(new Set<string>())
const resultPage = ref<Page<Game> | null>(null)
const activeQuery = ref('')
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
const visibleGames = computed(() => (searched.value ? games.value : recentGames.value))

async function loadRecentGames(): Promise<void> {
  loadingRecent.value = true
  recentError.value = false

  try {
    recentGames.value = await apiRequest<Game[]>('/api/games/recent')
  } catch {
    recentError.value = true
  } finally {
    loadingRecent.value = false
  }
}

onMounted(loadRecentGames)

function clearSearch(): void {
  query.value = ''
  activeQuery.value = ''
  searched.value = false
  resultPage.value = null
  searchError.value = null
}

async function submitSearch(): Promise<void> {
  const normalizedQuery = query.value.trim()
  if (!normalizedQuery) return

  activeQuery.value = normalizedQuery
  await loadGames(0)
}

async function loadGames(pageNumber: number): Promise<void> {
  searching.value = true
  searched.value = true
  searchError.value = null
  successMessage.value = null

  try {
    const params = new URLSearchParams({
      query: activeQuery.value,
      page: String(pageNumber),
      size: '20',
    })
    const page = await apiRequest<Page<Game>>(`/api/games?${params}`)
    resultPage.value = page
    games.value = page.content
  } catch (error) {
    resultPage.value = null
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
      <form class="search-form" role="search" @submit.prevent="submitSearch">
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
      <p class="catalog-attribution">
        Dados e capas dos jogos fornecidos por <a href="https://www.igdb.com/">IGDB.com</a>.
      </p>
    </header>

    <p v-if="searchError" class="form-error" role="alert">{{ searchError }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <section
      v-if="searched && !searching && games.length === 0 && !searchError"
      class="empty-state"
    >
      <h2>Nenhum jogo encontrado</h2>
      <p>Tente buscar por outro título ou por um trecho do nome.</p>
    </section>

    <section class="catalog-results" aria-labelledby="catalog-results-title">
      <div class="catalog-results-heading">
        <h2 id="catalog-results-title">
          {{ searched ? 'Resultados da pesquisa' : 'Jogos recentes' }}
        </h2>
        <button
          v-if="searched"
          class="secondary-button"
          type="button"
          :disabled="searching"
          @click="clearSearch"
        >
          Ver jogos recentes
        </button>
      </div>
      <template v-if="!searched">
        <p v-if="loadingRecent">Carregando jogos…</p>
        <div v-else-if="recentError">
          <p>Não foi possível carregar os jogos recentes.</p>
          <button class="secondary-button" type="button" @click="loadRecentGames">
            Tentar novamente
          </button>
        </div>
        <p v-else-if="!recentGames.length">Nenhum jogo recente disponível.</p>
      </template>

      <ul v-if="visibleGames.length" class="catalog-grid">
        <li v-for="game in visibleGames" :key="game.id" class="game-card">
          <div class="cover-placeholder">
            <img
              v-if="game.coverUrl && !brokenCovers.has(game.id)"
              :src="game.coverUrl"
              alt=""
              loading="lazy"
              decoding="async"
              @error="brokenCovers.add(game.id)"
            />
            <span v-else aria-hidden="true">MGL</span>
          </div>
          <div class="game-card-content">
            <h3>{{ game.title }}</h3>
            <p v-if="game.releaseDate">{{ game.releaseDate.slice(0, 4) }}</p>
            <button class="secondary-button" type="button" @click="chooseGame(game)">
              Adicionar à lista
            </button>
          </div>
        </li>
      </ul>

      <PaginationControls
        v-if="resultPage"
        :page="resultPage.page"
        :total-pages="resultPage.totalPages"
        :disabled="searching"
        @change="loadGames"
      />
    </section>

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
