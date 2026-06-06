// VAPI rotation client — silently tries 5 (publicKey, assistantId) pairs.
// On any failure before the call connects, destroys the instance and rotates
// to the next. If all 5 fail, the caller falls back to LiveKit dispatch.
import Vapi from "@vapi-ai/web";

export type VapiPair = { publicKey: string; assistantId: string };

// NOTE: pair 1 (publicKey a83a3d16…) is out of credit — keep it at the END
// of the rotation so we attempt funded pairs first and only fall back to it
// as a last resort. We still keep it in case credit is topped up later.
export const VAPI_PAIRS: VapiPair[] = [
  { publicKey: "e6bf041d-1c62-4b94-a93c-52b563eef22c", assistantId: "5c3ce312-2f00-486c-8cd9-7da43417af4d" },
  { publicKey: "2ef0603f-4704-4cf4-9be8-a581fc68b192", assistantId: "d1fd7394-f3bc-4a1d-8181-a05a4978c572" },
  { publicKey: "04b01653-b99c-4749-b012-be91aa031768", assistantId: "e4d008ae-429f-4248-a503-33f30917b28e" },
  { publicKey: "146217bf-5d74-4870-acfd-6bad277f66eb", assistantId: "d6f52dbc-eb9b-422e-8815-27bf261ef0a9" },
  { publicKey: "a83a3d16-74f3-4f19-9fc7-3fa732cac8a1", assistantId: "a16cf991-f420-44f4-8460-0129939c9fe3" },
];

export type VapiHandle = {
  vapi: Vapi;
  pairIndex: number;
  setMuted: (muted: boolean) => void;
  end: () => void;
};

export type VapiCallbacks = {
  onConnected: (h: VapiHandle) => void;
  onEnded: () => void;
  onAllFailed: () => void; // caller should fall back to LiveKit
};

export async function startCallWithRotation(cb: VapiCallbacks): Promise<void> {
  let connected = false;

  // Pre-warm mic permission so VAPI doesn't stall on first pair.
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
  } catch (e) {
    console.error("[vapi] mic permission denied", e);
    cb.onAllFailed();
    return;
  }

  const tryPair = async (index: number): Promise<void> => {
    if (index >= VAPI_PAIRS.length) {
      cb.onAllFailed();
      return;
    }
    const pair = VAPI_PAIRS[index];
    console.log(`[vapi] trying pair ${index + 1}/${VAPI_PAIRS.length}`);
    const vapi = new Vapi(pair.publicKey);
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearGuard = () => { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } };

    const rotate = (reason: string) => {
      if (settled || connected) return;
      settled = true;
      clearGuard();
      console.warn(`[vapi] pair ${index + 1} failed: ${reason}, rotating`);
      try { vapi.stop(); } catch { /* noop */ }
      void tryPair(index + 1);
    };

    const markConnected = (via: string) => {
      if (settled) return;
      settled = true;
      connected = true;
      clearGuard();
      console.log(`[vapi] pair ${index + 1} CONNECTED via ${via}`);
      cb.onConnected({
        vapi,
        pairIndex: index,
        setMuted: (m: boolean) => { try { vapi.setMuted(m); } catch { /* noop */ } },
        end: () => { try { vapi.stop(); } catch { /* noop */ } },
      });
    };

    vapi.on("error", (e) => {
      console.error(`[vapi] pair ${index + 1} error`, e);
      rotate(`error: ${JSON.stringify(e)}`);
    });
    vapi.on("call-end", () => {
      clearGuard();
      if (!connected) rotate("call-end before connect");
      else cb.onEnded();
    });
    vapi.on("call-start", () => markConnected("call-start"));
    // Fallback connect signals — some VAPI versions are slow to emit call-start
    vapi.on("speech-start", () => markConnected("speech-start"));
    vapi.on("message", () => markConnected("message"));

    try {
      await vapi.start(pair.assistantId);
    } catch (e) {
      rotate(`start threw: ${String(e)}`);
      return;
    }

    // Guard: if no connect signal within 7s, rotate fast (out-of-credit pairs
    // typically hang silently instead of emitting an error).
    timeoutId = setTimeout(() => rotate("connect timeout 7s"), 7000);
  };

  await tryPair(0);
}

// LiveKit fallback dispatcher
export async function startLiveKitFallback(email: string): Promise<{ token: string; url: string; roomName: string } | null> {
  try {
    const r = await fetch("/api/public/hooks/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    console.error("livekit fallback failed", e);
    return null;
  }
}
