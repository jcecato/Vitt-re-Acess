export type TtsPlaybackStatus = 'idle' | 'loading' | 'playing';

export interface TtsStateSnapshot {
  activeBlockId: string | null;
  status: TtsPlaybackStatus;
}

type TtsListener = (snapshot: TtsStateSnapshot) => void;

interface CachedAudioClip {
  key: string;
  mimeType: string;
  audioBase64: string;
  updatedAt: number;
}

const DB_NAME = 'clinical_tts_cache_db';
const STORE_NAME = 'audio_clips';
const DB_VERSION = 2;
const MAX_LOCAL_CLIPS = 80;
const PLAYBACK_RATE = 1.0;
const SPOKEN_CLOSING_NOTE =
  'Fique à vontade para ouvir novamente, sempre que desejar. Uma observação: todo o conteúdo foi elaborado pelo profissional responsável pelo seu acompanhamento. Minha função é apenas realizar a leitura, sem acrescentar ou modificar as informações.';

// Tiny silent 8kHz mono PCM WAV used strictly to synchronously unlock HTMLAudioElement
// inside mobile user-tap gesture handlers (iOS Safari / Android Chrome).
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const memoryClipCache = new Map<string, CachedAudioClip>();
const listeners = new Set<TtsListener>();

let activeBlockId: string | null = null;
let status: TtsPlaybackStatus = 'idle';
let sharedAudioEl: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeObjectUrl: string | null = null;
let activeAbortController: AbortController | null = null;
let speechCancelled = false;

function notify(): void {
  const snapshot: TtsStateSnapshot = { activeBlockId, status };
  listeners.forEach((cb) => cb(snapshot));
}

function hashText(text: string): string {
  const normalized = `v2:${text.replace(/\s+/g, ' ').trim()}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16)}-${(h1 >>> 0).toString(16)}-${normalized.length}`;
}

/**
 * Synchronously unlocks mobile audio playback (iOS Safari / Android Chrome)
 * while still inside the user click/tap call stack, BEFORE any async await.
 */
function unlockMobileAudioGesture(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        void sharedAudioCtx.resume().catch(() => {});
      }
    }
  } catch {
    // Ignore AudioContext unlock error
  }

  try {
    if (!sharedAudioEl) {
      sharedAudioEl = new Audio();
      sharedAudioEl.preload = 'auto';
      sharedAudioEl.setAttribute('playsinline', 'true');
    }
    sharedAudioEl.onended = null;
    sharedAudioEl.onerror = null;
    sharedAudioEl.src = SILENT_WAV_DATA_URI;
    sharedAudioEl.muted = true;
    const playPromise = sharedAudioEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          if (sharedAudioEl && sharedAudioEl.src === SILENT_WAV_DATA_URI) {
            sharedAudioEl.pause();
            sharedAudioEl.muted = false;
          }
        })
        .catch(() => {
          if (sharedAudioEl) sharedAudioEl.muted = false;
        });
    } else {
      sharedAudioEl.muted = false;
    }
  } catch {
    if (sharedAudioEl) sharedAudioEl.muted = false;
  }
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readLocalCache(key: string): Promise<CachedAudioClip | null> {
  const mem = memoryClipCache.get(key);
  if (mem) return mem;

  const db = await openCacheDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const clip = req.result as CachedAudioClip | undefined;
        if (clip && clip.audioBase64) {
          memoryClipCache.set(key, clip);
          resolve(clip);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeLocalCache(clip: CachedAudioClip): Promise<void> {
  if (memoryClipCache.size >= MAX_LOCAL_CLIPS) {
    const firstKey = memoryClipCache.keys().next().value;
    if (firstKey) memoryClipCache.delete(firstKey);
  }
  memoryClipCache.set(clip.key, clip);

  const db = await openCacheDb();
  if (!db) return;

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(clip);
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function base64ToArrayBuffer(audioBase64: string): ArrayBuffer {
  const binaryStr = window.atob(audioBase64);
  const buffer = new ArrayBuffer(binaryStr.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binaryStr.length; i++) {
    view[i] = binaryStr.charCodeAt(i);
  }
  return buffer;
}

function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.onvoiceschanged = finish;
    window.setTimeout(finish, 350);
  });
}

function selectBestPtBrVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('pt-br'));
  const pool =
    ptVoices.length > 0
      ? ptVoices
      : voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  if (!pool.length) return null;

  const preferredOrder = [
    /google\s+portugu[eê]s\s+do\s+brasil/i,
    /microsoft\s+francisca/i,
    /microsoft\s+thalita/i,
    /microsoft\s+antonio/i,
    /luciana/i,
    /fernanda/i,
    /neural/i,
    /natural/i
  ];

  for (const pattern of preferredOrder) {
    const match = pool.find((v) => pattern.test(v.name));
    if (match) return match;
  }

  const nonLocalVoice = pool.find((v) => v.localService === false);
  return nonLocalVoice || pool[0];
}

function splitIntoSpeechChunks(text: string, maxLen = 220): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/);

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((buffer + ' ' + sentence).trim().length <= maxLen) {
      buffer = (buffer + ' ' + sentence).trim();
    } else {
      if (buffer) chunks.push(buffer);
      if (sentence.length <= maxLen) {
        buffer = sentence;
      } else {
        const words = sentence.split(/\s+/);
        let piece = '';
        for (const w of words) {
          if ((piece + ' ' + w).trim().length <= maxLen) {
            piece = (piece + ' ' + w).trim();
          } else {
            if (piece) chunks.push(piece);
            piece = w;
          }
        }
        buffer = piece;
      }
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}

async function playWithBrowserSpeech(blockId: string, text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    activeBlockId = null;
    status = 'idle';
    notify();
    return;
  }

  speechCancelled = false;
  window.speechSynthesis.cancel();

  const chunks = splitIntoSpeechChunks(text);
  if (chunks.length === 0) {
    activeBlockId = null;
    status = 'idle';
    notify();
    return;
  }

  const voices = await loadSpeechVoices();
  if (speechCancelled || activeBlockId !== blockId) return;

  const voice = selectBestPtBrVoice(voices);
  activeBlockId = blockId;
  status = 'playing';
  notify();

  let index = 0;

  const speakNext = () => {
    if (speechCancelled || activeBlockId !== blockId || index >= chunks.length) {
      if (activeBlockId === blockId) {
        activeBlockId = null;
        status = 'idle';
        notify();
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = 'pt-BR';
    utterance.rate = PLAYBACK_RATE;
    utterance.pitch = 1.02;
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      index += 1;
      speakNext();
    };

    utterance.onerror = () => {
      if (activeBlockId === blockId) {
        activeBlockId = null;
        status = 'idle';
        notify();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

async function playWavViaAudioContext(blockId: string, wavBuffer: ArrayBuffer): Promise<boolean> {
  if (!sharedAudioCtx) return false;
  try {
    if (sharedAudioCtx.state === 'suspended') {
      await sharedAudioCtx.resume();
    }
    const decoded = await sharedAudioCtx.decodeAudioData(wavBuffer.slice(0));
    if (activeBlockId !== blockId) return true;

    const source = sharedAudioCtx.createBufferSource();
    source.buffer = decoded;
    source.playbackRate.value = PLAYBACK_RATE;
    source.connect(sharedAudioCtx.destination);
    activeBufferSource = source;

    source.onended = () => {
      if (activeBufferSource === source) {
        activeBufferSource = null;
      }
      if (activeBlockId === blockId) {
        stopTtsPlayback();
      }
    };

    status = 'playing';
    notify();
    source.start(0);
    return true;
  } catch {
    return false;
  }
}

export function stopTtsPlayback(): void {
  speechCancelled = true;

  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {
      // Ignore already stopped source
    }
    activeBufferSource = null;
  }

  if (sharedAudioEl) {
    sharedAudioEl.onended = null;
    sharedAudioEl.onerror = null;
    try {
      sharedAudioEl.pause();
      sharedAudioEl.currentTime = 0;
    } catch {
      // Ignore audio pause errors
    }
  }

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  activeBlockId = null;
  status = 'idle';
  notify();
}

export async function toggleTtsPlayback(blockId: string, rawText: string): Promise<void> {
  const baseText = rawText.replace(/\s+/g, ' ').trim();
  if (!baseText) return;
  const cleanText = `${baseText} ${SPOKEN_CLOSING_NOTE}`;

  if (activeBlockId === blockId && status !== 'idle') {
    stopTtsPlayback();
    return;
  }

  stopTtsPlayback();
  // MUST run synchronously before any await so iOS Safari / Android Chrome allow delayed playback
  unlockMobileAudioGesture();

  activeBlockId = blockId;
  status = 'loading';
  notify();

  const cacheKey = hashText(cleanText);
  const controller = new AbortController();
  activeAbortController = controller;

  try {
    let clip = await readLocalCache(cacheKey);

    if (!clip) {
      const timeoutId = window.setTimeout(() => controller.abort(), 16000);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText }),
          signal: controller.signal
        });

        if (res.ok) {
          const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
          if (data.audioBase64) {
            clip = {
              key: cacheKey,
              mimeType: data.mimeType || 'audio/wav',
              audioBase64: data.audioBase64,
              updatedAt: Date.now()
            };
            void writeLocalCache(clip);
          }
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    if (controller.signal.aborted || activeBlockId !== blockId) {
      return;
    }

    if (clip && clip.audioBase64) {
      const wavBuffer = base64ToArrayBuffer(clip.audioBase64);
      const blob = new Blob([wavBuffer], { type: clip.mimeType || 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);
      activeObjectUrl = objectUrl;

      const audio = sharedAudioEl || new Audio();
      sharedAudioEl = audio;
      audio.muted = false;
      audio.src = objectUrl;
      audio.playbackRate = PLAYBACK_RATE;
      audio.defaultPlaybackRate = PLAYBACK_RATE;
      audio.preservesPitch = true;

      audio.onended = () => {
        if (activeBlockId === blockId) {
          stopTtsPlayback();
        }
      };

      audio.onerror = () => {
        if (activeBlockId === blockId) {
          void playWavViaAudioContext(blockId, wavBuffer).then((ok) => {
            if (!ok && activeBlockId === blockId) {
              void playWithBrowserSpeech(blockId, cleanText);
            }
          });
        }
      };

      try {
        await audio.play();
        if (activeBlockId === blockId) {
          status = 'playing';
          notify();
        }
        return;
      } catch {
        // Fallback to already-resumed Web AudioContext if HTMLAudioElement is blocked on mobile
        const ctxPlayed = await playWavViaAudioContext(blockId, wavBuffer);
        if (ctxPlayed) return;
      }
    }

    await playWithBrowserSpeech(blockId, cleanText);
  } catch {
    if (!controller.signal.aborted && activeBlockId === blockId) {
      await playWithBrowserSpeech(blockId, cleanText);
    }
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}

export function subscribeTtsState(listener: TtsListener): () => void {
  listeners.add(listener);
  listener({ activeBlockId, status });
  return () => {
    listeners.delete(listener);
  };
}
