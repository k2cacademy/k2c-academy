import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";

export function CallScreen({
  session,
  firstName,
  onClose,
  onNoMinutes,
}: {
  session: string;
  firstName: string;
  onClose: () => void;
  onNoMinutes: () => void;
}) {
  const [status, setStatus] = useState<
    "loading" | "connecting" | "waiting-agent" | "connected" | "ending"
  >("loading");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  const vapiRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const endingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadAndStart = () => {
      // Remove any existing Vapi scripts
      const existing = document.getElementById("vapi-script");
      if (existing) existing.remove();

      const script = document.createElement("script");
      script.id = "vapi-script";
      script.src =
        "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
      script.async = true;

      script.onload = async () => {
        if (cancelled) return;

        // Wait for vapiSDK to be available
        let attempts = 0;
        while (!(window as any).vapiSDK && attempts < 20) {
          await new Promise((r) => setTimeout(r, 300));
          attempts++;
        }

        if (cancelled) return;

        const sdk = (window as any).vapiSDK;
        if (!sdk) {
          setError("Voice system failed to load. Please refresh.");
          setStatus("ending");
          return;
        }

        try {
          setStatus("connecting");

          const vapi = sdk.run({
            apiKey: "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1",
            assistant: "a16cf991-f420-44f4-8460-0129939c9fe3",
            config: { hideButton: true },
          });

          vapiRef.current = vapi;

          vapi.on("call-start", () => {
            if (cancelled) return;
            setStatus("waiting-agent");
          });

          vapi.on("speech-start", () => {
            if (cancelled) return;
            setAgentSpeaking(true);
            setStatus("connected");
            if (!timerRef.current) {
              timerRef.current = setInterval(() => {
                setDuration((d) => d + 1);
              }, 1000);
            }
          });

          vapi.on("speech-end", () => {
            if (cancelled) return;
            setAgentSpeaking(false);
          });

          vapi.on("call-end", () => {
            if (!endingRef.current) hangup(false);
          });

          vapi.on("error", (e: any) => {
            console.error("Vapi error:", e);
            if (!cancelled) {
              setError(e?.message || "Call error. Please try again.");
              setStatus("ending");
            }
          });
        } catch (e: any) {
          if (!cancelled) {
            setError(e?.message || "Could not start call.");
            setStatus("ending");
          }
        }
      };

      script.onerror = () => {
        if (!cancelled) {
          setError("Failed to load voice system. Check your connection.");
          setStatus("ending");
        }
      };

      document.head.appendChild(script);
      setStatus("connecting");
    };

    loadAndStart();

    return () => {
      cancelled = true;
      endingRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
        vapiRef.current = null;
      }
    };
  }, []);

  const hangup = (timeUp = false) => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("ending");
    if (timerRef.current) clearInterval(timerRef.current);
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {}
      vapiRef.current = null;
    }
    onClose();
    if (timeUp) onNoMinutes();
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      vapiRef.current.setMuted(!muted);
      setMuted(!muted);
    }
  };

  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");

  const statusLabel = {
    loading: "Loading voice system...",
    connecting: "Connecting...",
    "waiting-agent": "Coach is joining...",
    connected: "Live with your coach",
    ending: "Ending...",
  }[status];

  const statusColor = {
    loading: "text-gray-400",
    connecting: "text-purple-300",
    "waiting-agent": "text-yellow-300",
    connected: "text-green-300",
    ending: "text-gray-400",
  }[status];

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center px-6">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(147,51,234,0.25) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* AI Avatar */}
        <div
          className={`h-40 w-40 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 transition-all duration-300 ${
            agentSpeaking ? "animate-pulse scale-110" : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #5B21B6, #9333EA)",
            boxShadow: agentSpeaking
              ? "0 0 60px rgba(147,51,234,0.8)"
              : "0 0 40px rgba(147,51,234,0.4)",
          }}
        >
          AI
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          Your K2Ç Personalised AI Coach
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Hi {firstName}, glad you called.
        </p>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2 text-sm">
          {status === "loading" ||
          status === "connecting" ||
          status === "waiting-agent" ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor}`} />
          ) : status === "connected" ? (
            <span
              className={`h-2 w-2 rounded-full bg-green-400 animate-pulse`}
            />
          ) : null}
          <span className={statusColor}>{statusLabel}</span>
        </div>

        {/* Timer */}
        {status === "connected" && (
          <div className="mt-6 text-6xl font-mono text-white tabular-nums">
            {mm}:{ss}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 max-w-xs text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center gap-6">
          {status === "connected" && (
            <button
              onClick={toggleMute}
              className={`h-14 w-14 rounded-full flex items-center justify-center border transition ${
                muted
                  ? "border-red-500 bg-red-500/20"
                  : "border-white/20 bg-white/10 hover:bg-white/20"
              }`}
            >
              {muted ? (
                <MicOff className="h-6 w-6 text-red-400" />
              ) : (
                <Mic className="h-6 w-6 text-white" />
              )}
            </button>
          )}

          <button
            onClick={() => hangup(false)}
            className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.6)] transition active:scale-95"
            aria-label="End call"
          >
            <PhoneOff className="h-8 w-8 text-white" />
          </button>
        </div>

        <p className="mt-6 text-xs text-white/40 text-center max-w-xs">
          {status === "connected"
            ? "Speak any time — even while coach is talking. They'll stop and listen."
            : status === "waiting-agent"
            ? "Your coach is joining... say hello! 👋"
            : ""}
        </p>
      </div>
    </div>
  );
}
