<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import WaveformCanvas from '../components/WaveformCanvas.vue'
import { CATEGORIES } from '../core/catalog'
import { keepScreenAwake } from '../core/device'
import { neighborPhrase, pickNextPhrase } from '../core/priority'
import { analyzeQuality, QUALITY_MESSAGES, trimSilence, type QualityReport } from '../core/quality'
import { Recorder } from '../core/recorder'
import type { Phrase } from '../core/types'
import { encodeWav } from '../core/wav'
import { usePlayback } from '../composables/usePlayback'
import { REPETITIONS_PER_PHRASE, useAppStore } from '../stores/app'

type Status = 'idle' | 'recording' | 'processing' | 'review'
type OrderMode = 'smart' | 'catalog'

const ORDER_KEY = 'echokiz.order'
const MAX_HISTORY = 50

const app = useAppStore()
const { playingId, play, stop: stopPlayback } = usePlayback()

const recorder = new Recorder()
const analyser = shallowRef<AnalyserNode>()
const status = ref<Status>('idle')
const error = ref<string>()
const category = ref<string>('Alle')
// The current phrase is tracked by ID (not list position) so it never jumps when counts change.
const currentId = ref<string>()
const order = ref<OrderMode>(localStorage.getItem(ORDER_KEY) === 'catalog' ? 'catalog' : 'smart')
const history: string[] = []
const stars = ref(0)
const celebrate = ref(false)
const lastId = ref<number>()
const lastQuality = ref<QualityReport>()
const notes = ref('')
// Text that was actually said; starts as the phrase text and is stored as `targetText` (training label).
const spokenText = ref('')

let releaseWakeLock: (() => void) | undefined

const categories = computed(() => {
  const custom = app.phrases.map((p) => p.category).filter((c) => !(CATEGORIES as readonly string[]).includes(c))
  return ['Alle', ...CATEGORIES, ...new Set(custom)]
})
const phrases = computed(() =>
  category.value === 'Alle' ? app.phrases : app.phrases.filter((p) => p.category === category.value),
)
const phrase = computed(() => phrases.value.find((p) => p.id === currentId.value))
const count = computed(() => (phrase.value ? (app.countsByPhrase.get(phrase.value.id) ?? 0) : 0))

function selectInitialPhrase() {
  history.length = 0
  const first = order.value === 'smart' ? pickNextPhrase(phrases.value, app.countsByPhrase) : phrases.value[0]
  currentId.value = first?.id
}

watch(
  [category, () => app.currentSpeakerId],
  () => {
    selectInitialPhrase()
    resetReview()
  },
  { immediate: true },
)

// A custom phrase may have been removed while it was selected.
watch(phrases, () => {
  if (!phrase.value) selectInitialPhrase()
})

watch(order, (mode) => localStorage.setItem(ORDER_KEY, mode))

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
  notes.value = ''
  spokenText.value = ''
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
  if (!phrase.value) return
  status.value = 'processing'
  try {
    const result = await recorder.stop()
    const samples = trimSilence(result.samples, result.sampleRate)
    const quality = analyzeQuality(samples, result.sampleRate)
    const session = await app.ensureSession()
    // Saved immediately so a crash or reload cannot lose the take; "Verwerfen" deletes it again.
    lastId.value = await app.saveRecording({
      speakerId: session.speakerId,
      sessionId: session.id,
      phraseId: phrase.value.id,
      targetText: phrase.value.text,
      category: phrase.value.category,
      duration: quality.duration,
      sampleRate: result.sampleRate,
      timestamp: new Date().toISOString(),
      device: `${navigator.userAgent} | ${result.deviceSampleRate} Hz`,
      wav: encodeWav(samples, result.sampleRate),
    })
    lastQuality.value = quality
    spokenText.value = phrase.value.text
    status.value = 'review'
    if (quality.ok) {
      stars.value++
      celebrate.value = true
      setTimeout(() => (celebrate.value = false), 1200)
    }
  } catch (e) {
    status.value = 'idle'
    error.value = (e as Error).message
  }
}

async function discard() {
  if (lastId.value === undefined) return
  await app.deleteRecording(lastId.value)
  if (lastQuality.value?.ok) stars.value = Math.max(0, stars.value - 1)
  resetReview()
}

async function saveNotes() {
  if (lastId.value !== undefined) await app.updateRecording(lastId.value, { notes: notes.value.trim() })
}

async function saveSpokenText() {
  if (lastId.value === undefined || !phrase.value) return
  // An empty field falls back to the catalog text so a recording never ends up without a label.
  spokenText.value = spokenText.value.trim() || phrase.value.text
  await app.updateRecording(lastId.value, { targetText: spokenText.value })
}

function go(delta: 1 | -1) {
  const list = phrases.value
  const from = currentId.value
  if (!from || !list.length) return

  let target: Phrase | undefined
  if (delta === 1) {
    target = order.value === 'smart' ? pickNextPhrase(list, app.countsByPhrase, from) : neighborPhrase(list, from, 1)
    if (order.value === 'smart') history.push(from)
    if (history.length > MAX_HISTORY) history.shift()
  } else if (order.value === 'smart') {
    // Step back through the phrases actually visited, skipping ones that no longer exist.
    while (history.length && !target) target = list.find((p) => p.id === history.pop())
    target ??= neighborPhrase(list, from, -1)
  } else {
    target = neighborPhrase(list, from, -1)
  }
  currentId.value = target?.id
  resetReview()
}
</script>

<template>
  <section v-if="!app.currentSpeakerId" class="card">
    <h1>Aufnahme</h1>
    <p>Bitte zuerst einen Sprecher auswählen oder anlegen.</p>
    <RouterLink to="/" class="button">Zu den Sprechern</RouterLink>
  </section>

  <section v-else class="record">
    <div class="toolbar row">
      <select v-model="category" aria-label="Kategorie">
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="order" aria-label="Reihenfolge" :disabled="status === 'recording'">
        <option value="smart">Wenig aufgenommen zuerst</option>
        <option value="catalog">Reihenfolge im Katalog</option>
      </select>
      <span class="stars" :class="{ pop: celebrate }" aria-label="Sterne">⭐ {{ stars }}</span>
    </div>

    <p v-if="error" class="alert alert-error">{{ error }}</p>

    <div v-if="phrase" class="phrase-card card">
      <button class="secondary nav" :disabled="status === 'recording'" aria-label="Vorheriges Wort" @click="go(-1)">
        ◀
      </button>
      <div class="phrase">
        <div class="emoji" aria-hidden="true">{{ phrase.emoji ?? '💬' }}</div>
        <div class="text">{{ phrase.text }}</div>
        <div class="progress">
          <span
            v-for="n in REPETITIONS_PER_PHRASE"
            :key="n"
            class="dot"
            :class="{ filled: n <= count }"
            aria-hidden="true"
          />
          <span class="muted">{{ count }} / {{ REPETITIONS_PER_PHRASE }}</span>
        </div>
      </div>
      <button class="secondary nav" :disabled="status === 'recording'" aria-label="Nächstes Wort" @click="go(1)">
        ▶
      </button>
    </div>

    <WaveformCanvas :analyser="analyser" :active="status === 'recording'" />

    <div class="record-area">
      <button
        class="record-button"
        :class="{ recording: status === 'recording' }"
        :disabled="status === 'processing' || !phrase"
        @click="toggleRecording"
      >
        <span v-if="status === 'recording'">⏹ Stopp</span>
        <span v-else-if="status === 'processing'">…</span>
        <span v-else>🎙️ Aufnehmen</span>
      </button>
      <div v-if="celebrate" class="celebrate" aria-live="polite">🎉 Super!</div>
    </div>

    <div v-if="status === 'review' && lastId !== undefined" class="card review">
      <h2>Für Erwachsene: Aufnahme prüfen</h2>
      <p v-if="lastQuality?.ok" class="alert alert-ok">
        Gespeichert ({{ lastQuality.duration.toFixed(1) }} s).
      </p>
      <div v-else-if="lastQuality" class="alert alert-warn">
        <div v-for="issue in lastQuality.issues" :key="issue">{{ QUALITY_MESSAGES[issue] }}</div>
        Die Aufnahme wurde trotzdem gespeichert. Ggf. verwerfen und wiederholen.
      </div>
      <label>
        Gesagter Text (Training lernt genau diesen Text)
        <input v-model="spokenText" type="text" autocomplete="off" @change="saveSpokenText" />
        <span class="hint muted">
          Nur ändern, wenn das Kind etwas anderes gesagt hat, z. B. „Wasser haben“ statt des ganzen Satzes.
        </span>
      </label>
      <label>
        Notiz (optional, z. B. Aussprache oder was gemeint war)
        <input v-model="notes" type="text" autocomplete="off" @change="saveNotes" />
      </label>
      <div class="row">
        <button class="secondary" @click="play(lastId)">{{ playingId === lastId ? '⏸ Stopp' : '▶ Anhören' }}</button>
        <button class="danger" @click="discard">🗑 Verwerfen</button>
        <button @click="go(1)">Weiter ➜</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  justify-content: space-between;
  margin-bottom: 1rem;
}

.toolbar select {
  width: auto;
}

.stars {
  font-size: 1.5rem;
  font-weight: 700;
  transition: transform 0.2s;
}

.stars.pop {
  transform: scale(1.4);
}

.phrase-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.phrase {
  text-align: center;
  flex: 1;
}

.emoji {
  font-size: 5rem;
  line-height: 1.1;
}

.text {
  font-size: 2.2rem;
  font-weight: 700;
}

.nav {
  font-size: 1.5rem;
  padding: 0.6rem 0.9rem;
}

.progress {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--amber);
}

.dot.filled {
  background: var(--amber);
}

.record-area {
  position: relative;
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

.celebrate {
  position: absolute;
  top: -2.5rem;
  font-size: 2rem;
  font-weight: 700;
  animation: rise 1.2s ease-out forwards;
  pointer-events: none;
}

@keyframes rise {
  from {
    opacity: 1;
    transform: translateY(0) scale(0.8);
  }
  to {
    opacity: 0;
    transform: translateY(-40px) scale(1.3);
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
