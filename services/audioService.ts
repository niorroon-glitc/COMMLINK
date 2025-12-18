
class AudioService {
  private ctx: AudioContext | null = null;
  public isEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createSquelchNoise(duration: number, volume: number) {
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generar Ruido Blanco
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Filtro para sonido de radio "vieja" (Bandpass)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.0;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start();
  }

  playBeep(type: 'start' | 'end' | 'receive' | 'click') {
    if (!this.isEnabled && type !== 'click') return;
    this.initCtx();
    if (!this.ctx) return;

    if (type === 'start') {
      // Squelch inicial corto y agudo
      this.createSquelchNoise(0.15, 0.15);
      // Tono de confirmación
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      g.gain.setValueAtTime(0.1, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } else if (type === 'end') {
      // Squelch final más largo (clásico de walkie talkie)
      this.createSquelchNoise(0.35, 0.12);
    } else if (type === 'receive') {
      this.createSquelchNoise(0.08, 0.08);
    } else if (type === 'click') {
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      oscillator.start();
      oscillator.stop(this.ctx.currentTime + 0.03);
    }
  }
}

export const audioService = new AudioService();
