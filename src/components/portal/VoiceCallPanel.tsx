import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VoiceCallPanel({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [status]);

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    setError("");
    setStatus("connecting");
    setDuration(0);

    try {
      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Get LiveKit token from our backend
      const tokenRes = await fetch("/api/public/hooks/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!tokenRes.ok) throw new Error("Could not get call token");
      const { token, roomName } = await tokenRes.json();

      // Dispatch agent to room
      await fetch("/api/public/hooks/livekit-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });

      // Connect to LiveKit via WebSocket
      const ws = new WebSocket(
        `wss://k2c-ai-coach-yt1puc7u.livekit.cloud?access_token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
      };

      ws.onerror = () => {
        setError("Connection failed. Please try again.");
        setStatus("idle");
        cleanup();
      };

      ws.onclose = () => {
        if (status === "connected") {
          setStatus("ended");
        }
        cleanup();
      };

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not start call. Check mic permissions.");
      setStatus("idle");
      cleanup();
    }
  };

  const endCall = () => {
    cleanup();
    setStatus("ended");
    setMuted(false);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => {
        t.enabled = muted;
      });
      setMuted(!muted);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      {/* AI Coach Avatar */}
      <div className="relative mb-6">
        <div className={`h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 ${status === "connected" ? "border-primary animate-pulse" : "border-border"}`}>
          <span className="text-4xl">🧠</span>
        </div>
        {status === "connected" && (
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">K2Ç AI Sales Coach</h2>
      <p className="text-sm text-muted-foreground mb-2">Digital Nathy's AI Voice Coach</p>

      {/* Status */}
      <div className="mb-6 text-center">
        {status === "idle" && (
          <p className="text-muted-foreground text-sm">Ready to coach you to your first sale</p>
        )}
        {status === "connecting" && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Connecting your coach...</span>
          </div>
        )}
        {status === "connected" && (
          <div className="flex items-center gap-2 text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm">Connected — {formatDuration(duration)}</span>
          </div>
        )}
        {status === "ended" && (
          <p className="text-muted-foreground text-sm">Call ended. Great session! 🎉</p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-destructive/20 border border-destructive rounded-lg text-destructive text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {/* Call Controls */}
      {status === "idle" || status === "ended" ? (
        <Button
          onClick={startCall}
          className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
        >
          <Phone className="h-7 w-7" />
        </Button>
      ) : status === "connecting" ? (
        <Button disabled className="h-16 w-16 rounded-full bg-yellow-500">
          <Loader2 className="h-7 w-7 animate-spin" />
        </Button>
      ) : (
        <div className="flex items-center gap-6">
          <Button
            onClick={toggleMute}
            variant="outline"
            className="h-14 w-14 rounded-full border-border"
          >
            {muted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            onClick={endCall}
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        {status === "idle" ? "Tap the green button to start your coaching session" : ""}
        {status === "connected" ? "Speak clearly — your coach is listening 👂" : ""}
      </p>
    </div>
  );
          }
