/**
 * Breath Resonance • Core Application Engine
 * High precision requestAnimationFrame timing loop, multi-phase breathwork,
 * Alternate Nostril breathing, Wake Lock API, and state persistence.
 */

// Preset ratios definition (in seconds: [inhale, holdIn, exhale, holdOut])
const RATIO_PRESETS = {
  'resonance': {
    name: 'Resonance Frequency',
    desc: 'Science-backed 5.5 BPM for heart rate coherence and vagal tone',
    times: [5.45, 0, 5.45, 0],
    isResonance: true,
    bpm: 5.5
  },
  'box': {
    name: 'Box Breathing (4-4-4-4)',
    desc: 'Navy SEAL technique for instant focus and stress reduction',
    times: [4, 4, 4, 4],
    bpm: 3.75
  },
  'sleep478': {
    name: '4-7-8 Sleep & Calm',
    desc: 'Dr. Andrew Weil method to slow heart rate and prepare for deep rest',
    times: [4, 7, 8, 0],
    bpm: 3.15
  },
  'calming12': {
    name: 'Parasympathetic Calming (1:2)',
    desc: 'Extended exhale activates the rest-and-digest nervous system',
    times: [4, 0, 8, 0],
    bpm: 5.0
  },
  'energizing': {
    name: 'Energizing Pranayama (2:1)',
    desc: 'Invigorating ratio to awaken the mind and boost energy',
    times: [6, 0, 3, 0],
    bpm: 6.66
  },
  'grounding': {
    name: 'Grounding Rhythm (4-2-6-2)',
    desc: 'Steadies the nervous system and eases racing thoughts',
    times: [4, 2, 6, 2],
    bpm: 4.28
  },
  'kids': {
    name: 'Kids Gentle Rhythm',
    desc: 'Easy 3s in, 3s out for children and gentle resets',
    times: [3, 0, 3, 0],
    bpm: 10.0
  },
  'custom': {
    name: 'Custom Ratio',
    desc: 'Personalized interval timing',
    times: [5, 0, 5, 0],
    bpm: 6.0
  }
};

class BreathApp {
  constructor() {
    // State
    this.isActive = false;
    this.selectedRatioKey = 'resonance';
    this.currentTimes = [...RATIO_PRESETS['resonance'].times];
    this.resonanceBpm = 5.5;
    
    this.visualMode = 'orb'; // 'orb', 'lotus', 'ring', 'wave'
    this.currentTheme = 'midnight';
    
    // Session Timer
    this.sessionDurationSec = 300; // 5 min default, 0 = unlimited
    this.sessionRemainingSec = 300;
    this.sessionTimerInterval = null;
    this.sessionElapsedSec = 0;
    
    // Alternate Nostril Breathing
    this.alternateNostrilEnabled = false;
    this.nostrilCycleStep = 0; // 0: Left In, 1: Right Out, 2: Right In, 3: Left Out

    // Animation / Phase Tracking
    this.phaseOrder = ['inhale', 'hold-in', 'exhale', 'hold-out'];
    this.currentPhaseIndex = 0;
    this.phaseElapsed = 0;
    this.lastTimestamp = null;
    this.animFrameId = null;
    this.wakeLock = null;

    // DOM Elements Cache
    this.initDOMElements();
    this.loadPersistedData();
    this.bindEvents();
    this.updateTheme(this.currentTheme);
    this.updateVisualMode(this.visualMode);
    this.updatePresetDisplay();
    this.initServiceWorker();
  }

  initDOMElements() {
    this.dom = {
      appContainer: document.getElementById('app-container'),
      playBtn: document.getElementById('play-btn'),
      playIcon: document.getElementById('play-icon'),
      pauseIcon: document.getElementById('pause-icon'),
      phaseText: document.getElementById('phase-text'),
      phaseCountdown: document.getElementById('phase-countdown'),
      nostrilCue: document.getElementById('nostril-cue'),
      nostrilText: document.getElementById('nostril-text'),
      stateMetaBadge: document.getElementById('state-meta-badge'),
      metaRatioText: document.getElementById('meta-ratio-text'),
      ratioQuickPill: document.getElementById('ratio-quick-pill'),
      quickPillName: document.getElementById('quick-pill-name'),
      
      // Visuals
      breathingOrb: document.getElementById('breathing-orb'),
      rippleRing1: document.getElementById('ripple-ring-1'),
      rippleRing2: document.getElementById('ripple-ring-2'),
      lotusContainer: document.getElementById('lotus-container'),
      lotusPetals: document.querySelectorAll('.lotus-petal'),
      zenRingContainer: document.getElementById('zen-ring-container'),
      zenRingProgress: document.getElementById('zen-ring-progress'),
      waveContainer: document.getElementById('wave-container'),
      waveFill: document.getElementById('wave-fill'),
      ambientHalo: document.getElementById('ambient-halo'),

      // Controls
      timerBtn: document.getElementById('timer-btn'),
      timerDisplay: document.getElementById('timer-display'),
      soundBtn: document.getElementById('sound-btn'),
      visualBtn: document.getElementById('visual-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      statsBtn: document.getElementById('stats-btn'),
      shareBtn: document.getElementById('share-btn'),

      // Modals
      ratiosModal: document.getElementById('ratios-modal'),
      soundModal: document.getElementById('sound-modal'),
      statsModal: document.getElementById('stats-modal'),
      shareModal: document.getElementById('share-modal'),
      timerModal: document.getElementById('timer-modal'),

      // Ratio Sheet Inputs
      bpmSlider: document.getElementById('bpm-slider'),
      bpmDisplay: document.getElementById('bpm-display'),
      customSlidersBox: document.getElementById('custom-sliders-box'),
      sliderInhale: document.getElementById('slider-inhale'),
      sliderHoldIn: document.getElementById('slider-hold-in'),
      sliderExhale: document.getElementById('slider-exhale'),
      sliderHoldOut: document.getElementById('slider-hold-out'),
      valInhale: document.getElementById('val-inhale'),
      valHoldIn: document.getElementById('val-hold-in'),
      valExhale: document.getElementById('val-exhale'),
      valHoldOut: document.getElementById('val-hold-out'),
      nostrilToggle: document.getElementById('nostril-toggle'),

      // Sound Sheet Inputs
      volumeSlider: document.getElementById('volume-slider'),
      voiceToggle: document.getElementById('voice-toggle'),
      hapticToggle: document.getElementById('haptic-toggle'),

      // Stats Elements
      statMinutes: document.getElementById('stat-minutes'),
      statSessions: document.getElementById('stat-sessions'),
      statStreak: document.getElementById('stat-streak'),

      // QR Code
      qrContainer: document.getElementById('qr-container')
    };
  }

  loadPersistedData() {
    try {
      const savedTheme = localStorage.getItem('br_theme');
      if (savedTheme) this.currentTheme = savedTheme;

      const savedVisual = localStorage.getItem('br_visual');
      if (savedVisual) this.visualMode = savedVisual;

      const savedRatio = localStorage.getItem('br_ratio');
      if (savedRatio && RATIO_PRESETS[savedRatio]) {
        this.selectedRatioKey = savedRatio;
        this.currentTimes = [...RATIO_PRESETS[savedRatio].times];
      }

      const savedBpm = localStorage.getItem('br_resonance_bpm');
      if (savedBpm) {
        this.resonanceBpm = parseFloat(savedBpm);
        if (this.selectedRatioKey === 'resonance') {
          const halfCycle = (60 / this.resonanceBpm) / 2;
          this.currentTimes = [halfCycle, 0, halfCycle, 0];
        }
      }

      const savedSoundPack = localStorage.getItem('br_sound_pack');
      if (savedSoundPack && window.breathAudio) {
        window.breathAudio.setSoundPack(savedSoundPack);
      } else {
        // Default to gentle whisper pack for all new visitors
        window.breathAudio.setSoundPack('gentle');
      }

      const savedVoice = localStorage.getItem('br_voice_enabled');
      if (savedVoice !== null && window.breathAudio) {
        window.breathAudio.voiceEnabled = savedVoice === 'true';
        if (this.dom.voiceToggle) this.dom.voiceToggle.checked = window.breathAudio.voiceEnabled;
      }

      const savedHaptic = localStorage.getItem('br_haptic_enabled');
      if (savedHaptic !== null && window.breathAudio) {
        window.breathAudio.hapticsEnabled = savedHaptic === 'true';
        if (this.dom.hapticToggle) this.dom.hapticToggle.checked = window.breathAudio.hapticsEnabled;
      }

      this.updateStatsDisplay();
    } catch (e) {
      console.warn('Storage read error:', e);
    }
  }

  bindEvents() {
    // Play/Pause Primary Action
    this.dom.playBtn.addEventListener('click', () => this.togglePlay());

    // Ratio Quick Pill & Selectors
    this.dom.ratioQuickPill.addEventListener('click', () => this.openModal(this.dom.ratiosModal));
    
    // Bottom Dock Actions
    this.dom.timerBtn.addEventListener('click', () => this.openModal(this.dom.timerModal));
    this.dom.soundBtn.addEventListener('click', () => this.openModal(this.dom.soundModal));
    this.dom.visualBtn.addEventListener('click', () => this.cycleVisualMode());
    this.dom.settingsBtn.addEventListener('click', () => this.openModal(this.dom.ratiosModal));
    this.dom.statsBtn.addEventListener('click', () => {
      this.updateStatsDisplay();
      this.openModal(this.dom.statsModal);
    });
    this.dom.shareBtn.addEventListener('click', () => {
      this.renderQRCode();
      this.openModal(this.dom.shareModal);
    });

    // Close Modals on Overlay or close button click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.modal-close-btn')) {
          this.closeModal(modal);
        }
      });
    });

    // Ratio Cards Selection
    document.querySelectorAll('.ratio-card').forEach(card => {
      card.addEventListener('click', () => {
        const ratioKey = card.dataset.ratio;
        this.selectRatio(ratioKey);
      });
    });

    // Resonance BPM Slider
    if (this.dom.bpmSlider) {
      this.dom.bpmSlider.addEventListener('input', (e) => {
        const bpm = parseFloat(e.target.value);
        this.setResonanceBpm(bpm);
      });
    }

    // Custom Sliders
    ['Inhale', 'HoldIn', 'Exhale', 'HoldOut'].forEach((phase) => {
      const slider = this.dom['slider' + phase];
      if (slider) {
        slider.addEventListener('input', () => this.updateCustomSliders());
      }
    });

    // Alternate Nostril Toggle
    if (this.dom.nostrilToggle) {
      this.dom.nostrilToggle.addEventListener('change', (e) => {
        this.alternateNostrilEnabled = e.target.checked;
        this.updateNostrilUI();
      });
    }

    // Sound Pack Buttons
    document.querySelectorAll('.sound-pack-card').forEach(card => {
      card.addEventListener('click', () => {
        const pack = card.dataset.sound;
        document.querySelectorAll('.sound-pack-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        window.breathAudio.setSoundPack(pack);
        localStorage.setItem('br_sound_pack', pack);
        // Play sample chime
        window.breathAudio.playPhaseCue('inhale');
      });
    });

    // Volume Slider
    if (this.dom.volumeSlider) {
      this.dom.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        window.breathAudio.setVolume(val);
      });
    }

    // Voice & Haptic Toggles
    if (this.dom.voiceToggle) {
      this.dom.voiceToggle.addEventListener('change', (e) => {
        window.breathAudio.voiceEnabled = e.target.checked;
        localStorage.setItem('br_voice_enabled', e.target.checked);
      });
    }
    if (this.dom.hapticToggle) {
      this.dom.hapticToggle.addEventListener('change', (e) => {
        window.breathAudio.hapticsEnabled = e.target.checked;
        localStorage.setItem('br_haptic_enabled', e.target.checked);
        if (e.target.checked) window.breathAudio.triggerHaptic([30]);
      });
    }

    // Theme Selector Buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        this.updateTheme(theme);
      });
    });

    // Timer Preset Buttons inside Timer Modal
    document.querySelectorAll('.timer-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.dataset.min, 10);
        this.setSessionDuration(minutes);
        document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.closeModal(this.dom.timerModal);
      });
    });

    // Native Web Share button inside Share Modal
    const nativeShareBtn = document.getElementById('native-share-trigger');
    if (nativeShareBtn) {
      nativeShareBtn.addEventListener('click', () => this.handleNativeShare());
    }

    const copyLinkBtn = document.getElementById('copy-link-trigger');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => this.copyAppUrl());
    }

    // Handle Page Visibility for Audio and Wake Lock
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isActive) {
        this.requestWakeLock();
      }
    });

    // Keyboard shortcut (Space to play/pause)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }

  // --- Breath Timing Loop ---
  togglePlay() {
    if (this.isActive) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isActive = true;
    // Initialize the AudioContext and force-unlock it on this user gesture.
    // This is the critical fix for iOS Safari which blocks audio until
    // resume() is called synchronously inside a touch/click handler.
    window.breathAudio.init();
    window.breathAudio.unlockAudio();
    if (window.breathAudio.ctx && window.breathAudio.ctx.state === 'suspended') {
      window.breathAudio.ctx.resume().catch(() => {});
    }

    this.dom.playIcon.style.display = 'none';
    this.dom.pauseIcon.style.display = 'block';
    this.dom.playBtn.setAttribute('aria-label', 'Pause Breathing');

    this.lastTimestamp = performance.now();
    this.animFrameId = requestAnimationFrame((ts) => this.tick(ts));
    this.startSessionTimer();

    // Trigger initial phase cue
    const currentPhase = this.phaseOrder[this.currentPhaseIndex];
    window.breathAudio.playPhaseCue(currentPhase);
    this.updateNostrilUI();
  }

  pause() {
    this.isActive = false;
    this.releaseWakeLock();
    window.breathAudio.stopContinuousSounds();

    this.dom.playIcon.style.display = 'block';
    this.dom.pauseIcon.style.display = 'none';
    this.dom.playBtn.setAttribute('aria-label', 'Start Breathing');

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.stopSessionTimer();
  }

  tick(timestamp) {
    if (!this.isActive) return;

    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const phaseDuration = this.currentTimes[this.currentPhaseIndex];

    // If duration is 0, skip immediately to next phase
    if (phaseDuration <= 0) {
      this.advanceToNextPhase();
      this.animFrameId = requestAnimationFrame((ts) => this.tick(ts));
      return;
    }

    this.phaseElapsed += delta;

    if (this.phaseElapsed >= phaseDuration) {
      this.phaseElapsed -= phaseDuration;
      this.advanceToNextPhase();
    }

    this.renderCurrentPhaseProgress();
    this.animFrameId = requestAnimationFrame((ts) => this.tick(ts));
  }

  advanceToNextPhase() {
    this.currentPhaseIndex = (this.currentPhaseIndex + 1) % 4;
    
    // Skip 0-duration phases
    while (this.currentTimes[this.currentPhaseIndex] <= 0) {
      this.currentPhaseIndex = (this.currentPhaseIndex + 1) % 4;
    }

    // If we completed a full cycle (back to inhale), advance nostril step if alternate nostril is on
    if (this.currentPhaseIndex === 0) {
      if (this.alternateNostrilEnabled) {
        this.nostrilCycleStep = (this.nostrilCycleStep + 1) % 4;
        this.updateNostrilUI();
      }
    }

    const nextPhase = this.phaseOrder[this.currentPhaseIndex];
    window.breathAudio.playPhaseCue(nextPhase);
  }

  renderCurrentPhaseProgress() {
    const phaseName = this.phaseOrder[this.currentPhaseIndex];
    const duration = Math.max(0.1, this.currentTimes[this.currentPhaseIndex]);
    const progress = Math.min(1, Math.max(0, this.phaseElapsed / duration));
    const remainingSeconds = Math.max(0, (duration - this.phaseElapsed)).toFixed(1);

    // Phase label
    let phaseLabel = 'Inhale';
    let continuousExpansion = 0; // 0 (empty) to 1 (full lungs)

    if (phaseName === 'inhale') {
      phaseLabel = 'Inhale';
      continuousExpansion = progress;
    } else if (phaseName === 'hold-in') {
      phaseLabel = 'Hold';
      continuousExpansion = 1.0;
    } else if (phaseName === 'exhale') {
      phaseLabel = 'Exhale';
      continuousExpansion = 1.0 - progress;
    } else if (phaseName === 'hold-out') {
      phaseLabel = 'Rest';
      continuousExpansion = 0.0;
    }

    this.dom.phaseText.textContent = phaseLabel;
    this.dom.phaseCountdown.textContent = remainingSeconds + 's';

    // Render Visuals based on continuousExpansion (0 to 1)
    this.renderVisuals(continuousExpansion, progress, phaseName);

    // Audio frequency and noise sweep modulation
    window.breathAudio.updateBreathModulation(phaseName, progress, continuousExpansion);
  }

  renderVisuals(expansion, phaseProgress, phaseName) {
    // 1. Orb Visual: Scale from 0.75 to 1.38
    const orbScale = 0.75 + expansion * 0.63;
    const ripple1Scale = 0.82 + expansion * 0.55;
    const ripple2Scale = 0.90 + expansion * 0.45;

    if (this.dom.breathingOrb) {
      this.dom.breathingOrb.style.transform = `scale(${orbScale})`;
    }
    if (this.dom.rippleRing1) {
      this.dom.rippleRing1.style.transform = `scale(${ripple1Scale})`;
      this.dom.rippleRing1.style.opacity = (0.2 + expansion * 0.35).toString();
    }
    if (this.dom.rippleRing2) {
      this.dom.rippleRing2.style.transform = `scale(${ripple2Scale})`;
      this.dom.rippleRing2.style.opacity = (0.1 + expansion * 0.25).toString();
    }
    if (this.dom.ambientHalo) {
      this.dom.ambientHalo.style.transform = `translate(-50%, -50%) scale(${0.85 + expansion * 0.45})`;
      this.dom.ambientHalo.style.opacity = (0.3 + expansion * 0.35).toString();
    }

    // 2. Lotus Petals Blooming
    if (this.visualMode === 'lotus' && this.dom.lotusPetals.length > 0) {
      this.dom.lotusPetals.forEach((petal, i) => {
        const baseAngle = i * (360 / 12);
        const petalSpread = 10 + expansion * 26; // petals unfold
        const petalScale = 0.8 + expansion * 0.4;
        petal.style.transform = `rotate(${baseAngle}deg) translateY(-${petalSpread}px) scale(${petalScale})`;
      });
    }

    // 3. Zen Ring Progress
    if (this.visualMode === 'ring' && this.dom.zenRingProgress) {
      const circumference = 691;
      let ringProgress = 0;
      if (phaseName === 'inhale') {
        ringProgress = phaseProgress;
      } else if (phaseName === 'hold-in') {
        ringProgress = 1.0;
      } else if (phaseName === 'exhale') {
        ringProgress = 1.0 - phaseProgress;
      } else {
        ringProgress = 0;
      }
      const offset = circumference * (1 - ringProgress);
      this.dom.zenRingProgress.style.strokeDashoffset = offset.toString();
    }

    // 4. Wave Fill Level
    if (this.visualMode === 'wave' && this.dom.waveFill) {
      const heightPercent = 20 + expansion * 75;
      this.dom.waveFill.style.height = `${heightPercent}%`;
    }
  }

  // --- Alternate Nostril Breathing UI ---
  updateNostrilUI() {
    if (!this.alternateNostrilEnabled) {
      this.dom.nostrilCue.style.display = 'none';
      return;
    }

    this.dom.nostrilCue.style.display = 'inline-flex';
    // Cycle:
    // 0: Left Inhale
    // 1: Right Exhale
    // 2: Right Inhale
    // 3: Left Exhale
    const steps = [
      '👈 Left Nostril (Close Right)',
      '👉 Right Nostril (Close Left)',
      '👉 Right Nostril (Close Left)',
      '👈 Left Nostril (Close Right)'
    ];
    this.dom.nostrilText.textContent = steps[this.nostrilCycleStep] || 'Alternate Nostril';
  }

  // --- Ratio & Technique Selection ---
  selectRatio(key) {
    if (!RATIO_PRESETS[key]) return;
    this.selectedRatioKey = key;
    const preset = RATIO_PRESETS[key];

    if (preset.isResonance) {
      const halfCycle = (60 / this.resonanceBpm) / 2;
      this.currentTimes = [halfCycle, 0, halfCycle, 0];
      if (this.dom.bpmSlider) this.dom.bpmSlider.parentElement.style.display = 'flex';
      if (this.dom.customSlidersBox) this.dom.customSlidersBox.style.display = 'none';
    } else if (key === 'custom') {
      if (this.dom.bpmSlider) this.dom.bpmSlider.parentElement.style.display = 'none';
      if (this.dom.customSlidersBox) this.dom.customSlidersBox.style.display = 'flex';
      this.updateCustomSliders();
    } else {
      this.currentTimes = [...preset.times];
      if (this.dom.bpmSlider) this.dom.bpmSlider.parentElement.style.display = 'none';
      if (this.dom.customSlidersBox) this.dom.customSlidersBox.style.display = 'none';
    }

    // Update active card styling
    document.querySelectorAll('.ratio-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.ratio === key);
    });

    // Reset phase timing smoothly
    this.currentPhaseIndex = 0;
    this.phaseElapsed = 0;
    this.updatePresetDisplay();
    localStorage.setItem('br_ratio', key);
  }

  setResonanceBpm(bpm) {
    this.resonanceBpm = Math.round(bpm * 10) / 10;
    if (this.dom.bpmDisplay) {
      this.dom.bpmDisplay.textContent = this.resonanceBpm.toFixed(1) + ' BPM';
    }
    const halfCycle = (60 / this.resonanceBpm) / 2;
    this.currentTimes = [halfCycle, 0, halfCycle, 0];
    this.updatePresetDisplay();
    localStorage.setItem('br_resonance_bpm', this.resonanceBpm.toString());
  }

  updateCustomSliders() {
    const inhale = parseFloat(this.dom.sliderInhale.value);
    const holdIn = parseFloat(this.dom.sliderHoldIn.value);
    const exhale = parseFloat(this.dom.sliderExhale.value);
    const holdOut = parseFloat(this.dom.sliderHoldOut.value);

    this.dom.valInhale.textContent = inhale + 's';
    this.dom.valHoldIn.textContent = holdIn + 's';
    this.dom.valExhale.textContent = exhale + 's';
    this.dom.valHoldOut.textContent = holdOut + 's';

    this.currentTimes = [inhale, holdIn, exhale, holdOut];
    const totalCycle = inhale + holdIn + exhale + holdOut;
    const bpm = totalCycle > 0 ? (60 / totalCycle).toFixed(1) : '0';

    this.updatePresetDisplay(bpm);
  }

  updatePresetDisplay(customBpm = null) {
    const preset = RATIO_PRESETS[this.selectedRatioKey];
    this.dom.quickPillName.textContent = preset ? preset.name : 'Breathing';

    let bpmText = '';
    if (preset.isResonance) {
      bpmText = `${this.resonanceBpm.toFixed(1)} BPM • Coherent State`;
    } else if (customBpm) {
      bpmText = `${customBpm} BPM • Custom Rhythm`;
    } else {
      bpmText = `${preset.bpm} BPM • ${preset.name}`;
    }
    this.dom.metaRatioText.textContent = bpmText;
  }

  // --- Session Duration Timer ---
  setSessionDuration(minutes) {
    if (minutes === 0) {
      // Unlimited
      this.sessionDurationSec = 0;
      this.sessionRemainingSec = 0;
      this.dom.timerDisplay.textContent = '∞ Unlimited';
    } else {
      this.sessionDurationSec = minutes * 60;
      this.sessionRemainingSec = this.sessionDurationSec;
      this.updateTimerDockDisplay();
    }
  }

  startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimerInterval = setInterval(() => {
      this.sessionElapsedSec++;
      if (this.sessionDurationSec > 0) {
        this.sessionRemainingSec--;
        this.updateTimerDockDisplay();

        if (this.sessionRemainingSec <= 0) {
          this.completeSession();
        }
      } else {
        // Unlimited duration display counting up
        const mins = Math.floor(this.sessionElapsedSec / 60);
        const secs = this.sessionElapsedSec % 60;
        this.dom.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }, 1000);
  }

  stopSessionTimer() {
    if (this.sessionTimerInterval) {
      clearInterval(this.sessionTimerInterval);
      this.sessionTimerInterval = null;
    }
  }

  updateTimerDockDisplay() {
    if (this.sessionDurationSec === 0) {
      this.dom.timerDisplay.textContent = '∞ Unlimited';
      return;
    }
    const mins = Math.floor(this.sessionRemainingSec / 60);
    const secs = this.sessionRemainingSec % 60;
    this.dom.timerDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  completeSession() {
    this.pause();
    window.breathAudio.playCompletionGong();

    // Record stats
    const minutesCompleted = Math.max(1, Math.round(this.sessionElapsedSec / 60));
    this.recordSessionStats(minutesCompleted);

    // Reset session timer
    this.sessionRemainingSec = this.sessionDurationSec;
    this.updateTimerDockDisplay();
    this.sessionElapsedSec = 0;

    // Show congratulations
    setTimeout(() => {
      alert(`✨ Session Completed!\n\nYou've completed ${minutesCompleted} mindful minutes of coherent resonance breathing. Keep up your daily practice!`);
    }, 600);
  }

  // --- Mindful Stats & Streak Tracking (LocalStorage) ---
  recordSessionStats(minutes) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = JSON.parse(localStorage.getItem('br_stats') || '{}');

      stats.totalMinutes = (stats.totalMinutes || 0) + minutes;
      stats.totalSessions = (stats.totalSessions || 0) + 1;

      // Calculate streak
      const lastActive = stats.lastActiveDate;
      if (!lastActive) {
        stats.streak = 1;
      } else if (lastActive === today) {
        // Already practiced today, keep streak
      } else {
        const lastDate = new Date(lastActive);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.streak = (stats.streak || 0) + 1;
        } else if (diffDays > 1) {
          stats.streak = 1; // Streak reset
        }
      }
      stats.lastActiveDate = today;

      localStorage.setItem('br_stats', JSON.stringify(stats));
      this.updateStatsDisplay();
    } catch (e) {
      console.warn('Stats save error:', e);
    }
  }

  updateStatsDisplay() {
    try {
      const stats = JSON.parse(localStorage.getItem('br_stats') || '{}');
      if (this.dom.statMinutes) this.dom.statMinutes.textContent = stats.totalMinutes || 0;
      if (this.dom.statSessions) this.dom.statSessions.textContent = stats.totalSessions || 0;
      if (this.dom.statStreak) this.dom.statStreak.textContent = `${stats.streak || 1} 🔥`;
    } catch (e) {}
  }

  // --- Visual Mode Switching ---
  cycleVisualMode() {
    const modes = ['orb', 'lotus', 'ring', 'wave'];
    const nextIdx = (modes.indexOf(this.visualMode) + 1) % modes.length;
    this.updateVisualMode(modes[nextIdx]);
  }

  updateVisualMode(mode) {
    this.visualMode = mode;
    localStorage.setItem('br_visual', mode);

    // Hide all
    this.dom.breathingOrb.style.display = 'none';
    this.dom.rippleRing1.style.display = 'none';
    this.dom.rippleRing2.style.display = 'none';
    this.dom.lotusContainer.style.display = 'none';
    this.dom.zenRingContainer.style.display = 'none';
    this.dom.waveContainer.style.display = 'none';

    if (mode === 'orb') {
      this.dom.breathingOrb.style.display = 'block';
      this.dom.rippleRing1.style.display = 'block';
      this.dom.rippleRing2.style.display = 'block';
    } else if (mode === 'lotus') {
      this.dom.lotusContainer.style.display = 'block';
    } else if (mode === 'ring') {
      this.dom.zenRingContainer.style.display = 'block';
    } else if (mode === 'wave') {
      this.dom.waveContainer.style.display = 'block';
    }
  }

  // --- Theme Switching ---
  updateTheme(themeName) {
    this.currentTheme = themeName;
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('br_theme', themeName);

    // Set theme color meta tag for Safari iOS status bar
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const colorMap = {
      'midnight': '#05070c',
      'twilight': '#0a0815',
      'emerald': '#040d0a',
      'dawn': '#11090c',
      'light': '#f5f6fa'
    };
    if (metaTheme) {
      metaTheme.setAttribute('content', colorMap[themeName] || '#05070c');
    }
  }

  // --- Modal Helpers ---
  openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
  }

  // --- Screen Wake Lock API ---
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        // WakeLock request can fail if device battery is very low
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch (e) {}
    }
  }

  // --- Sharing & QR Code ---
  renderQRCode() {
    if (!this.dom.qrContainer) return;
    const url = window.location.href;
    
    // Generate a clean vector QR code SVG dynamically
    // Using an encoded QR image service with fallback to clean vector
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&color=05070c&bgcolor=ffffff`;
    qrImg.alt = 'Scan QR Code to Open on Phone';
    qrImg.style.width = '160px';
    qrImg.style.height = '160px';
    qrImg.style.borderRadius = '8px';

    this.dom.qrContainer.innerHTML = '';
    this.dom.qrContainer.appendChild(qrImg);
  }

  async handleNativeShare() {
    const shareData = {
      title: 'Breath Resonance • Calm Daily',
      text: 'Here is our free family breathing app! Use it for calm, focus, sleep, and heart coherence.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      this.copyAppUrl();
    }
  }

  copyAppUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('✅ App link copied to clipboard! Send it to your family via iMessage, WhatsApp, or email.');
    }).catch(() => {
      prompt('Copy this link to share with your family:', window.location.href);
    });
  }

  // --- Offline PWA Service Worker Registration ---
  initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('SW registration note:', err);
        });
      });
    }
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.breathApp = new BreathApp();
});
