<script setup lang="ts">
import { computed, ref } from 'vue'
import { CATEGORIES } from '../core/catalog'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const text = ref('')
const category = ref<string>(CATEGORIES[0])
const emoji = ref('')
const error = ref<string>()

const grouped = computed(() => {
  const groups = new Map<string, typeof app.phrases>()
  for (const p of app.phrases) groups.set(p.category, [...(groups.get(p.category) ?? []), p])
  return groups
})

async function add() {
  error.value = undefined
  try {
    await app.addPhrase(text.value, category.value, emoji.value.trim())
    text.value = ''
    emoji.value = ''
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <section>
    <h1>Wortkatalog</h1>
    <p class="muted">Vordefinierte Wörter, Sätze und Laute. Eigene Phrasen werden lokal gespeichert.</p>

    <form class="card" @submit.prevent="add">
      <h2>Eigene Phrase hinzufügen</h2>
      <label>
        Text
        <input v-model="text" type="text" placeholder="z. B. Ich möchte kuscheln" />
      </label>
      <div class="row">
        <label class="grow">
          Kategorie
          <select v-model="category">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label class="emoji-input">
          Emoji (optional)
          <input v-model="emoji" type="text" maxlength="8" placeholder="🧸" />
        </label>
      </div>
      <p v-if="error" class="alert alert-error">{{ error }}</p>
      <button type="submit" :disabled="!text.trim()">Hinzufügen</button>
    </form>

    <div v-for="[name, items] in grouped" :key="name" class="card">
      <h2>{{ name }}</h2>
      <ul class="phrases">
        <li v-for="p in items" :key="p.id">
          <span>{{ p.emoji ?? '💬' }} {{ p.text }}</span>
          <span class="muted">{{ app.countsByPhrase.get(p.id) ?? 0 }} Aufnahmen</span>
          <button v-if="p.custom" class="secondary small" @click="app.deletePhrase(p.id)">Entfernen</button>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.grow {
  flex: 1;
}

.emoji-input {
  width: 9rem;
}

.phrases {
  list-style: none;
  padding: 0;
  margin: 0;
}

.phrases li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--border);
}
</style>
