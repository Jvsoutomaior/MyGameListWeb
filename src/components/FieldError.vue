<script setup lang="ts">
defineProps<{ field: string; message?: string }>()
</script>

<template>
  <p v-if="message" :id="`${field}-error`" class="field-error" role="alert">{{ message }}</p>
</template>
