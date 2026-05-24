import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
} from "livekit-client";

type Status = "idle" | "connecting" | "connected" | "ending";

export function VoiceCallPanel({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);
  const tickRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const attachAudio = (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.volume = 1.0;
    document.body.appendChild(el);
    audioElsRef.current.push(el);
    el.play().catch((e) => console.warn("audio play blocked", e));
  };

  const cleanup = async () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    audioElsRef.current.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch {
        /* ignore */
      }
    });
    audioElsRef.current = [];
    if (roomRef.current) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(false);
      } catch {
        /* ignore */
      }
      try {
        await roomRef.current.disconnect();
      } catch {
        /* ignore */
      }
      roomRef.current = null;
    }
  };

  const endCall = async () => {
    setStatus("ending");
    await cleanup();
    setStatus("idle");
    setDuration(0);
    setMuted(false);
  };

  const startCall = async () => {
    setError(null);
    setStatus("connecting");
    try {
      // Ensure mic permission early (mobile Safari)
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("Microphone permission is required.");
      }

      // 1. Get token + roomName
      const tokRes = await fetch("/api/public/hooks/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!tokRes.ok) throw new Error("Could not get session token.");
      const { token, roomName, url } = await tokRes.json();

      // 2. Dispatch the agent into the room
      const dispRes = await fetch("/api/public/hooks/livekit-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      if (!dispRes.ok) console.warn("agent dispatch returned non-OK");

      // 3. Join the LiveKit room
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          attachAudio(track);
          setStatus("connected");
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach().forEach((el) => el.remove());
        })
        .on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => {
          setStatus("connected");
        })
        .on(RoomEvent.Disconnected, () => {
          void endCall();
        });

      await room.connect(url || "wss://k2c-ai-coach-yt1puc7u.livekit.cloud", token);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Attach any tracks already present
      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track) attachAudio(pub.track);
        });
        if (p.trackPublications.size > 0) setStatus("connected");
      });

      startedAtRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
    } catch (e) {
      console.error("startCall failed", e);
      setError(e instanceof Error ? e.message : "Could not start call.");
      await cleanup();
      setStatus("idle");
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, []);

  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="relative mb-6">
        <div
          className={`h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 ${
            status === "connected" ? "border-primary animate-pulse" : "border-border"
          }`}
        >
          <span className="text-4xl">🧠</span>
        </div>
        {status === "connected" && (
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">K2Ç AI Sales Coach</h2>
      <p className="text-sm text-muted-foreground mb-4">Digital Nathy's AI Voice Coach</p>

      <div className="mb-6 text-center min-h-[24px]">
        {status === "idle" && (
          <p className="text-muted-foreground text-sm">Ready to coach you to your first sale</p>
        )}
        {status === "connecting" && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Connecting your coach…</span>
          </div>
        )}
        {status === "connected" && (
          <div className="flex items-center gap-2 text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-mono">
              Connected — {mm}:{ss}
            </span>
          </div>
        )}
        {status === "ending" && (
          <p className="text-muted-foreground text-sm">Ending call…</p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-destructive/20 border border-destructive rounded-lg text-destructive text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {status === "idle" ? (
        <button
          onClick={startCall}
          className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition"
          aria-label="Call my coach"
        >
          <Phone className="h-7 w-7 text-white" />
        </button>
      ) : status === "connecting" ? (
        <button
          disabled
          className="h-16 w-16 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg opacity-80"
        >
          <Loader2 className="h-7 w-7 text-white animate-spin" />
        </button>
      ) : (
        <div className="flex items-center gap-6">
          <button
            onClick={toggleMute}
            className="h-14 w-14 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent/20 transition"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <MicOff className="h-5 w-5 text-destructive" />
            ) : (
              <Mic className="h-5 w-5 text-foreground" />
            )}
          </button>
          <button
            onClick={endCall}
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition"
            aria-label="End call"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        {status === "idle" && "Tap the green button to start your coaching session"}
        {status === "connected" && "Speak any time — your coach will listen and respond"}
      </p>
    </div>
  );
}
