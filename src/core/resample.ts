/**
 * Band-limited resampling with a Hann-windowed sinc kernel.
 * Implemented in plain TypeScript so results are identical in every browser
 * (OfflineAudioContext support for low sample rates varies, e.g. on Safari).
 */
export function resample(
  input: Float32Array,
  inRate: number,
  outRate: number,
  halfTaps = 16,
): Float32Array {
  if (inRate === outRate) return input.slice()

  const ratio = inRate / outRate
  const outLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outLength)
  // Cutoff relative to the input Nyquist frequency; < 1 when downsampling (anti-aliasing).
  const cutoff = Math.min(1, outRate / inRate)
  const halfWidth = halfTaps / cutoff

  for (let i = 0; i < outLength; i++) {
    const t = i * ratio
    const start = Math.max(0, Math.ceil(t - halfWidth))
    const end = Math.min(input.length - 1, Math.floor(t + halfWidth))
    let sum = 0
    let weightSum = 0
    for (let k = start; k <= end; k++) {
      const d = t - k
      const w = cutoff * sinc(cutoff * d) * hann(d / halfWidth)
      sum += input[k] * w
      weightSum += w
    }
    output[i] = weightSum !== 0 ? sum / weightSum : 0
  }
  return output
}

function sinc(x: number): number {
  if (x === 0) return 1
  const px = Math.PI * x
  return Math.sin(px) / px
}

function hann(u: number): number {
  return Math.abs(u) >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * u))
}
