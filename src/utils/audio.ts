class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public enabled: boolean = true;
  public volume: number = 0.8; // 0.0 to 1.0

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('casino_sound_volume');
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          this.volume = val;
        }
      }
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('casino_sound_volume', this.volume.toString());
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getDestination(): AudioNode {
    if (!this.ctx) this.initCtx();
    return this.masterGain || this.ctx?.destination as AudioNode;
  }

  // Chip placement sound (sharp click/clink)
  playChip() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio context may be restricted
    }
  }

  // Wheel spin sound (whoosh and rapid ticks)
  playSpinStart() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      noise.start();
    } catch {
      // ignore
    }
  }

  // Ball rolling / pocket bounce tick
  playTick(frequency = 1400) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {
      // ignore
    }
  }

  // Winner chime / chord celebration
  playWin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.65);
      });
    } catch {
      // ignore
    }
  }

  // Big Jackpot sound
  playBigWin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const chord = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      chord.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.06);
        osc.stop(this.ctx.currentTime + idx * 0.06 + 0.85);
      });
    } catch {
      // ignore
    }
  }

  // Claw Machine: Mid-air drop / fail chime ("燈楞～" descending fail chime)
  playDropFail() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const freqs = [587.33, 493.88, 440.0, 329.63, 220.0]; // D5 -> B4 -> A4 -> E4 -> A3
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.12);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, this.ctx.currentTime + idx * 0.12 + 0.18);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain || this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.12);
        osc.stop(this.ctx.currentTime + idx * 0.12 + 0.24);
      });
    } catch {
      // ignore
    }
  }

  // Loss sound: Crisp Casino Chip Sweep & Glassy Chime (Direction 2: Clear, open, high-end casino felt & ceramic sweep)
  playLoss() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // ==========================================
      // 1. PHYSICAL CERAMIC CHIP CLATTER & SWEEP
      // Dealer cleanly sweeping chips across felt
      // ==========================================
      const sweepDur = 0.14;
      const sweepSize = Math.floor(this.ctx.sampleRate * sweepDur);
      const sweepBuffer = this.ctx.createBuffer(1, sweepSize, this.ctx.sampleRate);
      const sweepData = sweepBuffer.getChannelData(0);
      for (let i = 0; i < sweepSize; i++) {
        // High-textured felt scrape with rapid taper
        sweepData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sweepSize * 0.35));
      }
      const sweepSource = this.ctx.createBufferSource();
      sweepSource.buffer = sweepBuffer;

      const sweepFilter = this.ctx.createBiquadFilter();
      sweepFilter.type = 'bandpass';
      sweepFilter.frequency.setValueAtTime(3200, now);
      sweepFilter.Q.setValueAtTime(2.2, now);

      const sweepGain = this.ctx.createGain();
      sweepGain.gain.setValueAtTime(0.18, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + sweepDur);

      sweepSource.connect(sweepFilter);
      sweepFilter.connect(sweepGain);
      sweepGain.connect(this.masterGain || this.ctx.destination);
      sweepSource.start(now);

      // Micro ceramic chip edge clicks (delicate 'clack-click' as chips gather)
      const chipClicks = [
        { freq: 3800, time: 0.015, dur: 0.025, vol: 0.12 },
        { freq: 4400, time: 0.048, dur: 0.02, vol: 0.10 },
        { freq: 3100, time: 0.082, dur: 0.03, vol: 0.09 },
      ];

      chipClicks.forEach(({ freq, time, dur, vol }) => {
        if (!this.ctx) return;
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        const clickFilter = this.ctx.createBiquadFilter();

        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(freq, now + time);
        clickOsc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + time + dur);

        clickFilter.type = 'highpass';
        clickFilter.frequency.setValueAtTime(2200, now + time);

        clickGain.gain.setValueAtTime(0.001, now);
        clickGain.gain.setValueAtTime(vol, now + time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.masterGain || this.ctx.destination);
        clickOsc.start(now + time);
        clickOsc.stop(now + time + dur + 0.005);
      });

      // ==========================================
      // 2. DELICATE GLASSY / CRYSTALLINE DESCENDING CHIME
      // Airy, transparent, non-muffled minor 2-tone chime (E5 -> C5)
      // ==========================================
      const glassyNotes = [
        { freq: 659.25, time: 0.03, dur: 0.28, gain: 0.07 }, // E5
        { freq: 523.25, time: 0.14, dur: 0.38, gain: 0.08, glissTo: 493.88 }, // C5 gliding gently to B4
      ];

      glassyNotes.forEach(({ freq, time, dur, gain: noteVol, glissTo }) => {
        if (!this.ctx) return;
        // Fundamental glassy sine
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);
        if (glissTo) {
          osc.frequency.setValueAtTime(freq, now + time + 0.08);
          osc.frequency.exponentialRampToValueAtTime(glissTo, now + time + dur);
        }

        // Clean chime envelope (instant glassy strike, smooth transparent decay)
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.setValueAtTime(noteVol, now + time);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        // Overtone shimmer (octave harmonic for crystal texture)
        const shimmerOsc = this.ctx.createOscillator();
        const shimmerGain = this.ctx.createGain();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.setValueAtTime(freq * 2, now + time);

        shimmerGain.gain.setValueAtTime(0.001, now);
        shimmerGain.gain.setValueAtTime(noteVol * 0.35, now + time);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.6);

        osc.connect(noteGain);
        shimmerOsc.connect(shimmerGain);
        noteGain.connect(this.masterGain || this.ctx.destination);
        shimmerGain.connect(this.masterGain || this.ctx.destination);

        osc.start(now + time);
        shimmerOsc.start(now + time);
        osc.stop(now + time + dur + 0.02);
        shimmerOsc.stop(now + time + dur * 0.6 + 0.02);
      });
    } catch {
      // ignore
    }
  }

  // Card slide / deal sound: High-pitched crisp shuffle riffle brush ("洗牌刷刷音")
  playCardDeal() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. High-frequency dual micro-brush flutter ("刷-刷" riffle card sound)
      const bufferSize1 = Math.floor(this.ctx.sampleRate * 0.055); // 55ms
      const bufferSize2 = Math.floor(this.ctx.sampleRate * 0.07); // 70ms

      const noise1 = this.ctx.createBuffer(1, bufferSize1, this.ctx.sampleRate);
      const out1 = noise1.getChannelData(0);
      for (let i = 0; i < bufferSize1; i++) {
        out1[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize1 * 0.35));
      }

      const noise2 = this.ctx.createBuffer(1, bufferSize2, this.ctx.sampleRate);
      const out2 = noise2.getChannelData(0);
      for (let i = 0; i < bufferSize2; i++) {
        out2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize2 * 0.4));
      }

      // First brush pulse: High-pitch paper friction (~5600Hz)
      const src1 = this.ctx.createBufferSource();
      src1.buffer = noise1;
      const bp1 = this.ctx.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.setValueAtTime(5600, now);
      bp1.Q.setValueAtTime(1.8, now);

      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      src1.connect(bp1);
      bp1.connect(gain1);
      gain1.connect(this.masterGain || this.ctx.destination);
      src1.start(now);

      // Second brush pulse: Slightly higher sliding felt sweep (~6800Hz, offset by 26ms)
      const src2 = this.ctx.createBufferSource();
      src2.buffer = noise2;
      const bp2 = this.ctx.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.setValueAtTime(6800, now + 0.026);
      bp2.Q.setValueAtTime(1.5, now + 0.026);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.20, now + 0.026);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.096);

      src2.connect(bp2);
      bp2.connect(gain2);
      gain2.connect(this.masterGain || this.ctx.destination);
      src2.start(now + 0.026);

      // 2. High-pitch card flick click at the end of the deal (crisp edge release)
      const tapOsc = this.ctx.createOscillator();
      const tapGain = this.ctx.createGain();
      tapOsc.type = 'sine';
      tapOsc.frequency.setValueAtTime(1200, now + 0.045);
      tapOsc.frequency.exponentialRampToValueAtTime(450, now + 0.065);

      tapGain.gain.setValueAtTime(0.001, now);
      tapGain.gain.setValueAtTime(0.08, now + 0.045);
      tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      tapOsc.connect(tapGain);
      tapGain.connect(this.masterGain || this.ctx.destination);
      tapOsc.start(now + 0.045);
      tapOsc.stop(now + 0.07);
    } catch {
      // ignore
    }
  }

  // Card flip sound (Crisp snappy card flick & air swoosh)
  playCardFlip() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // 1. Snap burst noise
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.05); // 50ms
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.16, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain || this.ctx.destination);
      noiseSource.start(now);
    } catch {
      // ignore
    }
  }

  // Card shuffle sound
  playShuffle() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400 + Math.random() * 300, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);
          gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(this.masterGain || this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.045);
        }, i * 45);
      }
    } catch {
      // ignore
    }
  }

  // Clear / Reset click sound
  playClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // ignore
    }
  }

  // Slot Machine: Lever pull clunk & spring ratchet
  playLever() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch {
      // ignore
    }
  }

  // Slot Machine: Reel spin tick / rolling sound
  playReelTick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700 + Math.random() * 200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.025);
    } catch {
      // ignore
    }
  }

  // Slot Machine: Reel lock/stop clunk
  playReelStop(reelIndex: number = 0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const baseFreq = 300 + reelIndex * 120;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  // Slot Machine: Coin payout waterfall sound
  playCoinPayout() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400 + i * 150, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(this.masterGain || this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.055);
        }, i * 60);
      }
    } catch {
      // ignore
    }
  }

  // Sic Bo / Siba: Dice Cup Cover (solid wooden/ceramic thud)
  playCupCover() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // ignore
    }
  }

  // Sic Bo: Dice Cup Shake / Rattle sound
  playDiceShake() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450 + Math.random() * 600, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);

          gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.04);

          osc.connect(gain);
          gain.connect(this.masterGain || this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.045);
        }, i * 70);
      }
    } catch {
      // ignore
    }
  }

  // Plinko: Ball hits peg (metallic ping with musical pitch scale)
  playPegHit(row = 0) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Slightly ascending pitch as ball drops deeper
      const baseFreq = 520 + row * 45 + (Math.random() * 40 - 20);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.055);
    } catch {
      // ignore
    }
  }

  // Plinko: Ball lands in bottom slot
  playPlinkoSlot(multiplier: number) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      if (multiplier >= 2) {
        this.playWin();
      } else if (multiplier >= 1) {
        this.playChip();
      } else {
        this.playTick(600);
      }
    } catch {
      // ignore
    }
  }

  // Sic Bo: Dice cup lift and landing clink
  playDiceReveal() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.11);
    } catch {
      // ignore
    }
  }

  // Bubble / Peg / Pop sound for arcade and pinball
  playPop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {
      // ignore
    }
  }

  // Pinball: Spring bumper / kicker launch sound (elastic boing / twang)
  playSpringBoing() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, this.ctx.currentTime + 0.06);
      osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.19);
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundManager();
