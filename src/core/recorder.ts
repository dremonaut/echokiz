import workletUrl from './recorder-worklet.ts?worker&url'
import { resample } from './resample'
import { TARGET_SAMPLE_RATE } from './wav'

type WorkletMessage = { type: 'chunk'; samples: Float32Array } | { type: 'done' }

export interface RecordingResult {
  /** Mono samples at {@link TARGET_SAMPLE_RATE}. */
  samples: Float32Array
  sampleRate: number
  /** Sample rate of the device before resampling (stored for documentation). */
  deviceSampleRate: number
}

/**
 * Microphone recorder producing raw PCM via an AudioWorklet.
 * `open()` must be called from a user gesture (tap/click), especially on iOS.
 * The microphone stays open until `close()` is called; callers close it after each take so playback is not
 * degraded by the device's recording audio mode.
 */
export class Recorder {
  private context?: AudioContext
  private stream?: MediaStream
  private source?: MediaStreamAudioSourceNode
  private node?: AudioWorkletNode
  private chunks: Float32Array[] = []
  private onDone?: () => void
  analyser?: AnalyserNode

  get isOpen(): boolean {
    return !!this.node
  }

  async open(): Promise<void> {
    if (this.node) {
      await this.context?.resume()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Mikrofonzugriff wird nicht unterstützt. Bitte die App über HTTPS öffnen.')
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Disable processing: it can distort atypical speech and would differ from later inference input.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    this.context = new AudioContext()
    await this.context.audioWorklet.addModule(workletUrl)
    await this.context.resume()

    this.source = this.context.createMediaStreamSource(this.stream)
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    this.node = new AudioWorkletNode(this.context, 'echokiz-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
      channelCountMode: 'explicit',
    })
    this.node.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      if (event.data.type === 'chunk') this.chunks.push(event.data.samples)
      else this.onDone?.()
    }
    this.source.connect(this.analyser)
    this.source.connect(this.node)
  }

  async start(): Promise<void> {
    await this.open()
    this.chunks = []
    this.node!.port.postMessage('start')
  }

  async stop(): Promise<RecordingResult> {
    if (!this.node || !this.context) throw new Error('Aufnahme wurde nicht gestartet')
    await new Promise<void>((resolve) => {
      this.onDone = resolve
      this.node!.port.postMessage('stop')
    })
    this.onDone = undefined

    const length = this.chunks.reduce((n, c) => n + c.length, 0)
    const raw = new Float32Array(length)
    let offset = 0
    for (const chunk of this.chunks) {
      raw.set(chunk, offset)
      offset += chunk.length
    }
    this.chunks = []

    const deviceSampleRate = this.context.sampleRate
    return {
      samples: resample(raw, deviceSampleRate, TARGET_SAMPLE_RATE),
      sampleRate: TARGET_SAMPLE_RATE,
      deviceSampleRate,
    }
  }

  async close(): Promise<void> {
    this.source?.disconnect()
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    await this.context?.close()
    this.context = this.stream = this.source = this.node = this.analyser = undefined
    this.chunks = []
  }
}
