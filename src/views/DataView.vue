<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatBytes, downloadBlob, getStorageStatus, requestPersistentStorage, type StorageStatus } from '../core/device'
import { buildDatasetZip, exportableRecordings } from '../core/export'
import { isUnlabeled, resolveLabel, textSourceOf, TEXT_SOURCE_LABELS } from '../core/labeling'
import type { Recording } from '../core/types'
import { usePlayback } from '../composables/usePlayback'
import { useAppStore } from '../stores/app'

const LAST_EXPORT_KEY = 'echokiz.lastExport'
const REMINDER_DAYS = 7

const app = useAppStore()
const { playingId, play } = usePlayback()

const exporting = ref(false)
const message = ref<string>()
const error = ref<string>()
const storageStatus = ref<StorageStatus>()
const lastExport = ref(localStorage.getItem(LAST_EXPORT_KEY))
const deleteConfirmation = ref('')
const pendingDeleteId = ref<number>()
const drafts = ref<Record<number, string>>({})

const exportOverdue = computed(() => {
  if (!app.recordings.length) return false
  if (!lastExport.value) return true
  return Date.now() - Date.parse(lastExport.value) > REMINDER_DAYS * 24 * 3600 * 1000
})
const recordings = computed(() => [...app.recordings].reverse())

onMounted(async () => {
  storageStatus.value = await getStorageStatus()
})

async function exportData(speakerId?: string) {
  exporting.value = true
  error.value = message.value = undefined
  try {
    const db = app.db()
    const [allRecordings, speakers, sessions] = await Promise.all([
      db.listRecordings(speakerId ? { speakerId } : {}),
      db.listSpeakers(),
      db.listSessions(speakerId),
    ])
    const exportable = exportableRecordings(allRecordings as Recording[])
    const skipped = allRecordings.length - exportable.length
    if (!exportable.length) {
      message.value = allRecordings.length
        ? `Keine exportierbaren Aufnahmen: ${skipped} ohne Text. Bitte unten einen Text ergänzen oder die Aufnahmen löschen.`
        : 'Keine Aufnahmen vorhanden.'
      return
    }
    const zip = buildDatasetZip({
      recordings: exportable,
      speakers: speakerId ? speakers.filter((s) => s.id === speakerId) : speakers,
      sessions,
    })
    const date = new Date().toISOString().slice(0, 10)
    downloadBlob(zip as Uint8Array<ArrayBuffer>, `echokiz_${speakerId ?? 'alle'}_${date}.zip`, 'application/zip')
    lastExport.value = new Date().toISOString()
    localStorage.setItem(LAST_EXPORT_KEY, lastExport.value)
    message.value = `${exportable.length} Aufnahmen exportiert${skipped ? `, ${skipped} ohne Text übersprungen` : ''}.`
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    exporting.value = false
  }
}

async function persist() {
  await requestPersistentStorage()
  storageStatus.value = await getStorageStatus()
}

async function deleteSpeaker() {
  const id = app.currentSpeakerId
  if (!id || deleteConfirmation.value.trim() !== id) return
  await app.deleteSpeaker(id)
  deleteConfirmation.value = ''
  message.value = `Alle Daten von ${id} wurden gelöscht.`
  storageStatus.value = await getStorageStatus()
}

async function addText(r: Omit<Recording, 'wav'>) {
  const label = resolveLabel(drafts.value[r.id!] ?? '', r.predictedText)
  if (!label.targetText) return
  await app.updateRecording(r.id!, { targetText: label.targetText, textSource: label.textSource })
}

async function remove(id: number) {
  if (pendingDeleteId.value !== id) {
    pendingDeleteId.value = id
    return
  }
  pendingDeleteId.value = undefined
  await app.deleteRecording(id)
}
</script>

<template>
  <section>
    <h1>Daten & Export</h1>

    <p v-if="exportOverdue" class="alert alert-warn">
      {{ lastExport ? `Letzter Export: ${new Date(lastExport).toLocaleDateString('de-DE')}.` : 'Noch kein Export.' }}
      Bitte regelmäßig exportieren – Browserdaten können verloren gehen.
    </p>
    <p v-if="message" class="alert alert-ok">{{ message }}</p>
    <p v-if="error" class="alert alert-error">{{ error }}</p>

    <p v-if="app.unlabeledCount" class="alert alert-warn">
      {{ app.unlabeledCount }} Aufnahme(n) ohne Text werden nicht exportiert. Unten einen Text ergänzen oder löschen.
    </p>

    <div class="card">
      <h2>Export (ZIP)</h2>
      <p class="muted">
        Enthält <code>metadata.csv</code>, <code>audio/*.wav</code> (16 kHz, mono) und
        <code>echokiz-export.json</code> – direkt ladbar mit Hugging Face <code>datasets</code> (<code>audiofolder</code>).
      </p>
      <div class="row">
        <button :disabled="exporting || !app.currentSpeakerId" @click="exportData(app.currentSpeakerId)">
          ⬇ {{ app.currentSpeakerId ?? 'Sprecher' }} exportieren
        </button>
        <button class="secondary" :disabled="exporting" @click="exportData()">⬇ Alle Sprecher exportieren</button>
      </div>
    </div>

    <div v-if="storageStatus" class="card">
      <h2>Speicher</h2>
      <p>
        Belegt: {{ formatBytes(storageStatus.usage) }}
        <span v-if="storageStatus.quota" class="muted">von ca. {{ formatBytes(storageStatus.quota) }}</span>
      </p>
      <p v-if="storageStatus.persisted" class="alert alert-ok">Dauerhafter Speicher ist aktiv.</p>
      <div v-else class="row">
        <span class="muted">Dauerhafter Speicher ist nicht aktiv.</span>
        <button class="secondary small" @click="persist">Anfragen</button>
      </div>
    </div>

    <div v-if="app.currentSpeakerId" class="card">
      <h2>Aufnahmen von {{ app.currentSpeakerId }} ({{ app.recordings.length }})</h2>
      <p v-if="!app.recordings.length" class="muted">Noch keine Aufnahmen.</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Text</th>
              <th>Dauer</th>
              <th>Zeit</th>
              <th>Notiz</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in recordings" :key="r.id">
              <td>
                <template v-if="isUnlabeled(r)">
                  <span class="badge">ohne Text</span>
                  <form class="row add-text" @submit.prevent="addText(r)">
                    <input
                      v-model="drafts[r.id!]"
                      type="text"
                      autocomplete="off"
                      :placeholder="r.predictedText ? `Vorschlag: ${r.predictedText}` : 'Text eingeben'"
                      aria-label="Text ergänzen"
                    />
                    <button type="submit" class="small" :disabled="!(drafts[r.id!] ?? '').trim()">Speichern</button>
                  </form>
                </template>
                <template v-else>
                  {{ r.targetText }}
                  <span v-if="textSourceOf(r) !== 'prompted'" class="badge">{{ TEXT_SOURCE_LABELS[textSourceOf(r)] }}</span>
                </template>
              </td>
              <td>{{ r.duration.toFixed(1) }} s</td>
              <td>{{ new Date(r.timestamp).toLocaleString('de-DE') }}</td>
              <td class="muted">{{ r.notes }}</td>
              <td class="actions">
                <button class="secondary small" @click="play(r.id!)">{{ playingId === r.id ? '⏸' : '▶' }}</button>
                <button
                  class="small"
                  :class="pendingDeleteId === r.id ? 'danger' : 'secondary'"
                  :aria-label="pendingDeleteId === r.id ? 'Löschen bestätigen' : 'Löschen'"
                  @click="remove(r.id!)"
                >
                  {{ pendingDeleteId === r.id ? 'Wirklich löschen?' : '🗑' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="app.currentSpeakerId" class="card">
      <h2>Einwilligung widerrufen</h2>
      <p class="muted">
        Löscht den Sprecher mit allen Aufnahmen, Sessions und der Einwilligung unwiderruflich von diesem Gerät.
      </p>
      <form class="row" @submit.prevent="deleteSpeaker">
        <input
          v-model="deleteConfirmation"
          type="text"
          class="confirm-input"
          :placeholder="`Zur Bestätigung „${app.currentSpeakerId}“ eingeben`"
          :aria-label="`Zur Bestätigung ${app.currentSpeakerId} eingeben`"
          autocomplete="off"
        />
        <button type="submit" class="danger" :disabled="deleteConfirmation.trim() !== app.currentSpeakerId">
          Alle Daten von {{ app.currentSpeakerId }} löschen
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.actions {
  white-space: nowrap;
  text-align: right;
}

.confirm-input {
  flex: 1;
  min-width: 14rem;
}

.badge {
  display: inline-block;
  padding: 0.05rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--muted, inherit);
}

.add-text {
  margin-top: 0.35rem;
  flex-wrap: nowrap;
}
</style>
