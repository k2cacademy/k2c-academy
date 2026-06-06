// Strict audio-priority ringtone controller.
// Once `killRingtone()` is called (because the coach audio stream is available),
// the ringtone can NEVER play or resume again — even if a queued buffer,
// a pending play() promise, or a stray timer tries to restart it.
//
// All ringtone playback in the app MUST go through `startRingtone()` so this
// guarantee holds. Direct `new Audio(...).play()` for the ringtone is banned.

declare global {
  interface Window {
    _k2cRingtone?: HTMLAudioElement;
    _k2cRingtoneKilled?: boolean;
  }
}

const RINGTONES = [
  "/From Knowledge to Cash.mp3",
  "/From Knowledge to Cash (1).mp3",
];

function attachKillGuard(audio: HTMLAudioElement) {
  // If the buffer tries to resume after kill (autoplay, gesture, or a queued
  // play() promise resolving late), force-pause immediately.
  const enforce = () => {
    if (window._k2cRingtoneKilled) {
      try { audio.pause(); } catch { /* noop */ }
      try { audio.muted = true; } catch { /* noop */ }
      try { audio.volume = 0; } catch { /* noop */ }
      try { audio.currentTime = 0; } catch { /* noop */ }
    }
  };
  audio.addEventListener("play", enforce);
  audio.addEventListener("playing", enforce);
  audio.addEventListener("timeupdate", enforce);
  audio.addEventListener("loadeddata", enforce);
}

export function startRingtone(volume = 0.55): HTMLAudioElement | null {
  // Hard refusal: once killed for this call lifecycle, never play again.
  if (typeof window === "undefined") return null;
  if (window._k2cRingtoneKilled) return null;

  // Reuse / replace any prior instance.
  killRingtoneInstanceOnly();

  try {
    const src = RINGTONES[Math.floor(Math.random() * RINGTONES.length)];
    const audio = new Audio(encodeURI(src));
    audio.loop = true;
    audio.volume = volume;
    attachKillGuard(audio);
    window._k2cRingtone = audio;
    void audio.play().catch(() => { /* autoplay blocked is fine */ });
    return audio;
  } catch {
    return null;
  }
}

function killRingtoneInstanceOnly() {
  const audio = typeof window !== "undefined" ? window._k2cRingtone : undefined;
  if (!audio) return;
  try { audio.pause(); } catch { /* noop */ }
  try { audio.muted = true; } catch { /* noop */ }
  try { audio.volume = 0; } catch { /* noop */ }
  try { audio.currentTime = 0; } catch { /* noop */ }
  try { audio.removeAttribute("src"); } catch { /* noop */ }
  try { audio.load(); } catch { /* noop */ }
  // Override play() so any late callers can't resurrect it.
  try { audio.play = async () => { /* killed */ }; } catch { /* noop */ }
  if (typeof window !== "undefined") window._k2cRingtone = undefined;
}

/**
 * STRICT AUDIO PRIORITY: call this the moment coach audio is available.
 * Stops the ringtone, neutralizes its buffer, AND locks future playback
 * so nothing can restart it for the remainder of this call.
 */
export function killRingtone() {
  if (typeof window === "undefined") return;
  window._k2cRingtoneKilled = true;
  killRingtoneInstanceOnly();
}

/** Call when a fresh call starts (new attempt) to reset the kill-lock. */
export function armRingtone() {
  if (typeof window === "undefined") return;
  window._k2cRingtoneKilled = false;
}
