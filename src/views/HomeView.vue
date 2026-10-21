<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatBytes, getStorageStatus, requestPersistentStorage, type StorageStatus } from '../core/device'
import { useAppStore } from '../stores/app'

const app = useAppStore()
const router = useRouter()

const newId = ref('')
const consent = ref(false)
const formError = ref<string>()
const storageStatus = ref<StorageStatus>()

const suggestedId = computed(() => {
  let n = app.speakers.length + 1
  const ids = new Set(app.speakers.map((s) => s.id))
  while (ids.has(`Kind_${String(n).padStart(2, '0')}`)) n++
  return `Kind_${String(n).padStart(2, '0')}`
})

onMounted(async () => {
  storageStatus.value = await getStorageStatus()
})

async function addSpeaker() {
  formError.value = undefined
  try {
    await app.addSpeaker(newId.value || suggestedId.value, consent.value)
    newId.value = ''
    consent.value = false
    await requestPersistentStorage()
    storageStatus.value = await getStorageStatus()
  } catch (e) {
    formError.value = (e as Error).message
  }
}

async function startRecording(id: string) {
  await app.selectSpeaker(id)
  await router.push('/aufnahme')
}
</script>

<template>
  <section>
    <h1>Sprecher</h1>
    <p class="muted">
      Wähle ein Kind aus oder lege einen neuen, anonymen Sprecher an. Alle Aufnahmen bleiben lokal auf diesem Gerät.
    </p>

    <div v-if="app.speakers.length" class="card">
      <h2>Vorhandene Sprecher</h2>
      <ul class="speaker-list">
        <li v-for="speaker in app.speakers" :key="speaker.id" :class="{ active: speaker.id === app.currentSpeakerId }">
          <div>
            <strong>{{ speaker.id }}</strong>
            <div class="muted small">
              Einwilligung: {{ new Date(speaker.consent.timestamp).toLocaleDateString('de-DE') }}
            </div>
          </div>
          <div class="row">
            <button class="secondary small" @click="app.selectSpeaker(speaker.id)">Auswählen</button>
            <button class="small" @click="startRecording(speaker.id)">🎙️ Aufnehmen</button>
          </div>
        </li>
      </ul>
    </div>

    <form class="card" @submit.prevent="addSpeaker">
      <h2>Neuer Sprecher</h2>
      <label>
        Sprecher-ID (anonym, keine echten Namen)
        <input v-model="newId" type="text" :placeholder="suggestedId" autocomplete="off" />
      </label>
      <label class="inline">
        <input v-model="consent" type="checkbox" />
        <span>
          Die Erziehungsberechtigten haben eingewilligt, dass Sprachaufnahmen des Kindes erstellt und zur Anpassung
          eines Spracherkennungsmodells verwendet werden. Die Einwilligung kann jederzeit widerrufen werden; die Daten
          lassen sich unter „Daten“ vollständig löschen.
        </span>
      </label>
      <p v-if="formError" class="alert alert-error">{{ formError }}</p>
      <button type="submit" :disabled="!consent">Sprecher anlegen</button>
    </form>

    <div v-if="storageStatus" class="card">
      <h2>Speicher</h2>
      <p>
        Belegt: {{ formatBytes(storageStatus.usage) }}
        <span v-if="storageStatus.quota" class="muted">von ca. {{ formatBytes(storageStatus.quota) }}</span>
      </p>
      <p v-if="storageStatus.persisted" class="alert alert-ok">Dauerhafter Speicher ist aktiv.</p>
      <p v-else class="alert alert-warn">
        Der Browser darf die Daten bei Speicherknappheit löschen. Bitte regelmäßig unter „Daten“ exportieren. Tipp: Die
        App zum Home-Bildschirm hinzufügen.
      </p>
    </div>
  </section>
</template>

<style scoped>
.speaker-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.speaker-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--border);
  border-radius: 10px;
}

.speaker-list li.active {
  background: #e6f4f4;
}

.small {
  font-size: 0.85rem;
}
</style>
