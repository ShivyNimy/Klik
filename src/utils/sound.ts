// Procedural WebAudio sound effects synthesizer for Klik Games
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(
    freq: number,
    duration: number = 0.12,
    type: OscillatorType = 'sine',
    volume: number = 0.14,
    slideTo?: number
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio errors
    }
  }

  playNoise(duration: number = 0.15, volume: number = 0.12, filterFreq: number = 900) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Ignore
    }
  }

  click() {
    this.playTone(580, 0.06, 'triangle', 0.1, 780);
  }

  coin() {
    this.playTone(880, 0.08, 'sine', 0.12, 1320);
    setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.11, 1760), 55);
  }

  hit() {
    this.playNoise(0.14, 0.18, 500);
    this.playTone(150, 0.14, 'sawtooth', 0.14, 55);
  }

  chop() {
    this.playNoise(0.09, 0.15, 1100);
    this.playTone(210, 0.08, 'triangle', 0.12, 95);
  }

  jump() {
    this.playTone(260, 0.16, 'sine', 0.12, 620);
  }

  laser() {
    this.playTone(760, 0.09, 'sawtooth', 0.08, 220);
  }

  powerup() {
    this.playTone(440, 0.1, 'triangle', 0.12, 660);
    setTimeout(() => this.playTone(660, 0.12, 'triangle', 0.12, 990), 80);
    setTimeout(() => this.playTone(990, 0.18, 'triangle', 0.12, 1320), 160);
  }

  monsterGrowl() {
    this.playTone(92, 0.55, 'sawtooth', 0.18, 42);
    this.playNoise(0.45, 0.14, 320);
  }

  gameOver() {
    this.playTone(340, 0.2, 'sawtooth', 0.13, 250);
    setTimeout(() => this.playTone(240, 0.35, 'sawtooth', 0.13, 110), 190);
  }
}

export const sfx = new SoundEngine();
