/**
 * Professional Deep Acoustic Web Audio Synthesizer for 101 Okey
 * Features deep & satisfying "tok" wooden & bone stone clacks,
 * authentic Turkish cafe conversation chatter atmosphere, turn prompts,
 * countdown ticks, and "İşlek Taş Fail" blunder sound effect.
 */
class OkeyAudio {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;

    // Granular Settings
    this.settings = {
      masterVolume: 0.85,
      sfxVolume: 0.9,
      ambientVolume: 0.4,
      ambientEnabled: true,
      timerAlertEnabled: true,
      sfxEnabled: true,
      muted: false
    };

    this.loadSettings();

    // Ambient Cafe Chatter state
    this.ambientGainNode = null;
    this.ambientRunning = false;
    this.ambientNodes = [];
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
    const bufferSize = this.ctx.sampleRate * 3; // 3 seconds of warm pink/brown noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter heavily towards warm brown/pink noise
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      output[i] = (b0 + b1 + b2 + b3 + white * 0.2) * 0.15;
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
  // 1. GAMEPLAY SOUND EFFECTS (Tok, derin, ahşap & kemik vuruşları)
  // =========================================================================

  /**
   * Yana Taş Atma (Discard) - Tok, pürüzsüz ve doyurucu ahşap-kemik vuruşu
   */
  playDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Tok kemik gövdesi (Warm low body)
    const oscBody = this.ctx.createOscillator();
    const gainBody = this.ctx.createGain();
    const filterBody = this.ctx.createBiquadFilter();

    filterBody.type = 'lowpass';
    filterBody.frequency.setValueAtTime(450, t);

    oscBody.type = 'sine';
    oscBody.frequency.setValueAtTime(220, t);
    oscBody.frequency.exponentialRampToValueAtTime(80, t + 0.06);

    gainBody.gain.setValueAtTime(vol * 0.85, t);
    gainBody.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    oscBody.connect(filterBody);
    filterBody.connect(gainBody);
    gainBody.connect(this.ctx.destination);

    oscBody.start(t);
    oscBody.stop(t + 0.07);

    // 2. Derin ahşap rezonansı (Hollow wood table thump)
    const oscWood = this.ctx.createOscillator();
    const gainWood = this.ctx.createGain();
    oscWood.type = 'triangle';
    oscWood.frequency.setValueAtTime(140, t);
    oscWood.frequency.exponentialRampToValueAtTime(55, t + 0.08);

    gainWood.gain.setValueAtTime(vol * 0.65, t);
    gainWood.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);

    oscWood.connect(gainWood);
    gainWood.connect(this.ctx.destination);

    oscWood.start(t);
    oscWood.stop(t + 0.09);

    // 3. Yumuşak temas çıtlatması (Muted tactile snap - no harsh treble)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(900, t);
      nFilter.Q.setValueAtTime(1.8, t);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(vol * 0.35, t);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.035);
    }
  }

  // Alias for backward compatibility
  playTilePlace() {
    this.playDiscard();
  }

  /**
   * Desteden Taş Alma (Draw from Deck) - Çuhada yumuşak kayma ve hafif ahşap dokunuşu
   */
  playDrawDeck() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Yumuşak çuha sürtünmesi
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, t);
      filter.frequency.exponentialRampToValueAtTime(1100, t + 0.05);
      filter.Q.setValueAtTime(2.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
      noise.stop(t + 0.06);
    }

    // Tok hafif kaldırma tonu
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t + 0.01);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.05);

    gain.gain.setValueAtTime(vol * 0.45, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t + 0.01);
    osc.stop(t + 0.06);
  }

  playDraw() {
    this.playDrawDeck();
  }

  /**
   * Yandan Taş Alma (Draw from Discard) - Çift vuruşlu tok taş kavrama sesi
   */
  playDrawDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    [
      { offset: 0.00, freq: 190, gainVal: 0.5 },
      { offset: 0.035, freq: 240, gainVal: 0.7 }
    ].forEach(({ offset, freq, gainVal }) => {
      const clickTime = t + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, clickTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, clickTime);
      osc.frequency.exponentialRampToValueAtTime(85, clickTime + 0.045);

      gain.gain.setValueAtTime(vol * gainVal, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.055);
    });
  }

  /**
   * Birisi El Açtığında (Open Hand) - Kalabalık ve tok taş yığını efekti
   */
  playOpenHand() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const clacks = [
      { time: 0.00, freq: 230, decay: 0.05, gVal: 0.5 },
      { time: 0.03, freq: 190, decay: 0.05, gVal: 0.6 },
      { time: 0.06, freq: 260, decay: 0.06, gVal: 0.7 },
      { time: 0.09, freq: 140, decay: 0.12, gVal: 0.9 } // Tok masa çarpması
    ];

    clacks.forEach(({ time, freq, decay, gVal }) => {
      const clackT = t + time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, clackT);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, clackT);
      osc.frequency.exponentialRampToValueAtTime(65, clackT + decay);

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
   * Sıra Sizde Uyarısı (Your Turn) - Yumuşak, tok marimba tınısı
   */
  playYourTurn() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const notes = [349.23, 523.25]; // F4 -> C5 (Tok ve sıcak 5'li akor)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.09);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  /**
   * Son 5 Saniye Nazik Uyarı Tınısı (Sadece hamlenin son 5 saniyesinde çalar)
   */
  playTimerTick(secondsLeft = 5) {
    if (!this.settings.timerAlertEnabled) return;
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

    gain.gain.setValueAtTime(vol * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Oyuncu İşlek Taş Attığında Çalacak Fail / Blunder Sesi
   */
  playIslekFail() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const failNotes = [260, 210, 160, 110]; // İnen komik fail gamı

    failNotes.forEach((freq, idx) => {
      const noteT = t + (idx * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, noteT);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteT);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, noteT + 0.08);

      gain.gain.setValueAtTime(vol * 0.55, noteT);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteT + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteT);
      osc.stop(noteT + 0.095);
    });

    // Tok tahta çökme efekti
    const woodOsc = this.ctx.createOscillator();
    const woodGain = this.ctx.createGain();
    woodOsc.type = 'sine';
    woodOsc.frequency.setValueAtTime(120, t + 0.22);
    woodOsc.frequency.exponentialRampToValueAtTime(50, t + 0.35);

    woodGain.gain.setValueAtTime(vol * 0.6, t + 0.22);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

    woodOsc.connect(woodGain);
    woodGain.connect(this.ctx.destination);

    woodOsc.start(t + 0.22);
    woodOsc.stop(t + 0.37);
  }

  /**
   * Zafer / El Bitirme Sesi
   */
  playVictory() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Tok sıcak C Major)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, t);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.37);
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
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.16);

    gain.gain.setValueAtTime(vol * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  // =========================================================================
  // 2. ORTAM SESİ / KAHVEHANE KONUŞMA VE KAFE AMBİYANSI (Cafe Chatter)
  // =========================================================================

  startAmbient() {
    if (this.ambientRunning || !this.settings.ambientEnabled || this.settings.muted) return;
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    try {
      this.ambientGainNode = this.ctx.createGain();
      this.ambientGainNode.gain.setValueAtTime(this.getEffectiveVolume('ambient'), this.ctx.currentTime);
      this.ambientGainNode.connect(this.ctx.destination);

      // Layer 1: İnsan ses formanı uğultusu (Distant human speech vowel formant resonance)
      // Formants simulating natural Turkish cafe conversation murmurs
      const formants = [
        { freq: 480, Q: 3.5, gainVal: 0.35 },  // F1 vowel formant
        { freq: 1250, Q: 3.0, gainVal: 0.25 }, // F2 vowel formant
        { freq: 2100, Q: 2.5, gainVal: 0.18 }  // F3 vowel formant
      ];

      const nodes = [];

      formants.forEach(({ freq, Q, gainVal }) => {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        noise.loop = true;

        const bpFilter = this.ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        bpFilter.Q.setValueAtTime(Q, this.ctx.currentTime);

        // Slow speech cadence modulation
        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(gainVal, this.ctx.currentTime);

        noise.connect(bpFilter);
        bpFilter.connect(modGain);
        modGain.connect(this.ambientGainNode);
        noise.start(0);

        nodes.push(noise, bpFilter, modGain);
      });

      // Layer 2: Cozy room tone / Kahvehane mekan bas tınısı
      const roomNoise = this.ctx.createBufferSource();
      roomNoise.buffer = this.noiseBuffer;
      roomNoise.loop = true;

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

      const lpGain = this.ctx.createGain();
      lpGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      roomNoise.connect(lpFilter);
      lpFilter.connect(lpGain);
      lpGain.connect(this.ambientGainNode);
      roomNoise.start(0);

      nodes.push(roomNoise, lpFilter, lpGain);

      this.ambientNodes = nodes;
      this.ambientRunning = true;
    } catch (e) {
      console.warn('Could not start ambient audio', e);
    }
  }

  stopAmbient() {
    this.ambientRunning = false;
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
