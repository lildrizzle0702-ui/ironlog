export function vibrate(pattern: number | number[] = 200) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function beep(freq = 880, dur = 0.15, when = 0) {
  const c = audioCtx()
  if (!c) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export function timerEndAlert() {
  vibrate([200, 100, 200, 100, 400])
  beep(880, 0.12, 0)
  beep(880, 0.12, 0.18)
  beep(1320, 0.3, 0.36)
}
