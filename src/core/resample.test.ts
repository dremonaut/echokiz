import { describe, expect, it } from 'vitest'
import { resample } from './resample'

function sine(freq: number, rate: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(rate * seconds))
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / rate)
  return out
}

function rms(x: Float32Array, skip = 0): number {
  let s = 0
  for (let i = skip; i < x.length - skip; i++) s += x[i] * x[i]
  return Math.sqrt(s / (x.length - 2 * skip))
}

describe('resample', () => {
  it('returns a copy when rates match', () => {
    const input = new Float32Array([1, 2, 3])
    const out = resample(input, 16000, 16000)
    expect(Array.from(out)).toEqual([1, 2, 3])
    expect(out).not.toBe(input)
  })

  it.each([48000, 44100])('downsamples %i Hz to 16 kHz with correct length', (rate) => {
    const out = resample(sine(440, rate, 1), rate, 16000)
    expect(out.length).toBe(16000)
  })

  it('preserves in-band signals', () => {
    const out = resample(sine(1000, 48000, 0.5), 48000, 16000)
    // RMS of a unit sine is 1/sqrt(2); ignore edges where the kernel is truncated.
    expect(rms(out, 200)).toBeCloseTo(Math.SQRT1_2, 1)
  })

  it('suppresses frequencies above the new Nyquist limit (anti-aliasing)', () => {
    const out = resample(sine(12000, 48000, 0.5), 48000, 16000)
    expect(rms(out, 200)).toBeLessThan(0.05)
  })
})
