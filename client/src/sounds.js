let _menuSounds = true

// C-E-G major arpeggio chime for note/screen completion
export function playChime() {
  try {
    const ctx = ac()
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.08
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
      osc.start(start)
      osc.stop(start + 0.35)
    })
  } catch {}
}

export function updateSoundSettings(settings) {
  _menuSounds = settings.menuSounds ?? true
}

function ac() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

// Primary action — thocky mechanical key: low thump body + brief noise transient
export function playClick() {
  if (!_menuSounds) return
  try {
    const ctx = ac()
    const now = ctx.currentTime

    // Layer 1: deep sine thump (the "thock" body)
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.connect(oscGain)
    oscGain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.055)
    oscGain.gain.setValueAtTime(0.38, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065)
    osc.start(now)
    osc.stop(now + 0.07)

    // Layer 2: click transient — two stacked noise bursts at different frequencies
    for (const [freq, q, vol, dur] of [[5000, 1.2, 0.4, 0.012], [2200, 0.8, 0.22, 0.022]]) {
      const bufSize = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'
      bpf.frequency.value = freq
      bpf.Q.value = q
      const noiseGain = ctx.createGain()
      noise.connect(bpf)
      bpf.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noiseGain.gain.setValueAtTime(vol, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
      noise.start(now)
      noise.stop(now + dur)
    }
  } catch {}
}

// Secondary / toggle — lighter, higher tap
export function playToggle() {
  if (!_menuSounds) return
  try {
    const ctx = ac()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.07)
    gain.gain.setValueAtTime(0.13, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.09)
  } catch {}
}

// Wrong answer — descending sawtooth buzz
export function playWrong() {
  try {
    const ctx = ac()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.22)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.24)
  } catch {}
}

// Back / dismiss — low soft thud
export function playBack() {
  if (!_menuSounds) return
  try {
    const ctx = ac()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(240, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.14)
  } catch {}
}
