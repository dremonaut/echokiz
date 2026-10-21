<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ analyser?: AnalyserNode; active: boolean }>()
const canvas = ref<HTMLCanvasElement>()
let frame = 0
let data: Float32Array<ArrayBuffer> | undefined

function draw() {
  frame = requestAnimationFrame(draw)
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return

  const { width, height } = el
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 3
  ctx.strokeStyle = props.active ? '#d1495b' : '#0f8b8d'
  ctx.beginPath()

  const analyser = props.analyser
  if (!analyser) {
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
  } else {
    if (!data || data.length !== analyser.fftSize) data = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(data)
    const step = width / data.length
    for (let i = 0; i < data.length; i++) {
      const y = height / 2 - data[i] * (height / 2) * 0.95
      if (i === 0) ctx.moveTo(0, y)
      else ctx.lineTo(i * step, y)
    }
  }
  ctx.stroke()
}

onMounted(() => {
  draw()
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <canvas ref="canvas" class="waveform" width="600" height="120" aria-label="Mikrofon-Wellenform" />
</template>

<style scoped>
.waveform {
  width: 100%;
  height: 120px;
  background: #f0f6f6;
  border-radius: 12px;
}
</style>
