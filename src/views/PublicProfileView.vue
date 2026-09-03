<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { ApiError, apiRequest } from '@/api/http'
import type { GameListEntry, Page, User } from '@/api/types'
import PaginationControls from '@/components/PaginationControls.vue'
import { gameStatusLabels } from '@/domain/game-status'

const route = useRoute()
const user = ref<User | null>(null)
const entries = ref<GameListEntry[]>([])
const listPage = ref<Page<GameListEntry> | null>(null)
const listLoading = ref(false)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const username = computed(() => String(route.params.username))

watch(username, loadProfile, { immediate: true })

async function loadProfile(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  user.value = null
  entries.value = []

  try {
    const encodedUsername = encodeURIComponent(username.value)
    const [profile, list] = await Promise.all([
      apiRequest<User>(`/api/users/${encodedUsername}`),
      fetchPublicList(0),
    ])
    user.value = profile
    listPage.value = list
    entries.value = list.content
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError && error.status === 404
        ? 'Este perfil não foi encontrado.'
        : error instanceof ApiError
          ? error.message
          : 'Não foi possível carregar este perfil.'
  } finally {
    loading.value = false
  }
}

async function fetchPublicList(pageNumber: number): Promise<Page<GameListEntry>> {
  const encodedUsername = encodeURIComponent(username.value)
  return apiRequest<Page<GameListEntry>>(
    `/api/users/${encodedUsername}/games?page=${pageNumber}&size=20`,
  )
}

async function loadPublicList(pageNumber: number): Promise<void> {
  listLoading.value = true
  errorMessage.value = null

  try {
    const page = await fetchPublicList(pageNumber)
    listPage.value = page
    entries.value = page.content
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Não foi possível carregar a lista.'
  } finally {
    listLoading.value = false
  }
}

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(createdAt),
  )
}
</script>

<template>
  <main class="content-page public-profile-page">
    <p v-if="loading" class="state-message">Carregando perfil…</p>

    <section v-else-if="errorMessage" class="empty-state">
      <h1>Perfil indisponível</h1>
      <p class="form-error" role="alert">{{ errorMessage }}</p>
      <RouterLink class="secondary-button" to="/">Voltar ao início</RouterLink>
    </section>

    <template v-else-if="user">
      <header class="profile-header">
        <div class="profile-avatar" aria-hidden="true">
          {{ user.username.slice(0, 2).toUpperCase() }}
        </div>
        <div>
          <p class="eyebrow">Perfil público</p>
          <h1>@{{ user.username }}</h1>
          <p class="profile-since">Membro desde {{ formatMemberSince(user.createdAt) }}</p>
          <p v-if="user.bio" class="profile-bio">{{ user.bio }}</p>
        </div>
      </header>

      <section class="public-list-heading">
        <div>
          <p class="eyebrow">Biblioteca</p>
          <h2>
            {{ listPage?.totalElements ?? 0 }}
            {{ listPage?.totalElements === 1 ? 'jogo' : 'jogos' }}
          </h2>
        </div>
      </section>

      <section v-if="entries.length === 0" class="empty-state">
        <h2>Esta lista ainda está vazia</h2>
        <p>{{ user.username }} ainda não adicionou jogos.</p>
      </section>

      <ul v-else class="game-list public-game-list">
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
          <strong>{{ entry.score === null ? 'Sem nota' : `${entry.score}/10` }}</strong>
        </li>
      </ul>
      <PaginationControls
        v-if="listPage"
        :page="listPage.page"
        :total-pages="listPage.totalPages"
        :disabled="listLoading"
        @change="loadPublicList"
      />
    </template>
  </main>
</template>
