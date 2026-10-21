import { onBeforeUnmount, ref } from 'vue'
import { useAppStore } from '../stores/app'

/** Plays stored recordings; only one at a time. */
export function usePlayback() {
  const app = useAppStore()
  const playingId = ref<number>()
  let audio: HTMLAudioElement | undefined
  let url: string | undefined

  function stop() {
    audio?.pause()
    if (url) URL.revokeObjectURL(url)
    audio = url = undefined
    playingId.value = undefined
  }

  async function play(id: number) {
    const wasPlaying = playingId.value === id
    stop()
    if (wasPlaying) return
    const wav = await app.getWav(id)
    if (!wav) return
    url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
    audio = new Audio(url)
    audio.onended = stop
    playingId.value = id
    await audio.play()
  }

  onBeforeUnmount(stop)
  return { playingId, play, stop }
}
