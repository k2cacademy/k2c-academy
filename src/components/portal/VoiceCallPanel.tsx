import { useState } from "react";
import { Phone, PhoneOff, Mic } from "lucide-react";

export function VoiceCallPanel({ email }: { email: string }) {
  const [calling, setCalling] = useState(false);

  const startCall = async () => {
    setCalling(true);
    try {
      // Dispatch agent first
      await fetch("/api/public/hooks/livekit-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: `coaching-${email.replace(/[^a-zA-Z0-9]/g, "-")}`,
        }),
      });

      // Get token
      const res = await fetch("/api/public/hooks/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { token } = await res.json();

      // Open LiveKit meet in new tab
      const meetUrl = `https://meet.livekit.io/custom?liveKitUrl=wss://k2c-ai-coach-yt1puc7u.livekit.cloud&token=${token}`;
      window.open(meetUrl, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="relative mb-6">
        <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border">
          <span className="text-4xl">🧠</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">K2Ç AI Sales Coach</h2>
      <p className="text-sm text-muted-foreground mb-6">Digital Nathy's AI Voice Coach</p>

      <p className="text-muted-foreground text-sm text-center max-w-xs mb-8">
        Tap the button below to start your live coaching session. Your coach will join you in seconds.
      </p>

      <button
        onClick={startCall}
        disabled={calling}
        className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg disabled:opacity-50 transition"
      >
        {calling ? (
          <Mic className="h-7 w-7 text-white animate-pulse" />
        ) : (
          <Phone className="h-7 w-7 text-white" />
        )}
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        {calling ? "Starting your session..." : "Tap to call your coach"}
      </p>
    </div>
  );
}  const toggleMute = () => {
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
