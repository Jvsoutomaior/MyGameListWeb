<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

function changePage(page: number): void {
  if (!props.disabled && page >= 0 && page < props.totalPages) emit('change', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Paginação">
    <button
      class="secondary-button"
      type="button"
      :disabled="disabled || page === 0"
      @click="changePage(page - 1)"
    >
      Anterior
    </button>
    <span>Página {{ page + 1 }} de {{ totalPages }}</span>
    <button
      class="secondary-button"
      type="button"
      :disabled="disabled || page + 1 >= totalPages"
      @click="changePage(page + 1)"
    >
      Próxima
    </button>
  </nav>
</template>
