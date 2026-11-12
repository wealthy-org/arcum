// Arcum Protocol — Web Audio Engine & Ambient Soundscape
// Adapted from Surplus.codes audio architecture

type SoundMode = 'on' | 'music-off' | 'off';

interface SoundFiles {
  start: string[];
  navigate: string[];
  place: string[];
  hover: string[];
  select: string[];
  open: string[];
  close: string[];
  back: string[];
  refused: string[];
  done: string[];
  failed: string[];
}

const CUES: SoundFiles = {
  start: ['start.mp3'],
  navigate: ['navigate-0.mp3', 'navigate-1.mp3', 'navigate-2.mp3'],
  place: ['place-0.mp3', 'place-1.mp3', 'place-2.mp3', 'place-3.mp3', 'place-4.mp3'],
  hover: ['hover-0.wav', 'hover-1.wav', 'hover-2.wav', 'hover-3.wav', 'hover-4.wav'],
  select: ['select-0.wav', 'select-1.wav', 'select-2.wav', 'select-3.wav'],
  open: ['open.mp3'],
  close: ['close.mp3'],
  back: ['back.mp3'],
  refused: ['refused.mp3'],
  done: ['done.mp3'],
  failed: ['failed.mp3'],
};

const DEBOUNCE_MS: Record<string, number> = {
  hover: 70,
  select: 90,
  place: 110,
  navigate: 300,
};

let audioCtx: AudioContext | null = null;
let fxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;

const audioBuffers = new Map<string, AudioBuffer>();
const lastPlayTimes = new Map<string, number>();
const lastVariants = new Map<string, number>();
const listeners = new Set<() => void>();

let soundMode: SoundMode = 'on';
let isInitialized = false;

// Read persisted preference
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('arcum.sound') as SoundMode | null;
    if (saved === 'on' || saved === 'music-off' || saved === 'off') {
      soundMode = saved;
    }
  } catch {}
}

export function getSoundMode(): SoundMode {
  return soundMode;
}

export function setSoundMode(mode: SoundMode) {
  soundMode = mode;
  try {
    localStorage.setItem('arcum.sound', mode);
  } catch {}

  applyGains();
  listeners.forEach((cb) => cb());
}

export function toggleSoundMode() {
  const next: Record<SoundMode, SoundMode> = {
    on: 'music-off',
    'music-off': 'off',
    off: 'on',
  };
  setSoundMode(next[soundMode]);
}

export function subscribeSoundMode(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function applyGains() {
  if (!audioCtx || !fxGain || !musicGain) return;
  const now = audioCtx.currentTime;
  const fxTarget = soundMode !== 'off' ? 0.9 : 0;
  const musicTarget = soundMode === 'on' ? 0.45 : 0;

  fxGain.gain.setTargetAtTime(fxTarget, now, 0.05);
  musicGain.gain.setTargetAtTime(musicTarget, now, 0.3);
}

async function loadBuffer(path: string): Promise<AudioBuffer | null> {
  if (!audioCtx) return null;
  if (audioBuffers.has(path)) return audioBuffers.get(path)!;

  try {
    const res = await fetch(`/sound/${path}`);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    audioBuffers.set(path, decoded);
    return decoded;
  } catch (err) {
    console.warn(`[Audio] Failed loading ${path}:`, err);
    return null;
  }
}

async function startAmbientMusic() {
  if (!audioCtx || !musicGain || musicSource) return;

  const buffer = await loadBuffer('music.mp3');
  if (!buffer || !audioCtx || !musicGain) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 1.0;
  source.loopEnd = 97.0;

  const envelope = audioCtx.createGain();
  envelope.gain.setValueAtTime(0, audioCtx.currentTime);
  envelope.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 5.0);

  source.connect(envelope).connect(musicGain);
  source.start(0, 1.0);
  musicSource = source;
}

export async function initAudio() {
  if (isInitialized) {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return;
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  audioCtx = new AudioContextClass();
  fxGain = audioCtx.createGain();
  musicGain = audioCtx.createGain();

  fxGain.gain.value = 0;
  musicGain.gain.value = 0;

  fxGain.connect(audioCtx.destination);
  musicGain.connect(audioCtx.destination);

  isInitialized = true;
  applyGains();

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Preload essential UI cues in background
  Promise.all([
    loadBuffer('music.mp3'),
    loadBuffer('place-0.mp3'),
    loadBuffer('place-1.mp3'),
    loadBuffer('place-2.mp3'),
    loadBuffer('select-0.wav'),
    loadBuffer('select-1.wav'),
    loadBuffer('hover-0.wav'),
    loadBuffer('navigate-0.mp3'),
  ]).then(() => {
    if (soundMode === 'on') {
      startAmbientMusic();
    }
  });
}

export function playCue(cue: keyof SoundFiles, variantIndex?: number) {
  if (!audioCtx || !fxGain || soundMode === 'off') return;

  const now = performance.now();
  const debounce = DEBOUNCE_MS[cue];
  const lastTime = lastPlayTimes.get(cue) ?? 0;
  if (debounce && now - lastTime < debounce) return;
  lastPlayTimes.set(cue, now);

  const files = CUES[cue];
  if (!files || files.length === 0) return;

  let variant = variantIndex;
  if (variant === undefined) {
    variant = Math.floor(Math.random() * files.length);
    if (files.length > 1 && variant === lastVariants.get(cue)) {
      variant = (variant + 1) % files.length;
    }
  }
  lastVariants.set(cue, variant);

  const file = files[Math.min(variant, files.length - 1)];

  loadBuffer(file).then((buffer) => {
    if (!buffer || !audioCtx || !fxGain) return;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Organic slight pitch and volume variance for realism
    const gainNode = audioCtx.createGain();
    const isMajorCue = cue === 'place' || cue === 'navigate' || cue === 'done' || cue === 'start';
    gainNode.gain.value = isMajorCue ? 0.95 : 0.75 + Math.random() * 0.15;

    if (!isMajorCue) {
      source.playbackRate.value = 0.97 + Math.random() * 0.06;
    }

    source.connect(gainNode).connect(fxGain);
    source.start(0);
  });
}

// Auto-arm on first user interaction for browser autoplay policy
if (typeof window !== 'undefined') {
  const armAudio = () => {
    initAudio();
    window.removeEventListener('pointerdown', armAudio);
    window.removeEventListener('keydown', armAudio);
  };
  window.addEventListener('pointerdown', armAudio, { once: true });
  window.addEventListener('keydown', armAudio, { once: true });
}
