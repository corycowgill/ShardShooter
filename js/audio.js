// Procedural audio using Web Audio API

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicNodes = [];

function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.18;
    musicGain.connect(masterGain);
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(freq, duration, type, gainNode, volume = 0.3, detune = 0) {
  const c = ensureContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(gainNode || sfxGain);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function noise(duration, gainNode, volume = 0.1) {
  const c = ensureContext();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;

  const g = c.createGain();
  g.gain.setValueAtTime(volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(gainNode || sfxGain);
  src.start(c.currentTime);
  src.stop(c.currentTime + duration);
}

export const Audio = {
  init() {
    ensureContext();
  },

  resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },

  shoot() {
    playTone(880, 0.08, 'square', sfxGain, 0.15);
    playTone(1200, 0.05, 'sine', sfxGain, 0.08);
  },

  shardBreak() {
    noise(0.12, sfxGain, 0.2);
    playTone(400 + Math.random() * 200, 0.15, 'square', sfxGain, 0.15);
    playTone(200 + Math.random() * 100, 0.1, 'sawtooth', sfxGain, 0.08);
  },

  chainSplit() {
    playTone(600, 0.1, 'square', sfxGain, 0.15);
    playTone(900, 0.15, 'sine', sfxGain, 0.1);
    noise(0.08, sfxGain, 0.12);
  },

  playerHit() {
    playTone(150, 0.3, 'sawtooth', sfxGain, 0.3);
    playTone(80, 0.4, 'square', sfxGain, 0.2);
    noise(0.15, sfxGain, 0.25);
  },

  enemySpawn() {
    playTone(300, 0.15, 'sine', sfxGain, 0.1);
    playTone(450, 0.2, 'sine', sfxGain, 0.08);
  },

  gameOver() {
    const c = ensureContext();
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, c.currentTime + i * 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.2 + 0.3);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(c.currentTime + i * 0.2);
      osc.stop(c.currentTime + i * 0.2 + 0.3);
    });
  },

  scoreMilestone() {
    const c = ensureContext();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.15, c.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.2);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(c.currentTime + i * 0.08);
      osc.stop(c.currentTime + i * 0.08 + 0.2);
    });
  },

  powerUp() {
    const c = ensureContext();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.2);
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.3);
  },

  startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    this._playMusicLoop();
  },

  stopMusic() {
    musicPlaying = false;
    musicNodes.forEach(n => {
      try { n.stop(); } catch (e) { /* ignore */ }
    });
    musicNodes = [];
  },

  _playMusicLoop() {
    if (!musicPlaying) return;
    const c = ensureContext();

    // Bass pattern
    const bassNotes = [110, 110, 146.83, 130.81, 110, 110, 164.81, 146.83];
    const beatDuration = 0.25;
    const loopLength = bassNotes.length * beatDuration;

    bassNotes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.12, c.currentTime + i * beatDuration);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * beatDuration + beatDuration * 0.8);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(c.currentTime + i * beatDuration);
      osc.stop(c.currentTime + i * beatDuration + beatDuration * 0.9);
      musicNodes.push(osc);
    });

    // Hi-hat pattern
    for (let i = 0; i < bassNotes.length * 2; i++) {
      const t = c.currentTime + i * beatDuration * 0.5;
      const bufferSize = c.sampleRate * 0.03;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      const g = c.createGain();
      g.gain.setValueAtTime(i % 2 === 0 ? 0.06 : 0.03, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.connect(filter);
      filter.connect(g);
      g.connect(musicGain);
      src.start(t);
      src.stop(t + 0.05);
      musicNodes.push(src);
    }

    // Arp melody
    const arpNotes = [330, 440, 523, 440, 349, 523, 440, 349];
    arpNotes.forEach((freq, i) => {
      if (i % 2 !== 0) return;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.06, c.currentTime + i * beatDuration);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * beatDuration + beatDuration * 1.5);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(c.currentTime + i * beatDuration);
      osc.stop(c.currentTime + i * beatDuration + beatDuration * 1.8);
      musicNodes.push(osc);
    });

    setTimeout(() => {
      musicNodes = [];
      if (musicPlaying) this._playMusicLoop();
    }, loopLength * 1000);
  },

  setSFXVolume(v) {
    if (sfxGain) sfxGain.gain.value = v;
  },

  setMusicVolume(v) {
    if (musicGain) musicGain.gain.value = v;
  },
};
