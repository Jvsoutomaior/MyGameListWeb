<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { ApiError, apiRequest } from '@/api/http'
import type { GameListEntry, Page } from '@/api/types'

const entries = ref<GameListEntry[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const statusLabels: Record<GameListEntry['status'], string> = {
  PLAN_TO_PLAY: 'Quero jogar',
  PLAYING: 'Jogando',
  COMPLETED: 'Concluído',
  ON_HOLD: 'Em pausa',
  DROPPED: 'Abandonado',
}

onMounted(async () => {
  try {
    const page = await apiRequest<Page<GameListEntry>>('/api/me/games')
    entries.value = page.content
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Não foi possível carregar sua lista.'
  } finally {
    loading.value = false
  }
})
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
      <p>Na próxima etapa, a pesquisa do catálogo permitirá adicionar seu primeiro jogo.</p>
    </section>
    <ul v-else class="game-list">
      <li v-for="entry in entries" :key="entry.id" class="game-row">
        <div>
          <h2>{{ entry.game.title }}</h2>
          <p>{{ statusLabels[entry.status] }}</p>
        </div>
        <strong>{{ entry.score === null ? 'Sem nota' : `${entry.score}/10` }}</strong>
      </li>
    </ul>
  </main>
</template>
