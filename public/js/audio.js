/**
 * Soft Acoustic Web Audio Synthesizer for 101 Okey
 * Replaces harsh synth beeps with warm, organic, tactile wooden & bone clacks,
 * soft lounge chimes, and pleasant ASMR-grade game audio.
 */
class OkeyAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this._createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1; // 1 second of noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * 1. Soft Tile Touch / Click (Hafif ve pürüzsüz taş dokunuşu)
   */
  playTileClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Soft warm wood resonance
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * 2. Satisfying Wooden Tile Place / Discard (Tok, yumuşak ahşap ve kemik vuruşu)
   */
  playTilePlace() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Layer A: Soft tactile bone impact (filtered noise click)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200, t);
      noiseFilter.Q.setValueAtTime(1.5, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.09, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.035);
    }

    // Layer B: Deep, warm hollow wooden body resonance
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    const woodFilter = this.ctx.createBiquadFilter();

    woodFilter.type = 'lowpass';
    woodFilter.frequency.setValueAtTime(800, t);

    woodOsc.type = 'sine';
    woodOsc.frequency.setValueAtTime(240, t);
    woodOsc.frequency.exponentialRampToValueAtTime(90, t + 0.06);

    woodGain.gain.setValueAtTime(0.14, t);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

    woodOsc.connect(woodFilter);
    woodFilter.connect(woodGain);
    woodGain.connect(this.ctx.destination);

    woodOsc.start(t);
    woodOsc.stop(t + 0.075);
  }

  /**
   * 3. Soft Felt Glide / Draw Tile (Çuhada yumuşak taş çekme hissi)
   */
  playDraw() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Gentle felt slide
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, t);
      filter.frequency.exponentialRampToValueAtTime(1100, t + 0.06);
      filter.Q.setValueAtTime(2.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.07);
    }

    // Soft pickup tap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t + 0.02);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);

    oscGain.gain.setValueAtTime(0.06, t + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t + 0.02);
    osc.stop(t + 0.07);
  }

  /**
   * 4. Soft Kalimba / Lounge Turn Notification (Sıra sende uyarısı)
   */
  playYourTurn() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25]; // C5, E5 (Soft warm pair)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.09);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * 5. Gentle Chord Melodic Fanfare (El açma sesi)
   */
  playOpenHand() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 (Warm A Major)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * 6. Warm Acoustic Harp / Marimba Arpeggio (El bitirme / zafer sesi)
   */
  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.09);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.46);
    });
  }

  /**
   * 7. Subtle Muted Wooden Drop (Ceza uyarısı - kulak tırmalamayan yumuşak bas)
   */
  playPenalty() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.17);
  }
}

window.soundEngine = new OkeyAudio();
