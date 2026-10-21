// Runs in the AudioWorkletGlobalScope (separate from the page).
// It buffers raw microphone samples and sends them to the main thread in chunks.

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  abstract process(inputs: Float32Array[][]): boolean
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void

const CHUNK_SIZE = 4096

class CaptureProcessor extends AudioWorkletProcessor {
  private capturing = false
  private buffer = new Float32Array(CHUNK_SIZE)
  private filled = 0

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
      if (event.data === 'start') {
        this.filled = 0
        this.capturing = true
      } else if (event.data === 'stop') {
        this.capturing = false
        this.flush()
        this.port.postMessage({ type: 'done' })
      }
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0]
    if (!this.capturing || !channel) return true
    let offset = 0
    while (offset < channel.length) {
      const n = Math.min(channel.length - offset, CHUNK_SIZE - this.filled)
      this.buffer.set(channel.subarray(offset, offset + n), this.filled)
      this.filled += n
      offset += n
      if (this.filled === CHUNK_SIZE) this.flush()
    }
    return true
  }

  private flush(): void {
    if (this.filled === 0) return
    const chunk = this.buffer.slice(0, this.filled)
    this.port.postMessage({ type: 'chunk', samples: chunk }, [chunk.buffer])
    this.filled = 0
  }
}

registerProcessor('echokiz-capture', CaptureProcessor)

export {}
