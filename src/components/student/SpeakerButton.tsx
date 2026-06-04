import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";

/**
 * Plays a coach/assistant message using browser TTS.
 * Cleans emojis, markdown, and grammatical symbols before speaking so the
 * voice only reads the actual words (and numbers). Picks a male or female
 * voice based on the `gender` prop with sensible fallbacks.
 */
type Gender = "male" | "female";

function cleanForSpeech(input: string): string {
  return input
    // strip emoji + pictographs
    .replace(
      /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu,
      " "
    )
    // markdown emphasis / code / headings
    .replace(/[*_~`#>]+/g, " ")
    // bullets and arrows
    .replace(/[•●○◦▪▫■□◆◇→←↑↓⇒⇐]/g, " ")
    // other grammatical symbols we don't want spoken literally
    .replace(/[\\/|<>@^]/g, " ")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(gender: Gender): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const malePatterns = /(male|david|daniel|alex|fred|google uk english male|microsoft (guy|mark|ryan|david))/i;
  const femalePatterns = /(female|samantha|victoria|karen|moira|tessa|google uk english female|microsoft (zira|aria|jenny|libby))/i;
  const wanted = gender === "male" ? malePatterns : femalePatterns;
  const other = gender === "male" ? femalePatterns : malePatterns;
  const match = pool.find((v) => wanted.test(v.name));
  if (match) return match;
  // avoid obviously-wrong-gender voices
  const filtered = pool.filter((v) => !other.test(v.name));
  return filtered[0] ?? pool[0] ?? null;
}

export function SpeakerButton({
  text,
  gender = "male",
}: {
  text: string;
  /** Legacy session prop accepted for back-compat; ignored. */
  session?: string;
  gender?: Gender;
}) {
  const [state, setState] = useState<"idle" | "playing">("idle");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      }
    };
  }, []);

  // Prime voices on first interaction (Chrome loads them async).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const sv = window.speechSynthesis;
    if (sv.getVoices().length === 0) {
      sv.onvoiceschanged = () => { /* triggers a re-pick on next play */ };
    }
  }, []);

  const play = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const sv = window.speechSynthesis;
    if (state === "playing") {
      sv.cancel();
      setState("idle");
      return;
    }
    const clean = cleanForSpeech(text);
    if (!clean) return;
    sv.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const voice = pickVoice(gender);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-US";
    }
    // Calm, teacher-like delivery
    u.rate = 0.92;
    u.pitch = gender === "male" ? 0.95 : 1.05;
    u.volume = 1;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utterRef.current = u;
    setState("playing");
    sv.speak(u);
  };

  return (
    <button
      onClick={play}
      className="inline-flex items-center justify-center h-7 w-7 rounded-full transition"
      style={{
        background: state === "playing" ? "rgba(239,68,68,0.2)" : "rgba(250,204,21,0.15)",
        color: state === "playing" ? "#ef4444" : "#FACC15",
        border: `1px solid ${state === "playing" ? "rgba(239,68,68,0.5)" : "rgba(250,204,21,0.4)"}`,
      }}
      title={state === "playing" ? "Stop" : "Listen"}
      aria-label={state === "playing" ? "Stop speaking" : "Listen to message"}
    >
      {state === "playing" ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}
