import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";

export function VoiceCallPanel({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  
  const roomRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Load LiveKit SDK from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.5.4/dist/livekit-client.umd.min.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status === "connected" && agentSpeaking && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
  }, [status, agentSpeaking]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    setError("");
    setStatus("connecting");
    setDuration(0);

    try {
      // Check LiveKit SDK loaded
      const LivekitClient = (window as any).LivekitClient;
      if (!LivekitClient) {
        throw new Error("SDK not loaded yet. Please try again.");
      }

      // Get mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Get token
      const tokenRes = await fetch("/api/public/hooks/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!tokenRes.ok) throw new Error("Could not get call token");
      const { token, roomName } = await tokenRes.json();

      // Dispatch agent
      await fetch("/api/public/hooks/livekit-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });

      // Create room
      const room = new LivekitClient.Room({
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
      });
      roomRef.current = room;

      // Handle remote audio (agent speaking)
      room.on(LivekitClient.RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
        if (track.kind === "audio") {
          setAgentSpeaking(true);
          const audioEl = track.attach();
          audioEl.autoplay = true;
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          audioRef.current = audioEl;
        }
      });

      room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
        if (track.kind === "audio") {
          track.detach();
          setAgentSpeaking(false);
        }
      });

      room.on(LivekitClient.RoomEvent.Disconnected, () => {
        setStatus("ended");
        cleanup();
      });

      // Connect to room
      await room.connect(
        "wss://k2c-ai-coach-yt1puc7u.livekit.cloud",
        token
      );

      // Publish mic
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("connected");

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
    setAgentSpeaking(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleMute = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(muted);
      setMuted(!muted);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      {/* Avatar */}
      <div className="relative mb-6">
        <div className={`h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 transition-all ${
          agentSpeaking ? "border-primary animate-pulse scale-110" : "border-border"
        }`}>
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
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm">Connected</span>
            </div>
            {agentSpeaking ? (
              <p className="text-xs text-primary">Coach is speaking — {formatTime(duration)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for coach to join...</p>
            )}
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

      {/* Controls */}
      {status === "idle" || status === "ended" ? (
        <button
          onClick={startCall}
          className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition"
        >
          <Phone className="h-7 w-7 text-white" />
        </button>
      ) : status === "connecting" ? (
        <button disabled className="h-16 w-16 rounded-full bg-yellow-500 flex items-center justify-center opacity-80">
          <Loader2 className="h-7 w-7 text-white animate-spin" />
        </button>
      ) : (
        <div className="flex items-center gap-6">
          <button
            onClick={toggleMute}
            className="h-14 w-14 rounded-full border border-border bg-card flex items-center justify-center hover:bg-card/80 transition"
          >
            {muted
              ? <MicOff className="h-5 w-5 text-destructive" />
              : <Mic className="h-5 w-5 text-foreground" />
            }
          </button>
          <button
            onClick={endCall}
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        {status === "idle" && "Tap the green button to start your coaching session"}
        {status === "connected" && !agentSpeaking && "Your coach is joining... speak to say hello 👋"}
        {status === "connected" && agentSpeaking && "Speak clearly — your coach is listening 👂"}
      </p>
    </div>
  );
}
