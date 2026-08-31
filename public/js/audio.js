/**
 * Professional Acoustic Web Audio Synthesizer for 101 Okey
 * Features realistic bone-on-stone clacks, Turkish cafe ambient atmosphere,
 * turn alerts, countdown warning ticks, and granular audio controls.
 */
class OkeyAudio {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;

    // Granular Settings
    this.settings = {
      masterVolume: 0.85,
      sfxVolume: 0.9,
      ambientVolume: 0.35,
      ambientEnabled: true,
      timerAlertEnabled: true,
      sfxEnabled: true,
      muted: false
    };

    this.loadSettings();

    // Ambient Cafe generator state
    this.ambientGainNode = null;
    this.ambientRunning = false;
    this.ambientNodes = [];
    this.ambientTimerId = null;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('okey101_sound_settings');
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load sound settings', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('okey101_sound_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save sound settings', e);
    }
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
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of pink/white noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter towards pink noise for warmth
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.18;
    }
  }

  getEffectiveVolume(type = 'sfx') {
    if (this.settings.muted) return 0;
    const master = Math.max(0, Math.min(1, this.settings.masterVolume));
    if (type === 'ambient') {
      return this.settings.ambientEnabled ? master * this.settings.ambientVolume : 0;
    }
    return this.settings.sfxEnabled ? master * this.settings.sfxVolume : 0;
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
    if (this.settings.muted) {
      this.stopAmbient();
    } else if (this.settings.ambientEnabled) {
      this.startAmbient();
    }
    return this.settings.muted;
  }

  // =========================================================================
  // 1. GAMEPLAY SOUND EFFECTS (Taş taşa vurma, ele alma, yandan alma)
  // =========================================================================

  /**
   * Yana Taş Atma (Discard) - Authentic crisp bone-on-stone & wood impact
   */
  playDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Layer A: Sharp bone snap (filtered noise click)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2800, t);
      noiseFilter.Q.setValueAtTime(3.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.03);
    }

    // Layer B: Heavy ceramic stone knock
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter1 = this.ctx.createBiquadFilter();

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(1200, t);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(560, t);
    osc1.frequency.exponentialRampToValueAtTime(140, t + 0.05);

    gain1.gain.setValueAtTime(vol * 0.55, t);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.065);

    // Layer C: Low wooden table resonance
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(180, t);
    woodOsc.frequency.exponentialRampToValueAtTime(75, t + 0.08);

    woodGain.gain.setValueAtTime(vol * 0.35, t);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    woodOsc.connect(woodGain);
    woodGain.connect(this.ctx.destination);

    woodOsc.start(t);
    woodOsc.stop(t + 0.095);
  }

  // Alias for backward compatibility
  playTilePlace() {
    this.playDiscard();
  }

  /**
   * Desteden Taş Alma (Draw from Deck) - Natural bone tile pickup and slide
   */
  playDrawDeck() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Felt & bone slide
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(1600, t + 0.05);
      filter.Q.setValueAtTime(2.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.065);
    }

    // Light stone pickup click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, t + 0.015);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.055);

    gain.gain.setValueAtTime(vol * 0.35, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t + 0.015);
    osc.stop(t + 0.065);
  }

  playDraw() {
    this.playDrawDeck();
  }

  /**
   * Yandan Taş Alma (Draw from Discard) - Quick double-snap stone grab
   */
  playDrawDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Double stone click
    [0, 0.04].forEach((offset, idx) => {
      const clickTime = t + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 380 : 540, clickTime);
      osc.frequency.exponentialRampToValueAtTime(180, clickTime + 0.035);

      gain.gain.setValueAtTime(vol * (idx === 0 ? 0.3 : 0.45), clickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.045);
    });
  }

  /**
   * Birisi El Açtığında (Open Hand) - "Daha kalabalık ve tok taş vurma sesi"
   * Satisfying multi-tile cascade slam onto the wooden board
   */
  playOpenHand() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const clacks = [
      { time: 0.00, freq: 520, decay: 0.04, gain: 0.35 },
      { time: 0.03, freq: 410, decay: 0.045, gain: 0.4 },
      { time: 0.06, freq: 620, decay: 0.05, gain: 0.45 },
      { time: 0.09, freq: 360, decay: 0.055, gain: 0.5 },
      { time: 0.12, freq: 240, decay: 0.12, gain: 0.65 } // Final heavy table slam
    ];

    clacks.forEach(({ time, freq, decay, gain: gVal }) => {
      const clackT = t + time;

      // Stone body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, clackT);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, clackT);
      osc.frequency.exponentialRampToValueAtTime(90, clackT + decay);

      gain.gain.setValueAtTime(vol * gVal, clackT);
      gain.gain.exponentialRampToValueAtTime(0.0001, clackT + decay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clackT);
      osc.stop(clackT + decay + 0.01);
    });
  }

  /**
   * Sıra Sizde Uyarısı (Your Turn) - Pleasant acoustic notification chime
   */
  playYourTurn() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const notes = [659.25, 987.77]; // E5 -> B5 (Warm pleasant major 5th)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  /**
   * Son 10 Saniye Uyarı Tınısı (Turn Timer Warning Tick)
   */
  playTimerTick(secondsLeft = 10) {
    if (!this.settings.timerAlertEnabled) return;
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const isUrgent = secondsLeft <= 5;
    const freq = isUrgent ? 680 : 480;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.04);

    gain.gain.setValueAtTime(vol * (isUrgent ? 0.35 : 0.2), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Zafer / El Bitirme Sesi
   */
  playVictory() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  /**
   * Ceza Alma Sesi (Penalty)
   */
  playPenalty() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);

    gain.gain.setValueAtTime(vol * 0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  // =========================================================================
  // 2. ORTAM SESİ / KAHVEHANE AMBİYANSI (Turkish Cafe Atmosphere)
  // =========================================================================

  startAmbient() {
    if (this.ambientRunning || !this.settings.ambientEnabled || this.settings.muted) return;
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    try {
      this.ambientGainNode = this.ctx.createGain();
      this.ambientGainNode.gain.setValueAtTime(this.getEffectiveVolume('ambient'), this.ctx.currentTime);
      this.ambientGainNode.connect(this.ctx.destination);

      // Layer 1: Cozy room air murmur (dual lowpass filtered noise)
      const noise1 = this.ctx.createBufferSource();
      noise1.buffer = this.noiseBuffer;
      noise1.loop = true;

      const filter1 = this.ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(280, this.ctx.currentTime);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      noise1.connect(filter1);
      filter1.connect(subGain);
      subGain.connect(this.ambientGainNode);
      noise1.start(0);

      this.ambientNodes = [noise1, filter1, subGain];
      this.ambientRunning = true;

      // Start periodic gentle tea glass & spoon tinkles
      this._scheduleTeaTinkle();
    } catch (e) {
      console.warn('Could not start ambient audio', e);
    }
  }

  _scheduleTeaTinkle() {
    if (!this.ambientRunning) return;
    const nextInterval = 4000 + Math.random() * 6000; // Random 4-10 seconds
    this.ambientTimerId = setTimeout(() => {
      if (!this.ambientRunning) return;
      this._playTeaTinkle();
      this._scheduleTeaTinkle();
    }, nextInterval);
  }

  _playTeaTinkle() {
    const vol = this.getEffectiveVolume('ambient');
    if (vol <= 0 || !this.ctx) return;

    const t = this.ctx.currentTime;
    const pingFreq = 2600 + Math.random() * 800; // 2.6kHz - 3.4kHz crystal glass ping

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pingFreq, t);
    filter.Q.setValueAtTime(8.0, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pingFreq, t);

    gain.gain.setValueAtTime(vol * 0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  stopAmbient() {
    this.ambientRunning = false;
    if (this.ambientTimerId) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (this.ambientNodes) {
      this.ambientNodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) {}
      });
      this.ambientNodes = [];
    }
    if (this.ambientGainNode) {
      try { this.ambientGainNode.disconnect(); } catch (e) {}
      this.ambientGainNode = null;
    }
  }

  updateAmbientVolume() {
    if (this.ambientGainNode && this.ctx) {
      const vol = this.getEffectiveVolume('ambient');
      this.ambientGainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }
}

window.soundEngine = new OkeyAudio();

// Global unlock listener on first user interaction to satisfy browser autoplay policies
const unlockAudioContext = () => {
  if (window.soundEngine) {
    window.soundEngine.init();
  }
  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.removeEventListener(evt, unlockAudioContext, true);
  });
};
['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, unlockAudioContext, { capture: true, passive: true });
});
