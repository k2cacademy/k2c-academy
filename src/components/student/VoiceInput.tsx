import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/**
 * Tap-to-record mic.
 * - Tap once: start listening.
 * - Stops automatically when the user stops talking (browser silence detection)
 *   OR when user taps again.
 * - Calls onResult() with the transcript so the parent can auto-send.
 */
export function VoiceInput({
  onResult,
  disabled,
}: {
  onResult: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => () => recRef.current?.abort(), []);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  if (!supported) return null;

  const start = () => {
    if (disabled || recording) return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new (Ctor as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: (ev: { results: { 0: { transcript: string } }[] }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
      abort: () => void;
    })();
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    transcriptRef.current = "";

    rec.onresult = (ev) => {
      for (let i = 0; i < ev.results.length; i++) {
        transcriptRef.current += ev.results[i][0].transcript;
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      setRecording(false);
      const text = transcriptRef.current.trim();
      if (text) onResult(text);
    };
    try {
      rec.start();
      recRef.current = { stop: () => rec.stop(), abort: () => rec.abort() };
      setRecording(true);
    } catch {
      /* ignore */
    }
  };

  const toggle = () => {
    if (recording) recRef.current?.stop();
    else start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={recording ? "Stop recording" : "Tap to talk"}
      title={recording ? "Tap to stop and send" : "Tap to talk"}
      className="relative h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition select-none disabled:opacity-50"
      style={{
        background: recording ? "rgba(239,68,68,0.85)" : "rgba(147,51,234,0.2)",
        border: `1px solid ${recording ? "#ef4444" : "rgba(147,51,234,0.5)"}`,
        boxShadow: recording
          ? "0 0 30px rgba(239,68,68,0.7)"
          : "0 0 15px rgba(147,51,234,0.4)",
      }}
    >
      {recording && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-500/40" />
      )}
      {recording ? (
        <Square className="h-4 w-4 text-white relative" fill="white" />
      ) : (
        <Mic className="h-5 w-5 text-purple-200 relative" />
      )}
    </button>
  );
}
