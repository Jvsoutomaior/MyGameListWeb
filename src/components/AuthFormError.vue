<script setup lang="ts">
defineProps<{ message: string | null }>()
</script>

<template>
  <p v-if="message" class="form-error" role="alert">{{ message }}</p>
</template>
