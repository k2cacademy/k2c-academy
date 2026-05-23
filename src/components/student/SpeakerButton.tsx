import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeCoachVoice } from "@/lib/student-portal.functions";

/**
 * Plays a coach message using Fish Audio TTS (warm, human voice).
 * Falls back silently if synthesis fails.
 */
export function SpeakerButton({ text, session }: { text: string; session?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const ttsFn = useServerFn(synthesizeCoachVoice);


  const cleanup = () => {
    const el = audioRef.current;
    if (el) {
      try { el.pause(); } catch { /* ignore */ }
      el.src = "";
    }
    if (urlRef.current) {
      try { URL.revokeObjectURL(urlRef.current); } catch { /* ignore */ }
      urlRef.current = null;
    }
  };

  useEffect(() => () => cleanup(), []);

  const play = async () => {
    if (state === "playing") {
      cleanup();
      setState("idle");
      return;
    }
    // Public Ask-Nathy widget has no session — fall back to browser TTS.
    if (!session) {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.lang = navigator.language || "en-US";
      u.onend = () => setState("idle");
      u.onerror = () => setState("idle");
      setState("playing");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return;
    }
    const browserFallback = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setState("idle");
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.lang = navigator.language || "en-US";
      u.onend = () => setState("idle");
      u.onerror = () => setState("idle");
      setState("playing");
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };
    try {
      setState("loading");
      const result = await ttsFn({ data: { session, text } });
      if (result.fallback || !("audio_b64" in result) || !result.audio_b64) {
        browserFallback();
        return;
      }
      const bin = atob(result.audio_b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.mime });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const el = audioRef.current ?? new Audio();
      audioRef.current = el;
      el.src = url;
      el.onended = () => { cleanup(); setState("idle"); };
      el.onerror = () => { cleanup(); setState("idle"); };
      await el.play();
      setState("playing");
    } catch (e) {
      console.error("TTS playback failed, falling back to browser TTS", e);
      cleanup();
      browserFallback();
    }
  };


  return (
    <button
      onClick={play}
      disabled={state === "loading"}
      className="inline-flex items-center justify-center h-7 w-7 rounded-full transition disabled:opacity-60"
      style={{
        background: state === "playing" ? "rgba(239,68,68,0.2)" : "rgba(250,204,21,0.15)",
        color: state === "playing" ? "#ef4444" : "#FACC15",
        border: `1px solid ${state === "playing" ? "rgba(239,68,68,0.5)" : "rgba(250,204,21,0.4)"}`,
      }}
      title={state === "playing" ? "Stop" : "Play"}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "playing" ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
