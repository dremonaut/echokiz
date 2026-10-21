import { describe, expect, it } from 'vitest'
import { decodeWav, encodeWav } from './wav'

describe('encodeWav', () => {
  it('writes a valid 16-bit mono PCM header', () => {
    const buffer = encodeWav(new Float32Array(100), 16000)
    const view = new DataView(buffer)
    const ascii = (o: number) => String.fromCharCode(...new Uint8Array(buffer, o, 4))

    expect(buffer.byteLength).toBe(44 + 200)
    expect(ascii(0)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(36 + 200)
    expect(ascii(8)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(32000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(200)
  })

  it('round-trips samples and clamps out-of-range values', () => {
    const input = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2])
    const { samples, sampleRate } = decodeWav(encodeWav(input, 16000))
    expect(sampleRate).toBe(16000)
    const expected = [0, 0.5, -0.5, 1, -1, 1, -1]
    expected.forEach((v, i) => expect(samples[i]).toBeCloseTo(v, 3))
  })
})
