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
    this.mp3Audios = {};  // Preloaded HTML5 Audio objects
    this.mp3Missing = {}; // Track missing MP3s to avoid repeated requests

    // Simple Sound Settings (Master Mute / Unmute)
    this.settings = {
      muted: false
    };

    this.loadSettings();
    this._preloadMP3s();
  }

  _preloadMP3s() {
    const soundNames = ['discard', 'draw', 'draw_discard', 'open_hand', 'your_turn', 'fail', 'tick', 'win', 'penalty'];
    soundNames.forEach(name => {
      const audio = new Audio(`/audio/${name}.mp3`);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => {
        this.mp3Audios[name] = audio;
      }, { once: true });
      audio.addEventListener('error', () => {
        this.mp3Missing[name] = true;
      }, { once: true });
      audio.load();
    });
  }

  _playMP3OrFallback(name, type = 'sfx', fallbackFn = null) {
    if (this.settings.muted) return;

    if (this.mp3Audios[name] && !this.mp3Missing[name]) {
      try {
        const sound = this.mp3Audios[name].cloneNode();
        sound.volume = 0.85;
        sound.play().catch(() => {
          if (fallbackFn) fallbackFn.call(this);
        });
        return;
      } catch (e) {}
    }

    if (fallbackFn) {
      fallbackFn.call(this);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('okey101_sound_muted');
      if (saved !== null) {
        this.settings.muted = (saved === 'true');
      }
    } catch (e) {}
  }

  saveSettings() {
    try {
      localStorage.setItem('okey101_sound_muted', String(this.settings.muted));
    } catch (e) {}
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getEffectiveVolume() {
    return this.settings.muted ? 0 : 0.85;
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
    return this.settings.muted;
  }

  isMuted() {
    return Boolean(this.settings.muted);
  }

  setMuted(muted) {
    this.settings.muted = Boolean(muted);
    this.saveSettings();
  }

  startAmbient() {}
  stopAmbient() {}
  updateAmbientVolume() {}

  // =========================================================================
  // 1. GAMEPLAY SOUND EFFECTS (Tok, derin, ahşap & kemik vuruşları / MP3)
  // =========================================================================

  /**
   * Yana Taş Atma (Discard) - Tok, pürüzsüz ve doyurucu ahşap-kemik vuruşu
   */
  playDiscard() {
    this._playMP3OrFallback('discard', 'sfx', this._synthDiscard);
  }

  _synthDiscard() {
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
    this._playMP3OrFallback('draw', 'sfx', this._synthDrawDeck);
  }

  _synthDrawDeck() {
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
    this._playMP3OrFallback('draw_discard', 'sfx', this._synthDrawDiscard);
  }

  _synthDrawDiscard() {
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
    this._playMP3OrFallback('open_hand', 'sfx', this._synthOpenHand);
  }

  _synthOpenHand() {
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
    this._playMP3OrFallback('your_turn', 'sfx', this._synthYourTurn);
  }

  _synthYourTurn() {
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
    this._playMP3OrFallback('tick', 'sfx', () => this._synthTimerTick(secondsLeft));
  }

  _synthTimerTick(secondsLeft = 5) {
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
   * Oyuncu İşlek Taş Attığında (Standart taş atma sesi kullanılır, absürt ses kaldırıldı)
   */
  playIslekFail() {
    this.playDiscard();
  }

  _synthIslekFail() {
    this._synthDiscard();
  }

  /**
   * Zafer / El Bitirme Sesi
   */
  playVictory() {
    this._playMP3OrFallback('win', 'sfx', this._synthVictory);
  }

  _synthVictory() {
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
    this._playMP3OrFallback('penalty', 'sfx', this._synthPenalty);
  }

  _synthPenalty() {
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
  // 2. ORTAM SESİ / KAHVEHANE KONUŞMA VE KAFE AMBİYANSI (Cafe Chatter / MP3)
  // =========================================================================

  startAmbient() {
    if (this.ambientRunning || !this.settings.ambientEnabled || this.settings.muted) return;
    this.init();

    // Check if MP3 ambient is available
    if (this.mp3Audios['ambient'] && !this.mp3Missing['ambient']) {
      try {
        if (!this.ambientAudioElement) {
          this.ambientAudioElement = this.mp3Audios['ambient'].cloneNode();
          this.ambientAudioElement.loop = true;
        }
        this.ambientAudioElement.volume = Math.max(0, Math.min(1, this.getEffectiveVolume('ambient')));
        this.ambientAudioElement.play().then(() => {
          this.ambientRunning = true;
        }).catch(() => {
          this._synthAmbient();
        });
        return;
      } catch (e) {
        // Fallback to synth
      }
    }

    this._synthAmbient();
  }

  _synthAmbient() {
    if (!this.ctx || !this.noiseBuffer) return;

    try {
      this.ambientGainNode = this.ctx.createGain();
      this.ambientGainNode.gain.setValueAtTime(this.getEffectiveVolume('ambient'), this.ctx.currentTime);
      this.ambientGainNode.connect(this.ctx.destination);

      // Layer 1: İnsan ses formanı uğultusu (Distant human speech vowel formant resonance)
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
    if (this.ambientAudioElement) {
      try {
        this.ambientAudioElement.pause();
        this.ambientAudioElement.currentTime = 0;
      } catch (e) {}
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
    const vol = this.getEffectiveVolume('ambient');
    if (this.ambientAudioElement) {
      this.ambientAudioElement.volume = Math.max(0, Math.min(1, vol));
    }
    if (this.ambientGainNode && this.ctx) {
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
