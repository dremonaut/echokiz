<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { keepScreenAwake } from '../core/device'
import {
  loadInferenceSettings,
  PredictionError,
  requestPrediction,
  saveInferenceSettings,
  type Prediction,
} from '../core/inference'
import { resolveLabel, TEXT_SOURCE_LABELS } from '../core/labeling'
import { analyzeQuality, QUALITY_MESSAGES, trimSilence, type QualityReport } from '../core/quality'
import { Recorder } from '../core/recorder'
import { FREE_CATEGORY, FREE_PHRASE_ID, type TextSource } from '../core/types'
import { encodeWav } from '../core/wav'
import { usePlayback } from '../composables/usePlayback'
import { useAppStore } from '../stores/app'

type Status = 'idle' | 'recording' | 'processing' | 'review'

const app = useAppStore()
const { playingId, play, stop: stopPlayback } = usePlayback()

const recorder = new Recorder()
const analyser = shallowRef<AnalyserNode>()
const status = ref<Status>('idle')
const error = ref<string>()
const lastId = ref<number>()
const lastQuality = ref<QualityReport>()

const text = ref('')
const savedSource = ref<TextSource>()
const prediction = ref<Prediction>()
const predictedText = ref<string>()
const predicting = ref(false)
const predictionError = ref<string>()

const settings = ref(loadInferenceSettings())
const form = ref({ ...settings.value })
const settingsError = ref<string>()
const settingsSaved = ref(false)
const configured = computed(() => !!settings.value.url && !!settings.value.token)

let releaseWakeLock: (() => void) | undefined

onMounted(async () => {
  releaseWakeLock = await keepScreenAwake()
})

onBeforeUnmount(() => {
  releaseWakeLock?.()
  void recorder.close()
})

function resetReview() {
  stopPlayback()
  status.value = 'idle'
  lastId.value = undefined
  lastQuality.value = undefined
  text.value = ''
  savedSource.value = undefined
  prediction.value = undefined
  predictedText.value = undefined
  predictionError.value = undefined
}

async function toggleRecording() {
  error.value = undefined
  if (status.value === 'recording') return finishRecording()
  try {
    resetReview()
    await recorder.start()
    analyser.value = recorder.analyser
    status.value = 'recording'
  } catch (e) {
    status.value = 'idle'
    const err = e as DOMException
    error.value =
      err.name === 'NotAllowedError'
        ? 'Der Mikrofonzugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben.'
        : err.message
  }
}

async function finishRecording() {
  status.value = 'processing'
  try {
    const result = await recorder.stop()
    // An open microphone switches mobile devices to a call-like audio mode that distorts playback.
    await recorder.close()
    const samples = trimSilence(result.samples, result.sampleRate)
    const quality = analyzeQuality(samples, result.sampleRate)
    const session = await app.ensureSession()
    // Saved immediately without text, so a crash or reload cannot lose the take.
    lastId.value = await app.saveRecording({
      speakerId: session.speakerId,
      sessionId: session.id,
      phraseId: FREE_PHRASE_ID,
      targetText: '',
      category: FREE_CATEGORY,
      duration: quality.duration,
      sampleRate: result.sampleRate,
      timestamp: new Date().toISOString(),
      device: `${navigator.userAgent} | ${result.deviceSampleRate} Hz`,
      wav: encodeWav(samples, result.sampleRate),
    })
    lastQuality.value = quality
    status.value = 'review'
  } catch (e) {
    status.value = 'idle'
    error.value = (e as Error).message
  }
}

async function discard() {
  if (lastId.value === undefined) return
  await app.deleteRecording(lastId.value)
  resetReview()
}

async function predict() {
  const id = lastId.value
  if (id === undefined || predicting.value) return
  predicting.value = true
  predictionError.value = undefined
  try {
    const wav = await app.getWav(id)
    if (!wav) throw new Error('Die Aufnahme wurde nicht gefunden.')
    const result = await requestPrediction(wav, settings.value)
    if (lastId.value !== id) return
    prediction.value = result
    predictedText.value = result.text
    text.value = result.text
    await app.updateRecording(id, { predictedText: result.text, modelVersion: result.modelVersion ?? '' })
  } catch (e) {
    if (lastId.value !== id) return
    predictionError.value = e instanceof PredictionError ? e.message : (e as Error).message
  } finally {
    predicting.value = false
  }
}

async function saveText() {
  if (lastId.value === undefined) return
  const label = resolveLabel(text.value, predictedText.value)
  text.value = label.targetText
  await app.updateRecording(lastId.value, { targetText: label.targetText, textSource: label.textSource })
  savedSource.value = label.textSource
}

function saveSettings() {
  settingsError.value = undefined
  settingsSaved.value = false
  try {
    settings.value = saveInferenceSettings(form.value)
    form.value = { ...settings.value }
    settingsSaved.value = true
  } catch (e) {
    settingsError.value = (e as Error).message
  }
}

function seconds(ms: number): string {
  return (ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })
}
</script>

<template>
  <section v-if="!app.currentSpeakerId" class="card">
    <h1>Frei sprechen</h1>
    <p>Bitte zuerst einen Sprecher auswählen oder anlegen.</p>
    <RouterLink to="/" class="button">Zu den Sprechern</RouterLink>
  </section>

  <section v-else class="free">
    <h1>Frei sprechen</h1>
    <p class="muted">
      Das Kind spricht ohne Vorgabe. Danach kann der Text vom Modell vorgeschlagen werden; der Erwachsene bestätigt ihn
      oder tippt, was das Kind gesagt hat.
    </p>

    <details class="card settings" :open="!configured">
      <summary>Vorhersage-Service {{ configured ? '(eingerichtet)' : '(nicht eingerichtet)' }}</summary>
      <form @submit.prevent="saveSettings">
        <label>
          Adresse (nur https://)
          <input
            v-model="form.url"
            type="url"
            placeholder="https://mein-pc.tailnet.ts.net"
            autocomplete="off"
            @input="settingsSaved = false"
          />
        </label>
        <label>
          Token
          <input v-model="form.token" type="password" autocomplete="off" @input="settingsSaved = false" />
        </label>
        <span class="hint muted">
          Adresse und Token bleiben nur auf diesem Gerät und sind nie Teil des Exports. Das Audio wird nur gesendet, wenn
          „Erkennen lassen“ gedrückt wird, und nur an diese Adresse.
        </span>
        <p v-if="settingsError" class="alert alert-error">{{ settingsError }}</p>
        <p v-if="settingsSaved" class="alert alert-ok">Gespeichert.</p>
        <button type="submit">Speichern</button>
      </form>
    </details>

    <p v-if="error" class="alert alert-error">{{ error }}</p>

    <WaveformCanvas :analyser="analyser" :active="status === 'recording'" />

    <div class="record-area">
      <button
        class="record-button"
        :class="{ recording: status === 'recording' }"
        :disabled="status === 'processing'"
        @click="toggleRecording"
      >
        <span v-if="status === 'recording'">⏹ Stopp</span>
        <span v-else-if="status === 'processing'">…</span>
        <span v-else>🎙️ Aufnehmen</span>
      </button>
    </div>

    <div v-if="status === 'review' && lastId !== undefined" class="card review">
      <h2>Für Erwachsene: Aufnahme prüfen</h2>
      <p v-if="lastQuality?.ok" class="alert alert-ok">Gespeichert ({{ lastQuality.duration.toFixed(1) }} s).</p>
      <div v-else-if="lastQuality" class="alert alert-warn">
        <div v-for="issue in lastQuality.issues" :key="issue">{{ QUALITY_MESSAGES[issue] }}</div>
        Die Aufnahme wurde trotzdem gespeichert. Ggf. verwerfen und wiederholen.
      </div>

      <div class="row">
        <button class="secondary" @click="play(lastId)">{{ playingId === lastId ? '⏸ Stopp' : '▶ Anhören' }}</button>
        <button :disabled="predicting" @click="predict">
          {{ predicting ? 'Erkenne …' : '🤖 Erkennen lassen' }}
        </button>
      </div>

      <p v-if="!configured && !prediction" class="hint muted">
        Kein Service eingerichtet – der Text kann auch von Hand eingegeben werden.
      </p>
      <p v-if="predictionError" class="alert alert-error">
        {{ predictionError }} Der Text kann von Hand eingegeben werden.
      </p>
      <div v-if="prediction" class="alert alert-ok">
        <div>
          Vorschlag: <strong>{{ prediction.text || '(kein Text erkannt)' }}</strong>
        </div>
        <div class="muted">
          Dauer {{ seconds(prediction.roundTripMs) }} s<span v-if="prediction.modelVersion">
            · Modell {{ prediction.modelVersion }}</span
          >
        </div>
        <div v-if="prediction.truncated">Die Erkennung wurde gekürzt; der Text ist evtl. unvollständig.</div>
      </div>

      <label>
        Gesagter Text (das Training lernt genau diesen Text)
        <input v-model="text" type="text" autocomplete="off" @keyup.enter="saveText" />
        <span class="hint muted">
          Mit dem Vorschlag übereinstimmend = bestätigt. Sonst gilt der eingegebene Text als Korrektur.
        </span>
      </label>
      <p v-if="savedSource" class="alert alert-ok">Text gespeichert ({{ TEXT_SOURCE_LABELS[savedSource] }}).</p>
      <p v-else-if="!text.trim()" class="hint muted">
        Ohne Text bleibt die Aufnahme unter „Daten“ als „ohne Text“ erhalten und wird nicht exportiert.
      </p>

      <div class="row">
        <button @click="saveText">✓ Text speichern</button>
        <button class="danger" @click="discard">🗑 Verwerfen</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings summary {
  cursor: pointer;
  font-weight: 600;
}

.record-area {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}

.record-button {
  font-size: 1.6rem;
  padding: 1.4rem 2.6rem;
  min-width: 260px;
  justify-content: center;
  box-shadow: 0 6px 18px rgb(15 139 141 / 0.35);
}

.record-button.recording {
  background: var(--red);
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(209 73 91 / 0.5);
  }
  50% {
    box-shadow: 0 0 0 16px rgb(209 73 91 / 0);
  }
}

.review h2 {
  font-size: 1.1rem;
}

.hint {
  display: block;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
</style>
