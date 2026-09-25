/**
 * Breath Resonance - Web Audio Engine
 * Pure synthesized soothing audio with zero external dependencies.
 * Includes Tibetan Singing Bowl, Ambient Pad Swell, Ocean Breeze, 432Hz Solfeggio, and Voice cues.
 */

class BreathAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.padGain = null;
    this.padFilter = null;
    this.padOscs = [];
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.binauralOscs = [];
    this.binauralGain = null;
    
    this.soundPack = 'gentle'; // 'gentle', 'bowl', 'ambient', 'ocean', 'binaural', 'chime', 'silent'
    this.volume = 0.75;
    this.voiceEnabled = false;
    this.hapticsEnabled = true;
    this.isInitialized = false;
    this.isPlayingAmbient = false;
  }

  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setSoundPack(pack) {
    this.soundPack = pack;
    if (pack !== 'ambient' && pack !== 'ocean' && pack !== 'binaural') {
      this.stopContinuousSounds();
    }
  }

  triggerHaptic(pattern = [30]) {
    if (this.hapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  // --- Voice Prompts ---
  speak(text) {
    if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.95;
      utterance.volume = this.volume * 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }

  // --- Phase Transition Cue ---
  playPhaseCue(phaseName, breathProgress = 0) {
    this.init();
    if (!this.ctx) return;

    // Haptics on phase transition
    if (phaseName === 'inhale') {
      this.triggerHaptic([35]);
    } else if (phaseName === 'hold-in' || phaseName === 'hold-out') {
      this.triggerHaptic([20, 40, 20]);
    } else if (phaseName === 'exhale') {
      this.triggerHaptic([45]);
    }

    // Voice cue
    if (this.voiceEnabled) {
      const promptMap = {
        'inhale': 'Inhale',
        'hold-in': 'Hold',
        'exhale': 'Exhale',
        'hold-out': 'Rest'
      };
      if (promptMap[phaseName]) {
        this.speak(promptMap[phaseName]);
      }
    }

    // Sound pack triggers
    if (this.soundPack === 'gentle') {
      // Gentle breath whisper — soft sine swell, no hard strike
      const pitchMap = {
        'inhale':   [285, 360],  // rising: warm D4 + soft F4 overtone
        'hold-in':  [285, 285],  // sustained hum
        'exhale':   [213, 285],  // falling: soft G3 + D4
        'hold-out': [180, 213]   // rest: very low quiet tone
      };
      this.playGentleCue(pitchMap[phaseName] || [240, 300], phaseName);
    } else if (this.soundPack === 'bowl') {
      const pitchMap = {
        'inhale': 216,
        'hold-in': 288,
        'exhale': 192,
        'hold-out': 162
      };
      const freq = pitchMap[phaseName] || 216;
      this.playSingingBowl(freq);
    } else if (this.soundPack === 'chime') {
      const pitchMap = {
        'inhale': 528,
        'hold-in': 639,
        'exhale': 432,
        'hold-out': 396
      };
      this.playZenBell(pitchMap[phaseName] || 432);
    }
  }

  // --- Realtime Sound Modulation (for Ambient Pad & Ocean) ---
  updateBreathModulation(phaseName, phaseProgress, continuousExpansion) {
    // continuousExpansion ranges from 0.0 (empty lungs) to 1.0 (full lungs)
    if (!this.ctx || !this.isInitialized) return;

    if (this.soundPack === 'ambient') {
      this.ensureAmbientPadRunning();
      if (this.padFilter && this.padGain) {
        const now = this.ctx.currentTime;
        // Sweeping filter cutoff from 220Hz to 1100Hz as lungs expand
        const cutoff = 240 + continuousExpansion * 900;
        this.padFilter.frequency.setTargetAtTime(cutoff, now, 0.1);
        
        // Gentle swell in volume
        const gainLevel = 0.15 + continuousExpansion * 0.25;
        this.padGain.gain.setTargetAtTime(gainLevel, now, 0.1);
      }
    } else if (this.soundPack === 'ocean') {
      this.ensureOceanRunning();
      if (this.noiseFilter && this.noiseGain) {
        const now = this.ctx.currentTime;
        // Ocean tide rises on inhale and falls on exhale
        const cutoff = 180 + Math.pow(continuousExpansion, 1.4) * 850;
        this.noiseFilter.frequency.setTargetAtTime(cutoff, now, 0.1);
        const gainVal = 0.05 + continuousExpansion * 0.22;
        this.noiseGain.gain.setTargetAtTime(gainVal, now, 0.1);
      }
    } else if (this.soundPack === 'binaural') {
      this.ensureBinauralRunning();
    }
  }

  // -----------------------------------------------------------------------
  // --- NEW: Gentle Breath Cue (Default) ---
  // Slow 500ms sine fade-in with optional whisper-breath noise layer.
  // Completely removes the jarring "strike" — feels like a soft inhale itself.
  // -----------------------------------------------------------------------
  playGentleCue(freqs = [285, 360], phaseName = 'inhale') {
    if (!this.ctx || this.soundPack === 'silent') return;
    const now = this.ctx.currentTime;

    // Volume scale: holds are barely audible, active phases are soft but clear
    const gainMap = {
      'inhale':   0.18,
      'hold-in':  0.06,
      'exhale':   0.15,
      'hold-out': 0.04
    };
    const peakGain = gainMap[phaseName] || 0.15;

    // Attack ramp: slow & smooth — 500ms for active, 800ms for holds
    const attackTime = (phaseName === 'hold-in' || phaseName === 'hold-out') ? 0.8 : 0.5;
    const decayTime  = (phaseName === 'hold-in' || phaseName === 'hold-out') ? 3.0 : 3.5;

    freqs.forEach((freq, i) => {
      const osc     = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      // Very subtle detune between the two partials for warmth (no metallic quality)
      osc.frequency.setValueAtTime(freq + (i === 1 ? 0.5 : 0), now);

      // Silky S-curve envelope: silence → slow rise → long gentle fade
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(peakGain * (i === 0 ? 1.0 : 0.4), now + attackTime);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + attackTime + decayTime + 0.1);
    });

    // Add a soft breath-wind texture on inhale and exhale only
    if (phaseName === 'inhale' || phaseName === 'exhale') {
      this.playBreathWhisper(phaseName);
    }
  }

  // Soft breath-wind whisper using very quiet filtered noise
  playBreathWhisper(phaseName = 'inhale') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Tiny 0.8s noise buffer
    const bufLen = Math.floor(this.ctx.sampleRate * 0.8);
    const buf    = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data   = buf.getChannelData(0);
    // Gentle white noise (lower amplitude than pink — airy, not hissy)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

    const src    = this.ctx.createBufferSource();
    src.buffer   = buf;

    // Band-pass around 1–3 kHz for airy breath texture
    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(phaseName === 'inhale' ? 1800 : 1200, now);
    bpf.Q.setValueAtTime(0.8, now);

    const noiseGain = this.ctx.createGain();
    // Inhale whisper fades in; exhale fades out — mirrors breath direction
    noiseGain.gain.setValueAtTime(0.0001, now);
    if (phaseName === 'inhale') {
      noiseGain.gain.linearRampToValueAtTime(0.035, now + 0.4);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    } else {
      noiseGain.gain.linearRampToValueAtTime(0.028, now + 0.15);
      noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    }

    src.connect(bpf);
    bpf.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.85);
  }

  // --- Tibetan Singing Bowl Synthesis (original, kept for 'bowl' pack) ---
  playSingingBowl(baseFreq = 216) {
    if (!this.ctx || this.soundPack === 'silent') return;
    const now = this.ctx.currentTime;

    // Softer attack than original — 0.12s instead of 0.04s, lower gain
    const partials = [
      { ratio: 1.0,  gain: 0.28, decay: 4.2 },
      { ratio: 2.76, gain: 0.16, decay: 3.2 },
      { ratio: 4.76, gain: 0.08, decay: 2.1 },
      { ratio: 5.40, gain: 0.05, decay: 1.8 }
    ];

    partials.forEach((p, idx) => {
      const osc     = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const detuneSpread = (idx % 2 === 0 ? 1 : -1) * 0.8;
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * p.ratio + detuneSpread, now);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(p.gain, now + 0.12); // softer attack
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  // --- Pure Zen Chime Bell ---
  playZenBell(freq = 528) {
    if (!this.ctx || this.soundPack === 'silent') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 2.02, now); // Metallic overtone

    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    osc.connect(bellGain);
    subOsc.connect(bellGain);
    bellGain.connect(this.masterGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 3.1);
    subOsc.stop(now + 3.1);
  }

  // --- End Session Gong ---
  playCompletionGong() {
    this.init();
    if (!this.ctx) return;
    this.playSingingBowl(144);
    setTimeout(() => this.playSingingBowl(216), 400);
    setTimeout(() => this.playSingingBowl(288), 900);
    this.triggerHaptic([60, 100, 60, 100, 120]);
  }

  // --- Continuous Ambient Pad (Moby Style Lush Pad) ---
  ensureAmbientPadRunning() {
    if (this.padOscs.length > 0) return;
    const now = this.ctx.currentTime;

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.setValueAtTime(260, now);
    this.padFilter.Q.setValueAtTime(2.5, now);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0.0001, now);
    this.padGain.gain.linearRampToValueAtTime(0.2, now + 2.0);

    // Warm chord: C3 (130.81Hz), G3 (196.00Hz), C4 (261.63Hz), E4 (329.63Hz)
    const notes = [130.81, 196.00, 261.63, 329.63];
    this.padOscs = notes.map((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Detune for chorus richness
      osc.detune.setValueAtTime((i - 1.5) * 5, now);
      osc.connect(this.padFilter);
      osc.start(now);
      return osc;
    });

    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);
    this.isPlayingAmbient = true;
  }

  // --- Continuous Ocean Breeze Noise Generator ---
  ensureOceanRunning() {
    if (this.noiseNode) return;
    const now = this.ctx.currentTime;

    // Generate 4 seconds of smooth pink/brown noise in a buffer
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.setValueAtTime(220, now);
    this.noiseFilter.Q.setValueAtTime(1.8, now);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.0001, now);
    this.noiseGain.gain.linearRampToValueAtTime(0.12, now + 1.5);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    this.noiseNode.start(now);
  }

  // --- Binaural 432 Hz / 528 Hz Healing Frequency ---
  ensureBinauralRunning() {
    if (this.binauralOscs.length > 0) return;
    const now = this.ctx.currentTime;

    this.binauralGain = this.ctx.createGain();
    this.binauralGain.gain.setValueAtTime(0.0001, now);
    this.binauralGain.gain.linearRampToValueAtTime(0.18, now + 1.5);

    // 432 Hz left, 437.5 Hz right (5.5 Hz Theta wave binaural beat for deep meditation!)
    const leftOsc = this.ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(432, now);

    const rightOsc = this.ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(437.5, now);

    const merger = this.ctx.createChannelMerger(2);
    leftOsc.connect(merger, 0, 0);
    rightOsc.connect(merger, 0, 1);

    merger.connect(this.binauralGain);
    this.binauralGain.connect(this.masterGain);

    leftOsc.start(now);
    rightOsc.start(now);

    this.binauralOscs = [leftOsc, rightOsc];
  }

  stopContinuousSounds() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Fade out and stop pad
    if (this.padGain) {
      this.padGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        this.padOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
        this.padOscs = [];
        this.padFilter = null;
        this.padGain = null;
      }, 850);
    }

    // Fade out and stop noise
    if (this.noiseGain) {
      this.noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        if (this.noiseNode) {
          try { this.noiseNode.stop(); this.noiseNode.disconnect(); } catch(e){}
          this.noiseNode = null;
          this.noiseFilter = null;
          this.noiseGain = null;
        }
      }, 850);
    }

    // Fade out and stop binaural
    if (this.binauralGain) {
      this.binauralGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        this.binauralOscs.forEach(o => { try { o.stop(); o.disconnect(); } catch(e){} });
        this.binauralOscs = [];
        this.binauralGain = null;
      }, 850);
    }
    this.isPlayingAmbient = false;
  }
}

// Global audio singleton
window.breathAudio = new BreathAudioEngine();
