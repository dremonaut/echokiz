import { describe, expect, it } from 'vitest'
import { analyzeQuality, trimSilence } from './quality'

const RATE = 16000

function signal(parts: { seconds: number; amplitude: number }[]): Float32Array {
  const total = parts.reduce((n, p) => n + Math.round(p.seconds * RATE), 0)
  const out = new Float32Array(total)
  let offset = 0
  for (const p of parts) {
    const n = Math.round(p.seconds * RATE)
    for (let i = 0; i < n; i++) out[offset + i] = p.amplitude * Math.sin((2 * Math.PI * 300 * i) / RATE)
    offset += n
  }
  return out
}

describe('analyzeQuality', () => {
  it('accepts a normal recording', () => {
    const report = analyzeQuality(signal([{ seconds: 1, amplitude: 0.5 }]), RATE)
    expect(report.ok).toBe(true)
    expect(report.duration).toBeCloseTo(1)
    expect(report.peak).toBeCloseTo(0.5, 2)
  })

  it('flags short, quiet and clipped recordings', () => {
    expect(analyzeQuality(signal([{ seconds: 0.1, amplitude: 0.5 }]), RATE).issues).toContain('zu_kurz')
    expect(analyzeQuality(signal([{ seconds: 1, amplitude: 0.01 }]), RATE).issues).toContain('zu_leise')
    expect(analyzeQuality(signal([{ seconds: 1, amplitude: 1.5 }]), RATE).issues).toContain('uebersteuert')
  })

  it('handles empty input', () => {
    const report = analyzeQuality(new Float32Array(0), RATE)
    expect(report.ok).toBe(false)
    expect(report.rms).toBe(0)
  })
})

describe('trimSilence', () => {
  it('trims leading and trailing silence but keeps padding', () => {
    const input = signal([
      { seconds: 1, amplitude: 0 },
      { seconds: 0.5, amplitude: 0.5 },
      { seconds: 1, amplitude: 0 },
    ])
    const out = trimSilence(input, RATE, { padMs: 300 })
    // 0.5 s speech + 2 × 0.3 s padding (± one 20 ms frame)
    expect(out.length / RATE).toBeGreaterThan(1.05)
    expect(out.length / RATE).toBeLessThan(1.15)
  })

  it('returns input unchanged when there is no speech', () => {
    const input = new Float32Array(RATE)
    expect(trimSilence(input, RATE)).toBe(input)
  })
})
