import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  ConnectionState,
} from "livekit-client";
import { startCoachCall, endCoachCall } from "@/lib/student-portal.functions";
import { PhoneOff, Loader2, Mic } from "lucide-react";

/**
 * Live voice call with the K2Ç Coach via LiveKit + Railway agent worker.
 *
 * Flow:
 *  1. server fn mints a LiveKit JWT for the student
 *  2. browser joins the LiveKit room, publishes mic
 *  3. Railway worker auto-dispatches into the room and starts the agent
 *  4. agent audio is auto-played; student can interrupt any time (agent VAD)
 */
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
    "connecting" | "waiting-agent" | "connected" | "ending"
  >("connecting");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startedAtRef = useRef<number>(0);
  const callIdRef = useRef<string | null>(null);
  const tickRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<HTMLAudioElement[]>([]);

  const start = useServerFn(startCoachCall);
  const end = useServerFn(endCoachCall);

  const attachRemoteAudio = (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach() as HTMLAudioElement;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    // Volume up; mobile browsers sometimes default low.
    el.volume = 1.0;
    document.body.appendChild(el);
    audioElsRef.current.push(el);
    // Some mobile browsers need an explicit play() after attach.
    el.play().catch((e) => console.warn("audio play blocked", e));
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await start({ data: { session } });
        if (cancelled) return;
        if (!res.ok) {
          onNoMinutes();
          return;
        }
        callIdRef.current = res.callId ?? null;
        setSecondsLeft(res.minutes_allowed * 60);
        startedAtRef.current = Date.now();

        // Request mic permission early (mobile Safari quirk).
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          throw new Error("Microphone permission is needed for the call.");
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            audioPreset: { maxBitrate: 32_000 },
          },
        });
        roomRef.current = room;

        room
          .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            attachRemoteAudio(track);
            if (!endingRef.current) setStatus("connected");
          })
          .on(
            RoomEvent.TrackUnsubscribed,
            (track: RemoteTrack, _pub: RemoteTrackPublication) => {
              track.detach().forEach((el) => el.remove());
            },
          )
          .on(RoomEvent.ParticipantConnected, (_p: RemoteParticipant) => {
            if (!endingRef.current) setStatus("connected");
          })
          .on(RoomEvent.Disconnected, () => {
            if (!endingRef.current) void hangup(false);
          })
          .on(RoomEvent.ConnectionStateChanged, (s: ConnectionState) => {
            if (s === ConnectionState.Connected && !endingRef.current) {
              // Connected but waiting for the agent to join.
              setStatus((prev) =>
                prev === "connecting" ? "waiting-agent" : prev,
              );
            }
          });

        await room.connect(res.livekit_url, res.livekit_token);
        if (cancelled || endingRef.current) return;

        // Publish mic; keep it on for the whole call so user can interrupt.
        await room.localParticipant.setMicrophoneEnabled(true);
        if (cancelled || endingRef.current) return;

        // Already-present remote audio tracks (in case agent joined first).
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track) attachRemoteAudio(pub.track);
          });
          if (p.trackPublications.size > 0) setStatus("connected");
        });

        // Greeting is the agent's job — but show the timer regardless.
        tickRef.current = window.setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              window.clearInterval(tickRef.current!);
              void hangup(true);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      } catch (e) {
        console.error("LiveKit connect failed", e);
        setError(e instanceof Error ? e.message : "Could not start the call.");
        setStatus("ending");
      }
    })();

    return () => {
      cancelled = true;
      endingRef.current = true;
      if (tickRef.current) window.clearInterval(tickRef.current);
      audioElsRef.current.forEach((el) => el.remove());
      audioElsRef.current = [];
      try { void roomRef.current?.disconnect(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hangup = async (timeUp = false) => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("ending");
    if (tickRef.current) window.clearInterval(tickRef.current);
    try { await roomRef.current?.disconnect(); } catch { /* ignore */ }
    audioElsRef.current.forEach((el) => el.remove());
    audioElsRef.current = [];

    const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    if (callIdRef.current) {
      void end({ data: { session, callId: callIdRef.current, duration_seconds: duration } })
        .catch(() => { /* ignore */ });
    }
    onClose();
    if (timeUp) onNoMinutes();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const statusLabel = {
    connecting: "Connecting…",
    "waiting-agent": "Coach is joining…",
    connected: "Live with your coach",
    ending: "Ending…",
  }[status];

  const statusColor = {
    connecting: "text-purple-300",
    "waiting-agent": "text-yellow-300",
    connected: "text-green-300",
    ending: "text-gray-400",
  }[status];

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(147,51,234,0.25) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        <div
          className={`h-40 w-40 rounded-full flex items-center justify-center text-white text-3xl font-bold ${
            status === "connected" ? "animate-pulse" : ""
          }`}
          style={{
            background: "linear-gradient(135deg, #5B21B6, #9333EA)",
            boxShadow: "0 0 80px rgba(147,51,234,0.8)",
          }}
        >
          AI
        </div>
        <h2 className="mt-6 text-2xl font-bold text-white">
          Your K2Ç Personalised AI Coach
        </h2>
        <p className="mt-1 text-sm text-white/60">Hi {firstName}, glad you called.</p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {status === "connecting" || status === "waiting-agent" ? (
            <Loader2 className={`h-4 w-4 animate-spin ${statusColor}`} />
          ) : status === "connected" ? (
            <Mic className="h-4 w-4 text-green-300" />
          ) : (
            <span className={`h-2 w-2 rounded-full bg-current animate-pulse ${statusColor}`} />
          )}
          <span className={statusColor}>{statusLabel}</span>
        </div>

        <div className="mt-8 text-6xl font-mono text-white tabular-nums">
          {mm}:{ss}
        </div>

        {error && (
          <p className="mt-4 max-w-xs text-center text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={() => hangup(false)}
          className="mt-12 h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.6)]"
          aria-label="End call"
        >
          <PhoneOff className="h-8 w-8 text-white" />
        </button>
        <p className="mt-3 text-xs text-white/40">
          Speak any time — even while coach is talking. They'll stop and listen.
        </p>
      </div>
    </div>
  );
}
