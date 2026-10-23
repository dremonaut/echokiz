<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useAppStore } from './stores/app'

const app = useAppStore()
onMounted(() => app.init())
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">🎙️ EchoKiz</RouterLink>
    <nav>
      <RouterLink to="/">Sprecher</RouterLink>
      <RouterLink to="/aufnahme">Aufnahme</RouterLink>
      <RouterLink to="/frei">Frei sprechen</RouterLink>
      <RouterLink to="/katalog">Katalog</RouterLink>
      <RouterLink to="/daten">Daten</RouterLink>
    </nav>
    <span v-if="app.currentSpeakerId" class="speaker-badge">👤 {{ app.currentSpeakerId }}</span>
  </header>

  <main>
    <p v-if="app.error" class="alert alert-error">{{ app.error }}</p>
    <p v-else-if="!app.ready" class="muted">Lade lokalen Speicher …</p>
    <RouterView v-else />
  </main>
</template>
