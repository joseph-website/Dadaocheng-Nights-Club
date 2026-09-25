/**
 * BGM Engine for 大稻賭埕之夜
 * Multi-source Background Music & Ambient Synthesizer
 * 
 * [Zero AI / Zero External API Guarantee]:
 * 100% Client-Side Pure Web Audio API & Standard HTMLAudioElement.
 * - Source 1: Pure Mathematical Procedural Audio Synthesizer (Paul Kellet's Pink Noise Algorithm + Web Audio OscillatorNodes + Biquad Filters). Zero network, zero external API, zero AI models.
 * - Source 2: Local User Audio File Stream (Standard HTML5 Audio via URL.createObjectURL, client-side only).
 */

export interface BgmTrackInfo {
  id: string;
  name: string;
  type: 'synth' | 'custom';
  description: string;
}

export const PRESET_SYNTH_TRACKS: BgmTrackInfo[] = [
  {
    id: 'synth-midnight-chill',
    name: '♫ 1. 雨夜微醺爵士 (Lo-Fi Jazz)',
    type: 'synth',
    description: '深夜酒吧窗外細雨、Rhodes 柔和爵士和弦與溫暖低音',
  },
  {
    id: 'synth-cyber-neon',
    name: '♫ 2. 賽博霓虹脈動 (Cyberpunk Pulse)',
    type: 'synth',
    description: '80s 復古合成器、16 分音符琶音 Bass 與節奏脈動',
  },
  {
    id: 'synth-zen-garden',
    name: '♫ 3. 和風禪意枯山水 (Zen Garden)',
    type: 'synth',
    description: '竹林水滴音、五聲音階尺八氛圍與空靈水琴窟',
  },
  {
    id: 'synth-bossa-nova',
    name: '♫ 4. 摩納哥巴薩諾瓦 (Bossa Nova)',
    type: 'synth',
    description: '輕快沙錘節奏、溫暖吉他切分和弦與優雅俱樂部貴賓廳',
  },
  {
    id: 'synth-cosmic-space',
    name: '♫ 5. 深空無重力冥想 (Space Ambient)',
    type: 'synth',
    description: '雙耳拍頻放鬆、星空水晶音色與超寬廣慢速流動 Pad',
  },
];

type BgmListener = () => void;

class BgmEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.5; // 0.0 to 1.0
  private currentTrackId: string = 'synth-midnight-chill';
  private currentTrackName: string = '♫ Midnight Chill Lo-Fi';

  // Web Audio Synth Nodes
  private ambientNoiseSource: AudioNode | null = null;
  private ambientNoiseGain: GainNode | null = null;
  private musicIntervalId: any = null;
  private activeSynthNodes: { oscs: OscillatorNode[]; gain: GainNode }[] = [];

  // Custom Audio Element (for local MP3s)
  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private customTrackUrl: string | null = null;
  private customTrackName: string | null = null;

  private listeners: Set<BgmListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('casino_bgm_volume');
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          this.volume = val;
        }
      }
      const savedTrack = localStorage.getItem('casino_bgm_track_id');
      if (savedTrack) {
        const found = PRESET_SYNTH_TRACKS.find((t) => t.id === savedTrack);
        if (found) {
          this.currentTrackId = found.id;
          this.currentTrackName = found.name;
        }
      }
    }
  }

  public subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTrackName(): string {
    if (this.currentTrackId === 'custom' && this.customTrackName) {
      return `♫ ${this.customTrackName}`;
    }
    return this.currentTrackName;
  }

  public getCurrentTrackId(): string {
    return this.currentTrackId;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('casino_bgm_volume', this.volume.toString());
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.notify();
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  }

  // ==========================================
  // PLAY / PAUSE CONTROLS
  // ==========================================
  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public play() {
    this.initCtx();
    if (this.currentTrackId === 'custom' && this.audioElement) {
      this.playCustomAudio();
    } else {
      this.startSynthBgm(this.currentTrackId);
    }
    this.isPlaying = true;
    this.notify();
  }

  public pause() {
    this.stopSynthBgm();
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isPlaying = false;
    this.notify();
  }

  public selectTrack(trackId: string) {
    this.currentTrackId = trackId;
    const found = PRESET_SYNTH_TRACKS.find((t) => t.id === trackId);
    if (found) {
      this.currentTrackName = found.name;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('casino_bgm_track_id', trackId);
    }

    if (this.isPlaying) {
      this.stopSynthBgm();
      if (this.audioElement) {
        this.audioElement.pause();
      }
      if (trackId === 'custom') {
        this.playCustomAudio();
      } else {
        this.startSynthBgm(trackId);
      }
    }
    this.notify();
  }

  // ==========================================
  // 5 DISTINCT PROCEDURAL SYNTHESIZERS
  // ==========================================
  private startSynthBgm(trackId: string) {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    this.stopSynthBgm();

    switch (trackId) {
      case 'synth-cyber-neon':
        this.startCyberpunkEngine();
        break;
      case 'synth-zen-garden':
        this.startZenGardenEngine();
        break;
      case 'synth-bossa-nova':
        this.startBossaNovaEngine();
        break;
      case 'synth-cosmic-space':
        this.startCosmicSpaceEngine();
        break;
      case 'synth-midnight-chill':
      default:
        this.startLofiJazzEngine();
        break;
    }
  }

  // ----------------------------------------------------
  // ENGINE 1: LO-FI JAZZ & MIDNIGHT RAIN
  // ----------------------------------------------------
  private startLofiJazzEngine() {
    if (!this.ctx || !this.masterGain) return;
    this.createPinkNoiseRain(900, 0.18);

    const progressions = [
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [98.0, 174.61, 246.94, 329.63, 440.0],  // G13
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
      [110.0, 196.0, 261.63, 329.63, 493.88],  // Am9
    ];

    let chordIdx = 0;
    const duration = 4.6;

    const playChord = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const freqs = progressions[chordIdx % progressions.length];
      chordIdx++;
      const now = this.ctx.currentTime;
      const oscs: OscillatorNode[] = [];
      const chordGain = this.ctx.createGain();

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(360, now + duration);

      chordGain.gain.setValueAtTime(0.001, now);
      chordGain.gain.exponentialRampToValueAtTime(0.14, now + 0.8);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.4);

      freqs.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + duration + 0.5);
        oscs.push(osc);
      });

      filter.connect(chordGain);
      chordGain.connect(this.masterGain);
      this.activeSynthNodes.push({ oscs, gain: chordGain });
    };

    playChord();
    this.musicIntervalId = setInterval(playChord, duration * 1000);
  }

  // ----------------------------------------------------
  // ENGINE 2: CYBERPUNK NEON PULSE (Fast Arpeggios + Kick Pulse)
  // ----------------------------------------------------
  private startCyberpunkEngine() {
    if (!this.ctx || !this.masterGain) return;

    const arpScale = [110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63];
    let step = 0;
    const bpm = 120;
    const stepTime = 60 / bpm / 2; // 16th note step = 0.25s

    const tick = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const oscs: OscillatorNode[] = [];

      // 1. Kick on every beat (step % 4 === 0)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
        kickGain.gain.setValueAtTime(0.24, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.22);
        oscs.push(kickOsc);
      }

      // 2. 16th-note Synthwave Saw Bass Arp
      const noteFreq = arpScale[(step * 3) % arpScale.length];
      const arpOsc = this.ctx.createOscillator();
      const arpFilter = this.ctx.createBiquadFilter();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'sawtooth';
      arpOsc.frequency.setValueAtTime(noteFreq, now);

      arpFilter.type = 'lowpass';
      arpFilter.Q.setValueAtTime(4, now);
      arpFilter.frequency.setValueAtTime(1400, now);
      arpFilter.frequency.exponentialRampToValueAtTime(320, now + stepTime * 0.9);

      arpGain.gain.setValueAtTime(0.09, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.95);

      arpOsc.connect(arpFilter);
      arpFilter.connect(arpGain);
      arpGain.connect(this.masterGain);

      arpOsc.start(now);
      arpOsc.stop(now + stepTime);
      oscs.push(arpOsc);

      this.activeSynthNodes.push({ oscs, gain: arpGain });
      step++;
    };

    tick();
    this.musicIntervalId = setInterval(tick, stepTime * 1000);
  }

  // ----------------------------------------------------
  // ENGINE 3: JAPANESE ZEN GARDEN (Suikinkutsu Water Drops & Insen Flute)
  // ----------------------------------------------------
  private startZenGardenEngine() {
    if (!this.ctx || !this.masterGain) return;
    this.createPinkNoiseRain(450, 0.08); // soft mountain breeze

    const pentatonic = [587.33, 622.25, 783.99, 880.0, 1046.5, 1174.66, 1567.98]; // D5, Eb5, G5, A5, C6, D6, G6
    let step = 0;

    const playZenTone = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const oscs: OscillatorNode[] = [];

      // Bamboo Water Drop (Suikinkutsu)
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const dropOsc = this.ctx.createOscillator();
      const dropGain = this.ctx.createGain();
      const dropFilter = this.ctx.createBiquadFilter();

      dropOsc.type = 'sine';
      dropOsc.frequency.setValueAtTime(freq, now);

      dropFilter.type = 'bandpass';
      dropFilter.Q.setValueAtTime(12, now);
      dropFilter.frequency.setValueAtTime(freq, now);

      dropGain.gain.setValueAtTime(0.18, now);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      dropOsc.connect(dropFilter);
      dropFilter.connect(dropGain);
      dropGain.connect(this.masterGain);

      dropOsc.start(now);
      dropOsc.stop(now + 1.9);
      oscs.push(dropOsc);

      // Shakuhachi Flute Breath Note every 4 steps
      if (step % 3 === 0) {
        const fluteOsc = this.ctx.createOscillator();
        const fluteGain = this.ctx.createGain();
        const fluteFilter = this.ctx.createBiquadFilter();

        fluteOsc.type = 'triangle';
        fluteOsc.frequency.setValueAtTime(freq / 2, now);

        fluteFilter.type = 'lowpass';
        fluteFilter.frequency.setValueAtTime(520, now);

        fluteGain.gain.setValueAtTime(0.001, now);
        fluteGain.gain.exponentialRampToValueAtTime(0.08, now + 0.8);
        fluteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

        fluteOsc.connect(fluteFilter);
        fluteFilter.connect(fluteGain);
        fluteGain.connect(this.masterGain);

        fluteOsc.start(now);
        fluteOsc.stop(now + 3.4);
        oscs.push(fluteOsc);
      }

      this.activeSynthNodes.push({ oscs, gain: dropGain });
      step++;
    };

    playZenTone();
    this.musicIntervalId = setInterval(playZenTone, 1400);
  }

  // ----------------------------------------------------
  // ENGINE 4: MONACO BOSSA NOVA (Syncopated Guitar + Shaker)
  // ----------------------------------------------------
  private startBossaNovaEngine() {
    if (!this.ctx || !this.masterGain) return;

    const chords = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 370.0],  // G7#11
      [164.81, 196.0, 246.94, 329.63], // Em7
      [220.0, 277.18, 329.63, 415.3],  // A7b13
    ];

    const bassNotes = [87.31, 98.0, 82.41, 110.0];
    let step = 0;
    const beatTime = 0.35; // ~85 BPM

    const tick = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const oscs: OscillatorNode[] = [];

      const currentChord = chords[Math.floor(step / 4) % chords.length];
      const currentBass = bassNotes[Math.floor(step / 4) % bassNotes.length];

      // 1. Shaker Percussion on every 8th note
      const shakerBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const data = shakerBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.012));
      }
      const shakerSource = this.ctx.createBufferSource();
      shakerSource.buffer = shakerBuffer;
      const shakerFilter = this.ctx.createBiquadFilter();
      shakerFilter.type = 'highpass';
      shakerFilter.frequency.setValueAtTime(3500, now);
      const shakerGain = this.ctx.createGain();
      shakerGain.gain.setValueAtTime(step % 2 === 0 ? 0.08 : 0.04, now);
      shakerSource.connect(shakerFilter);
      shakerFilter.connect(shakerGain);
      shakerGain.connect(this.masterGain);
      shakerSource.start(now);

      // 2. Bossa Nova Bass on 1 and 3
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(currentBass, now);
        bassGain.gain.setValueAtTime(0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + beatTime * 0.9);
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        bassOsc.start(now);
        bassOsc.stop(now + beatTime);
        oscs.push(bassOsc);
      }

      // 3. Syncopated Nylon Comping Chords
      if (step % 4 === 1 || step % 4 === 2) {
        const chordGain = this.ctx.createGain();
        chordGain.gain.setValueAtTime(0.1, now);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + beatTime * 0.7);

        currentChord.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(chordGain);
          osc.start(now);
          osc.stop(now + beatTime * 0.8);
          oscs.push(osc);
        });

        chordGain.connect(this.masterGain);
        this.activeSynthNodes.push({ oscs, gain: chordGain });
      }

      step++;
    };

    tick();
    this.musicIntervalId = setInterval(tick, beatTime * 1000);
  }

  // ----------------------------------------------------
  // ENGINE 5: DEEP SPACE BINAURAL AMBIENT (Zero Drums, Theta Wave Meditation)
  // ----------------------------------------------------
  private startCosmicSpaceEngine() {
    if (!this.ctx || !this.masterGain) return;

    const baseFreq = 144.0;
    const now = this.ctx.currentTime;
    const oscs: OscillatorNode[] = [];
    const spaceGain = this.ctx.createGain();

    spaceGain.gain.setValueAtTime(0.001, now);
    spaceGain.gain.exponentialRampToValueAtTime(0.16, now + 2.0);

    // Binaural Drone: 144Hz & 150Hz (6Hz Theta Beating)
    [baseFreq, baseFreq + 6, baseFreq * 1.5, baseFreq * 2.25].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      osc.connect(filter);
      filter.connect(spaceGain);
      osc.start(now);
      oscs.push(osc);
    });

    spaceGain.connect(this.masterGain);
    this.activeSynthNodes.push({ oscs, gain: spaceGain });

    // Random Celestial Glass Sparkles
    const sparkleInterval = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const curNow = this.ctx.currentTime;
      const glassFreqs = [1200, 1440, 1800, 2160, 2880];
      const sparkFreq = glassFreqs[Math.floor(Math.random() * glassFreqs.length)];

      const sparkOsc = this.ctx.createOscillator();
      const sparkGain = this.ctx.createGain();
      sparkOsc.type = 'sine';
      sparkOsc.frequency.setValueAtTime(sparkFreq, curNow);

      sparkGain.gain.setValueAtTime(0.06, curNow);
      sparkGain.gain.exponentialRampToValueAtTime(0.0001, curNow + 2.5);

      sparkOsc.connect(sparkGain);
      sparkGain.connect(this.masterGain);
      sparkOsc.start(curNow);
      sparkOsc.stop(curNow + 2.6);
    };

    this.musicIntervalId = setInterval(sparkleInterval, 2200);
  }

  private createPinkNoiseRain(filterFreq: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = noiseBuffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
          b6 = white * 0.115926;
        }
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

      const rainGain = this.ctx.createGain();
      rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      rainGain.gain.exponentialRampToValueAtTime(gainLevel, this.ctx.currentTime + 1.2);

      noiseNode.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.masterGain);

      noiseNode.start();
      this.ambientNoiseSource = noiseNode;
      this.ambientNoiseGain = rainGain;
    } catch {
      // ignore
    }
  }

  private stopSynthBgm() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }

    if (this.ambientNoiseSource && this.ambientNoiseGain && this.ctx) {
      try {
        this.ambientNoiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          if (this.ambientNoiseSource) {
            (this.ambientNoiseSource as AudioBufferSourceNode).stop();
            this.ambientNoiseSource.disconnect();
            this.ambientNoiseSource = null;
          }
        }, 350);
      } catch {
        // ignore
      }
    }

    this.activeSynthNodes.forEach(({ oscs, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        }
        oscs.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
    });
    this.activeSynthNodes = [];
  }

  // ==========================================
  // SOURCE 2: CUSTOM LOCAL MP3 / AUDIO FILE
  // ==========================================
  public loadCustomAudioFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (this.customTrackUrl) {
          URL.revokeObjectURL(this.customTrackUrl);
        }

        const objectUrl = URL.createObjectURL(file);
        this.customTrackUrl = objectUrl;
        this.customTrackName = file.name.replace(/\.[^/.]+$/, ''); // remove extension
        this.currentTrackId = 'custom';
        this.currentTrackName = `♫ ${this.customTrackName}`;

        if (!this.audioElement) {
          this.audioElement = new Audio();
          this.audioElement.loop = true;
        }

        this.audioElement.src = objectUrl;
        this.audioElement.volume = this.volume;

        if (this.isPlaying) {
          this.stopSynthBgm();
          this.playCustomAudio();
        }

        this.notify();
        resolve(this.customTrackName);
      } catch (err) {
        reject(err);
      }
    });
  }

  private playCustomAudio() {
    if (!this.audioElement) return;
    this.audioElement.volume = this.volume;
    this.audioElement
      .play()
      .then(() => {
        this.isPlaying = true;
        this.notify();
      })
      .catch((e) => {
        console.warn('Custom audio playback requires user interaction:', e);
      });
  }
}

export const bgmEngine = new BgmEngine();
