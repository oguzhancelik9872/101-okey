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
      muted: false,
      volume: 0.55
    };

    this.loadSettings();
    this._preloadMP3s();
  }

  _preloadMP3s() {
    const soundNames = [
      'tile_draw_deck',
      'tile_draw_discard',
      'tile_discard_1',
      'tile_discard_2',
      'tile_discard_3'
    ];
    soundNames.forEach(name => {
      const audio = new Audio(`/audio/${name}.mp3`);
      audio.preload = 'auto';
      this.mp3Audios[name] = audio;
      audio.addEventListener('canplaythrough', () => {
        this.mp3Audios[name] = audio;
      }, { once: true });
      audio.addEventListener('error', () => {
        this.mp3Missing[name] = true;
      }, { once: true });
      audio.load();
    });
  }

  _playMP3OrFallback(name, type = 'sfx', fallbackFn = null, volume = 0.85) {
    if (this.settings.muted) return;

    if (this.mp3Audios[name] && !this.mp3Missing[name]) {
      try {
        const sound = this.mp3Audios[name].cloneNode();
        sound.volume = Math.max(0, Math.min(1, volume * this.getEffectiveVolume()));
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
      const rawSavedVolume = localStorage.getItem('okey101_sound_volume');
      const savedVolume = Number(rawSavedVolume);
      if (saved !== null) {
        this.settings.muted = (saved === 'true');
      }
      if (rawSavedVolume !== null && Number.isFinite(savedVolume)) {
        this.settings.volume = Math.max(0, Math.min(1, savedVolume));
      }
    } catch (e) {}
  }

  saveSettings() {
    try {
      localStorage.setItem('okey101_sound_muted', String(this.settings.muted));
      localStorage.setItem('okey101_sound_volume', String(this.settings.volume));
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
    return this.settings.muted ? 0 : this.settings.volume;
  }

  getVolume() {
    return this.settings.volume;
  }

  setVolume(value) {
    const parsed = Number(value);
    this.settings.volume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.55;
    this.settings.muted = this.settings.volume === 0;
    this.saveSettings();
    return this.settings.volume;
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    if (!this.settings.muted && this.settings.volume === 0) this.settings.volume = 0.55;
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
  // 1. GAMEPLAY SOUND EFFECTS (Tok, gerçekçi, ahşap & kemik vuruşları)
  // =========================================================================

  /**
   * Yana Taş Atma (Discard) - Tok, pürüzsüz ve gerçekçi ahşap-kemik vuruşu
   */
  playDiscard() {
    // Keep the common sounds varied while making the harder hit less frequent.
    const roll = Math.random();
    const soundName = roll < 0.4
      ? 'tile_discard_1'
      : (roll < 0.8 ? 'tile_discard_2' : 'tile_discard_3');
    this._playMP3OrFallback(soundName, 'sfx', this._synthDiscard);
  }

  _synthDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Tok ve sıcak ahşap kemik vuruşu
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const filter1 = this.ctx.createBiquadFilter();

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(480, t);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(260, t);
    osc1.frequency.exponentialRampToValueAtTime(75, t + 0.05);

    gain1.gain.setValueAtTime(vol * 0.75, t);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.06);

    // 2. Masa rezonansı (Hollow body resonance)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(130, t);
    osc2.frequency.exponentialRampToValueAtTime(45, t + 0.07);

    gain2.gain.setValueAtTime(vol * 0.5, t);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc2.start(t);
    osc2.stop(t + 0.08);
  }

  // Alias for backward compatibility
  playTilePlace() {
    // Reuse the approved short tile samples quietly as meld tiles land.
    const soundName = Math.random() < 0.5 ? 'tile_discard_1' : 'tile_discard_2';
    this._playMP3OrFallback(soundName, 'sfx', null, 0.38);
  }

  _synthTilePlace() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.035);

    gain.gain.setValueAtTime(vol * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  playTileSelect() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.02);

    gain.gain.setValueAtTime(vol * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Desteden Taş Alma (Draw from Deck) - Çuhada yumuşak kayma ve hafif ahşap dokunuşu
   */
  playDrawDeck() {
    this._playMP3OrFallback('tile_draw_deck', 'sfx', this._synthDrawDeck);
  }

  _synthDrawDeck() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.045);

    gain.gain.setValueAtTime(vol * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.055);
  }

  playDraw() {
    this.playDrawDeck();
  }

  /**
   * Yandan Taş Alma (Draw from Discard) - Çift vuruşlu tok taş kavrama sesi
   */
  playDrawDiscard() {
    this._playMP3OrFallback('tile_draw_discard', 'sfx', this._synthDrawDiscard);
  }

  _synthDrawDiscard() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    [
      { offset: 0.00, freq: 200, gainVal: 0.4 },
      { offset: 0.03, freq: 270, gainVal: 0.55 }
    ].forEach(({ offset, freq, gainVal }) => {
      const clickTime = t + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, clickTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, clickTime);
      osc.frequency.exponentialRampToValueAtTime(90, clickTime + 0.04);

      gain.gain.setValueAtTime(vol * gainVal, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.05);
    });
  }

  /**
   * Birisi El Açtığında (Open Hand) - Tok taşlar ve tatlı casino tınısı
   */
  playOpenHand() {
    // Intentionally silent. The former synthesized opening sound was not approved.
  }

  _synthOpenHand() {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const clacks = [
      { time: 0.00, freq: 220, decay: 0.04, gVal: 0.4 },
      { time: 0.03, freq: 280, decay: 0.05, gVal: 0.5 },
      { time: 0.06, freq: 340, decay: 0.06, gVal: 0.6 }
    ];

    clacks.forEach(({ time, freq, decay, gVal }) => {
      const clackT = t + time;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, clackT);
      osc.frequency.exponentialRampToValueAtTime(80, clackT + decay);

      gain.gain.setValueAtTime(vol * gVal, clackT);
      gain.gain.exponentialRampToValueAtTime(0.0001, clackT + decay);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(clackT);
      osc.stop(clackT + decay + 0.01);
    });

    // Tatlı melodik akor (C5 -> E5 -> G5)
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const noteT = t + 0.08 + (i * 0.06);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(vol * 0.35, noteT);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteT + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteT);
      osc.stop(noteT + 0.28);
    });
  }

  playProcess() {
    this.playTilePlace();
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

    const notes = [523.25, 659.25]; // Kısa ve sıcak sıra bildirimi
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.08);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /**
   * Süre Azalırken Çalan Nazik Tik-Tak ve Son Saniyeler Hızlanan Uyarı Tınısı
   */
  playTimerTick(secondsLeft = 5) {
    if (this.settings.muted) return;
    this._synthTimerTick(secondsLeft);
  }

  _synthTimerTick(secondsLeft = 5) {
    const vol = this.getEffectiveVolume('sfx');
    if (vol <= 0) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Saniye azaldıkça frekans yükselir (gerilim ve farkındalık artışı)
    const baseFreq = secondsLeft <= 3 ? 560 : (secondsLeft <= 5 ? 480 : 400);
    const duration = 0.035;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + duration);

    const gainVal = secondsLeft <= 3 ? vol * 0.2 : vol * 0.12;
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration + 0.005);
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

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Sıcak C Major)
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + (i * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(vol * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.38);
    });

    // Kısa, filtrelenmiş alkış dokusu; sert yankı oluşturmadan kutlama hissi verir.
    const sampleRate = this.ctx.sampleRate;
    const applauseBuffer = this.ctx.createBuffer(1, Math.floor(sampleRate * 1.25), sampleRate);
    const samples = applauseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const pulse = Math.pow(Math.max(0, Math.sin(i / sampleRate * Math.PI * 9)), 10);
      samples[i] = (Math.random() * 2 - 1) * (0.18 + pulse * 0.82) * Math.exp(-i / sampleRate * 1.15);
    }
    const applause = this.ctx.createBufferSource();
    const applauseFilter = this.ctx.createBiquadFilter();
    const applauseGain = this.ctx.createGain();
    applause.buffer = applauseBuffer;
    applauseFilter.type = 'bandpass';
    applauseFilter.frequency.setValueAtTime(1450, this.ctx.currentTime);
    applauseFilter.Q.setValueAtTime(0.65, this.ctx.currentTime);
    applauseGain.gain.setValueAtTime(vol * 0.22, this.ctx.currentTime);
    applauseGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
    applause.connect(applauseFilter);
    applauseFilter.connect(applauseGain);
    applauseGain.connect(this.ctx.destination);
    applause.start();
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

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.14);

    gain.gain.setValueAtTime(vol * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.17);
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
